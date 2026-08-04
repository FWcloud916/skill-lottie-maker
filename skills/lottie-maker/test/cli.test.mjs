import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  access,
  copyFile,
  mkdtemp,
  readFile,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cli = path.resolve("scripts/lottie-maker.mjs");

async function run(args) {
  return execFileAsync(process.execPath, [cli, ...args], {
    maxBuffer: 10 * 1024 * 1024,
  });
}

test("init dry-run is non-writing and init refuses overwrite", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "lottie-maker-cli-"));
  const args = [
    "init",
    "--id",
    "sample",
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
    "Hello 世界",
    "--out",
    root,
  ];
  const dryRun = await run([...args, "--dry-run"]);
  assert.equal(JSON.parse(dryRun.stdout).status, "dry-run");
  await assert.rejects(access(path.join(root, "sample")));

  await run(args);
  assert.match(
    await readFile(path.join(root, "sample", "brief.yaml"), "utf8"),
    /Hello 世界/,
  );
  await assert.rejects(run(args), /destination already exists/);

  const validation = await run([
    "validate",
    path.join(root, "sample"),
    "--json",
  ]);
  assert.equal(JSON.parse(validation.stdout).status, "valid");
});

test("inspect reports expressions without modifying the source", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "lottie-maker-inspect-"));
  await run([
    "init",
    "--id",
    "expression",
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
    "--out",
    root,
  ]);
  const file = path.join(root, "expression", "animation.json");
  const animation = JSON.parse(await readFile(file, "utf8"));
  animation.layers[0].ks.r.x = "time * 10";
  const source = `${JSON.stringify(animation, null, 2)}\n`;
  await writeFile(file, source);

  const inspected = await run(["inspect", file, "--json"]);
  const report = JSON.parse(inspected.stdout);
  assert.equal(report.status, "invalid");
  assert.ok(
    report.errors.some((error) =>
      error.includes("expressions are not portable"),
    ),
  );
  assert.equal(await readFile(file, "utf8"), source);
});

test("clone preserves source bytes and compare reports exact JSON paths", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "lottie-maker-clone-"));
  await run([
    "init",
    "--id",
    "source",
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
    "--out",
    root,
  ]);
  const source = path.join(root, "source", "animation.json");
  const dryRun = await run([
    "clone",
    source,
    "--id",
    "revision",
    "--out",
    root,
    "--dry-run",
  ]);
  assert.equal(JSON.parse(dryRun.stdout).status, "dry-run");
  await assert.rejects(access(path.join(root, "revision")));

  const cloned = JSON.parse(
    (await run(["clone", source, "--id", "revision", "--out", root])).stdout,
  );
  assert.equal(cloned.source_sha256, cloned.cloned_sha256);
  await access(
    path.join(root, "revision", "assets", "fonts", "NotoSansCJKtc-Regular.otf"),
  );
  const revision = path.join(root, "revision", "animation.json");
  const identical = JSON.parse(
    (await run(["compare", source, revision, "--json"])).stdout,
  );
  assert.equal(identical.status, "identical");

  const animation = JSON.parse(await readFile(revision, "utf8"));
  animation.layers[0].ks.o.k[1].t = 4;
  await writeFile(revision, `${JSON.stringify(animation, null, 2)}\n`);
  const changed = JSON.parse(
    (await run(["compare", source, revision, "--json"])).stdout,
  );
  assert.deepEqual(changed.changed_paths, ["/layers/0/ks/o/k/1/t"]);

  await assert.rejects(
    run([
      "clone",
      path.join(root, "source"),
      "--id",
      "nested-revision",
      "--out",
      path.join(root, "source"),
    ]),
    /destination must not be inside the source bundle/,
  );

  const missingFontSource = path.join(root, "missing-font.json");
  await copyFile(source, missingFontSource);
  await assert.rejects(
    run([
      "clone",
      missingFontSource,
      "--id",
      "missing-font-revision",
      "--out",
      root,
    ]),
    /unresolved assets or fonts/,
  );
  await assert.rejects(access(path.join(root, "missing-font-revision")));
});

