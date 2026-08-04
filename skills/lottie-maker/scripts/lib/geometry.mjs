// Rendered-geometry contact verification: pure measurement math over occupancy masks derived
// from isolated per-layer renders, plus the render path (isolateAnimation/verifyGeometry) that
// produces those masks. The pure half is deliberately free of CanvasKit so it is cheap to unit
// test; only the render path below touches a CanvasKit instance.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { LIMITS } from "./profiles.mjs";
import { sha256 } from "./io.mjs";
import {
  CANVASKIT_VERSION,
  canvasKit,
  createManagedAnimation,
  loadAssets,
} from "./render.mjs";

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function quantize(value) {
  return Math.round(value * 1e6) / 1e6;
}

// alpha >= alphaThreshold is occupied. 128 is the half-coverage boundary — the geometrically
// correct edge for antialiased fills. The mask records which layer drew a pixel, never what
// color it drew, so two fills that differ by one unit stay perfectly separated (unlike
// palette-based part separation, which can misattribute antialiased edge pixels).
export function maskFromRgba(rgba, width, height, alphaThreshold = 128) {
  const occupancy = new Uint8Array(width * height);
  let pixels = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let sumX = 0;
  let sumY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (rgba[index * 4 + 3] < alphaThreshold) continue;
      occupancy[index] = 1;
      pixels += 1;
      sumX += x;
      sumY += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return {
    width,
    height,
    occupancy,
    pixels,
    bbox: pixels > 0 ? [minX, minY, maxX - minX + 1, maxY - minY + 1] : null,
    centroid: pixels > 0 ? [sumX / pixels, sumY / pixels] : null,
  };
}

// Minimum, over `rays` evenly spaced angles from the centroid, of the distance to the first
// unoccupied pixel — the root radius for a gear, the inradius generally. Null when the
// centroid itself falls on an unoccupied pixel (a hollow, stroke-only ring): guessing a body
// radius for a shape with no occupied center would be a fabricated number, not a measurement.
export function inradiusPx(mask, rays = 720) {
  if (!mask.centroid) return null;
  const [cx, cy] = mask.centroid;
  const cxi = Math.round(cx);
  const cyi = Math.round(cy);
  if (cxi < 0 || cyi < 0 || cxi >= mask.width || cyi >= mask.height)
    return null;
  if (!mask.occupancy[cyi * mask.width + cxi]) return null;
  const bound = Math.max(mask.width, mask.height);
  let minDistance = bound;
  for (let index = 0; index < rays; index += 1) {
    const angle = (index / rays) * 2 * Math.PI;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let found = bound;
    for (let distance = 0; distance < bound; distance += 0.5) {
      const x = Math.round(cx + dx * distance);
      const y = Math.round(cy + dy * distance);
      if (
        x < 0 ||
        y < 0 ||
        x >= mask.width ||
        y >= mask.height ||
        !mask.occupancy[y * mask.width + x]
      ) {
        found = distance;
        break;
      }
    }
    if (found < minDistance) minDistance = found;
  }
  return minDistance;
}

