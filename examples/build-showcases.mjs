import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  backgroundLayer,
  ellipse,
  entranceOpacity,
  rectangle,
  shapeLayer,
  textLayer,
} from "../skills/lottie-maker/scripts/lib/emit.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FONT = "Noto Sans CJK TC";
const OP = 144;
const COLORS = {
  background: [0.976, 0.98, 0.984, 1],
  foreground: [0.082, 0.145, 0.267, 1],
  card: [0.925, 0.945, 0.976, 1],
  accent: [0.082, 0.365, 0.988, 1],
  teal: [0.039, 0.55, 0.48, 1],
  coral: [0.88, 0.25, 0.25, 1],
};

function fade(start) {
  return entranceOpacity(start, {
    eased: true,
    fadeInFrames: 12,
    staticAtZero: true,
  });
}

function cardLayer(name, position, size, start, color = COLORS.accent) {
  return shapeLayer(
    name,
    [
      rectangle([Math.max(36, size[0] * 0.45), 10], {
        fill: color,
        radius: 5,
        position: [0, size[1] * 0.23],
      }),
      ellipse([30, 30], { fill: color }),
      rectangle(size, { fill: COLORS.card, radius: 18 }),
    ],
    position,
    { start, outPoint: OP, opacity: fade(start) },
  );
}

function connectorLayer(name, position, size, start, color = COLORS.accent) {
  return shapeLayer(
    name,
    [rectangle(size, { fill: color, radius: Math.min(size[0], size[1]) / 2 })],
    position,
    { start, outPoint: OP, opacity: fade(start) },
  );
}

function label(
  name,
  text,
  position,
  size = 30,
  start = 0,
  color = COLORS.foreground,
) {
  return textLayer(name, text, position, {
    size,
    start,
    outPoint: OP,
    font: FONT,
    lineHeight: size * 1.25,
    color,
    opacity: fade(start),
  });
}

function animation(name, copy, layers) {
  return {
    v: "5.12.2",
    fr: 24,
    ip: 0,
    op: OP,
    w: 1200,
    h: 675,
    nm: name,
    meta: { generator: "lottie-maker", profile: "landscape-16x9", loop: false },
    assets: [],
    fonts: {
      list: [
        {
          fName: FONT,
          fFamily: FONT,
          fStyle: "Regular",
          fPath: "assets/fonts/NotoSansCJKtc-Regular.otf",
          ascent: 75,
        },
      ],
    },
    slots: Object.fromEntries(
      Object.entries(copy).map(([key, value]) => [
        key,
        { p: { a: 0, k: value } },
      ]),
    ),
    layers: [
      ...layers,
      backgroundLayer([1200, 675], { fill: COLORS.background, outPoint: OP }),
    ],
  };
}

const profileCopy = {
  title: "One intent. Four profiles.",
  landscape: "16:9 landscape",
  portrait: "9:16 portrait",
  square: "1:1 square",
  icon: "icon",
};
const profile = animation("profile-portability", profileCopy, [
  label("title", profileCopy.title, [72, 98], 54),
  cardLayer("landscape-card", [210, 330], [250, 141], 12),
  cardLayer("portrait-card", [480, 330], [105, 187], 30),
  cardLayer("square-card", [720, 330], [160, 160], 48),
  cardLayer("icon-card", [960, 330], [105, 105], 66),
  label("landscape", profileCopy.landscape, [122, 485], 24, 12),
  label("portrait", profileCopy.portrait, [408, 485], 24, 30),
  label("square", profileCopy.square, [658, 485], 24, 48),
  label("icon", profileCopy.icon, [932, 485], 24, 66),
]);

const verifyCopy = {
  title: "Inspect. Block. Render twice.",
  source: "Lottie JSON",
  inspect: "Inspect",
  blocked: "Unsafe asset blocked",
  renderA: "Render A",
  renderB: "Render B",
  match: "SHA-256 match",
};
const verification = animation("deterministic-verification", verifyCopy, [
  label("title", verifyCopy.title, [72, 86], 50),
  cardLayer("source-card", [150, 330], [180, 110], 8),
  label("source", verifyCopy.source, [90, 405], 24, 8),
  cardLayer("inspect-card", [410, 330], [170, 110], 26, COLORS.accent),
  label("inspect", verifyCopy.inspect, [370, 405], 24, 26),
  cardLayer("blocked-card", [410, 515], [230, 80], 44, COLORS.coral),
  // 20px clearance below the card, matching source/inspect below. The previous 15px let the
  // ascender of a tall lowercase letter (e.g. "f" in "Unsafe") poke into the card above, which
  // paints in front of this layer (earlier root entries paint over later ones) and clipped it —
  // "Unsafe asset blocked" rendered as "Unsate asset blocked". Declared bounds looked fine; only
  // the rendered pixels showed the clip.
  label("blocked", verifyCopy.blocked, [288, 580], 22, 44, COLORS.coral),
  cardLayer("render-a-card", [690, 260], [170, 95], 50, COLORS.teal),
  label("renderA", verifyCopy.renderA, [638, 325], 22, 50),
  cardLayer("render-b-card", [690, 425], [170, 95], 62, COLORS.teal),
  label("renderB", verifyCopy.renderB, [638, 490], 22, 62),
  cardLayer("match-card", [990, 342], [230, 150], 82, COLORS.teal),
  label("match", verifyCopy.match, [902, 438], 26, 82, COLORS.teal),
  connectorLayer("source-to-inspect", [280, 330], [90, 8], 20),
  connectorLayer("inspect-to-blocked", [410, 422], [8, 74], 38, COLORS.coral),
  connectorLayer("inspect-to-renders", [550, 330], [110, 8], 44),
  connectorLayer("render-spine", [805, 342], [8, 165], 70, COLORS.teal),
  connectorLayer("renders-to-match", [870, 342], [120, 8], 76, COLORS.teal),
]);

writeFileSync(
  path.join(ROOT, "profile-portability", "animation.json"),
  `${JSON.stringify(profile, null, 2)}\n`,
);
writeFileSync(
  path.join(ROOT, "deterministic-verification", "animation.json"),
  `${JSON.stringify(verification, null, 2)}\n`,
);
