import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import YAML from "yaml";

import { validateComposition, validateMechanics } from "./composition.mjs";
import { LIMITS, resolveProfile } from "./profiles.mjs";
import { pointerToken, readJson, safeLocalFile, sha256 } from "./io.mjs";
import { estimateTextUnits } from "./text-metrics.mjs";
import { backgroundLayer, entranceOpacity, textLayer } from "./emit.mjs";

const ROOT_FIELDS = ["v", "fr", "ip", "op", "w", "h", "nm", "assets", "layers"];
const DISALLOWED_LAYER_TYPES = new Map([
  [1, "solid layers"],
  [3, "null layers"],
  [13, "camera layers"],
]);
const ALLOWED_LAYER_TYPES = new Set([0, 2, 4, 5]);
const EFFECT_KEYS = new Set(["ef", "ddd", "ao"]);
// Measured against the pinned CanvasKit/Skottie build (render.mjs CANVASKIT_VERSION): "\n"
// is not honored as a line break and renders as a substitute glyph on a single line; "\r"
// happens to break the line in this build but that behavior is undocumented and not proven
// to match other Lottie players (lottie-web, native SDKs). No line-separator character is
// portable, so text documents must not contain one.
export const LINE_SEPARATOR_PATTERN = /[\r\n]/u;
let schemaValidator;

async function officialSchemaReport(animation) {
  try {
    if (!schemaValidator) {
      const schemaPath = path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        "../schemas/lottie.schema.json",
      );
      const schema = JSON.parse(await readFile(schemaPath, "utf8"));
      const ajv = new Ajv2020({ allErrors: true, strict: false });
      addFormats(ajv);
      schemaValidator = ajv.compile(schema);
    }
    const valid = schemaValidator(animation);
    return {
      status: valid ? "valid" : "advisory",
      source_commit: "76b5617c5787382d8db4bc6a0496909fb69b3494",
      errors: valid
        ? []
        : [
            ...new Set(
              (schemaValidator.errors ?? []).map(
                (error) => `${error.instancePath || "/"} ${error.message}`,
              ),
            ),
          ],
    };
  } catch (error) {
    return {
      status: "unavailable",
      source_commit: "76b5617c5787382d8db4bc6a0496909fb69b3494",
      errors: [error.message],
    };
  }
}

function collectLayers(layers, found = []) {
  for (const layer of layers ?? []) {
    found.push(layer);
    if (Array.isArray(layer.layers)) collectLayers(layer.layers, found);
  }
  return found;
}

function collectAnimationLayers(animation) {
  const found = collectLayers(animation.layers);
  for (const asset of animation.assets ?? [])
    collectLayers(asset?.layers, found);
  return found;
}

function layerInventory(animation) {
  const found = [];
  function visit(layers, pointer) {
    for (const [index, layer] of (layers ?? []).entries()) {
      const layerPath = `${pointer}/${index}`;
      found.push({
        path: layerPath,
        name: layer.nm ?? null,
        type: layer.ty ?? null,
        in: layer.ip ?? null,
        out: layer.op ?? null,
        ref_id: layer.refId ?? null,
      });
      visit(layer.layers, `${layerPath}/layers`);
    }
  }
  visit(animation.layers, "/layers");
  for (const [index, asset] of (animation.assets ?? []).entries()) {
    visit(asset?.layers, `/assets/${index}/layers`);
  }
  return found;
}

function walk(value, visitor, pointer = "") {
  visitor(value, pointer);
  if (Array.isArray(value))
    value.forEach((item, index) => walk(item, visitor, `${pointer}/${index}`));
  else if (value && typeof value === "object") {
    for (const [childKey, child] of Object.entries(value))
      walk(child, visitor, `${pointer}/${pointerToken(childKey)}`);
  }
}

