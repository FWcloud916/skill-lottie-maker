import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const matrix = JSON.parse(await readFile(new URL("./trigger-matrix.json", import.meta.url), "utf8"));
assert.equal(matrix.skill, "lottie-maker");
assert.ok(matrix.cases.length >= 6);
assert.ok(matrix.cases.some((item) => item.should_trigger));
assert.ok(matrix.cases.some((item) => !item.should_trigger));
for (const item of matrix.cases) {
  assert.equal(typeof item.prompt, "string");
  assert.ok(item.prompt.length > 10);
  assert.equal(typeof item.should_trigger, "boolean");
  if (item.should_trigger) assert.ok(["create", "revise", "diagnose", "render"].includes(item.route));
  else assert.equal(item.route, null);
}
process.stdout.write(`validated ${matrix.cases.length} trigger cases\n`);
