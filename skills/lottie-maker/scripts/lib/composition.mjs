const COMPOSITION_FIELDS = new Set(["version", "checkpoints"]);
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
]);
const ROLES = new Set(["anchor", "support", "active"]);
const ALIGNMENTS = new Set(["left", "center", "right"]);

function rejectUnknown(value, allowed, pointer, errors) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${pointer}/${key}: unknown field`);
  }
}

function estimateTextUnits(text) {
  return [...text].reduce((total, character) => {
    if (/\s/u.test(character)) return total + 0.35;
    if (/^[\u0020-\u007e]$/u.test(character)) return total + 0.58;
    return total + 1;
  }, 0);
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
            const document = textDocument(layer, frame);
            const fontSize = document?.s;
            const lines = String(document?.t ?? "").split("\n");
            if (!Number.isInteger(block.max_lines) || block.max_lines < 1)
              errors.push(
                `${blockPointer}.max_lines must be a positive integer`,
              );
            else if (lines.length > block.max_lines)
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
              const requiredWidth = Math.max(
                ...lines.map((line) => estimateTextUnits(line) * fontSize),
              );
              const requiredHeight =
                lines.length * (document?.lh ?? fontSize * 1.2);
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
  return errors;
}