// One pass over both masks' pixels. `layers[0]` (A) is the "inner" mask for a `contained`
// relation's outside_pixels; for `interlocked`/`disjoint` the two masks are interchangeable.
export function measurePair(maskA, maskB) {
  const { width, height } = maskA;
  if (!maskA.centroid || !maskB.centroid) {
    return {
      center_distance_px: null,
      axis: null,
      envelope_engagement_px: null,
      overlap_pixels: 0,
      overlap_bbox: null,
      contact_depth_px: 0,
      contact_width_px: 0,
      inradius_a_px: inradiusPx(maskA),
      inradius_b_px: inradiusPx(maskB),
      body_clearance_px: null,
      a_pixels: maskA.pixels,
      b_pixels: maskB.pixels,
      outside_pixels: maskA.pixels,
    };
  }
  const [ax, ay] = maskA.centroid;
  const [bx, by] = maskB.centroid;
  const dx = bx - ax;
  const dy = by - ay;
  const centerDistance = Math.hypot(dx, dy);
  const axisX = centerDistance > 1e-9 ? quantize(dx / centerDistance) : 0;
  const axisY = centerDistance > 1e-9 ? quantize(dy / centerDistance) : 0;
  const perpX = -axisY;
  const perpY = axisX;

  let reachA = -Infinity;
  let reachB = -Infinity;
  let overlapPixels = 0;
  let overlapMinX = Infinity;
  let overlapMinY = Infinity;
  let overlapMaxX = -Infinity;
  let overlapMaxY = -Infinity;
  let overlapProjMin = Infinity;
  let overlapProjMax = -Infinity;
  let overlapPerpMin = Infinity;
  let overlapPerpMax = -Infinity;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const inA = maskA.occupancy[index];
      const inB = maskB.occupancy[index];
      if (inA) {
        const proj = (x - ax) * axisX + (y - ay) * axisY;
        if (proj > reachA) reachA = proj;
      }
      if (inB) {
        const proj = (x - bx) * -axisX + (y - by) * -axisY;
        if (proj > reachB) reachB = proj;
      }
      if (inA && inB) {
        overlapPixels += 1;
        if (x < overlapMinX) overlapMinX = x;
        if (x > overlapMaxX) overlapMaxX = x;
        if (y < overlapMinY) overlapMinY = y;
        if (y > overlapMaxY) overlapMaxY = y;
        const projA = (x - ax) * axisX + (y - ay) * axisY;
        const projPerp = (x - ax) * perpX + (y - ay) * perpY;
        if (projA < overlapProjMin) overlapProjMin = projA;
        if (projA > overlapProjMax) overlapProjMax = projA;
        if (projPerp < overlapPerpMin) overlapPerpMin = projPerp;
        if (projPerp > overlapPerpMax) overlapPerpMax = projPerp;
      }
    }
  }
  if (reachA === -Infinity) reachA = 0;
  if (reachB === -Infinity) reachB = 0;
  const inradiusA = inradiusPx(maskA);
  const inradiusB = inradiusPx(maskB);

  return {
    center_distance_px: round3(centerDistance),
    axis: [axisX, axisY],
    envelope_engagement_px: round3(reachA + reachB - centerDistance),
    overlap_pixels: overlapPixels,
    overlap_bbox:
      overlapPixels > 0
        ? [
            overlapMinX,
            overlapMinY,
            overlapMaxX - overlapMinX + 1,
            overlapMaxY - overlapMinY + 1,
          ]
        : null,
    contact_depth_px:
      overlapPixels > 0 ? round3(overlapProjMax - overlapProjMin) : 0,
    contact_width_px:
      overlapPixels > 0 ? round3(overlapPerpMax - overlapPerpMin) : 0,
    inradius_a_px: inradiusA != null ? round3(inradiusA) : null,
    inradius_b_px: inradiusB != null ? round3(inradiusB) : null,
    body_clearance_px:
      inradiusA != null && inradiusB != null
        ? round3(centerDistance - (inradiusA + inradiusB))
        : null,
    a_pixels: maskA.pixels,
    b_pixels: maskB.pixels,
    outside_pixels: maskA.pixels - overlapPixels,
  };
}

export function summarize(measurements, keys) {
  const summary = {};
  for (const key of keys) {
    const values = measurements
      .map((measurement) => measurement[key])
      .filter((value) => typeof value === "number");
    if (!values.length) {
      summary[key] = { min: null, max: null, mean: null, distinct: 0 };
      continue;
    }
    summary[key] = {
      min: round3(Math.min(...values)),
      max: round3(Math.max(...values)),
      mean: round3(
        values.reduce((total, value) => total + value, 0) / values.length,
      ),
      distinct: new Set(values).size,
    };
  }
  return summary;
}

