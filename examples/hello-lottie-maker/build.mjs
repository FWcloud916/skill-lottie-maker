import { writeFile } from "node:fs/promises";

const W = 960;
const H = 540;
const FPS = 24;
const OP = 96;
const font = "Noto Sans CJK TC";
const color = {
  canvas: [0.976, 0.98, 0.984, 1],
  card: [1, 1, 1, 1],
  border: [0.82, 0.843, 0.878, 1],
  text: [0.118, 0.161, 0.224, 1],
  muted: [0.416, 0.447, 0.51, 1],
  accent: [0.082, 0.365, 0.988, 1],
  info: [0.937, 0.965, 1, 1],
};

const staticProperty = (k) => ({ a: 0, k });

function entranceOpacity(start) {
  const keys = [];
  if (start > 0) keys.push({ t: 0, s: [0] }, { t: start, s: [0], e: [100] });
  else keys.push({ t: 0, s: [0], e: [100] });
  keys.push({ t: start + 10, s: [100] });
  return { a: 1, k: keys };
}

function animatedPosition(x, y, start, offset = 26) {
  return {
    a: 1,
    k: [
      { t: Math.max(0, start), s: [x, y + offset, 0], e: [x, y, 0] },
      { t: start + 12, s: [x, y, 0] },
    ],
  };
}

function textLayer(name, text, x, y, size, start, options = {}) {
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
      o: entranceOpacity(start),
      r: staticProperty(0),
      p: animatedPosition(x, y, start, options.offset ?? 26),
      a: staticProperty([0, 0, 0]),
      s: staticProperty([100, 100, 100]),
    },
    t: { a: [], p: {}, d: { k: [{ t: 0, s: document }] } },
  };
}

function shapeLayer(name, shapes, x, y, start, options = {}) {
  return {
    ty: 4,
    nm: name,
    ip: 0,
    op: OP,
    st: 0,
    ks: {
      o: entranceOpacity(start),
      r: staticProperty(0),
      p: animatedPosition(x, y, start, options.offset ?? 20),
      a: staticProperty([0, 0, 0]),
      s: staticProperty([100, 100, 100]),
    },
    shapes,
  };
}

function rectangle(width, height, fill, stroke, radius = 20) {
  return {
    ty: "gr",
    it: [
      {
        ty: "rc",
        p: staticProperty([0, 0]),
        s: staticProperty([width, height]),
        r: staticProperty(radius),
      },
      { ty: "fl", c: staticProperty(fill), o: staticProperty(100) },
      {
        ty: "st",
        c: staticProperty(stroke),
        o: staticProperty(100),
        w: staticProperty(2),
        lc: 2,
        lj: 2,
      },
      {
        ty: "tr",
        p: staticProperty([0, 0]),
        a: staticProperty([0, 0]),
        s: staticProperty([100, 100]),
        r: staticProperty(0),
        o: staticProperty(100),
      },
    ],
  };
}

function underline(width) {
  return {
    ty: "gr",
    it: [
      {
        ty: "rc",
        p: staticProperty([width / 2, 0]),
        s: staticProperty([width, 8]),
        r: staticProperty(4),
      },
      { ty: "fl", c: staticProperty(color.accent), o: staticProperty(100) },
      {
        ty: "tr",
        p: staticProperty([0, 0]),
        a: staticProperty([0, 0]),
        s: staticProperty([100, 100]),
        r: staticProperty(0),
        o: staticProperty(100),
      },
    ],
  };
}

const layers = [];

layers.push(textLayer("title", "lottie-maker", 70, 150, 56, 0));
layers.push(shapeLayer("title-underline", [underline(310)], 70, 190, 8));
layers.push(
  textLayer("subtitle", "可攜、可驗證、可重現的 Lottie JSON", 70, 230, 28, 10, {
    color: color.muted,
  }),
);

const steps = [
  { name: "stepCreate", label: "Create 建立", x: 240, start: 28 },
  { name: "stepValidate", label: "Validate 驗證", x: 480, start: 36 },
  { name: "stepRender", label: "Render 渲染", x: 720, start: 44 },
];
for (const step of steps) {
  layers.push(
    shapeLayer(
      `${step.name}Card`,
      [rectangle(220, 72, color.info, color.accent)],
      step.x,
      400,
      step.start,
    ),
  );
  layers.push(
    textLayer(step.name, step.label, step.x, 408, 24, step.start + 2, {
      color: color.accent,
      justify: 2,
      offset: 18,
    }),
  );
}

layers.push({
  ty: 4,
  nm: "background",
  ip: 0,
  op: OP,
  st: 0,
  ks: {
    o: staticProperty(100),
    r: staticProperty(0),
    p: staticProperty([W / 2, H / 2, 0]),
    a: staticProperty([0, 0, 0]),
    s: staticProperty([100, 100, 100]),
  },
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
  nm: "hello-lottie-maker",
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

await writeFile(
  new URL("animation.json", import.meta.url),
  `${JSON.stringify(animation, null, 2)}\n`,
);
