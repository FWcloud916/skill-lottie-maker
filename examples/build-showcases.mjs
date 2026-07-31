import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FONT = "Noto Sans CJK TC";
const COLORS = {
  background: [0.976, 0.98, 0.984, 1],
  foreground: [0.082, 0.145, 0.267, 1],
  card: [0.925, 0.945, 0.976, 1],
  accent: [0.082, 0.365, 0.988, 1],
  teal: [0.039, 0.55, 0.48, 1],
  coral: [0.88, 0.25, 0.25, 1],
};

function opacity(start = 0) {
  if (start === 0) return { a: 0, k: 100 };
  return {
    a: 1,
    k: [
      {
        t: start,
        s: [0],
        e: [100],
        i: { x: [0.667], y: [1] },
        o: { x: [0.333], y: [0] },
      },
      { t: start + 12, s: [100] },
    ],
  };
}

function transform(position, start = 0) {
  return {
    o: opacity(start),
    r: { a: 0, k: 0 },
    p: { a: 0, k: [...position, 0] },
    a: { a: 0, k: [0, 0, 0] },
    s: { a: 0, k: [100, 100, 100] },
  };
}

function group(shape, color) {
  return {
    ty: "gr",
    it: [
      shape,
      { ty: "fl", c: { a: 0, k: color }, o: { a: 0, k: 100 } },
      {
        ty: "tr",
        p: { a: 0, k: [0, 0] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] },
        r: { a: 0, k: 0 },
        o: { a: 0, k: 100 },
      },
    ],
  };
}

function rect(size, radius = 18, position = [0, 0]) {
  return {
    ty: "rc",
    p: { a: 0, k: position },
    s: { a: 0, k: size },
    r: { a: 0, k: radius },
  };
}

function ellipse(size, position = [0, 0]) {
  return { ty: "el", p: { a: 0, k: position }, s: { a: 0, k: size } };
}

function cardLayer(name, position, size, start, color = COLORS.accent) {
  return {
    ty: 4,
    nm: name,
    ip: 0,
    op: 144,
    st: 0,
    ks: transform(position, start),
    shapes: [
      group(
        rect([Math.max(36, size[0] * 0.45), 10], 5, [0, size[1] * 0.23]),
        color,
      ),
      group(ellipse([30, 30]), color),
      group(rect(size), COLORS.card),
    ],
  };
}

function connectorLayer(name, position, size, start, color = COLORS.accent) {
  return {
    ty: 4,
    nm: name,
    ip: 0,
    op: 144,
    st: 0,
    ks: transform(position, start),
    shapes: [group(rect(size, Math.min(size[0], size[1]) / 2), color)],
  };
}

function textLayer(
  name,
  text,
  position,
  size = 30,
  start = 0,
  color = COLORS.foreground,
) {
  return {
    ty: 5,
    nm: name,
    ip: 0,
    op: 144,
    st: 0,
    ks: transform(position, start),
    t: {
      a: [],
      p: {},
      d: {
        k: [
          {
            t: 0,
            s: {
              t: text,
              f: FONT,
              s: size,
              j: 0,
              tr: 0,
              lh: size * 1.25,
              fc: color.slice(0, 3),
            },
          },
        ],
      },
    },
  };
}

function background() {
  return {
    ty: 4,
    nm: "background",
    ip: 0,
    op: 144,
    st: 0,
    ks: transform([600, 337.5]),
    shapes: [group(rect([1200, 675], 0), COLORS.background)],
  };
}

function animation(name, copy, layers) {
  return {
    v: "5.12.2",
    fr: 24,
    ip: 0,
    op: 144,
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
    layers: [...layers, background()],
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
  textLayer("title", profileCopy.title, [72, 98], 54),
  cardLayer("landscape-card", [210, 330], [250, 141], 12),
  cardLayer("portrait-card", [480, 330], [105, 187], 30),
  cardLayer("square-card", [720, 330], [160, 160], 48),
  cardLayer("icon-card", [960, 330], [105, 105], 66),
  textLayer("landscape", profileCopy.landscape, [122, 485], 24, 12),
  textLayer("portrait", profileCopy.portrait, [408, 485], 24, 30),
  textLayer("square", profileCopy.square, [658, 485], 24, 48),
  textLayer("icon", profileCopy.icon, [932, 485], 24, 66),
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
  textLayer("title", verifyCopy.title, [72, 86], 50),
  cardLayer("source-card", [150, 330], [180, 110], 8),
  textLayer("source", verifyCopy.source, [90, 405], 24, 8),
  cardLayer("inspect-card", [410, 330], [170, 110], 26, COLORS.accent),
  textLayer("inspect", verifyCopy.inspect, [370, 405], 24, 26),
  cardLayer("blocked-card", [410, 515], [230, 80], 44, COLORS.coral),
  textLayer("blocked", verifyCopy.blocked, [288, 570], 22, 44, COLORS.coral),
  cardLayer("render-a-card", [690, 260], [170, 95], 50, COLORS.teal),
  textLayer("renderA", verifyCopy.renderA, [638, 325], 22, 50),
  cardLayer("render-b-card", [690, 425], [170, 95], 62, COLORS.teal),
  textLayer("renderB", verifyCopy.renderB, [638, 490], 22, 62),
  cardLayer("match-card", [990, 342], [230, 150], 82, COLORS.teal),
  textLayer("match", verifyCopy.match, [902, 438], 26, 82, COLORS.teal),
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
