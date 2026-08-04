import { writeFile } from "node:fs/promises";

import {
  backgroundLayer,
  layerRank,
  rectangle,
  shapeLayer,
  textLayer,
} from "../../skills/lottie-maker/scripts/lib/emit.mjs";

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

function title(name, text, x, y, size, start, options = {}) {
  return textLayer(name, text, [x, y], {
    size,
    start,
    outPoint: OP,
    font,
    justify: options.justify ?? 0,
    lineHeight: options.lineHeight,
    color: options.color ?? color.text,
    slide: { offset: options.offset ?? 26 },
  });
}

function card(name, shapes, x, y, start, options = {}) {
  return shapeLayer(name, shapes, [x, y], {
    start,
    outPoint: OP,
    slide: { offset: options.offset ?? 20 },
  });
}

function underline(width) {
  return rectangle([width, 8], {
    fill: color.accent,
    radius: 4,
    position: [width / 2, 0],
  });
}

const layers = [];

layers.push(title("title", "lottie-maker", 70, 150, 56, 0));
layers.push(card("title-underline", [underline(310)], 70, 190, 8));
layers.push(
  title("subtitle", "可攜、可驗證、可重現的 Lottie JSON", 70, 230, 28, 10, {
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
    card(
      `${step.name}Card`,
      [
        rectangle([220, 72], {
          fill: color.info,
          stroke: color.accent,
          radius: 20,
        }),
      ],
      step.x,
      400,
      step.start,
    ),
  );
  layers.push(
    title(step.name, step.label, step.x, 408, 24, step.start + 2, {
      color: color.accent,
      justify: 2,
      offset: 18,
    }),
  );
}

layers.push(backgroundLayer([W, H], { fill: color.canvas, outPoint: OP }));

layers.sort((first, second) => layerRank(first) - layerRank(second));

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