// The failure this catches cannot be predicted ahead of time — aliasing depends on the
// mechanism's period, not the sample count or stride — so it must be detected after the fact:
// every measured metric reporting exactly one distinct value across 3+ samples means either
// the sample stride is commensurate with the period (aliasing), or the claimed motion is
// simply not happening.
export function detectDegeneracy(summary, sampleCount) {
  if (sampleCount < 3) return false;
  const entries = Object.values(summary);
  return entries.length > 0 && entries.every((entry) => entry.distinct <= 1);
}

// measurements: per-frame records from measurePair, each additionally carrying `frame` and,
// for interlocked claims with declared body_layers, `body_overlap_pixels` from a second,
// exact pixel-overlap measurement of just the two body-layer masks.
export function evaluateClaim(claim, measurements) {
  const criteria = claim.criteria ?? {};
  const findings = [];
  if (claim.relation === "interlocked") {
    const engagementValues = measurements.map((m) => m.envelope_engagement_px);
    const overlapValues = measurements.map((m) => m.overlap_pixels);
    const minEngagement = Math.min(...engagementValues);
    const minOverlap = Math.min(...overlapValues);
    const worstEngagementFrame =
      measurements[engagementValues.indexOf(minEngagement)]?.frame;
    if (minEngagement < criteria.min_engagement_px)
      findings.push(
        `envelope_engagement_px minimum ${minEngagement} at frame ${worstEngagementFrame} is below min_engagement_px ${criteria.min_engagement_px}; contact is tangent-only`,
      );
    const minOverlapPixels = criteria.min_overlap_pixels ?? 4;
    if (minOverlap < minOverlapPixels)
      findings.push(
        `overlap_pixels minimum ${minOverlap} is below min_overlap_pixels ${minOverlapPixels}; contact is tangent-only`,
      );
    if (criteria.max_engagement_px != null) {
      const maxEngagement = Math.max(...engagementValues);
      if (maxEngagement > criteria.max_engagement_px)
        findings.push(
          `envelope_engagement_px maximum ${maxEngagement} exceeds max_engagement_px ${criteria.max_engagement_px}`,
        );
    }
    if (criteria.body_layers) {
      const bodyOverlapValues = measurements
        .map((m) => m.body_overlap_pixels)
        .filter((value) => typeof value === "number");
      const maxBodyOverlap = bodyOverlapValues.length
        ? Math.max(...bodyOverlapValues)
        : 0;
      if (maxBodyOverlap > 0)
        findings.push(
          `body_layers overlap_pixels maximum ${maxBodyOverlap} is greater than 0; bodies interpenetrate`,
        );
    } else {
      const clearanceValues = measurements
        .map((m) => m.body_clearance_px)
        .filter((value) => value != null);
      if (!clearanceValues.length) {
        findings.push(
          "body_clearance_px could not be derived from either part's occupied centroid (a hollow, stroke-only shape); declare criteria.body_layers for an exact body-overlap test instead",
        );
      } else {
        const minClearance = Math.min(...clearanceValues);
        const minBodyClearance = criteria.min_body_clearance_px ?? 0;
        if (minClearance < minBodyClearance)
          findings.push(
            `body_clearance_px minimum ${minClearance} is below min_body_clearance_px ${minBodyClearance}; bodies interpenetrate`,
          );
      }
    }
  } else if (claim.relation === "disjoint") {
    const maxOverlapPixels = criteria.max_overlap_pixels ?? 0;
    const maxOverlap = Math.max(...measurements.map((m) => m.overlap_pixels));
    if (maxOverlap > maxOverlapPixels)
      findings.push(
        `overlap_pixels maximum ${maxOverlap} exceeds max_overlap_pixels ${maxOverlapPixels}`,
      );
  } else if (claim.relation === "contained") {
    const maxOutsidePx = criteria.max_outside_px ?? 0;
    const maxOutside = Math.max(
      ...measurements.map((m) => m.outside_pixels ?? 0),
    );
    if (maxOutside > maxOutsidePx)
      findings.push(
        `outside_pixels maximum ${maxOutside} exceeds max_outside_px ${maxOutsidePx}`,
      );
  }
  return { status: findings.length ? "failed" : "valid", findings };
}

