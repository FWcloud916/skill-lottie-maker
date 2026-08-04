import assert from "node:assert/strict";
import { access, cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { inspectAnimation, loadBundle } from "../scripts/lib/lottie.mjs";
import {
  detectDegeneracy,
  evaluateClaim,
  inradiusPx,
  isolateAnimation,
  maskFromRgba,
  measurePair,
  summarize,
  verifyGeometry,
} from "../scripts/lib/geometry.mjs";

const WIDTH = 300;
const HEIGHT = 200;

function discRgba(cx, cy, radius, { width = WIDTH, height = HEIGHT } = {}) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const inside = Math.hypot(x - cx, y - cy) <= radius;
      rgba[(y * width + x) * 4 + 3] = inside ? 255 : 0;
    }
  }
  return rgba;
}

function ringRgba(
  cx,
  cy,
  outer,
  inner,
  { width = WIDTH, height = HEIGHT } = {},
) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const distance = Math.hypot(x - cx, y - cy);
      const inside = distance <= outer && distance >= inner;
      rgba[(y * width + x) * 4 + 3] = inside ? 255 : 0;
    }
  }
  return rgba;
}

function discMask(cx, cy, radius) {
  return maskFromRgba(discRgba(cx, cy, radius), WIDTH, HEIGHT);
}

test("maskFromRgba derives occupancy, pixel count, bbox, and centroid from alpha", () => {
  const mask = discMask(100, 100, 30);
  assert.ok(mask.pixels > 0);
  assert.ok(Math.abs(mask.centroid[0] - 100) < 1);
  assert.ok(Math.abs(mask.centroid[1] - 100) < 1);
  const [x, y, w, h] = mask.bbox;
  assert.ok(x <= 70 && y <= 70 && x + w >= 130 && y + h >= 130);
});

test("maskFromRgba reports zero pixels and null bbox/centroid for an empty frame", () => {
  const mask = maskFromRgba(
    new Uint8ClampedArray(WIDTH * HEIGHT * 4),
    WIDTH,
    HEIGHT,
  );
  assert.equal(mask.pixels, 0);
  assert.equal(mask.bbox, null);
  assert.equal(mask.centroid, null);
});

test("inradiusPx measures a filled disc's radius and is null for a hollow ring", () => {
  const solid = discMask(100, 100, 50);
  assert.ok(Math.abs(inradiusPx(solid) - 50) < 2);

  const hollow = maskFromRgba(ringRgba(100, 100, 50, 40), WIDTH, HEIGHT);
  assert.equal(inradiusPx(hollow), null);
});

test("measurePair separates tangent-only contact from interpenetration", () => {
  // Two r=50 discs 99px apart: envelope engagement = 50+50-99 = 1, tangent-only.
  const tangent = measurePair(discMask(100, 100, 50), discMask(199, 100, 50));
  assert.ok(Math.abs(tangent.envelope_engagement_px - 1) < 1);
  assert.ok(tangent.overlap_pixels < 4);

  // Two r=50 discs 60px apart: bodies interpenetrate by roughly 40px.
  const interpenetrating = measurePair(
    discMask(100, 100, 50),
    discMask(160, 100, 50),
  );
  assert.ok(interpenetrating.envelope_engagement_px > 35);
  assert.ok(interpenetrating.body_clearance_px < -30);
  assert.ok(interpenetrating.overlap_pixels > 100);

  // Two r=50 discs 205px apart: fully disjoint, no envelope overlap at all.
  const disjoint = measurePair(discMask(50, 100, 50), discMask(255, 100, 50));
  assert.ok(disjoint.envelope_engagement_px < 0);
  assert.equal(disjoint.overlap_pixels, 0);
});

test("measurePair computes outside_pixels for a contained relation", () => {
  const inner = discMask(150, 100, 20);
  const outer = discMask(150, 100, 60);
  const contained = measurePair(inner, outer);
  assert.equal(contained.outside_pixels, 0);

  const partiallyOutside = measurePair(discMask(210, 100, 20), outer);
  assert.ok(partiallyOutside.outside_pixels > 0);
});

