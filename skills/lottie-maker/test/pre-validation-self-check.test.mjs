import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// The self-check cites the literal fragments of the error strings `validate` (or
// `geometry`/`verify --geometry`) would report if a described defect were present. Extracting only
// the backtick-quoted spans that follow "Prevents" keeps this test from also matching the file's
// ordinary prose backticks (field names like `brief.copy`, cross-references like
// [motion-design.md](motion-design.md)) — those are not finding-fragment citations and would be
// found as trivial substrings of almost anything, defeating the point of a drift check.
const normalize = (text) => text.replace(/\s+/g, " ").trim();

function citedFragments(selfCheck) {
  const fragments = [];
  for (const match of selfCheck.matchAll(/Prevents[^:]*:\s*([^.]*)\./g)) {
    for (const quoted of match[1].matchAll(/`([^`]+)`/g))
      fragments.push(normalize(quoted[1]));
  }
  return fragments;
}

test("self-check cites only fragments that actually appear in the validator source", async () => {
  const [selfCheck, lottieSource, compositionSource, geometrySource] =
    await Promise.all([
      readFile("references/pre-validation-self-check.md", "utf8"),
      readFile("scripts/lib/lottie.mjs", "utf8"),
      readFile("scripts/lib/composition.mjs", "utf8"),
      readFile("scripts/lib/geometry.mjs", "utf8"),
    ]);
  const validatorSource = normalize(
    `${lottieSource}\n${compositionSource}\n${geometrySource}`,
  );

  const fragments = citedFragments(selfCheck);
  assert.ok(
    fragments.length >= 20,
    "self-check must cite a substantial set of finding fragments",
  );
  for (const fragment of fragments) {
    assert.ok(
      validatorSource.includes(fragment),
      `self-check cites a fragment absent from lottie.mjs/composition.mjs/geometry.mjs: ${fragment}`,
    );
  }
});

test("SKILL.md routes to the self-check before every validate in both Create and Revise", async () => {
  const skill = await readFile("SKILL.md", "utf8");
  const createSection = skill.split("## Revise")[0];
  const reviseSection = skill.split("## Revise")[1].split("## Diagnose")[0];

  for (const section of [createSection, reviseSection]) {
    assert.match(section, /pre-validation-self-check\.md/);
  }
  // The self-check must run before `validate`, not after — order the assertion against the
  // section text itself so a future edit that reorders the steps fails this test.
  const createSelfCheckIndex = createSection.indexOf(
    "pre-validation-self-check.md",
  );
  const createValidateIndex = createSection.indexOf("Validate, storyboard");
  assert.ok(createSelfCheckIndex > -1 && createValidateIndex > -1);
  assert.ok(createSelfCheckIndex < createValidateIndex);

  const reviseSelfCheckIndex = reviseSection.indexOf(
    "pre-validation-self-check.md",
  );
  const reviseValidateIndex = reviseSection.indexOf("Re-run validation");
  assert.ok(reviseSelfCheckIndex > -1 && reviseValidateIndex > -1);
  assert.ok(reviseSelfCheckIndex < reviseValidateIndex);
});

test("workflow requires a beat sheet for multi-phase motion rationale", async () => {
  const [workflow, motionDesign] = await Promise.all([
    readFile("references/workflow.md", "utf8"),
    readFile("references/motion-design.md", "utf8"),
  ]);

  assert.match(workflow, /motion\.md`.*MUST include a beat sheet/s);
  assert.match(motionDesign, /add a\s+beat sheet/);
});
