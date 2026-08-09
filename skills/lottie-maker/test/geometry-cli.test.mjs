import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import YAML from "yaml";

const execFileAsync = promisify(execFile);
const cli = path.resolve("scripts/lottie-maker.mjs");

async function run(args) {
  return execFileAsync(process.execPath, [cli, ...args], {
    maxBuffer: 20 * 1024 * 1024,
  });
}

async function runExpectingFailure(args) {
  try {
    await run(args);
    throw new Error("expected command to exit non-zero");
  } catch (error) {
    if (!error.stdout) throw error;
    return JSON.parse(error.stdout);
  }
}

async function initBundle(root, id) {
  await run([
    "init",
    "--id",
    id,
    "--profile",
    "custom",
    "--width",
    "320",
    "--height",
    "180",
    "--fps",
    "10",
    "--duration",
    "1",
    "--title",
    "Geometry CLI probe",
    "--out",
    root,
  ]);
  return path.join(root, id);
}

async function setGeometry(bundle, geometry) {
  const briefPath = path.join(bundle, "brief.yaml");
  const brief = YAML.parse(await readFile(briefPath, "utf8"));
  brief.composition.geometry = geometry;
  await writeFile(briefPath, YAML.stringify(brief));
}

test("geometry reports skipped and exits 0 when the brief declares no claims", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "lottie-maker-geometry-cli-"),
  );
  const bundle = await initBundle(root, "no-claims");
  const result = await run([
    "geometry",
    bundle,
    "--out",
    path.join(root, "out"),
    "--json",
  ]);
  assert.equal(JSON.parse(result.stdout).status, "skipped");
});

test("geometry requires a bundle with brief.yaml", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "lottie-maker-geometry-cli-"),
  );
  const bundle = await initBundle(root, "standalone");
  await assert.rejects(
    run([
      "geometry",
      path.join(bundle, "animation.json"),
      "--out",
      path.join(root, "out"),
    ]),
    /requires a bundle with brief\.yaml/,
  );
});

test("geometry --dry-run resolves the plan and writes nothing", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "lottie-maker-geometry-cli-"),
  );
  const bundle = await initBundle(root, "dry-run");
  await setGeometry(bundle, [
    {
      id: "title-in-background",
      relation: "contained",
      layers: ["title", "background"],
      frames: { start: 0, count: 3 },
    },
  ]);
  const outputDir = path.join(root, "out");
  const result = await run([
    "geometry",
    bundle,
    "--out",
    outputDir,
    "--dry-run",
    "--json",
  ]);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "dry-run");
  assert.equal(report.estimated_renders, 6);
  await assert.rejects(access(outputDir));
});

test("geometry passes a contained claim and writes geometry-report.json", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "lottie-maker-geometry-cli-"),
  );
  const bundle = await initBundle(root, "contained");
  await setGeometry(bundle, [
    {
      id: "title-in-background",
      relation: "contained",
      layers: ["title", "background"],
      frames: { start: 0, count: 3 },
    },
  ]);
  const outputDir = path.join(root, "out");
  const result = await run(["geometry", bundle, "--out", outputDir, "--json"]);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "valid");
  const written = JSON.parse(
    await readFile(path.join(outputDir, "geometry-report.json"), "utf8"),
  );
  assert.equal(written.measurements_sha256, report.measurements_sha256);
});

test("geometry fails a disjoint claim between overlapping layers and exits 1", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "lottie-maker-geometry-cli-"),
  );
  const bundle = await initBundle(root, "overlapping");
  await setGeometry(bundle, [
    {
      id: "title-vs-background",
      relation: "disjoint",
      layers: ["title", "background"],
      frames: { start: 0, count: 3 },
    },
  ]);
  const report = await runExpectingFailure([
    "geometry",
    bundle,
    "--out",
    path.join(root, "out"),
    "--json",
  ]);
  assert.equal(report.status, "invalid");
  assert.ok(report.errors.some((error) => error.includes("overlap_pixels")));
});

test("--frames overrides every claim's sampling window", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "lottie-maker-geometry-cli-"),
  );
  const bundle = await initBundle(root, "frames-override");
  await setGeometry(bundle, [
    {
      id: "title-in-background",
      relation: "contained",
      layers: ["title", "background"],
      frames: { start: 0, count: 3 },
    },
  ]);
  const result = await run([
    "geometry",
    bundle,
    "--out",
    path.join(root, "out"),
    "--dry-run",
    "--json",
    "--frames",
    "1:5:2",
  ]);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.claims[0].frames, { start: 1, count: 5, stride: 2 });
  assert.deepEqual(report.claims[0].sampled_frames, [1, 3, 5, 7, 9]);
});