const SUMMARY_KEYS = [
  "center_distance_px",
  "envelope_engagement_px",
  "overlap_pixels",
  "body_clearance_px",
  "a_pixels",
  "b_pixels",
  "outside_pixels",
];

// Clones the animation and zeroes every other root layer's opacity, so Skottie draws only the
// named layer — including any part of it normally occluded by layers painted above. Isolation
// via opacity is chosen over deleting layers because deletion would invalidate any `ind`/
// `parent` reference; JSON.parse(JSON.stringify(...)) is used instead of structuredClone
// because this repo's eslint config declares no browser/worker globals.
export function isolateAnimation(animation, layerName) {
  const clone = JSON.parse(JSON.stringify(animation));
  const roots = clone.layers ?? [];
  const matches = roots.filter((layer) => layer?.nm === layerName);
  if (matches.length !== 1)
    throw new Error(
      `geometry layer "${layerName}" must match exactly one root layer`,
    );
  const [target] = matches;
  for (const layer of roots) if (layer !== target) layer.ks.o = { a: 0, k: 0 };
  return clone;
}

function resolveClaim(claim, frameCount) {
  const frames = claim.frames ?? {};
  const start = frames.start ?? 0;
  const count = frames.count ?? Math.min(24, frameCount);
  const stride = frames.stride ?? 1;
  const sampledFrames = Array.from(
    { length: count },
    (_, index) => start + index * stride,
  );
  const criteria = {
    alpha_threshold: 128,
    min_overlap_pixels: 4,
    min_body_clearance_px: 0,
    max_overlap_pixels: 0,
    max_outside_px: 0,
    ...claim.criteria,
  };
  return {
    ...claim,
    frames: { start, count, stride },
    sampledFrames,
    criteria,
  };
}

function pickWorstFrame(claim, measurements) {
  if (claim.relation === "interlocked") {
    const worst = measurements.reduce((min, current) =>
      current.envelope_engagement_px < min.envelope_engagement_px
        ? current
        : min,
    );
    return worst.frame;
  }
  if (claim.relation === "disjoint") {
    return measurements.reduce((max, current) =>
      current.overlap_pixels > max.overlap_pixels ? current : max,
    ).frame;
  }
  if (claim.relation === "contained") {
    return measurements.reduce((max, current) =>
      (current.outside_pixels ?? 0) > (max.outside_pixels ?? 0) ? current : max,
    ).frame;
  }
  return measurements[0].frame;
}

function canonicalMeasurement(claimId, measurement) {
  const { frame, axis, overlap_bbox: overlapBbox, ...metrics } = measurement;
  return {
    claim: claimId,
    frame,
    axis: axis ? axis.map(round3) : null,
    overlap_bbox: overlapBbox,
    ...metrics,
  };
}