export function createAnimation(brief, profile) {
  const title = brief.copy?.title ?? "Replace me";
  const font = brief.fonts?.[0]?.family ?? "Noto Sans CJK TC";
  const background = brief.palette?.background ?? [0.976, 0.98, 0.984, 1];
  const foreground = brief.palette?.foreground ?? [0.082, 0.145, 0.267, 1];
  const holdStart = Math.min(
    12,
    Math.max(2, Math.floor(profile.frameCount * 0.15)),
  );
  const titleSize = Math.max(
    12,
    Math.min(
      profile.width * 0.06,
      (profile.width * 0.84) / Math.max(1, estimateTextUnits(title)),
    ),
  );
  return {
    v: "5.12.2",
    fr: profile.fps,
    ip: 0,
    op: profile.frameCount,
    w: profile.width,
    h: profile.height,
    nm: brief.id,
    meta: {
      generator: "lottie-maker",
      profile: profile.profile,
      loop: profile.loop,
    },
    assets: [],
    fonts: {
      list: [
        {
          fName: font,
          fFamily: font,
          fStyle: "Regular",
          fPath:
            brief.fonts?.[0]?.path ?? "assets/fonts/NotoSansCJKtc-Regular.otf",
          ascent: 75,
        },
      ],
    },
    layers: [
      textLayer("title", title, [profile.width * 0.08, profile.height / 2], {
        size: Math.floor(titleSize),
        font,
        lineHeight: Math.round(profile.width * 0.075),
        color: foreground,
        outPoint: profile.frameCount,
        opacity: entranceOpacity(0, { eased: true, fadeInFrames: holdStart }),
      }),
      backgroundLayer([profile.width, profile.height], {
        fill: background,
        outPoint: profile.frameCount,
      }),
    ],
  };
}