test("verify --geometry merges the geometry pass into verify-report.json", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "lottie-maker-geometry-cli-"),
  );
  const bundle = await initBundle(root, "verify-geometry");
  await setGeometry(bundle, [
    {
      id: "title-in-background",
      relation: "contained",
      layers: ["title", "background"],
      frames: { start: 0, count: 3 },
    },
  ]);
  const outputDir = path.join(root, "verify-out");
  const result = await run([
    "verify",
    bundle,
    "--out",
    outputDir,
    "--geometry",
  ]);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "valid");
  assert.equal(report.deterministic, true);
  assert.equal(report.geometry.status, "valid");
});

// --- connected claims measure against the target's rendered pixels ---

async function injectConnectorAndTarget(bundle) {
  const animationPath = path.join(bundle, "animation.json");
  const animation = JSON.parse(await readFile(animationPath, "utf8"));
  const staticKs = {
    o: { a: 0, k: 100 },
    r: { a: 0, k: 0 },
    p: { a: 0, k: [0, 0, 0] },
    a: { a: 0, k: [0, 0, 0] },
    s: { a: 0, k: [100, 100, 100] },
  };
  const transform = {
    ty: "tr",
    p: { a: 0, k: [0, 0] },
    a: { a: 0, k: [0, 0] },
    s: { a: 0, k: [100, 100] },
    r: { a: 0, k: 0 },
    o: { a: 0, k: 100 },
  };
  // Target: a 40x40 filled square centered at (200, 90) -> spans x 180..220.
  const target = {
    ddd: 0,
    ty: 4,
    nm: "target",
    sr: 1,
    ks: { ...staticKs, p: { a: 0, k: [200, 90, 0] } },
    ip: 0,
    op: animation.op,
    st: 0,
    shapes: [
      {
        ty: "gr",
        it: [
          {
            ty: "rc",
            p: { a: 0, k: [0, 0] },
            s: { a: 0, k: [40, 40] },
            r: { a: 0, k: 0 },
          },
          { ty: "fl", c: { a: 0, k: [0.1, 0.2, 0.3, 1] }, o: { a: 0, k: 100 } },
          transform,
        ],
      },
    ],
  };
  // Connector: an open stroke from (50, 90) to (180, 90); its end lands exactly on the
  // target's left edge, its start sits 130px away.
  const connector = {
    ddd: 0,
    ty: 4,
    nm: "connector",
    sr: 1,
    ks: staticKs,
    ip: 0,
    op: animation.op,
    st: 0,
    shapes: [
      {
        ty: "gr",
        it: [
          {
            ty: "sh",
            ks: {
              a: 0,
              k: {
                c: false,
                v: [
                  [50, 90],
                  [180, 90],
                ],
                i: [
                  [0, 0],
                  [0, 0],
                ],
                o: [
                  [0, 0],
                  [0, 0],
                ],
              },
            },
          },
          {
            ty: "st",
            c: { a: 0, k: [0.1, 0.2, 0.3, 1] },
            o: { a: 0, k: 100 },
            w: { a: 0, k: 4 },
            lc: 2,
            lj: 2,
          },
          transform,
        ],
      },
    ],
  };
  animation.layers.unshift(connector, target);
  await writeFile(animationPath, JSON.stringify(animation));
}

test("a connected claim passes at the declared endpoint and fails at the far end", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "lottie-maker-geometry-cli-"),
  );
  const bundle = await initBundle(root, "connected");
  await injectConnectorAndTarget(bundle);
  await setGeometry(bundle, [
    {
      id: "end-touches-target",
      relation: "connected",
      layers: ["connector", "target"],
      frames: { start: 0, count: 3 },
      criteria: { ends: "end", max_gap_px: 3 },
    },
    {
      id: "start-should-not-touch",
      relation: "connected",
      layers: ["connector", "target"],
      frames: { start: 0, count: 3 },
      criteria: { ends: "start", max_gap_px: 3 },
    },
  ]);
  const report = await runExpectingFailure([
    "geometry",
    bundle,
    "--out",
    path.join(root, "out"),
    "--json",
  ]);
  assert.equal(report.status, "invalid");
  const byId = Object.fromEntries(
    report.claims.map((claim) => [claim.id, claim]),
  );
  assert.equal(byId["end-touches-target"].status, "valid");
  assert.equal(byId["end-touches-target"].degenerate, false);
  assert.equal(byId["start-should-not-touch"].status, "failed");
  assert.ok(report.errors.some((error) => error.includes("gap_start_px")));
});
