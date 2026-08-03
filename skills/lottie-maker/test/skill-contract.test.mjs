import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("fail closed retains bundle evidence and separates cleanup", async () => {
  const [skill, workflow, guide] = await Promise.all([
    readFile("SKILL.md", "utf8"),
    readFile("references/workflow.md", "utf8"),
    readFile("../../docs/lottie-production-guide.md", "utf8"),
  ]);
  const normalizedGuide = guide.replace(/\s+/g, " ");

  assert.match(skill, /fail closed means the bundle is not complete/);
  assert.match(skill, /Treat that failed bundle as immutable evidence/);
  assert.match(
    skill,
    /retry or continue the current\s+revision, clone the failed bundle/,
  );
  assert.match(skill, /restart, clone the\s+unchanged original/);
  assert.match(skill, /Neither request authorizes replacing retained\s+files/);
  assert.match(skill, /MUST NOT delete, move, truncate, or overwrite/);
  assert.match(skill, /confirmation naming the exact targets/);
  assert.match(workflow, /retain the bundle and all completed/);
  assert.match(
    workflow,
    /request to retry, revise, diagnose, or restart does not/,
  );
  assert.match(
    workflow,
    /cloning the failed bundle to a new absent kebab-case destination/,
  );
  assert.match(workflow, /Restart by cloning\s+the unchanged original/);
  assert.match(guide, /### Fail closed is not cleanup/);
  assert.match(
    normalizedGuide,
    /Retrying, revising, diagnosing, or starting another bundle never implies cleanup or replacement/,
  );
  assert.match(
    normalizedGuide,
    /retry clones the failed bundle into a new destination/,
  );
  assert.match(normalizedGuide, /restart clones the unchanged original/);
});
