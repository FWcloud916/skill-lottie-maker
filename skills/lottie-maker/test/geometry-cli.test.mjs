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
