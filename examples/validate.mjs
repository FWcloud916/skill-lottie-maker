import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(
  ROOT,
  "skills",
  "lottie-maker",
  "scripts",
  "lottie-maker.mjs",
);
const EXAMPLES = path.join(ROOT, "examples");
const validExamples = [
  "skill-improvement-gear-loop",
  "profile-portability",
  "deterministic-verification",
];

function runJson(args) {
  return JSON.parse(
    execFileSync(process.execPath, [CLI, ...args], {
      cwd: ROOT,
      encoding: "utf8",
    }),
  );
}

const output = mkdtempSync(path.join(os.tmpdir(), "lottie-maker-examples-"));
try {
  for (const name of validExamples) {
    const bundle = path.join(EXAMPLES, name);
    const validation = runJson(["validate", bundle, "--json"]);
    if (validation.status !== "valid")
      throw new Error(`${name} failed validation`);
    const verification = runJson([
      "verify",
      bundle,
      "--out",
      path.join(output, name),
    ]);
    if (!verification.deterministic)
      throw new Error(`${name} failed deterministic verification`);
  }

  const fixture = runJson([
    "inspect",
    path.join(EXAMPLES, "fixtures", "unsafe-remote-asset.json"),
    "--json",
  ]);
  if (
    fixture.status !== "invalid" ||
    !fixture.features.remote_urls.includes("/assets/0/u")
  ) {
    throw new Error(
      "unsafe remote asset fixture was not rejected at /assets/0/u",
    );
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}

console.log("validated 3 deterministic examples and 1 diagnostic fixture");