test("summarize and detectDegeneracy flag zero variance across a contiguous window", () => {
  const constantMeasurements = Array.from({ length: 12 }, (_, index) => ({
    frame: index,
    envelope_engagement_px: 1.58,
    overlap_pixels: 0,
  }));
  const constantSummary = summarize(constantMeasurements, [
    "envelope_engagement_px",
    "overlap_pixels",
  ]);
  assert.equal(constantSummary.envelope_engagement_px.distinct, 1);
  assert.equal(
    detectDegeneracy(constantSummary, constantMeasurements.length),
    true,
  );

  const varyingMeasurements = Array.from({ length: 12 }, (_, index) => ({
    frame: index,
    envelope_engagement_px: 1.5 + index * 0.3,
    overlap_pixels: index,
  }));
  const varyingSummary = summarize(varyingMeasurements, [
    "envelope_engagement_px",
    "overlap_pixels",
  ]);
  assert.equal(
    detectDegeneracy(varyingSummary, varyingMeasurements.length),
    false,
  );
});

test("detectDegeneracy does not fire below 3 samples", () => {
  const measurements = [
    { envelope_engagement_px: 1 },
    { envelope_engagement_px: 1 },
  ];
  const summary = summarize(measurements, ["envelope_engagement_px"]);
  assert.equal(detectDegeneracy(summary, measurements.length), false);
});

test("evaluateClaim fails an interlocked claim on tangent-only contact and passes a real mesh", () => {
  const tangentMeasurements = [
    {
      frame: 0,
      envelope_engagement_px: 1.52,
      overlap_pixels: 1,
      body_clearance_px: 40,
    },
    {
      frame: 1,
      envelope_engagement_px: 1.61,
      overlap_pixels: 2,
      body_clearance_px: 40,
    },
  ];
  const claim = {
    relation: "interlocked",
    criteria: { min_engagement_px: 8 },
  };
  const tangentResult = evaluateClaim(claim, tangentMeasurements);
  assert.equal(tangentResult.status, "failed");
  assert.ok(
    tangentResult.findings.some((finding) => finding.includes("tangent-only")),
  );

  const meshedMeasurements = [
    {
      frame: 0,
      envelope_engagement_px: 35,
      overlap_pixels: 400,
      body_clearance_px: 24,
    },
    {
      frame: 1,
      envelope_engagement_px: 38,
      overlap_pixels: 420,
      body_clearance_px: 26,
    },
  ];
  assert.equal(evaluateClaim(claim, meshedMeasurements).status, "valid");
});

test("evaluateClaim fails an interlocked claim on body interpenetration", () => {
  const claim = { relation: "interlocked", criteria: { min_engagement_px: 8 } };
  const measurements = [
    {
      frame: 0,
      envelope_engagement_px: 35,
      overlap_pixels: 400,
      body_clearance_px: -10,
    },
  ];
  const result = evaluateClaim(claim, measurements);
  assert.equal(result.status, "failed");
  assert.ok(
    result.findings.some((finding) => finding.includes("interpenetrate")),
  );
});

test("evaluateClaim uses exact body-layer overlap when body_layers is declared", () => {
  const claim = {
    relation: "interlocked",
    criteria: { min_engagement_px: 8, body_layers: ["hub-a", "hub-b"] },
  };
  const clean = evaluateClaim(claim, [
    {
      frame: 0,
      envelope_engagement_px: 35,
      overlap_pixels: 400,
      body_overlap_pixels: 0,
    },
  ]);
  assert.equal(clean.status, "valid");

  const interpenetrating = evaluateClaim(claim, [
    {
      frame: 0,
      envelope_engagement_px: 35,
      overlap_pixels: 400,
      body_overlap_pixels: 12,
    },
  ]);
  assert.equal(interpenetrating.status, "failed");
  assert.ok(
    interpenetrating.findings.some((finding) =>
      finding.includes("body_layers"),
    ),
  );
});

test("evaluateClaim flags a hollow part with no declared body_layers as fail closed", () => {
  const claim = { relation: "interlocked", criteria: { min_engagement_px: 8 } };
  const measurements = [
    {
      frame: 0,
      envelope_engagement_px: 35,
      overlap_pixels: 400,
      body_clearance_px: null,
    },
  ];
  const result = evaluateClaim(claim, measurements);
  assert.equal(result.status, "failed");
  assert.ok(result.findings.some((finding) => finding.includes("body_layers")));
});

test("evaluateClaim handles disjoint and contained relations", () => {
  const disjointClaim = { relation: "disjoint", criteria: {} };
  assert.equal(
    evaluateClaim(disjointClaim, [{ overlap_pixels: 0 }]).status,
    "valid",
  );
  assert.equal(
    evaluateClaim(disjointClaim, [{ overlap_pixels: 3 }]).status,
    "failed",
  );

  const containedClaim = { relation: "contained", criteria: {} };
  assert.equal(
    evaluateClaim(containedClaim, [{ outside_pixels: 0 }]).status,
    "valid",
  );
  assert.equal(
    evaluateClaim(containedClaim, [{ outside_pixels: 5 }]).status,
    "failed",
  );
});

