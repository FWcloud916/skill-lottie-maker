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
