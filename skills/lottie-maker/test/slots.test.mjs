import assert from "node:assert/strict";
import test from "node:test";

import { validateSlots } from "../scripts/lib/lottie.mjs";

function fixture() {
  return {
    animation: {
      layers: [
        {
          ty: 5,
          nm: "title",
          t: {
            d: {
              k: [
                {
                  t: 0,
                  s: {
                    t: "Replace me",
                    f: "Noto Sans CJK TC",
                    s: 64,
                    j: 0,
                    tr: 0,
                    lh: 81,
                    fc: [0.082, 0.145, 0.267],
                  },
                },
              ],
            },
          },
        },
      ],
      slots: {
        title: { p: { a: 0, k: "Replace me" } },
      },
    },
    brief: { copy: { title: "Replace me" } },
  };
}

test("slots are inert metadata without a matching bundle", () => {
  assert.deepEqual(validateSlots(null, null), []);
});

test("legacy animations without slots stay compatible", () => {
  const { animation, brief } = fixture();
  delete animation.slots;
  assert.deepEqual(validateSlots(animation, brief), []);
});

test("a matching slot bound by layer name and verbatim brief.copy passes", () => {
  const { animation, brief } = fixture();
  assert.deepEqual(validateSlots(animation, brief), []);
});

test("a slot bound to neither a sid nor a layer name is reported", () => {
  const { animation, brief } = fixture();
  animation.slots = { subtitle: { p: { a: 0, k: "Unbound" } } };
  const errors = validateSlots(animation, brief);
  assert.deepEqual(errors, [
    "/slots/subtitle: not bound to any sid or layer name",
  ]);
});

test("a slot whose text diverges from its layer fallback is reported", () => {
  const { animation, brief } = fixture();
  animation.slots.title.p.k = "Drifted copy";
  brief.copy.title = "Drifted copy";
  const errors = validateSlots(animation, brief);
  assert.deepEqual(errors, [
    "/slots/title: does not match its layer fallback verbatim",
  ]);
});

test("a slot whose text diverges from brief.copy is reported", () => {
  const { animation, brief } = fixture();
  brief.copy.title = "Something else entirely";
  const errors = validateSlots(animation, brief);
  assert.deepEqual(errors, [
    "/slots/title: does not match brief.copy.title verbatim",
  ]);
});

test("a text-document slot missing style fields present on its layer fallback is reported", () => {
  const { animation, brief } = fixture();
  // This is the recorded production failure: substituted copy supplied only t/f/s and the
  // rendered hold was invisible because j/tr/lh/fc were missing.
  animation.slots.title = { t: "Replace me", f: "Noto Sans CJK TC", s: 64 };
  brief.copy.title = "Replace me";
  const errors = validateSlots(animation, brief);
  assert.deepEqual(errors, [
    "/slots/title: text document is missing style fields present on its layer fallback: j, tr, lh, fc",
  ]);
});

test("a slot bound via sid is accepted without a matching layer name", () => {
  const { animation } = fixture();
  animation.layers.push({
    ty: 4,
    nm: "accent",
    shapes: [
      {
        ty: "gr",
        it: [{ ty: "fl", c: { a: 0, sid: "accent", k: [0, 0, 0] } }],
      },
    ],
  });
  animation.slots.accent = { p: { a: 0, k: "ignored" } };
  const errors = validateSlots(animation, null);
  assert.deepEqual(
    errors.filter((error) => error.startsWith("/slots/accent")),
    [],
  );
});

test("an unrecognized slot value shape is reported", () => {
  const { animation, brief } = fixture();
  animation.slots.title = { unexpected: true };
  const errors = validateSlots(animation, brief);
  assert.deepEqual(errors, [
    "/slots/title: must be a string property ({p:{k:string}}) or a text document",
  ]);
});