const GEAR_LOOP_SOURCE = path.resolve(
  "../../examples/skill-improvement-gear-loop",
);

async function copyGearLoopBundle(geometryClaims) {
  const root = await mkdtemp(path.join(os.tmpdir(), "lottie-maker-geometry-"));
  const bundle = path.join(root, "gear-loop");
  await cp(GEAR_LOOP_SOURCE, bundle, { recursive: true });
  const briefPath = path.join(bundle, "brief.yaml");
  const brief = YAML.parse(await readFile(briefPath, "utf8"));
  brief.composition = { version: 1, geometry: geometryClaims };
  await writeFile(briefPath, YAML.stringify(brief));
  return bundle;
}

async function loadReport(bundlePath) {
  const bundle = await loadBundle(bundlePath);
  const report = await inspectAnimation(bundle);
  return { bundle, report };
}

test("isolateAnimation requires exactly one matching root layer", () => {
  const animation = {
    layers: [
      { nm: "a", ks: { o: { a: 0, k: 100 } } },
      { nm: "b", ks: { o: { a: 0, k: 100 } } },
      { nm: "b", ks: { o: { a: 0, k: 100 } } },
    ],
  };
  assert.throws(() => isolateAnimation(animation, "missing"), /exactly one/);
  assert.throws(() => isolateAnimation(animation, "b"), /exactly one/);
  const isolated = isolateAnimation(animation, "a");
  assert.deepEqual(isolated.layers[0].ks.o, { a: 0, k: 100 });
  assert.deepEqual(isolated.layers[1].ks.o, { a: 0, k: 0 });
});

test("geometry verification is skipped when the brief declares no claims", async () => {
  const noClaimsSource = path.resolve("../../examples/hello-lottie-maker");
  const { bundle, report } = await loadReport(noClaimsSource);
  const result = await verifyGeometry(bundle, report, "/unused", {});
  assert.equal(result.status, "skipped");
});

test("dry-run resolves the plan without writing files", async () => {
  const bundlePath = await copyGearLoopBundle([
    {
      id: "main-upper-mesh",
      relation: "interlocked",
      layers: ["gear-main", "gear-upper"],
      frames: { start: 0, count: 24 },
      criteria: { min_engagement_px: 8 },
    },
  ]);
  const { bundle, report } = await loadReport(bundlePath);
  const outputDir = path.join(path.dirname(bundlePath), "geometry-out");
  const result = await verifyGeometry(bundle, report, outputDir, {
    dryRun: true,
  });
  assert.equal(result.status, "dry-run");
  assert.equal(result.distinct_layers, 2);
  assert.equal(result.estimated_renders, 48);
  await assert.rejects(access(outputDir));
});

test("geometry verification refuses bundles with track mattes", async () => {
  const bundlePath = await copyGearLoopBundle([
    {
      id: "main-upper-mesh",
      relation: "interlocked",
      layers: ["gear-main", "gear-upper"],
      criteria: { min_engagement_px: 8 },
    },
  ]);
  const { bundle, report } = await loadReport(bundlePath);
  report.features.mattes = ["/layers/0"];
  await assert.rejects(
    verifyGeometry(
      bundle,
      report,
      path.join(path.dirname(bundlePath), "out"),
      {},
    ),
    /track mattes are not supported/,
  );
});

