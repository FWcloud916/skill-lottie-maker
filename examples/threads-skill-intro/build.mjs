import { writeFile } from "node:fs/promises";

const W = 1920;
const H = 1080;
const FPS = 24;
const OP = 384;
const font = "Noto Sans CJK TC";
const color = {
  canvas: [0.976, 0.98, 0.984, 1],
  card: [1, 1, 1, 1],
  border: [0.82, 0.843, 0.878, 1],
  text: [0.118, 0.161, 0.224, 1],
  muted: [0.416, 0.447, 0.51, 1],
  accent: [0.082, 0.365, 0.988, 1],
  info: [0.937, 0.965, 1, 1],
  code: [0.157, 0.173, 0.204, 1],
};

const staticProperty = (k) => ({ a: 0, k });
const transform = (position, opacity, rotation = 0, scale = [100, 100, 100]) => ({
  o: opacity,
  r: rotation,
  p: staticProperty([...position, 0]),
  a: staticProperty([0, 0, 0]),
  s: staticProperty(scale),
});

function opacity(start, end, keep = false) {
  const keys = [];
  if (start > 0) keys.push({ t: 0, s: [0] }, { t: start, s: [0], e: [100] });
  else keys.push({ t: 0, s: [0], e: [100] });
  keys.push({ t: start + 10, s: [100] });
  if (!keep) keys.push({ t: end - 8, s: [100], e: [0] }, { t: end, s: [0] });
  return { a: 1, k: keys };
}

function animatedPosition(x, y, start, offset = 34) {
  return {
    a: 1,
    k: [
      { t: Math.max(0, start), s: [x, y + offset, 0], e: [x, y, 0] },
      { t: start + 12, s: [x, y, 0] },
    ],
  };
}

function convergingPosition(x, y, start, targetX, targetY) {
  return {
    a: 1,
    k: [
      { t: start, s: [x, y + 34, 0], e: [x, y, 0] },
      { t: start + 10, s: [x, y, 0] },
      { t: 72, s: [x, y, 0], e: [targetX, targetY, 0] },
      { t: 88, s: [targetX, targetY, 0] },
    ],
  };
}

function textLayer(name, text, x, y, size, start, end, options = {}) {
  const keep = options.keep ?? false;
  const document = {
    t: text,
    f: font,
    s: size,
    j: options.justify ?? 0,
    tr: 0,
    lh: options.lineHeight ?? Math.round(size * 1.28),
    fc: (options.color ?? color.text).slice(0, 3),
  };
  return {
    ty: 5,
    nm: name,
    ip: 0,
    op: OP,
    st: 0,
    ks: {
      o: opacity(start, end, keep),
      r: staticProperty(0),
      p: animatedPosition(x, y, start + (options.stagger ?? 0), options.offset ?? 34),
      a: staticProperty([0, 0, 0]),
      s: staticProperty([100, 100, 100]),
    },
    t: { a: [], p: {}, d: { k: [{ t: 0, s: document }] } },
  };
}

function shapeLayer(name, shapes, x, y, start, end, options = {}) {
  return {
    ty: 4,
    nm: name,
    ip: 0,
    op: OP,
    st: 0,
    ks: {
      ...transform(
        [x, y],
        opacity(start, end, options.keep ?? false),
        options.rotation ?? staticProperty(0),
        options.scale ?? [100, 100, 100],
      ),
      p: animatedPosition(x, y, start + (options.stagger ?? 0), options.offset ?? 24),
    },
    shapes,
  };
}

function rectangle(width, height, fill = color.card, stroke = color.border, radius = 28) {
  return {
    ty: "gr",
    it: [
      { ty: "rc", p: staticProperty([0, 0]), s: staticProperty([width, height]), r: staticProperty(radius) },
      { ty: "fl", c: staticProperty(fill), o: staticProperty(100) },
      { ty: "st", c: staticProperty(stroke), o: staticProperty(100), w: staticProperty(2), lc: 2, lj: 2 },
      { ty: "tr", p: staticProperty([0, 0]), a: staticProperty([0, 0]), s: staticProperty([100, 100]), r: staticProperty(0), o: staticProperty(100) },
    ],
  };
}

function pathShape(vertices, stroke = color.accent, width = 5, closed = false, fill = null) {
  const path = { i: vertices.map(() => [0, 0]), o: vertices.map(() => [0, 0]), v: vertices, c: closed };
  const items = [{ ty: "sh", ks: staticProperty(path) }];
  if (fill) items.push({ ty: "fl", c: staticProperty(fill), o: staticProperty(100) });
  items.push({ ty: "st", c: staticProperty(stroke), o: staticProperty(100), w: staticProperty(width), lc: 2, lj: 2 });
  items.push({ ty: "tr", p: staticProperty([0, 0]), a: staticProperty([0, 0]), s: staticProperty([100, 100]), r: staticProperty(0), o: staticProperty(100) });
  return { ty: "gr", it: items };
}

