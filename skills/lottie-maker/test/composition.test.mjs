import assert from "node:assert/strict";
import test from "node:test";

import {
  validateComposition,
  validateGeometryClaims,
} from "../scripts/lib/composition.mjs";

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

test("composition measures a line-separator title as the renderer draws it, not as a false-passing per-line split", () => {
  // Regression for the silent false pass: the pinned CanvasKit/Skottie build does not honor
  // "\n" as a line break (it renders inline as a substitute glyph on one line), so splitting
  // on "\n" and taking the widest segment previously underestimated the true rendered width.
  // Two 9-character CJK segments each fit the 800-unit available width individually (432
  // units), so the old per-line-max math reported no overflow — but the renderer draws them
  // concatenated on one line (864 units), which does overflow. The fix must report that.
  const { brief, animation } = fixture();
  const checkpoint = brief.composition.checkpoints[0];
  checkpoint.blocks[0].max_lines = 2;
  animation.layers[0].t.d.k[0].s.t = "排版契約標題字九十\n更多文字內容九十個";
  const errors = validateComposition(brief, animation, profile);
  assert(errors.some((error) => error.includes("text exceeds declared width")));
});

const geometryAnimation = {
  layers: [{ nm: "gear-main" }, { nm: "gear-upper" }, { nm: "background" }],
};
const geometryProfile = { width: 720, height: 720, frameCount: 120 };

test("geometry claims are optional and legacy briefs stay compatible", () => {
  assert.deepEqual(
    validateGeometryClaims(
      { composition: {} },
      geometryAnimation,
      geometryProfile,
    ),
    [],
  );
  assert.deepEqual(
    validateGeometryClaims(null, geometryAnimation, geometryProfile),
    [],
  );
});

test("a well-formed interlocked claim passes static validation", () => {
  const brief = {
    composition: {
      geometry: [
        {
          id: "main-upper-mesh",
          relation: "interlocked",
          layers: ["gear-main", "gear-upper"],
          frames: { start: 0, count: 24 },
          criteria: { min_engagement_px: 8 },
        },
      ],
    },
  };
  assert.deepEqual(
    validateGeometryClaims(brief, geometryAnimation, geometryProfile),
    [],
  );
});

test("geometry claims reject malformed ids, relations, and layer references", () => {
  const brief = {
    composition: {
      geometry: [
        {
          id: "Bad_ID",
          relation: "interlocked",
          layers: ["gear-main", "gear-upper"],
          criteria: { min_engagement_px: 8 },
        },
        {
          id: "bad-relation",
          relation: "touching",
          layers: ["gear-main", "gear-upper"],
          criteria: {},
        },
        {
          id: "missing-layer",
          relation: "disjoint",
          layers: ["gear-main", "ghost-layer"],
        },
        {
          id: "same-layer-twice",
          relation: "disjoint",
          layers: ["gear-main", "gear-main"],
        },
      ],
    },
  };
  const errors = validateGeometryClaims(
    brief,
    geometryAnimation,
    geometryProfile,
  );
  assert(errors.some((error) => error.includes("[0].id must be kebab-case")));
  assert(errors.some((error) => error.includes("[1].relation must be")));
  assert(
    errors.some((error) =>
      error.includes(
        "[2].layers must name an existing root layer: ghost-layer",
      ),
    ),
  );
  assert(
    errors.some((error) =>
      error.includes("[3].layers must name exactly two distinct layers"),
    ),
  );
});

test("interlocked claims require min_engagement_px of at least 2px", () => {
  const brief = {
    composition: {
      geometry: [
        {
          id: "no-min",
          relation: "interlocked",
          layers: ["gear-main", "gear-upper"],
          criteria: {},
        },
        {
          id: "low-min",
          relation: "interlocked",
          layers: ["gear-main", "gear-upper"],
          criteria: { min_engagement_px: 1 },
        },
      ],
    },
  };
  const errors = validateGeometryClaims(
    brief,
    geometryAnimation,
    geometryProfile,
  );
  assert(
    errors.some((error) =>
      error.includes("[0].criteria.min_engagement_px is required"),
    ),
  );
  assert(
    errors.some((error) =>
      error.includes("[1].criteria.min_engagement_px must be at least 2px"),
    ),
  );
});

test("geometry claims reject unsupported criteria and unknown fields rather than silently ignoring them", () => {
  const brief = {
    composition: {
      geometry: [
        {
          id: "unsupported",
          relation: "disjoint",
          layers: ["gear-main", "gear-upper"],
          criteria: { min_clearance_px: 5 },
        },
        {
          id: "typo",
          relation: "disjoint",
          layers: ["gear-main", "gear-upper"],
          oops: true,
        },
      ],
    },
  };
  const errors = validateGeometryClaims(
    brief,
    geometryAnimation,
    geometryProfile,
  );
  assert(
    errors.some((error) =>
      error.includes("[0].criteria.min_clearance_px is not supported yet"),
    ),
  );
  assert(errors.some((error) => error.includes("[1]/oops: unknown field")));
});

test("geometry claim windows must stay inside the timeline and have at least 3 frames", () => {
  const brief = {
    composition: {
      geometry: [
        {
          id: "short-window",
          relation: "disjoint",
          layers: ["gear-main", "gear-upper"],
          frames: { start: 0, count: 2 },
        },
        {
          id: "outside-window",
          relation: "disjoint",
          layers: ["gear-main", "gear-upper"],
          frames: { start: 100, count: 30, stride: 1 },
        },
      ],
    },
  };
  const errors = validateGeometryClaims(
    brief,
    geometryAnimation,
    geometryProfile,
  );
  assert(
    errors.some((error) =>
      error.includes("[0].frames.count must be an integer of at least 3"),
    ),
  );
  assert(
    errors.some((error) =>
      error.includes("[1].frames must stay inside the timeline"),
    ),
  );
});

test("validateComposition surfaces geometry-claim errors alongside checkpoint errors", () => {
  const { brief, animation } = fixture();
  brief.composition.geometry = [
    {
      id: "Bad_ID",
      relation: "interlocked",
      layers: ["title", "missing"],
      criteria: {},
    },
  ];
  const errors = validateComposition(brief, animation, profile);
  assert(errors.some((error) => error.includes("composition.geometry[0]")));
});