// Empirical anchor: this pins the exact historical defect this feature was built to catch —
// skill-improvement-gear-loop originally shipped with gear-main and gear-upper 223.44px apart
// (a naive-geometry envelope engagement of ~1.6px), which is tangent-only, not meshed. The
// committed example has since been corrected (see the next test), so this test hardcodes the
// original coordinates rather than reading the live file, to keep proving the tool catches a
// real production defect rather than only synthetic discs — a permanent regression fixture,
// independent of the current state of the example.
test("a reproduction of the original tangent-only gear-loop defect is caught", async () => {
  const bundlePath = await copyGearLoopBundle([
    {
      id: "main-upper-mesh",
      relation: "interlocked",
      layers: ["gear-main", "gear-upper"],
      frames: { start: 0, count: 24 },
      criteria: { min_engagement_px: 8 },
    },
  ]);
  const animationPath = path.join(bundlePath, "animation.json");
  const animation = JSON.parse(await readFile(animationPath, "utf8"));
  animation.layers.find((layer) => layer.nm === "gear-upper").ks.p.k = [
    530, 220, 0,
  ];
  await writeFile(animationPath, JSON.stringify(animation));

  const { bundle, report } = await loadReport(bundlePath);
  const outputDir = path.join(path.dirname(bundlePath), "geometry-out");
  const result = await verifyGeometry(bundle, report, outputDir, {});

  assert.equal(result.status, "invalid");
  assert.equal(result.claims[0].degenerate, false);
  const engagement = result.claims[0].summary.envelope_engagement_px;
  assert.ok(
    engagement.min > -5 && engagement.max < 5,
    `unexpectedly large engagement range: ${JSON.stringify(engagement)}`,
  );
  assert.ok(
    result.errors.some((error) => error.includes("tangent-only")),
    JSON.stringify(result.errors),
  );
  await access(path.join(outputDir, "evidence", "main-upper-mesh"));
});

// The committed example was corrected in the same change that added this feature (see
// docs/lottie-production-guide.md and the example's brief.yaml): gear-upper and gear-lower
// were moved to a real mesh distance, and three geometry claims were declared. This is the
// regression test that keeps the shipped example honest going forward.
test("the committed gear-loop example now measures a real mesh, not tangent contact", async () => {
  const { bundle, report } = await loadReport(GEAR_LOOP_SOURCE);
  const outputDir = path.join(
    await mkdtemp(path.join(os.tmpdir(), "lottie-maker-geometry-")),
    "out",
  );
  const result = await verifyGeometry(bundle, report, outputDir, {});

  assert.equal(result.status, "valid", JSON.stringify(result.errors));
  assert.equal(result.claims.length, 3);
  for (const claim of result.claims) {
    assert.equal(
      claim.status,
      "valid",
      `${claim.id}: ${JSON.stringify(claim.findings)}`,
    );
    assert.equal(
      claim.degenerate,
      false,
      `${claim.id} should not be degenerate`,
    );
  }
});

test("moving the upper gear into a real mesh produces a passing interlocked claim", async () => {
  const bundlePath = await copyGearLoopBundle([
    {
      id: "main-upper-mesh",
      relation: "interlocked",
      layers: ["gear-main", "gear-upper"],
      frames: { start: 0, count: 24 },
      criteria: { min_engagement_px: 8 },
    },
  ]);
  const animationPath = path.join(bundlePath, "animation.json");
  const animation = JSON.parse(await readFile(animationPath, "utf8"));
  const upper = animation.layers.find((layer) => layer.nm === "gear-upper");
  // gear-main sits at [360, 365]; move gear-upper from its authored tangent-only position to
  // roughly 205px away along the same bearing, matching the corrected mesh distance used in
  // the follow-up example fix.
  const mainPosition = animation.layers.find(
    (layer) => layer.nm === "gear-main",
  ).ks.p.k;
  const angle = Math.atan2(-1, 1);
  upper.ks.p.k = [
    mainPosition[0] + Math.cos(angle) * 205,
    mainPosition[1] + Math.sin(angle) * 205,
    0,
  ];
  await writeFile(animationPath, JSON.stringify(animation));

  const { bundle, report } = await loadReport(bundlePath);
  const outputDir = path.join(path.dirname(bundlePath), "geometry-out");
  const result = await verifyGeometry(bundle, report, outputDir, {});
  assert.equal(
    result.status,
    "valid",
    JSON.stringify(result.claims[0].summary, null, 2),
  );
});

test("measurements_sha256 is deterministic across repeated runs", async () => {
  const bundlePath = await copyGearLoopBundle([
    {
      id: "main-upper-mesh",
      relation: "interlocked",
      layers: ["gear-main", "gear-upper"],
      frames: { start: 0, count: 6 },
      criteria: { min_engagement_px: 8 },
    },
  ]);
  const { bundle, report } = await loadReport(bundlePath);
  const first = await verifyGeometry(
    bundle,
    report,
    path.join(path.dirname(bundlePath), "first"),
    {},
  );
  const second = await verifyGeometry(
    bundle,
    report,
    path.join(path.dirname(bundlePath), "second"),
    {},
  );
  assert.equal(first.measurements_sha256, second.measurements_sha256);
});