export async function verifyGeometry(
  bundle,
  report,
  outputDir,
  { ck: providedCk, dryRun = false, allowLarge = false } = {},
) {
  const animation = bundle.animation;
  const geometryClaims = bundle.brief?.composition?.geometry ?? [];
  if (!geometryClaims.length)
    return {
      status: "skipped",
      reason: "brief declares no composition.geometry claims",
    };
  if ((report.features?.mattes ?? []).length)
    throw new Error(
      "track mattes are not supported by rendered-geometry verification; the isolated render cannot reproduce the matte",
    );

  const frameCount = report.frame_count;
  const resolvedClaims = geometryClaims.map((claim) =>
    resolveClaim(claim, frameCount),
  );

  const layerNames = new Set();
  let estimatedRenders = 0;
  for (const claim of resolvedClaims) {
    for (const name of claim.layers) layerNames.add(name);
    let perFrameLayers = claim.layers.length;
    if (claim.criteria.body_layers) {
      for (const name of claim.criteria.body_layers) layerNames.add(name);
      perFrameLayers += claim.criteria.body_layers.length;
    }
    estimatedRenders += claim.sampledFrames.length * perFrameLayers;
  }

  if (dryRun)
    return {
      status: "dry-run",
      claims: resolvedClaims.map((claim) => ({
        id: claim.id,
        relation: claim.relation,
        layers: claim.layers,
        frames: claim.frames,
        sampled_frames: claim.sampledFrames,
      })),
      distinct_layers: layerNames.size,
      estimated_renders: estimatedRenders,
    };

  if (estimatedRenders > LIMITS.maxIsolatedRenders && !allowLarge)
    throw new Error(
      `geometry verification estimates ${estimatedRenders} isolated renders; pass --allow-large-geometry after review`,
    );

  await mkdir(outputDir, { recursive: true });
  const kit = providedCk ?? (await canvasKit());
  const assets = await loadAssets(report.assets);
  const width = animation.w;
  const height = animation.h;
  // readPixels' `dest` parameter must be a Malloc-backed buffer, not a plain typed array —
  // passing a plain Uint8Array is silently accepted by the binding but readPixels then
  // returns null instead of writing into it or returning fresh pixels.
  const readback = kit.Malloc(Uint8Array, width * height * 4);
  const imageInfo = {
    width,
    height,
    colorType: kit.ColorType.RGBA_8888,
    alphaType: kit.AlphaType.Unpremul,
    colorSpace: kit.ColorSpace.SRGB,
  };
  const surface = kit.MakeSurface(width, height);
  if (!surface) {
    kit.Free(readback);
    throw new Error("CanvasKit could not create a software surface");
  }
  const managedByLayer = new Map();
  let compositeManaged;
  const claimResults = [];
  try {
    const canvas = surface.getCanvas();
    const managedFor = (name) => {
      if (!managedByLayer.has(name)) {
        const isolated = isolateAnimation(animation, name);
        const { managed } = createManagedAnimation(kit, isolated, assets);
        managedByLayer.set(name, managed);
      }
      return managedByLayer.get(name);
    };
    const maskAt = (name, frame, alphaThreshold) => {
      const managed = managedFor(name);
      canvas.clear(kit.TRANSPARENT);
      managed.seekFrame(frame);
      managed.render(canvas, kit.LTRBRect(0, 0, width, height));
      surface.flush();
      const rgba = canvas.readPixels(0, 0, imageInfo, readback, width * 4);
      if (!rgba)
        throw new Error(
          `could not read back pixels for layer "${name}" at frame ${frame}`,
        );
      return maskFromRgba(rgba, width, height, alphaThreshold);
    };
    const measureAt = (layerA, layerB, frame, alphaThreshold) => {
      const measurement = measurePair(
        maskAt(layerA, frame, alphaThreshold),
        maskAt(layerB, frame, alphaThreshold),
      );
      measurement.frame = frame;
      return measurement;
    };

    for (const claim of resolvedClaims) {
      const [layerA, layerB] = claim.layers;
      const alphaThreshold = claim.criteria.alpha_threshold;
      const measurements = claim.sampledFrames.map((frame) => {
        const measurement = measureAt(layerA, layerB, frame, alphaThreshold);
        if (claim.criteria.body_layers) {
          const [bodyA, bodyB] = claim.criteria.body_layers;
          measurement.body_overlap_pixels = measureAt(
            bodyA,
            bodyB,
            frame,
            alphaThreshold,
          ).overlap_pixels;
        }
        return measurement;
      });

      const summary = summarize(measurements, SUMMARY_KEYS);
      const degenerate = detectDegeneracy(summary, measurements.length);
      let probeNote = null;
      if (degenerate && claim.frames.stride > 1) {
        const probeCount = Math.min(
          claim.frames.count,
          2 * claim.frames.stride,
        );
        const probeFrames = Array.from(
          { length: probeCount },
          (_, index) => claim.frames.start + index,
        );
        const probeMeasurements = probeFrames.map((frame) =>
          measureAt(layerA, layerB, frame, alphaThreshold),
        );
        const probeSummary = summarize(probeMeasurements, SUMMARY_KEYS);
        probeNote = detectDegeneracy(probeSummary, probeMeasurements.length)
          ? `a contiguous probe of ${probeCount} frames is also constant: the geometry is static`
          : `a contiguous probe of ${probeCount} frames varies: the strided sample was aliased`;
      }

      const evaluation = evaluateClaim(claim, measurements);
      const findings = [...evaluation.findings];
      if (degenerate) {
        const base =
          claim.frames.stride > 1
            ? `composition.geometry (${claim.id}): all ${measurements.length} sampled frames at stride ${claim.frames.stride} measured identically; the sample stride may be commensurate with the mechanism period (aliasing), or the geometry may be static`
            : `composition.geometry (${claim.id}): all ${measurements.length} contiguous sampled frames measured identically; the geometry is static across the declared window`;
        findings.push(probeNote ? `${base}. ${probeNote}` : base);
      }
      const status = degenerate ? "degenerate" : evaluation.status;
      const worstFrame = pickWorstFrame(claim, measurements);

      claimResults.push({
        id: claim.id,
        relation: claim.relation,
        layers: claim.layers,
        frames: claim.frames,
        sampled_frames: claim.sampledFrames,
        criteria: claim.criteria,
        status,
        degenerate,
        measurements,
        summary,
        findings,
        worst_frame: worstFrame,
        evidence: {},
      });
    }

    const failedOrDegenerate = claimResults.filter(
      (claim) => claim.status !== "valid",
    );
    if (failedOrDegenerate.length) {
      const { managed } = createManagedAnimation(kit, animation, assets);
      compositeManaged = managed;
      const evidenceDir = path.join(outputDir, "evidence");
      for (const claim of failedOrDegenerate) {
        const claimDir = path.join(evidenceDir, claim.id);
        await mkdir(claimDir, { recursive: true });
        const frameLabel = String(claim.worst_frame).padStart(4, "0");
        canvas.clear(kit.TRANSPARENT);
        compositeManaged.seekFrame(claim.worst_frame);
        compositeManaged.render(canvas, kit.LTRBRect(0, 0, width, height));
        surface.flush();
        const compositeFile = path.join(claimDir, `frame-${frameLabel}.png`);
        await writePngFromSurface(kit, surface, compositeFile);
        const layerMasks = {};
        for (const name of claim.layers) {
          const managed = managedByLayer.get(name);
          canvas.clear(kit.TRANSPARENT);
          managed.seekFrame(claim.worst_frame);
          managed.render(canvas, kit.LTRBRect(0, 0, width, height));
          surface.flush();
          const file = path.join(claimDir, `frame-${frameLabel}-${name}.png`);
          await writePngFromSurface(kit, surface, file);
          layerMasks[name] = path.relative(outputDir, file);
        }
        claim.evidence = {
          worst_frame: claim.worst_frame,
          composite_png: path.relative(outputDir, compositeFile),
          layer_masks: layerMasks,
        };
      }
    }
  } finally {
    for (const managed of managedByLayer.values()) managed.delete();
    compositeManaged?.delete();
    surface.dispose();
    kit.Free(readback);
  }

  const canonical = claimResults.flatMap((claim) =>
    claim.measurements.map((measurement) =>
      canonicalMeasurement(claim.id, measurement),
    ),
  );
  const measurementsSha256 = sha256(JSON.stringify(canonical));
  const errors = claimResults.flatMap((claim) =>
    claim.findings.map((finding) =>
      finding.startsWith("composition.geometry")
        ? finding
        : `composition.geometry (${claim.id}): ${finding}`,
    ),
  );

  return {
    status: errors.length ? "invalid" : "valid",
    canvaskit: CANVASKIT_VERSION,
    width,
    height,
    fps: animation.fr,
    frame_count: frameCount,
    claims: claimResults,
    measurements_sha256: measurementsSha256,
    errors,
    warnings: [],
  };
}

async function writePngFromSurface(kit, surface, file) {
  const image = surface.makeImageSnapshot();
  try {
    const png = image.encodeToBytes(kit.ImageFormat.PNG, 100);
    if (!png) throw new Error(`could not encode ${file}`);
    await writeFile(file, png);
    return file;
  } finally {
    image.delete();
  }
}
