import { estimateTextUnits } from "./text-metrics.mjs";

const COMPOSITION_FIELDS = new Set(["version", "checkpoints", "geometry"]);
const CHECKPOINT_FIELDS = new Set(["frame", "reading_order", "blocks"]);
const BLOCK_FIELDS = new Set([
  "id",
  "slot",
  "role",
  "bounds",
  "align",
  "max_lines",
  "min_font_size",
  "card_layer",
  "padding",
  "equal_size_group",
  "hold_waiver",
]);
const ROLES = new Set(["anchor", "support", "active"]);
const ALIGNMENTS = new Set(["left", "center", "right"]);

const GEOMETRY_FIELDS = new Set([
  "id",
  "relation",
  "layers",
  "frames",
  "criteria",
  "note",
]);
const FRAMES_FIELDS = new Set(["start", "count", "stride"]);
const CRITERIA_FIELDS = new Set([
  "min_engagement_px",
  "max_engagement_px",
  "min_overlap_pixels",
  "max_overlap_pixels",
  "min_body_clearance_px",
  "body_layers",
  "max_outside_px",
  "alpha_threshold",
  "ends",
  "max_gap_px",
]);
// Criteria that only make sense for one relation are rejected on every other relation rather
// than silently ignored (same policy as UNSUPPORTED_CRITERIA_FIELDS below).
const CONNECTED_ONLY_CRITERIA = new Set(["ends", "max_gap_px"]);
const CONNECTED_ENDS = new Set(["start", "end", "both"]);
// Deliberately not yet supported: a true minimum-distance criterion needs a distance
// transform, a second algorithm to test, and every empirical failure this feature exists to
// catch is already caught by the binary overlap checks above. Reject rather than silently
// accept and ignore.
const UNSUPPORTED_CRITERIA_FIELDS = new Set([
  "min_clearance_px",
  "min_padding_px",
]);
const GEOMETRY_RELATIONS = new Set([
  "interlocked",
  "disjoint",
  "contained",
  "connected",
]);
const GEOMETRY_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function rejectUnknown(value, allowed, pointer, errors) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${pointer}/${key}: unknown field`);
  }
}

function sampledValue(property, frame) {
  if (!property || typeof property !== "object") return null;
  if (property.a !== 1) return property.k ?? null;
  if (!Array.isArray(property.k) || !property.k.length) return null;
  const keyframes = property.k;
  let current = keyframes[0];
  for (const keyframe of keyframes) {
    if ((keyframe.t ?? 0) > frame) break;
    current = keyframe;
  }
  const currentIndex = keyframes.indexOf(current);
  const next = keyframes[currentIndex + 1];
  const start = current.s ?? current.e;
  if (!Array.isArray(start) || !next || !Array.isArray(current.e)) return start;
  const span = (next.t ?? current.t) - (current.t ?? 0);
  if (span <= 0) return start;
  const amount = Math.max(0, Math.min(1, (frame - current.t) / span));
  return start.map((value, index) =>
    typeof value === "number" && typeof current.e[index] === "number"
      ? value + (current.e[index] - value) * amount
      : value,
  );
}

function textDocument(layer, frame) {
  const documents = layer?.t?.d?.k;
  if (!Array.isArray(documents) || !documents.length) return null;
  let document = documents[0]?.s ?? null;
  for (const keyframe of documents) {
    if ((keyframe.t ?? 0) > frame) break;
    document = keyframe.s ?? document;
  }
  return document;
}

// Reading budget from the actual copy, per references/motion-design.md's two rate models:
// character-rate scripts (CJK) at 3.5 characters/second, word-rate scripts at 3 words/second,
// floor 1 second, converted with frames = round(seconds * fps).
export function readingBudgetFrames(text, fps) {
  const hasCharRateScript =
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(
      text,
    );
  const seconds = hasCharRateScript
    ? Math.max(1, [...text.replace(/\s+/gu, "")].length / 3.5)
    : Math.max(1, text.trim().split(/\s+/u).filter(Boolean).length / 3);
  return Math.round(seconds * fps);
}

// Frame windows [start, end) where any of the layer's o/p/s/r transform properties actually
// changes value. A keyframed-but-constant property produces no segment; a hold keyframe
// (h: 1) whose next value differs produces a zero-length segment at the jump frame.
function movingSegments(layer) {
  const segments = [];
  for (const key of ["o", "p", "s", "r"]) {
    const property = layer?.ks?.[key];
    if (!property || property.a !== 1 || !Array.isArray(property.k)) continue;
    const keyframes = property.k;
    for (let index = 0; index < keyframes.length - 1; index += 1) {
      const current = keyframes[index];
      const next = keyframes[index + 1];
      const startValue = current?.s ?? null;
      const endValue = current?.e ?? next?.s ?? null;
      if (startValue == null || endValue == null) continue;
      if (JSON.stringify(startValue) === JSON.stringify(endValue)) continue;
      if (current.h === 1) {
        segments.push([next.t ?? 0, next.t ?? 0]);
      } else {
        segments.push([current.t ?? 0, next.t ?? 0]);
      }
    }
  }
  return segments;
}

// The stable window around `frame`: from the end of the last moving segment at or before it
// (or the layer's in-point) to the start of the first moving segment at or after it (or the
// layer's out-point / timeline end). Null when the frame sits inside a moving segment.
export function stableWindow(layer, frame, frameCount) {
  const segments = movingSegments(layer);
  let start = Math.max(0, layer?.ip ?? 0);
  let end = Math.min(layer?.op ?? frameCount, frameCount);
  for (const [segmentStart, segmentEnd] of segments) {
    if (segmentStart < frame && segmentEnd > frame) return null;
    if (segmentEnd <= frame && segmentEnd > start) start = segmentEnd;
    if (segmentStart >= frame && segmentStart < end) end = segmentStart;
  }
  return { start, end, hold: end - start };
}

function rectangleSize(layer, frame) {
  for (const group of layer?.shapes ?? []) {
    for (const item of group?.it ?? []) {
      if (item?.ty === "rc") return sampledValue(item.s, frame);
    }
  }
  return null;
}

function overlaps(first, second) {
  const [ax, ay, aw, ah] = first;
  const [bx, by, bw, bh] = second;
  const epsilon = 1e-6;
  return (
    ax + aw > bx + epsilon &&
    bx + bw > ax + epsilon &&
    ay + ah > by + epsilon &&
    by + bh > ay + epsilon
  );
}

function validBounds(bounds) {
  return (
    Array.isArray(bounds) &&
    bounds.length === 4 &&
    bounds.every(
      (value) => typeof value === "number" && Number.isFinite(value),
    ) &&
    bounds[0] >= 0 &&
    bounds[1] >= 0 &&
    bounds[2] > 0 &&
    bounds[3] > 0 &&
    bounds[0] + bounds[2] <= 1 &&
    bounds[1] + bounds[3] <= 1
  );
}

const MECHANICS_VALUES = new Set(["declared", "decorative"]);
const MECHANICS_MINIMUM_ROTATING_LAYERS = 2;

// Non-background root layers whose ks.r is keyframed and whose keyframe values actually
// differ — a keyframed-but-constant rotation is not "animated". Layer-level rotation only:
// nothing in this repo animates a shape group's own tr.r, and geometry claims already see
// only root layers.
export function rotatingLayerNames(animation) {
  const names = [];
  for (const layer of animation?.layers ?? []) {
    if (!layer || typeof layer !== "object" || layer.nm === "background")
      continue;
    const rotation = layer.ks?.r;
    if (!rotation || rotation.a !== 1 || !Array.isArray(rotation.k)) continue;
    const values = new Set(
      rotation.k
        .map((keyframe) => keyframe?.s)
        .filter((value) => value != null)
        .map((value) => JSON.stringify(value)),
    );
    if (values.size > 1) names.push(layer.nm);
  }
  return names;
}

// A drawing that looks mechanical makes a contact claim whether or not the author declared
// one. Two channels force the claim to become measurable: the rotation heuristic below (the
// common case), and an explicit `mechanics: declared` for mechanisms rotation-counting cannot
// see (belts, pistons, ratchets). `mechanics: decorative` is the attested opposite — the
// rotation makes no contact claim — and therefore contradicts declaring geometry claims.
export function validateMechanics(brief, animation) {
  const errors = [];
  const mechanics = brief?.mechanics;
  const claims = brief?.composition?.geometry ?? [];
  const claimCount = Array.isArray(claims) ? claims.length : 0;
  if (mechanics != null && !MECHANICS_VALUES.has(mechanics)) {
    errors.push("mechanics must be declared or decorative");
    return errors;
  }
  if (mechanics === "declared" && claimCount === 0)
    errors.push(
      "mechanics: declared requires at least one composition.geometry claim",
    );
  if (mechanics === "decorative" && claimCount > 0)
    errors.push(
      "mechanics: decorative contradicts declared composition.geometry claims; drop one of the two",
    );
  if (mechanics == null && claimCount === 0) {
    const rotating = rotatingLayerNames(animation);
    if (rotating.length >= MECHANICS_MINIMUM_ROTATING_LAYERS)
      errors.push(
        `layers ${rotating.join(", ")} rotate independently but composition.geometry declares no claims; declare the contact claim, or set mechanics: decorative if the rotation makes none`,
      );
  }
  return errors;
}

// Structural validation only — no rendering. A geometry claim's actual contact is measured by
// scripts/lib/geometry.mjs against rendered pixels; this only checks the claim is well formed
// enough to attempt that measurement (a real window, two distinct existing root layers, a
// known relation, sane criteria).
export function validateGeometryClaims(brief, animation, profile) {
  const errors = [];
  const geometry = brief?.composition?.geometry;
  if (geometry == null) return errors;
  if (!Array.isArray(geometry)) return ["composition.geometry must be a list"];
  const rootLayerNames = new Set(
    (animation.layers ?? [])
      .map((layer) => layer?.nm)
      .filter((name) => typeof name === "string"),
  );
  const ids = new Set();
  geometry.forEach((claim, index) => {
    const pointer = `composition.geometry[${index}]`;
    if (!claim || typeof claim !== "object" || Array.isArray(claim)) {
      errors.push(`${pointer} must be a mapping`);
      return;
    }
    rejectUnknown(claim, GEOMETRY_FIELDS, pointer, errors);
    if (typeof claim.id !== "string" || !GEOMETRY_ID_PATTERN.test(claim.id))
      errors.push(`${pointer}.id must be kebab-case`);
    else if (ids.has(claim.id)) errors.push(`${pointer}.id must be unique`);
    else ids.add(claim.id);

    if (!GEOMETRY_RELATIONS.has(claim.relation))
      errors.push(
        `${pointer}.relation must be interlocked, disjoint, contained, or connected`,
      );

    if (
      !Array.isArray(claim.layers) ||
      claim.layers.length !== 2 ||
      claim.layers[0] === claim.layers[1] ||
      !claim.layers.every((name) => typeof name === "string")
    ) {
      errors.push(`${pointer}.layers must name exactly two distinct layers`);
    } else {
      for (const name of claim.layers)
        if (!rootLayerNames.has(name))
          errors.push(
            `${pointer}.layers must name an existing root layer: ${name}`,
          );
    }

    const frames = claim.frames;
    if (frames != null) {
      if (!frames || typeof frames !== "object" || Array.isArray(frames)) {
        errors.push(`${pointer}.frames must be a mapping`);
      } else {
        rejectUnknown(frames, FRAMES_FIELDS, `${pointer}.frames`, errors);
        const start = frames.start ?? 0;
        const count = frames.count ?? Math.min(24, profile.frameCount);
        const stride = frames.stride ?? 1;
        if (!Number.isInteger(start) || start < 0)
          errors.push(`${pointer}.frames.start must be a non-negative integer`);
        if (!Number.isInteger(count) || count < 3)
          errors.push(
            `${pointer}.frames.count must be an integer of at least 3`,
          );
        if (!Number.isInteger(stride) || stride < 1)
          errors.push(`${pointer}.frames.stride must be a positive integer`);
        if (
          Number.isInteger(start) &&
          Number.isInteger(count) &&
          Number.isInteger(stride) &&
          start >= 0 &&
          count >= 1 &&
          stride >= 1 &&
          start + (count - 1) * stride >= profile.frameCount
        )
          errors.push(`${pointer}.frames must stay inside the timeline`);
      }
    }

    const criteria = claim.criteria ?? {};
    if (typeof criteria !== "object" || Array.isArray(criteria)) {
      errors.push(`${pointer}.criteria must be a mapping`);
    } else {
      rejectUnknown(
        criteria,
        new Set([...CRITERIA_FIELDS, ...UNSUPPORTED_CRITERIA_FIELDS]),
        `${pointer}.criteria`,
        errors,
      );
      for (const key of UNSUPPORTED_CRITERIA_FIELDS)
        if (key in criteria)
          errors.push(`${pointer}.criteria.${key} is not supported yet`);
      const numericChecks = [
        ["min_engagement_px", 0],
        ["max_engagement_px", 0],
        ["min_overlap_pixels", 0],
        ["max_overlap_pixels", 0],
        ["min_body_clearance_px", 0],
        ["max_outside_px", 0],
      ];
      for (const [key, minimum] of numericChecks) {
        if (criteria[key] == null) continue;
        if (typeof criteria[key] !== "number" || criteria[key] < minimum)
          errors.push(
            `${pointer}.criteria.${key} must be a non-negative number`,
          );
      }
      if (
        criteria.alpha_threshold != null &&
        (!Number.isInteger(criteria.alpha_threshold) ||
          criteria.alpha_threshold < 0 ||
          criteria.alpha_threshold > 255)
      )
        errors.push(
          `${pointer}.criteria.alpha_threshold must be an integer from 0 to 255`,
        );
      if (
        criteria.body_layers != null &&
        (!Array.isArray(criteria.body_layers) ||
          criteria.body_layers.length !== 2 ||
          criteria.body_layers[0] === criteria.body_layers[1] ||
          !criteria.body_layers.every((name) => rootLayerNames.has(name)))
      )
        errors.push(
          `${pointer}.criteria.body_layers must name two distinct existing root layers`,
        );
      if (claim.relation === "interlocked") {
        if (typeof criteria.min_engagement_px !== "number")
          errors.push(
            `${pointer}.criteria.min_engagement_px is required for an interlocked claim`,
          );
        else if (criteria.min_engagement_px < 2)
          errors.push(
            `${pointer}.criteria.min_engagement_px must be at least 2px; below that antialiasing can fabricate contact`,
          );
        if (
          typeof criteria.min_engagement_px === "number" &&
          typeof criteria.max_engagement_px === "number" &&
          criteria.min_engagement_px >= criteria.max_engagement_px
        )
          errors.push(
            `${pointer}.criteria.min_engagement_px must be less than max_engagement_px`,
          );
      }
      if (claim.relation === "connected") {
        if (!CONNECTED_ENDS.has(criteria.ends))
          errors.push(
            `${pointer}.criteria.ends must be start, end, or both for a connected claim`,
          );
        if (
          criteria.max_gap_px != null &&
          (typeof criteria.max_gap_px !== "number" || criteria.max_gap_px < 0)
        )
          errors.push(
            `${pointer}.criteria.max_gap_px must be a non-negative number`,
          );
      } else {
        for (const key of CONNECTED_ONLY_CRITERIA)
          if (key in criteria)
            errors.push(
              `${pointer}.criteria.${key} only applies to a connected claim`,
            );
      }
    }
  });
  return errors;
}

export function validateComposition(brief, animation, profile) {
  const errors = [];
  const composition = brief?.composition;
  if (composition == null) return errors;
  if (
    !composition ||
    typeof composition !== "object" ||
    Array.isArray(composition)
  )
    return ["composition must be a mapping"];
  rejectUnknown(composition, COMPOSITION_FIELDS, "composition", errors);
  if (composition.version !== 1) errors.push("composition.version must be 1");
  errors.push(...validateGeometryClaims(brief, animation, profile));
  if (
    !Array.isArray(composition.checkpoints) ||
    !composition.checkpoints.length
  ) {
    errors.push("composition.checkpoints must be a non-empty list");
    return errors;
  }

  const safe = brief.safe_area ?? {};
  const safeLeft = safe.left ?? 0;
  const safeTop = safe.top ?? 0;
  const safeRight = 1 - (safe.right ?? 0);
  const safeBottom = 1 - (safe.bottom ?? 0);
  const layers = [...(animation.layers ?? [])];
  const frames = new Set();
  let hasPoster = false;
  const slotInstances = new Map();

  composition.checkpoints.forEach((checkpoint, checkpointIndex) => {
    const pointer = `composition.checkpoints[${checkpointIndex}]`;
    if (
      !checkpoint ||
      typeof checkpoint !== "object" ||
      Array.isArray(checkpoint)
    ) {
      errors.push(`${pointer} must be a mapping`);
      return;
    }
    rejectUnknown(checkpoint, CHECKPOINT_FIELDS, pointer, errors);
    const frame = checkpoint.frame;
    if (!Number.isInteger(frame) || frame < 0 || frame >= profile.frameCount)
      errors.push(`${pointer}.frame must point inside the timeline`);
    else {
      if (frames.has(frame)) errors.push(`${pointer}.frame must be unique`);
      frames.add(frame);
      if (frame === brief.poster_frame) hasPoster = true;
    }
    if (!Array.isArray(checkpoint.blocks) || !checkpoint.blocks.length) {
      errors.push(`${pointer}.blocks must be a non-empty list`);
      return;
    }

    const ids = new Set();
    const blockBounds = [];
    const equalGroups = new Map();
    checkpoint.blocks.forEach((block, blockIndex) => {
      const blockPointer = `${pointer}.blocks[${blockIndex}]`;
      if (!block || typeof block !== "object" || Array.isArray(block)) {
        errors.push(`${blockPointer} must be a mapping`);
        return;
      }
      rejectUnknown(block, BLOCK_FIELDS, blockPointer, errors);
      if (typeof block.id !== "string" || !block.id)
        errors.push(`${blockPointer}.id is required`);
      else if (ids.has(block.id))
        errors.push(`${blockPointer}.id must be unique`);
      else ids.add(block.id);
      if (!ROLES.has(block.role))
        errors.push(`${blockPointer}.role must be anchor, support, or active`);
      if (block.align != null && !ALIGNMENTS.has(block.align))
        errors.push(`${blockPointer}.align must be left, center, or right`);
      if (!validBounds(block.bounds))
        errors.push(
          `${blockPointer}.bounds must be normalized [x, y, width, height]`,
        );
      else {
        const [x, y, width, height] = block.bounds;
        if (
          x < safeLeft ||
          y < safeTop ||
          x + width > safeRight ||
          y + height > safeBottom
        )
          errors.push(`${blockPointer}.bounds must stay inside safe_area`);
        for (const previous of blockBounds) {
          if (overlaps(block.bounds, previous.bounds))
            errors.push(`${blockPointer}.bounds overlaps ${previous.id}`);
        }
        blockBounds.push({ id: block.id, bounds: block.bounds });
      }

      if (
        block.hold_waiver != null &&
        (typeof block.hold_waiver !== "string" ||
          block.hold_waiver.trim().length < 10)
      )
        errors.push(
          `${blockPointer}.hold_waiver must be a string of at least 10 characters explaining the deliberate tradeoff`,
        );

      if (block.slot != null) {
        if (
          typeof block.slot !== "string" ||
          !(block.slot in (brief.copy ?? {}))
        ) {
          errors.push(`${blockPointer}.slot must name brief.copy`);
        } else {
          const layer = layers.find(
            (candidate) => candidate.ty === 5 && candidate.nm === block.slot,
          );
          if (!layer)
            errors.push(`${blockPointer}.slot must name a text layer`);
          else if (validBounds(block.bounds) && Number.isInteger(frame)) {
            if (!slotInstances.has(block.slot))
              slotInstances.set(block.slot, []);
            slotInstances.get(block.slot).push({
              frame,
              layer,
              blockPointer,
              waiver:
                typeof block.hold_waiver === "string" &&
                block.hold_waiver.trim().length >= 10
                  ? block.hold_waiver
                  : null,
            });
            const document = textDocument(layer, frame);
            const fontSize = document?.s;
            const rawText = String(document?.t ?? "");
            // Neither "\n" nor "\r" is a portable line break (measured against the pinned
            // CanvasKit/Skottie build: "\n" renders inline as a substitute glyph, not a
            // break). A text document containing either is rejected elsewhere as invalid
            // for a managed bundle; here it is measured conservatively as the renderer
            // actually draws it — one concatenated line — rather than optimistically as
            // if each separator produced a real line break.
            const hasLineSeparator = /[\r\n]/u.test(rawText);
            const lineCount = hasLineSeparator
              ? rawText.split(/\r\n|[\r\n]/u).length
              : 1;
            if (!Number.isInteger(block.max_lines) || block.max_lines < 1)
              errors.push(
                `${blockPointer}.max_lines must be a positive integer`,
              );
            else if (lineCount > block.max_lines)
              errors.push(`${blockPointer} exceeds max_lines`);
            if (
              typeof block.min_font_size !== "number" ||
              block.min_font_size <= 0
            )
              errors.push(`${blockPointer}.min_font_size must be positive`);
            else if (
              typeof fontSize === "number" &&
              fontSize < block.min_font_size
            )
              errors.push(`${blockPointer} is below min_font_size`);
            if (typeof fontSize === "number") {
              const availableWidth = block.bounds[2] * profile.width;
              const availableHeight = block.bounds[3] * profile.height;
              const requiredWidth = hasLineSeparator
                ? estimateTextUnits(rawText.replace(/[\r\n]/gu, "")) * fontSize
                : estimateTextUnits(rawText) * fontSize;
              const requiredHeight =
                lineCount * (document?.lh ?? fontSize * 1.2);
              if (requiredWidth > availableWidth + 1)
                errors.push(`${blockPointer} text exceeds declared width`);
              if (requiredHeight > availableHeight + 1)
                errors.push(`${blockPointer} text exceeds declared height`);
            }
            const position = sampledValue(layer.ks?.p, frame);
            if (Array.isArray(position)) {
              const [x, y, width, height] = block.bounds;
              if (
                position[0] < x * profile.width - 1 ||
                position[0] > (x + width) * profile.width + 1 ||
                position[1] < y * profile.height - 1 ||
                position[1] > (y + height) * profile.height + 1
              )
                errors.push(
                  `${blockPointer} text-layer anchor is outside declared bounds`,
                );
            }
          }
        }
      }

      if (block.card_layer != null) {
        const card = layers.find(
          (candidate) => candidate.nm === block.card_layer,
        );
        const size =
          card && Number.isInteger(frame) ? rectangleSize(card, frame) : null;
        if (!card || !Array.isArray(size))
          errors.push(
            `${blockPointer}.card_layer must name a rectangle shape layer`,
          );
        else {
          const padding = block.padding ?? 0;
          if (typeof padding !== "number" || padding < 0)
            errors.push(`${blockPointer}.padding must be non-negative`);
          if (validBounds(block.bounds)) {
            const requiredWidth = block.bounds[2] * profile.width + padding * 2;
            const requiredHeight =
              block.bounds[3] * profile.height + padding * 2;
            if (size[0] + 1 < requiredWidth || size[1] + 1 < requiredHeight)
              errors.push(
                `${blockPointer}.card_layer does not contain the block plus padding`,
              );
          }
          if (block.equal_size_group) {
            const previous = equalGroups.get(block.equal_size_group);
            if (
              previous &&
              (Math.abs(previous[0] - size[0]) > 1 ||
                Math.abs(previous[1] - size[1]) > 1)
            )
              errors.push(
                `${blockPointer}.card_layer differs from equal_size_group ${block.equal_size_group}`,
              );
            else equalGroups.set(block.equal_size_group, size);
          }
        }
      }
    });

    if (!Array.isArray(checkpoint.reading_order))
      errors.push(`${pointer}.reading_order must be a list`);
    else if (
      checkpoint.reading_order.length !== ids.size ||
      new Set(checkpoint.reading_order).size !== ids.size ||
      checkpoint.reading_order.some((id) => !ids.has(id))
    )
      errors.push(
        `${pointer}.reading_order must contain every block id exactly once`,
      );
  });

  if (!hasPoster)
    errors.push("composition.checkpoints must include poster_frame");

  // Reading-hold budget gate. The hold is the stable window around the slot's first declared
  // checkpoint — from the layer's last incoming transform to its next outgoing one — and must
  // meet references/motion-design.md's reading-time formula for the actual copy. Text whose
  // stable window runs to the end of the timeline is exempt: a standalone Lottie persists on
  // its final frame (and a loop repeats), so copy with no exit stays readable indefinitely —
  // the budget exists for copy that leaves the canvas before a reader can finish it. A
  // deliberate exception is declared per block as hold_waiver; a waiver whose hold already
  // passes is itself an error so exemptions cannot outlive their excuse.
  if (Number.isFinite(profile.fps)) {
    for (const instances of slotInstances.values()) {
      const first = instances.reduce((minimum, current) =>
        current.frame < minimum.frame ? current : minimum,
      );
      for (const instance of instances) {
        if (instance !== first && instance.waiver)
          errors.push(
            `${instance.blockPointer}.hold_waiver only counts at the slot's first checkpoint`,
          );
      }
      const text = String(textDocument(first.layer, first.frame)?.t ?? "");
      if (!text) continue;
      const window = stableWindow(first.layer, first.frame, profile.frameCount);
      if (window === null) {
        errors.push(
          `${first.blockPointer} checkpoint frame ${first.frame} sits inside a transition, not a hold`,
        );
        continue;
      }
      const budget = readingBudgetFrames(text, profile.fps);
      const exits = window.end < profile.frameCount;
      if (exits && window.hold < budget) {
        if (!first.waiver)
          errors.push(
            `${first.blockPointer} holds ${window.hold} frames (${window.start}-${window.end}) before its exit, below the ${budget}-frame reading budget for its copy; extend the hold, cut copy, or declare hold_waiver`,
          );
      } else if (first.waiver) {
        errors.push(
          `${first.blockPointer}.hold_waiver is unused: the hold already meets its reading budget`,
        );
      }
    }
  }
  return errors;
}