export async function loadBundle(input) {
  const absolute = path.resolve(input);
  const info = await stat(absolute);
  if (info.isFile())
    return {
      root: path.dirname(absolute),
      animationPath: absolute,
      brief: null,
      animation: await readJson(absolute),
    };
  if (!info.isDirectory())
    throw new Error("input must be a bundle directory or Lottie JSON file");
  const briefPath = path.join(absolute, "brief.yaml");
  const animationPath = path.join(absolute, "animation.json");
  let brief = null;
  try {
    brief = YAML.parse(await readFile(briefPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return {
    root: absolute,
    briefPath,
    animationPath,
    brief,
    animation: await readJson(animationPath),
  };
}

export async function inspectAnimation(bundle) {
  const { animation, root } = bundle;
  const errors = [];
  const warnings = [];
  for (const field of ROOT_FIELDS)
    if (!(field in animation)) errors.push(`/${field}: missing root field`);
  const dimensions = {
    width: animation.w,
    height: animation.h,
    fps: animation.fr,
    in: animation.ip,
    out: animation.op,
  };
  if (!Number.isInteger(animation.w) || !Number.isInteger(animation.h))
    errors.push("/w,/h: canvas dimensions must be integers");
  if (animation.w * animation.h > LIMITS.maxPixels)
    errors.push(`/w,/h: canvas exceeds ${LIMITS.maxPixels} pixels`);
  if (
    !Number.isInteger(animation.fr) ||
    animation.fr < LIMITS.minFps ||
    animation.fr > LIMITS.maxFps
  )
    errors.push("/fr: frame rate is outside the supported range");
  if (
    animation.ip !== 0 ||
    !Number.isInteger(animation.op) ||
    animation.op <= 0
  )
    errors.push("/ip,/op: timeline must use ip=0 and positive integer op");

  const layers = collectAnimationLayers(animation);
  const layerDetails = layerInventory(animation);
  const lineSeparatorPaths = [];
  for (const [index, layer] of layers.entries()) {
    const layerPath = layerDetails[index]?.path ?? "/layers";
    if (!ALLOWED_LAYER_TYPES.has(layer.ty))
      errors.push(
        `${layerPath}: unsupported layer type ${layer.ty} (${DISALLOWED_LAYER_TYPES.get(layer.ty) ?? "unknown"}) at ${layer.nm ?? "unnamed"}`,
      );
    for (const key of EFFECT_KEYS)
      if (layer[key])
        errors.push(
          `${layerPath}/${key}: unsupported field on layer ${layer.nm ?? "unnamed"}`,
        );
    if (
      layer.ty === 5 &&
      (!Array.isArray(layer.t?.a) || typeof layer.t?.p !== "object")
    ) {
      errors.push(
        `${layerPath}/t: text layer ${layer.nm ?? "unnamed"} must contain t.a and t.p`,
      );
    }
    if (layer.ty === 5) {
      for (const [keyIndex, keyframe] of (layer.t?.d?.k ?? []).entries()) {
        const text = keyframe?.s?.t;
        if (typeof text === "string" && LINE_SEPARATOR_PATTERN.test(text)) {
          const pointer = `${layerPath}/t/d/k/${keyIndex}/s/t`;
          lineSeparatorPaths.push(pointer);
          warnings.push(
            `${pointer}: line separators are not portable; measured Skottie behavior renders them inline or as a substitute glyph rather than a clean break. Use one text layer per line.`,
          );
        }
      }
    }
  }
  const expressionPaths = [];
  const remoteUrlPaths = [];
  walk(animation, (value, pointer) => {
    if (pointer.endsWith("/x") && typeof value === "string" && value.trim()) {
      expressionPaths.push(pointer);
      errors.push(`${pointer}: expressions are not portable`);
    }
    if (typeof value === "string" && /^(https?:|data:)/i.test(value)) {
      remoteUrlPaths.push(pointer || "/");
      errors.push(
        `${pointer || "/"}: remote or embedded asset URLs are not portable`,
      );
    }
  });

  const assets = [];
  let totalAssetBytes = 0;
  for (const [assetIndex, asset] of (animation.assets ?? []).entries()) {
    if (!asset || typeof asset !== "object" || !asset.p) continue;
    if (asset.e === 1) {
      errors.push(
        `/assets/${assetIndex}/e: embedded asset is not allowed: ${asset.id ?? asset.p}`,
      );
      assets.push({
        id: asset.id ?? null,
        kind: "image",
        reference: asset.p,
        status: "invalid",
        error: "embedded assets are not portable",
      });
      continue;
    }
    const reference = `${asset.u ?? ""}${asset.p}`;
    try {
      const file = await safeLocalFile(
        root,
        reference,
        `asset ${asset.id ?? asset.p}`,
      );
      const info = await stat(file);
      if (info.size > LIMITS.maxAssetBytes)
        errors.push(
          `asset exceeds ${LIMITS.maxAssetBytes} bytes: ${reference}`,
        );
      totalAssetBytes += info.size;
      assets.push({
        id: asset.id ?? null,
        kind: "image",
        reference,
        status: "resolved",
        path: file,
        bytes: info.size,
      });
    } catch (error) {
      const message = `/assets/${assetIndex}: ${error.message}`;
      errors.push(message);
      assets.push({
        id: asset.id ?? null,
        kind: "image",
        reference,
        status: "invalid",
        error: message,
      });
    }
  }
  const declaredFonts = animation.fonts?.list ?? [];
  const fonts = [];
  for (const [fontIndex, font] of declaredFonts.entries()) {
    const name = font.fName;
    try {
      const declaredFont = bundle.brief?.fonts?.find(
        (item) => item.name === name || item.family === name,
      );
      const declared = declaredFont?.path ?? font.fPath;
      let file;
      let lastError;
      for (const candidate of [
        declared,
        `assets/fonts/${name}`,
        `assets/fonts/${name}.otf`,
        `assets/fonts/${name}.ttf`,
      ].filter(Boolean)) {
        try {
          file = await safeLocalFile(root, candidate, `font ${name}`);
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!file) throw lastError ?? new Error(`font ${name} is missing`);
      const info = await stat(file);
      totalAssetBytes += info.size;
      assets.push({
        id: name,
        kind: "font",
        reference: declared ?? `assets/fonts/${path.basename(file)}`,
        status: "resolved",
        path: file,
        bytes: info.size,
        font: true,
      });
      fonts.push({
        name,
        family: font.fFamily ?? null,
        style: font.fStyle ?? null,
        reference: declared ?? font.fPath ?? null,
        status: "resolved",
      });
    } catch (error) {
      const message = `/fonts/list/${fontIndex}: ${error.message}`;
      errors.push(message);
      fonts.push({
        name,
        family: font.fFamily ?? null,
        style: font.fStyle ?? null,
        reference: font.fPath ?? null,
        status: "invalid",
        error: message,
      });
    }
  }
  if (assets.length > LIMITS.maxAssets)
    errors.push(`asset count exceeds ${LIMITS.maxAssets}`);
  if (totalAssetBytes > LIMITS.maxTotalAssetBytes)
    errors.push(`assets exceed ${LIMITS.maxTotalAssetBytes} bytes total`);
  if (!declaredFonts.length && layers.some((layer) => layer.ty === 5))
    warnings.push("text layers exist without a declared local font");
  const officialSchema = await officialSchemaReport(animation);
  if (officialSchema.status === "advisory")
    warnings.push(
      "official schema reported advisory gaps; portable-profile validity is not a guarantee for every player",
    );
  return {
    status: errors.length ? "invalid" : "valid",
    scope: "lottie-maker-portable-profile",
    compatibility_guarantee: false,
    animation_version: animation.v ?? null,
    dimensions,
    frame_count:
      Number.isInteger(animation.op) && Number.isInteger(animation.ip)
        ? animation.op - animation.ip
        : null,
    layer_count: layers.length,
    layers: layerDetails,
    assets,
    fonts,
    features: {
      layer_types: [...new Set(layers.map((layer) => layer.ty))].sort(),
      masks: layerDetails
        .filter((_, index) => Array.isArray(layers[index]?.masksProperties))
        .map((layer) => `${layer.path}/masksProperties`),
      mattes: layerDetails
        .filter((_, index) => layers[index]?.tt || layers[index]?.td)
        .map((layer) => layer.path),
      blend_modes: layerDetails
        .filter((_, index) => layers[index]?.bm)
        .map((layer) => `${layer.path}/bm`),
      effects: layerDetails
        .filter((_, index) => Array.isArray(layers[index]?.ef))
        .map((layer) => `${layer.path}/ef`),
      three_d: layerDetails
        .filter((_, index) => layers[index]?.ddd)
        .map((layer) => `${layer.path}/ddd`),
      precompositions: layerDetails
        .filter((_, index) => layers[index]?.ty === 0)
        .map((layer) => layer.path),
      images: layerDetails
        .filter((_, index) => layers[index]?.ty === 2)
        .map((layer) => layer.path),
      text_animators: layerDetails
        .filter((_, index) => (layers[index]?.t?.a?.length ?? 0) > 0)
        .map((layer) => `${layer.path}/t/a`),
      expressions: expressionPaths,
      remote_urls: remoteUrlPaths,
      line_separators: lineSeparatorPaths,
      embedded_glyphs: Array.isArray(animation.chars)
        ? animation.chars.length
        : 0,
      slots: Boolean(animation.slots),
      markers: Array.isArray(animation.markers) ? animation.markers.length : 0,
    },
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    official_schema: {
      ...officialSchema,
      interpretation:
        "Advisory schema errors do not override portable-profile status and do not prove player compatibility.",
    },
    sha256: sha256(await readFile(bundle.animationPath)),
  };
}

export async function validateBundle(bundle) {
  const report = await inspectAnimation(bundle);
  if (bundle.brief) {
    const animation = bundle.animation;

    // Checks that do not depend on profile resolution run unconditionally, in their own
    // try/catch, so a bad canvas/fps/duration in the brief cannot hide them (see the
    // profile-resolution group below). A single throw here previously discarded every
    // finding after it; each group now fails independently.
    try {
      if (bundle.brief.version !== 1)
        report.errors.push("brief version must be 1");
      if (typeof bundle.brief.id !== "string")
        report.errors.push("brief id is required");
      for (const [slot, copy] of Object.entries(bundle.brief.copy ?? {})) {
        if (typeof copy !== "string" || !copy.trim())
          report.errors.push(`copy.${slot} must be a non-empty string`);
        const bound = collectAnimationLayers(animation).some(
          (layer) =>
            layer.ty === 5 &&
            layer.nm === slot &&
            layer.t?.d?.k?.some((item) => item.s?.t === copy),
        );
        if (!bound)
          report.errors.push(`copy.${slot} must match its named text layer`);
      }
      report.errors.push(...validateManagedBackgroundOrder(animation));
      report.errors.push(...validateSlots(animation, bundle.brief));
      report.errors.push(...validateMechanics(bundle.brief, animation));
      for (const pointer of report.features.line_separators)
        report.errors.push(
          `${pointer}: line separators are not portable in a managed bundle; use one text layer per line instead of \\n or \\r`,
        );
    } catch (error) {
      report.errors.push(error.message);
    }

    let profile = null;
    try {
      profile = resolveProfile(bundle.brief);
    } catch (error) {
      report.errors.push(error.message);
    }

    if (profile) {
      try {
        if (animation.w !== profile.width || animation.h !== profile.height)
          report.errors.push("animation canvas does not match brief");
        if (
          animation.fr !== profile.fps ||
          animation.op - animation.ip !== profile.frameCount
        )
          report.errors.push("animation timeline does not match brief");
        const poster = bundle.brief.poster_frame;
        if (
          !Number.isInteger(poster) ||
          poster < 0 ||
          poster >= profile.frameCount
        )
          report.errors.push("poster_frame must point inside the timeline");
        report.errors.push(
          ...validateComposition(bundle.brief, animation, profile),
        );
      } catch (error) {
        report.errors.push(error.message);
      }
    } else {
      report.errors.push(
        "profile-dependent checks were skipped; re-run validate after fixing the profile",
      );
    }
  }
  report.errors = [...new Set(report.errors)];
  report.status = report.errors.length ? "invalid" : "valid";
  return report;
}

const SLOT_STYLE_KEYS = ["f", "s", "j", "tr", "lh", "fc"];

function collectSids(animation) {
  const sids = new Set();
  walk(animation, (value) => {
    if (value && typeof value === "object" && typeof value.sid === "string")
      sids.add(value.sid);
  });
  return sids;
}

// Standard Lottie binds a slot through a `sid` on the target property. This skill's own
// examples bind by layer name instead, and no `sid` ever appears in this repo — so a slot
// that names neither is inert metadata that can silently drift from what actually renders.
function resolveSlotValue(slotValue) {
  if (!slotValue || typeof slotValue !== "object") return null;
  if (typeof slotValue.t === "string")
    return { text: slotValue.t, document: slotValue };
  if (typeof slotValue.p?.k === "string")
    return { text: slotValue.p.k, document: null };
  return null;
}

export function validateSlots(animation, brief) {
  const errors = [];
  const slots = animation?.slots;
  if (slots == null) return errors;
  if (typeof slots !== "object" || Array.isArray(slots))
    return ["/slots: must be a mapping"];
  const sids = collectSids(animation);
  const layers = collectAnimationLayers(animation);
  for (const [key, slotValue] of Object.entries(slots)) {
    const pointer = `/slots/${pointerToken(key)}`;
    const layer = layers.find(
      (candidate) => candidate.ty === 5 && candidate.nm === key,
    );
    if (!sids.has(key) && !layer) {
      errors.push(`${pointer}: not bound to any sid or layer name`);
      continue;
    }
    const resolved = resolveSlotValue(slotValue);
    if (!resolved) {
      errors.push(
        `${pointer}: must be a string property ({p:{k:string}}) or a text document`,
      );
      continue;
    }
    if (layer) {
      const fallback = layer.t?.d?.k?.[0]?.s ?? null;
      if (fallback && fallback.t !== resolved.text)
        errors.push(`${pointer}: does not match its layer fallback verbatim`);
      if (resolved.document && fallback) {
        const missing = SLOT_STYLE_KEYS.filter(
          (styleKey) =>
            fallback[styleKey] !== undefined &&
            resolved.document[styleKey] === undefined,
        );
        if (missing.length)
          errors.push(
            `${pointer}: text document is missing style fields present on its layer fallback: ${missing.join(", ")}`,
          );
      }
    }
    const copy = brief?.copy?.[key];
    if (typeof copy === "string" && copy !== resolved.text)
      errors.push(`${pointer}: does not match brief.copy.${key} verbatim`);
  }
  return errors;
}

export function validateManagedBackgroundOrder(animation) {
  const layers = Array.isArray(animation?.layers) ? animation.layers : [];
  const backgroundIndex = layers.findIndex(
    (layer) => layer?.nm === "background",
  );
  if (backgroundIndex === -1 || backgroundIndex === layers.length - 1)
    return [];
  return [
    `/layers/${backgroundIndex}: managed background must be the final root layer`,
  ];
}
