import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cli = path.resolve("scripts/lottie-maker.mjs");

async function run(args) {
  return execFileAsync(process.execPath, [cli, ...args], {
    maxBuffer: 20 * 1024 * 1024,
  });
}

test("CanvasKit renders multilingual motion deterministically", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "lottie-maker-render-"));
  await run([
    "init",
    "--id",
    "multilingual",
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
    "繁體中文 Lottie",
    "--out",
    root,
  ]);
  const result = await run([
    "verify",
    path.join(root, "multilingual"),
    "--out",
    path.join(root, "verify"),
  ]);
  const report = JSON.parse(result.stdout);

  assert.equal(report.deterministic, true);
  assert.equal(new Set(report.frame_sha256.map((item) => item.sha256)).size, 3);
  assert.equal(report.poster_sha256, report.frame_sha256.at(-1).sha256);
  assert.ok(
    (await readFile(path.join(root, "verify", "first", "poster.png"))).length >
      500,
  );
  assert.ok(
    (await readFile(path.join(root, "verify", "first", "contact-sheet.png")))
      .length > 1000,
  );
});