async function runExpectingFailure(args) {
  try {
    await run(args);
    throw new Error("expected command to exit non-zero");
  } catch (error) {
    if (!error.stdout) throw error;
    return JSON.parse(error.stdout);
  }
}

test("a line separator warns on bare inspect but errors on managed validate", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "lottie-maker-newline-"));
  await run([
    "init",
    "--id",
    "newline",
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
    "Line one Line two",
    "--out",
    root,
  ]);
  const bundle = path.join(root, "newline");
  const file = path.join(bundle, "animation.json");
  const animation = JSON.parse(await readFile(file, "utf8"));
  animation.layers[0].t.d.k[0].s.t = "Line one\nLine two";
  await writeFile(file, `${JSON.stringify(animation, null, 2)}\n`);

  // Bare JSON has no brief attached, so the skill did not author it: a line separator is
  // reported as a warning, not an error, and inspect still exits 0.
  const inspectReport = JSON.parse(
    (await run(["inspect", file, "--json"])).stdout,
  );
  assert.equal(inspectReport.status, "valid");
  assert.ok(
    inspectReport.warnings.some((warning) =>
      warning.includes("line separators are not portable"),
    ),
  );
  assert.deepEqual(inspectReport.features.line_separators, [
    "/layers/0/t/d/k/0/s/t",
  ]);

  // The brief.yaml copy binding still has to match the layer text exactly for validate to
  // reach the promotion check, so keep it in sync with the edit above.
  const briefFile = path.join(bundle, "brief.yaml");
  await writeFile(
    briefFile,
    (await readFile(briefFile, "utf8")).replace(
      "Line one Line two",
      "Line one\\nLine two",
    ),
  );

  const validateReport = await runExpectingFailure([
    "validate",
    bundle,
    "--json",
  ]);
  assert.equal(validateReport.status, "invalid");
  assert.ok(
    validateReport.errors.some((error) =>
      error.includes("line separators are not portable in a managed bundle"),
    ),
  );
});

test("validate reports every independent finding when the brief's profile also fails to resolve", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "lottie-maker-partial-"));
  await run([
    "init",
    "--id",
    "partial",
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
    "--out",
    root,
  ]);
  const bundle = path.join(root, "partial");
  const briefFile = path.join(bundle, "brief.yaml");
  const brief = await readFile(briefFile, "utf8");
  // Break profile resolution (fps must be an integer) and the copy binding in the same
  // revision. Before the validateBundle decomposition, the profile-resolution throw
  // discarded the copy-binding error; both must now be reported from one validate call.
  await writeFile(
    briefFile,
    brief.replace("fps: 10", "fps: 10.5").replace("Replace me", "Renamed"),
  );

  const validateReport = await runExpectingFailure([
    "validate",
    bundle,
    "--json",
  ]);
  assert.equal(validateReport.status, "invalid");
  assert.ok(
    validateReport.errors.some((error) => error.includes("fps must be")),
  );
  assert.ok(
    validateReport.errors.some((error) =>
      error.includes("copy.title must match its named text layer"),
    ),
  );
  assert.ok(
    validateReport.errors.some((error) =>
      error.includes("profile-dependent checks were skipped"),
    ),
  );
});

test("validate rejects symlinked local assets", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "lottie-maker-symlink-"));
  await run([
    "init",
    "--id",
    "unsafe",
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
    "--out",
    root,
  ]);
  const bundle = path.join(root, "unsafe");
  const outside = path.join(root, "outside.png");
  const linked = path.join(bundle, "assets", "linked.png");
  await writeFile(outside, "not-an-image");
  await symlink(outside, linked);
  const file = path.join(bundle, "animation.json");
  const animation = JSON.parse(await readFile(file, "utf8"));
  animation.assets.push({ id: "linked", u: "assets/", p: "linked.png", e: 0 });
  await writeFile(file, `${JSON.stringify(animation, null, 2)}\n`);

  await assert.rejects(run(["validate", bundle, "--json"]), /Command failed/);
  const inspected = await run(["inspect", bundle, "--json"]);
  assert.ok(
    JSON.parse(inspected.stdout).errors.some((error) =>
      error.includes("must not be a symlink"),
    ),
  );
});
