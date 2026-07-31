import assert from "node:assert/strict";
import test from "node:test";

import { validateComposition } from "../scripts/lib/composition.mjs";

const profile = { width: 1000, height: 1000, frameCount: 100 };

function fixture() {
  return {
    brief: {
      poster_frame: 75,
      safe_area: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
      copy: { title: "排版契約" },
      composition: {
        version: 1,
        checkpoints: [
          {
            frame: 75,
            reading_order: ["title"],
            blocks: [
              {
                id: "title",
                slot: "title",
                role: "anchor",
                bounds: [0.1, 0.4, 0.8, 0.2],
                align: "left",
                max_lines: 1,
                min_font_size: 24,
              },
            ],
          },
        ],
      },
    },
    animation: {
      layers: [
        {
          ty: 5,
          nm: "title",
          ks: { p: { a: 0, k: [100, 500, 0] } },
          t: {
            d: {
              k: [{ t: 0, s: { t: "排版契約", s: 48, lh: 58 } }],
            },
          },
        },
      ],
    },
  };
}

test("composition accepts a poster checkpoint with a fitted text block", () => {
  const { brief, animation } = fixture();
  assert.deepEqual(validateComposition(brief, animation, profile), []);
});

test("composition rejects missing poster, unsafe bounds, and stale reading order", () => {
  const { brief, animation } = fixture();
  const checkpoint = brief.composition.checkpoints[0];
  checkpoint.frame = 20;
  checkpoint.reading_order = ["missing"];
  checkpoint.blocks[0].bounds = [0.01, 0.4, 0.8, 0.2];
  const errors = validateComposition(brief, animation, profile);
  assert(errors.some((error) => error.includes("poster_frame")));
  assert(errors.some((error) => error.includes("safe_area")));
  assert(errors.some((error) => error.includes("reading_order")));
});

test("composition rejects text overflow and overlapping blocks", () => {
  const { brief, animation } = fixture();
  const checkpoint = brief.composition.checkpoints[0];
  checkpoint.blocks[0].bounds = [0.1, 0.4, 0.1, 0.2];
  checkpoint.blocks.push({
    id: "badge",
    role: "support",
    bounds: [0.15, 0.45, 0.2, 0.1],
  });
  checkpoint.reading_order.push("badge");
  const errors = validateComposition(brief, animation, profile);
  assert(errors.some((error) => error.includes("text exceeds declared width")));
  assert(errors.some((error) => error.includes("overlaps title")));
});

test("composition keeps legacy briefs compatible when omitted", () => {
  const { brief, animation } = fixture();
  delete brief.composition;
  assert.deepEqual(validateComposition(brief, animation, profile), []);
});