function gearPath(teeth, outer, root) {
  const vertices = [];
  for (let index = 0; index < teeth * 4; index += 1) {
    const phase = index % 4;
    const radius = phase === 1 || phase === 2 ? outer : root;
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / (teeth * 4);
    vertices.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return vertices;
}

function gearLayer(name, x, y, radius, start, clockwise = true, phase = 0, fill = color.info) {
  const turn = clockwise ? 120 : -120;
  const rotationStart = 300;
  const rotation = {
    a: 1,
    k: [
      { t: rotationStart, s: [phase], e: [phase + turn] },
      { t: OP, s: [phase + turn] },
    ],
  };
  const shapes = [
    pathShape(gearPath(12, radius, radius * 0.78), color.accent, 4, true, fill),
    {
      ty: "gr",
      it: [
        { ty: "el", p: staticProperty([0, 0]), s: staticProperty([radius * 0.58, radius * 0.58]) },
        { ty: "fl", c: staticProperty(color.canvas), o: staticProperty(100) },
        { ty: "st", c: staticProperty(color.accent), o: staticProperty(100), w: staticProperty(4), lc: 2, lj: 2 },
        { ty: "tr", p: staticProperty([0, 0]), a: staticProperty([0, 0]), s: staticProperty([100, 100]), r: staticProperty(0), o: staticProperty(100) },
      ],
    },
  ];
  return shapeLayer(name, shapes, x, y, start, OP, { keep: true, rotation, offset: 70 });
}

const layers = [];

// Act 1: named inputs converge into one portable bundle.
layers.push(textLayer("act1Title", "lottie-maker", 140, 250, 82, 0, 96));
layers.push(textLayer("act1Body", "不是把 JSON 動起來就好", 140, 365, 42, 8, 96, { color: color.muted }));
layers.push(shapeLayer("act1-code-card", [rectangle(1640, 180, color.code, color.accent, 30)], 960, 610, 4, 96));
layers.push(textLayer("act1Code", '{ "create": "portable",  "verify": "deterministic" }', 270, 625, 31, 12, 96, { color: color.card }));
const inputs = [
  { name: "act1Copy", label: "copy", x: 330 },
  { name: "act1Timing", label: "timing", x: 750 },
  { name: "act1Assets", label: "assets", x: 1170 },
  { name: "act1Layout", label: "layout", x: 1590 },
];
for (const [index, input] of inputs.entries()) {
  const chip = shapeLayer(`${input.name}Card`, [rectangle(260, 88, color.info, color.accent, 18)], input.x, 850, 10 + index * 3, 96, { offset: 34 });
  chip.ks.p = convergingPosition(input.x, 850, 10 + index * 3, 960, 700);
  layers.push(chip);
  const label = textLayer(input.name, input.label, input.x, 862, 30, 12 + index * 3, 96, { color: color.accent, justify: 2, offset: 34 });
  label.ks.p = convergingPosition(input.x, 862, 12 + index * 3, 960, 712);
  layers.push(label);
}

// Act 2: three aspect-ratio compositions share content, not geometry.
layers.push(textLayer("act2Title", "不是等比縮放", 140, 205, 68, 96, 192));
layers.push(textLayer("act2Body", "內容要回到正確層級", 140, 305, 38, 96, 192, { color: color.muted }));
const profileCards = [
  { name: "profileLandscape", label: "16:9", x: 430, y: 650, w: 470, h: 264 },
  { name: "profilePortrait", label: "9:16", x: 960, y: 650, w: 190, h: 338 },
  { name: "profileSquare", label: "1:1", x: 1490, y: 650, w: 300, h: 300 },
];
for (const [index, card] of profileCards.entries()) {
  layers.push(shapeLayer(`${card.name}Card`, [rectangle(card.w, card.h, index === 1 ? color.info : color.card, color.accent, 24)], card.x, card.y, 98 + index * 4, 192, { stagger: index * 2, offset: 56 }));
  layers.push(textLayer(card.name, card.label, card.x, 890, 36, 104 + index * 4, 192, { color: color.accent, justify: 2, offset: 24 }));
}
layers.push(shapeLayer("reflow-track", [pathShape([[-670, 0], [0, 0], [670, 0]], color.accent, 6)], 960, 970, 102, 192));

// Act 3: validation pipeline and deterministic convergence.
layers.push(textLayer("act3Title", "先要求它證明", 140, 180, 68, 192, 288));
layers.push(textLayer("act3Body", "Create  →  Inspect  →  Render A / B", 140, 285, 38, 192, 288, { color: color.muted }));
layers.push(shapeLayer("pipeline-track", [pathShape([[-650, 0], [-220, 0], [220, 0], [650, 0]], color.accent, 8)], 960, 530, 196, 288));
const pipeline = [
  { name: "act3Create", label: "Create", x: 310 },
  { name: "act3Inspect", label: "Inspect", x: 740 },
  { name: "act3RenderA", label: "Render A", x: 1180 },
  { name: "act3RenderB", label: "Render B", x: 1610 },
];
for (const [index, step] of pipeline.entries()) {
  layers.push(shapeLayer(`${step.name}Card`, [rectangle(220, 104, index === 3 ? color.info : color.card, color.accent, 24)], step.x, 530, 198 + index * 4, 288, { offset: 36 }));
  layers.push(textLayer(step.name, step.label, step.x, 542, 30, 202 + index * 4, 288, { color: color.accent, justify: 2, offset: 24 }));
}
layers.push(textLayer("act3Hash", "SHA-256  ✓  MATCH", 960, 745, 48, 214, 288, { color: color.accent, justify: 2, offset: 50 }));
layers.push(shapeLayer("blocked-card", [rectangle(980, 120, color.card, color.muted, 30)], 960, 925, 222, 288));
layers.push(textLayer("act3Blocked", "unsafe branch   ×   blocked", 960, 940, 34, 226, 288, { color: color.muted, justify: 2, offset: 24 }));

// Act 4: interlocked improvement cycle.
layers.push(textLayer("act4Title", "Skill 會循環改善", 140, 145, 64, 288, OP, { keep: true }));
layers.push(textLayer("act4Body", "Create · Revise · Diagnose · Verify", 140, 240, 34, 292, OP, { keep: true, color: color.muted }));
layers.push(gearLayer("gear-create", 500, 500, 143, 294, true, 0, color.info));
layers.push(gearLayer("gear-revise", 780, 500, 143, 296, false, 15, color.card));
layers.push(gearLayer("gear-diagnose", 500, 780, 143, 298, false, 15, color.card));
layers.push(gearLayer("gear-verify", 780, 780, 143, 300, true, 0, color.info));
layers.push(textLayer("act4Create", "Create", 500, 512, 30, 304, OP, { keep: true, color: color.accent, justify: 2, offset: 18 }));
layers.push(textLayer("act4Revise", "Revise", 780, 512, 30, 306, OP, { keep: true, color: color.accent, justify: 2, offset: 18 }));
layers.push(textLayer("act4Diagnose", "Diagnose", 500, 792, 28, 308, OP, { keep: true, color: color.accent, justify: 2, offset: 18 }));
layers.push(textLayer("act4Verify", "Verify", 780, 792, 30, 310, OP, { keep: true, color: color.accent, justify: 2, offset: 18 }));
layers.push(shapeLayer("cta-card", [rectangle(760, 190, color.info, color.accent, 32)], 1410, 560, 310, OP, { keep: true, offset: 42 }));
layers.push(textLayer("act4Cta", "先要求它證明，再要求它輸出", 1410, 575, 38, 316, OP, { keep: true, color: color.accent, justify: 2, offset: 24 }));
layers.push(textLayer("brand", "imfw.io  ×  lottie-maker", 1030, 875, 28, 320, OP, { keep: true, color: color.muted, offset: 16 }));

// Persistent stage rails and background sit below content.
layers.push(shapeLayer("stage-rail-left", [pathShape([[0, -420], [0, 420]], color.border, 2)], 96, 540, 0, OP, { keep: true, offset: 0 }));
layers.push(shapeLayer("stage-rail-right", [pathShape([[0, -420], [0, 420]], color.border, 2)], 1824, 540, 0, OP, { keep: true, offset: 0 }));
layers.push({
  ty: 4,
  nm: "background",
  ip: 0,
  op: OP,
  st: 0,
  ks: transform([W / 2, H / 2], staticProperty(100)),
  shapes: [rectangle(W, H, color.canvas, color.canvas, 0)],
});

layers.sort((first, second) => {
  const rank = (layer) => (layer.nm === "background" ? 2 : layer.ty === 5 ? 0 : 1);
  return rank(first) - rank(second);
});

const animation = {
  v: "5.12.2",
  fr: FPS,
  ip: 0,
  op: OP,
  w: W,
  h: H,
  nm: "Threads · lottie-maker skill intro",
  meta: { generator: "lottie-maker", profile: "custom", loop: false },
  assets: [],
  fonts: {
    list: [
      {
        fName: font,
        fFamily: font,
        fStyle: "Regular",
        fPath: "assets/fonts/NotoSansCJKtc-Regular.otf",
        ascent: 75,
      },
    ],
  },
  layers,
};

await writeFile(new URL("animation.json", import.meta.url), `${JSON.stringify(animation, null, 2)}\n`);
