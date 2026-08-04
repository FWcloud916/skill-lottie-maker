import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
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
  "hello-lottie-maker",
  "skill-improvement-gear-loop",
  "profile-portability",
  "deterministic-verification",
  "threads-skill-intro",
];

function runJson(args) {
  return JSON.parse(
    execFileSync(process.execPath, [CLI, ...args], {
      cwd: ROOT,
      encoding: "utf8",
    }),
  );
}

const EMIT_LIB = path.join(
  ROOT,
  "skills",
  "lottie-maker",
  "scripts",
  "lib",
  "emit.mjs",
);

// Builders write directly into their example directory via relative imports, so a drift
// check runs each builder against a temp copy replicating the same relative layout — the
// builder lands under a stand-in "examples/" directory, and the shared lib lands at the
// stand-in repo root one level above it, exactly as many "../" as the real import uses —
// then compares its output to the committed JSON. This proves the committed bytes are still
// what the builder produces, without touching the real files.
function checkBuilderDrift(workspace, name, builderRelativePath, outputs) {
  const builderSource = path.join(EXAMPLES, builderRelativePath);
  const tempRoot = path.join(workspace, name);
  const tempBuilder = path.join(tempRoot, builderRelativePath);
  mkdirSync(path.dirname(tempBuilder), { recursive: true });
  mkdirSync(path.join(workspace, "skills", "lottie-maker", "scripts", "lib"), {
    recursive: true,
  });
  cpSync(
    EMIT_LIB,
    path.join(
      workspace,
      "skills",
      "lottie-maker",
      "scripts",
      "lib",
      "emit.mjs",
    ),
  );
  cpSync(builderSource, tempBuilder);
  for (const relativeOutput of outputs)
    mkdirSync(path.dirname(path.join(tempRoot, relativeOutput)), {
      recursive: true,
    });
  execFileSync(process.execPath, [tempBuilder]);
  for (const relativeOutput of outputs) {
    const committed = readFileSync(path.join(EXAMPLES, relativeOutput), "utf8");
    const rebuilt = readFileSync(path.join(tempRoot, relativeOutput), "utf8");
    if (committed !== rebuilt)
      throw new Error(
        `${relativeOutput} has drifted from what ${builderRelativePath} produces; rebuild and re-review it`,
      );
  }
}

const output = mkdtempSync(path.join(os.tmpdir(), "lottie-maker-examples-"));
try {
  checkBuilderDrift(output, "hello", "hello-lottie-maker/build.mjs", [
    "hello-lottie-maker/animation.json",
  ]);
  checkBuilderDrift(output, "threads", "threads-skill-intro/build.mjs", [
    "threads-skill-intro/animation.json",
  ]);
  checkBuilderDrift(output, "showcases", "build-showcases.mjs", [
    "profile-portability/animation.json",
    "deterministic-verification/animation.json",
  ]);

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

    // Runs for every example; `geometry` itself reports status:"skipped" (not an error) when
    // a brief declares no composition.geometry claims, so this is a no-op for examples that
    // don't use the feature.
    const geometryReport = runJson([
      "geometry",
      bundle,
      "--out",
      path.join(output, `${name}-geometry`),
      "--json",
    ]);
    if (geometryReport.status === "invalid")
      throw new Error(`${name} failed rendered-geometry verification`);
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

console.log(
  `validated ${validExamples.length} deterministic examples, 1 diagnostic fixture, and 3 builders against their committed output`,
);
