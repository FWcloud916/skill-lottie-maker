// Shared Lottie JSON construction primitives. Used by createAnimation's init skeleton and by
// every example's build.mjs, so the shape of a text layer, a stroked rectangle, or an entrance
// fade is defined once instead of once per caller.

const EASE_OUT = { i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] } };

export function staticProperty(k) {
  return { a: 0, k };
}

export function keyframedProperty(keyframes) {
  return { a: 1, k: keyframes };
}

// staticAtZero: true reproduces a house style where a start:0 layer has no entrance at all
// (appears already opaque) rather than fading in from frame 0 — a deliberate per-bundle
// choice, not a universal default, so it is opt in.
export function entranceOpacity(
  start,
  {
    end = null,
    keep = false,
    eased = false,
    fadeInFrames = 10,
    staticAtZero = false,
  } = {},
) {
  if (start === 0 && staticAtZero) return staticProperty(100);
  const ease = eased ? EASE_OUT : {};
  const keys =
    start > 0
      ? [
          { t: 0, s: [0] },
          { t: start, s: [0], e: [100], ...ease },
        ]
      : [{ t: 0, s: [0], e: [100], ...ease }];
  keys.push({ t: start + fadeInFrames, s: [100] });
  if (end != null && !keep)
    keys.push({ t: end - 8, s: [100], e: [0] }, { t: end, s: [0] });
  return keyframedProperty(keys);
}

export function slidePosition(
  [x, y],
  start,
  { offset = 26, holdFrames = 12 } = {},
) {
  return keyframedProperty([
    { t: Math.max(0, start), s: [x, y + offset, 0], e: [x, y, 0] },
    { t: start + holdFrames, s: [x, y, 0] },
  ]);
}

export function transform(
  position,
  {
    opacity = staticProperty(100),
    rotation = staticProperty(0),
    scale = staticProperty([100, 100, 100]),
    anchor = staticProperty([0, 0, 0]),
  } = {},
) {
  return {
    o: opacity,
    r: rotation,
    p: staticProperty([...position, 0]),
    a: anchor,
    s: scale,
  };
}

function groupItem(pathItem, { fill, stroke, strokeWidth = 2 } = {}) {
  const items = [pathItem];
  if (fill)
    items.push({ ty: "fl", c: staticProperty(fill), o: staticProperty(100) });
  if (stroke)
    items.push({
      ty: "st",
      c: staticProperty(stroke),
      o: staticProperty(100),
      w: staticProperty(strokeWidth),
      lc: 2,
      lj: 2,
    });
  items.push({
    ty: "tr",
    p: staticProperty([0, 0]),
    a: staticProperty([0, 0]),
    s: staticProperty([100, 100]),
    r: staticProperty(0),
    o: staticProperty(100),
  });
  return { ty: "gr", it: items };
}

export function fillGroup(pathItem, color) {
  return groupItem(pathItem, { fill: color });
}

export function rectangle(
  size,
  { fill, stroke, strokeWidth = 2, radius = 0, position = [0, 0] } = {},
) {
  return groupItem(
    {
      ty: "rc",
      p: staticProperty(position),
      s: staticProperty(size),
      r: staticProperty(radius),
    },
    { fill, stroke, strokeWidth },
  );
}

export function ellipse(
  size,
  { fill, stroke, strokeWidth = 2, position = [0, 0] } = {},
) {
  return groupItem(
    { ty: "el", p: staticProperty(position), s: staticProperty(size) },
    { fill, stroke, strokeWidth },
  );
}

export function pathShape(
  vertices,
  { fill = null, stroke, strokeWidth = 5, closed = false } = {},
) {
  const path = {
    i: vertices.map(() => [0, 0]),
    o: vertices.map(() => [0, 0]),
    v: vertices,
    c: closed,
  };
  return groupItem(
    { ty: "sh", ks: staticProperty(path) },
    { fill, stroke, strokeWidth },
  );
}

export function textDocumentValue(
  text,
  { font, size, justify = 0, tracking = 0, lineHeight, color },
) {
  return {
    t: text,
    f: font,
    s: size,
    j: justify,
    tr: tracking,
    lh: lineHeight ?? Math.round(size * 1.28),
    fc: color.slice(0, 3),
  };
}

export function textDocument(document) {
  return { a: [], p: {}, d: { k: [{ t: 0, s: document }] } };
}

export function textLayer(
  name,
  text,
  position,
  {
    size,
    start = 0,
    outPoint,
    font,
    justify = 0,
    tracking = 0,
    lineHeight,
    color,
    slide,
    opacity = entranceOpacity(start),
  } = {},
) {
  return {
    ty: 5,
    nm: name,
    ip: 0,
    op: outPoint,
    st: 0,
    ks: {
      o: opacity,
      r: staticProperty(0),
      p: slide
        ? slidePosition(position, start + (slide.stagger ?? 0), slide)
        : staticProperty([...position, 0]),
      a: staticProperty([0, 0, 0]),
      s: staticProperty([100, 100, 100]),
    },
    t: textDocument(
      textDocumentValue(text, {
        font,
        size,
        justify,
        tracking,
        lineHeight,
        color,
      }),
    ),
  };
}

export function shapeLayer(
  name,
  shapes,
  position,
  {
    start = 0,
    outPoint,
    slide,
    rotation = staticProperty(0),
    scale = staticProperty([100, 100, 100]),
    opacity = entranceOpacity(start),
  } = {},
) {
  return {
    ty: 4,
    nm: name,
    ip: 0,
    op: outPoint,
    st: 0,
    ks: {
      o: opacity,
      r: rotation,
      p: slide
        ? slidePosition(position, start + (slide.stagger ?? 0), slide)
        : staticProperty([...position, 0]),
      a: staticProperty([0, 0, 0]),
      s: scale,
    },
    shapes,
  };
}

export function backgroundLayer(size, { fill, outPoint } = {}) {
  return shapeLayer(
    "background",
    [rectangle(size, { fill, radius: 0 })],
    [size[0] / 2, size[1] / 2],
    {
      outPoint,
      opacity: staticProperty(100),
    },
  );
}

// A managed bundle keeps its opaque background as the final root layer (earlier root entries
// paint above later ones); text layers read first for a stable authoring order in between.
export function layerRank(layer) {
  return layer.nm === "background" ? 2 : layer.ty === 5 ? 0 : 1;
}
