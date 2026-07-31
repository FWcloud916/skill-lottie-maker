import { writeFile } from "node:fs/promises";

const W = 1080;
const H = 1920;
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

function gearLayer(name, x, y, radius, start, clockwise = true, fill = color.info) {
  const rotation = {
    a: 1,
    k: [
      { t: start, s: [0], e: [clockwise ? 120 : -120] },
      { t: OP, s: [clockwise ? 120 : -120] },
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

// Act 1: JSON fragments converge into the skill name.
layers.push(textLayer("act1Title", "lottie-maker", 96, 610, 92, 0, 96));
layers.push(textLayer("act1Body", "不是把 JSON 動起來就好", 96, 780, 48, 8, 96, { color: color.muted }));
layers.push(shapeLayer("act1-code-card", [rectangle(888, 220, color.code, color.accent, 30)], 540, 1080, 4, 96));
layers.push(textLayer("act1Code", '{ "create": "portable",  "verify": "deterministic" }', 150, 1060, 25, 12, 96, { color: color.card }));
for (const [index, x] of [190, 390, 690, 880].entries()) {
  layers.push(shapeLayer(`json-fragment-${index + 1}`, [rectangle(130, 56, color.info, color.accent, 14)], x, 1430 + (index % 2) * 90, index * 3, 88, { offset: 120 - index * 18 }));
}

// Act 2: three aspect-ratio compositions share content, not geometry.
layers.push(textLayer("act2Title", "不是等比縮放", 96, 430, 76, 96, 192));
layers.push(textLayer("act2Body", "內容要回到正確層級", 96, 550, 42, 96, 192, { color: color.muted }));
const profileCards = [
  { name: "profileLandscape", label: "16:9", x: 240, y: 965, w: 300, h: 170 },
  { name: "profilePortrait", label: "9:16", x: 540, y: 965, w: 150, h: 270 },
  { name: "profileSquare", label: "1:1", x: 825, y: 965, w: 220, h: 220 },
];
for (const [index, card] of profileCards.entries()) {
  layers.push(shapeLayer(`${card.name}Card`, [rectangle(card.w, card.h, index === 1 ? color.info : color.card, color.accent, 24)], card.x, card.y, 98 + index * 4, 192, { stagger: index * 2, offset: 56 }));
  layers.push(textLayer(card.name, card.label, card.x - 48, 1190 + index * 8, 38, 104 + index * 4, 192, { color: color.accent, offset: 24 }));
}
layers.push(shapeLayer("reflow-track", [pathShape([[-350, 0], [0, 0], [300, 0]], color.accent, 6)], 540, 1375, 102, 192));

// Act 3: validation pipeline and deterministic convergence.
layers.push(textLayer("act3Title", "先要求它證明", 96, 390, 76, 192, 288));
layers.push(textLayer("act3Body", "Create  →  Inspect  →  Render A / B", 96, 560, 40, 192, 288, { color: color.muted }));
layers.push(shapeLayer("pipeline-track", [pathShape([[-340, 0], [-110, 0], [110, 0], [340, 0]], color.accent, 8)], 540, 890, 196, 288));
for (const [index, x] of [200, 430, 650, 880].entries()) {
  layers.push(shapeLayer(`pipeline-node-${index + 1}`, [rectangle(index === 3 ? 170 : 130, 94, index === 3 ? color.info : color.card, color.accent, 24)], x, 890, 198 + index * 4, 288, { offset: 36 }));
}
layers.push(textLayer("act3Hash", "SHA-256  ✓  MATCH", 255, 1110, 52, 214, 288, { color: color.accent, offset: 50 }));
layers.push(shapeLayer("blocked-card", [rectangle(780, 150, color.card, color.muted, 30)], 540, 1400, 222, 288));
layers.push(textLayer("act3Blocked", "unsafe branch   ×   blocked", 210, 1420, 38, 226, 288, { color: color.muted, offset: 24 }));

// Act 4: interlocked improvement cycle.
layers.push(textLayer("act4Title", "Skill 會循環改善", 96, 340, 72, 288, OP, { keep: true }));
layers.push(textLayer("act4Body", "Create · Revise · Diagnose · Verify", 96, 465, 38, 292, OP, { keep: true, color: color.muted }));
layers.push(gearLayer("gear-create", 350, 820, 150, 294, true, color.info));
layers.push(gearLayer("gear-revise", 644, 820, 150, 296, false, color.card));
layers.push(gearLayer("gear-diagnose", 350, 1114, 150, 298, false, color.card));
layers.push(gearLayer("gear-verify", 644, 1114, 150, 300, true, color.info));
layers.push(textLayer("act4Create", "Create", 288, 830, 34, 304, OP, { keep: true, color: color.accent, offset: 18 }));
layers.push(textLayer("act4Revise", "Revise", 583, 830, 34, 306, OP, { keep: true, color: color.accent, offset: 18 }));
layers.push(textLayer("act4Diagnose", "Diagnose", 274, 1130, 31, 308, OP, { keep: true, color: color.accent, offset: 18 }));
layers.push(textLayer("act4Verify", "Verify", 588, 1125, 34, 310, OP, { keep: true, color: color.accent, offset: 18 }));
layers.push(shapeLayer("cta-card", [rectangle(888, 178, color.info, color.accent, 32)], 540, 1515, 310, OP, { keep: true, offset: 42 }));
layers.push(textLayer("act4Cta", "先要求它證明，再要求它輸出", 168, 1530, 43, 316, OP, { keep: true, color: color.accent, offset: 24 }));
layers.push(textLayer("brand", "imfw.io  ×  lottie-maker", 96, 1770, 28, 320, OP, { keep: true, color: color.muted, offset: 16 }));

// Persistent stage rails and background sit below content.
layers.push(shapeLayer("stage-rail-left", [pathShape([[0, -720], [0, 720]], color.border, 2)], 54, 960, 0, OP, { keep: true, offset: 0 }));
layers.push(shapeLayer("stage-rail-right", [pathShape([[0, -720], [0, 720]], color.border, 2)], 1026, 960, 0, OP, { keep: true, offset: 0 }));
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
