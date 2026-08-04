import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import CanvasKitInit from "canvaskit-wasm/full";

import { LIMITS } from "./profiles.mjs";
import { sha256 } from "./io.mjs";

// Read from the installed dependency rather than a hand-maintained literal, so the version
// reported in every render/geometry report cannot drift from what actually rendered it.
export const CANVASKIT_VERSION = JSON.parse(
  await readFile(new URL(import.meta.resolve("canvaskit-wasm/package.json"))),
).version;

export async function canvasKit() {
  const base = path.dirname(
    new URL(import.meta.resolve("canvaskit-wasm/full")).pathname,
  );
  return CanvasKitInit({ locateFile: (file) => path.join(base, file) });
}

function sampleFrames(frameCount, posterFrame, checkpoints = []) {
  const candidates = [
    0,
    Math.floor(frameCount * 0.1),
    Math.floor(frameCount * 0.25),
    Math.floor(frameCount * 0.5),
    Math.floor(frameCount * 0.75),
    Math.floor(frameCount * 0.9),
    frameCount - 1,
    posterFrame,
    ...checkpoints,
  ];
  return [
    ...new Set(
      candidates.map((frame) => Math.max(0, Math.min(frameCount - 1, frame))),
    ),
  ].sort((a, b) => a - b);
}

export async function loadAssets(assetEntries) {
  const assets = {};
  for (const entry of assetEntries) {
    const bytes = await readFile(entry.path);
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );
    const basename = path.basename(entry.path);
    assets[basename] = buffer;
    assets[entry.reference] = buffer;
    if (entry.font)
      assets[basename.slice(0, -path.extname(basename).length)] = buffer;
  }
  return assets;
}

export function checkpointFrames(bundle) {
  return [
    ...new Set(
      (bundle.brief?.composition?.checkpoints ?? []).map(
        (checkpoint) => checkpoint.frame,
      ),
    ),
  ].sort((a, b) => a - b);
}

// Shared by renderFrameSet and any caller (e.g. isolated-layer geometry rendering) that needs
// a loaded Skottie animation without the frame-encoding loop below. Throws on any error-level
// Skottie message so a caller never renders a document Skottie itself rejected.
export function createManagedAnimation(ck, animation, assets) {
  const skottieMessages = [];
  const logger = {
    onError(message, json) {
      skottieMessages.push({ level: "error", message, json });
    },
    onWarning(message, json) {
      skottieMessages.push({ level: "warning", message, json });
    },
  };
  const managed = ck.MakeManagedAnimation(
    JSON.stringify(animation),
    assets,
    "",
    null,
    logger,
  );
  if (!managed) throw new Error("CanvasKit could not load the Lottie document");
  const skottieErrors = skottieMessages.filter(
    (entry) => entry.level === "error",
  );
  if (skottieErrors.length) {
    managed.delete();
    throw new Error(
      `Skottie rejected the document: ${skottieErrors.map((entry) => entry.message).join("; ")}`,
    );
  }
  return { managed, skottieMessages };
}

async function renderFrameSet(bundle, report, outputDir, frames, { ck } = {}) {
  const animation = bundle.animation;
  const kit = ck ?? (await canvasKit());
  const surface = kit.MakeSurface(animation.w, animation.h);
  if (!surface)
    throw new Error("CanvasKit could not create a software surface");
  let managed;
  let skottieMessages;
  try {
    ({ managed, skottieMessages } = createManagedAnimation(
      kit,
      animation,
      await loadAssets(report.assets),
    ));
  } catch (error) {
    surface.dispose();
    throw error;
  }
  const [renderWidth, renderHeight] = managed.size();
  if (renderWidth !== animation.w || renderHeight !== animation.h) {
    managed.delete();
    surface.dispose();
    throw new Error("CanvasKit size does not match the animation");
  }
  await mkdir(outputDir, { recursive: true });
  const rendered = [];
  try {
    const canvas = surface.getCanvas();
    for (const frame of frames) {
      canvas.clear(kit.TRANSPARENT);
      managed.seekFrame(frame);
      managed.render(canvas, kit.LTRBRect(0, 0, animation.w, animation.h));
      surface.flush();
      const image = surface.makeImageSnapshot();
      try {
        const png = image.encodeToBytes(kit.ImageFormat.PNG, 100);
        if (!png) throw new Error(`could not encode frame ${frame}`);
        const file = path.join(
          outputDir,
          `frame-${String(frame).padStart(4, "0")}.png`,
        );
        await writeFile(file, png);
        rendered.push({ frame, file, sha256: sha256(png), bytes: png });
      } finally {
        image.delete();
      }
    }
  } finally {
    managed.delete();
    surface.dispose();
  }
  return { ck: kit, rendered, skottieMessages };
}

export async function renderSamples(
  bundle,
  report,
  outputDir,
  { allFrames = false, allowLarge = false } = {},
) {
  const animation = bundle.animation;
  const frameCount = report.frame_count;
  const posterFrame = bundle.brief?.poster_frame ?? Math.max(0, frameCount - 1);
  const estimatedBytes = animation.w * animation.h * 4 * frameCount;
  if (allFrames && estimatedBytes > LIMITS.largeRenderBytes && !allowLarge) {
    throw new Error(
      `full render estimates ${estimatedBytes} raw bytes; pass --allow-large-render after review`,
    );
  }
  const frames = allFrames
    ? Array.from({ length: frameCount }, (_, index) => index)
    : sampleFrames(frameCount, posterFrame, checkpointFrames(bundle));
  const { ck, rendered, skottieMessages } = await renderFrameSet(
    bundle,
    report,
    outputDir,
    frames,
  );
  const poster = rendered.find((item) => item.frame === posterFrame);
  if (!poster) throw new Error("poster frame was not rendered");
  await writeFile(path.join(outputDir, "poster.png"), poster.bytes);
  const contactFrames = allFrames
    ? new Set(sampleFrames(frameCount, posterFrame, checkpointFrames(bundle)))
    : null;
  await writeContactSheet(
    ck,
    contactFrames
      ? rendered.filter((item) => contactFrames.has(item.frame))
      : rendered,
    animation.w,
    animation.h,
    path.join(outputDir, "contact-sheet.png"),
  );
  return {
    canvaskit: CANVASKIT_VERSION,
    width: animation.w,
    height: animation.h,
    fps: animation.fr,
    frame_count: frameCount,
    sampled_frames: frames,
    poster_frame: posterFrame,
    frame_sha256: rendered.map(({ frame, sha256: digest }) => ({
      frame,
      sha256: digest,
    })),
    poster_sha256: poster.sha256,
    skottie_messages: skottieMessages,
  };
}

export async function renderStoryboard(bundle, report, outputDir) {
  const animation = bundle.animation;
  const frameCount = report.frame_count;
  const posterFrame = bundle.brief?.poster_frame ?? Math.max(0, frameCount - 1);
  const frames = checkpointFrames(bundle);
  if (!frames.length) {
    throw new Error(
      "storyboard requires declared composition checkpoints in brief.yaml",
    );
  }
  const fontEntry = report.assets.find((entry) => entry.font);
  if (!fontEntry)
    throw new Error("storyboard requires a bundled font for frame labels");
  const fontBytes = await readFile(fontEntry.path);
  const { ck, rendered, skottieMessages } = await renderFrameSet(
    bundle,
    report,
    outputDir,
    frames,
  );
  const storyboardSha = await writeStoryboard(
    ck,
    rendered,
    animation.w,
    animation.h,
    posterFrame,
    fontBytes.buffer.slice(
      fontBytes.byteOffset,
      fontBytes.byteOffset + fontBytes.byteLength,
    ),
    path.join(outputDir, "storyboard.png"),
  );
  return {
    canvaskit: CANVASKIT_VERSION,
    width: animation.w,
    height: animation.h,
    fps: animation.fr,
    frame_count: frameCount,
    checkpoint_frames: frames,
    poster_frame: posterFrame,
    frame_sha256: rendered.map(({ frame, sha256: digest }) => ({
      frame,
      sha256: digest,
    })),
    storyboard_sha256: storyboardSha,
    skottie_messages: skottieMessages,
  };
}

async function writeContactSheet(ck, rendered, width, height, target) {
  const columns = Math.min(4, rendered.length);
  const rows = Math.ceil(rendered.length / columns);
  const cellWidth = Math.min(480, width);
  const cellHeight = Math.round((cellWidth * height) / width);
  const surface = ck.MakeSurface(cellWidth * columns, cellHeight * rows);
  if (!surface)
    throw new Error("CanvasKit could not create contact sheet surface");
  const canvas = surface.getCanvas();
  canvas.clear(ck.Color(32, 36, 44, 1));
  try {
    for (let index = 0; index < rendered.length; index += 1) {
      const image = ck.MakeImageFromEncoded(rendered[index].bytes);
      if (!image)
        throw new Error(
          `could not decode rendered frame ${rendered[index].frame}`,
        );
      try {
        const x = (index % columns) * cellWidth;
        const y = Math.floor(index / columns) * cellHeight;
        canvas.drawImageRect(
          image,
          ck.XYWHRect(0, 0, width, height),
          ck.XYWHRect(x, y, cellWidth, cellHeight),
          null,
        );
      } finally {
        image.delete();
      }
    }
    surface.flush();
    const image = surface.makeImageSnapshot();
    try {
      const png = image.encodeToBytes(ck.ImageFormat.PNG, 100);
      if (!png) throw new Error("could not encode contact sheet");
      await writeFile(target, png);
    } finally {
      image.delete();
    }
  } finally {
    surface.dispose();
  }
}

async function writeStoryboard(
  ck,
  rendered,
  width,
  height,
  posterFrame,
  fontBuffer,
  target,
) {
  const typeface = ck.Typeface.MakeFreeTypeFaceFromData(fontBuffer);
  if (!typeface)
    throw new Error("could not load the bundled font for storyboard labels");
  const font = new ck.Font(typeface, 16);
  const textPaint = new ck.Paint();
  textPaint.setColor(ck.Color(226, 230, 236, 1));
  textPaint.setAntiAlias(true);
  const labelHeight = 32;
  const columns = Math.min(4, rendered.length);
  const rows = Math.ceil(rendered.length / columns);
  const cellWidth = Math.min(480, width);
  const imageHeight = Math.round((cellWidth * height) / width);
  const cellHeight = imageHeight + labelHeight;
  const surface = ck.MakeSurface(cellWidth * columns, cellHeight * rows);
  if (!surface)
    throw new Error("CanvasKit could not create storyboard surface");
  const canvas = surface.getCanvas();
  canvas.clear(ck.Color(32, 36, 44, 1));
  try {
    for (let index = 0; index < rendered.length; index += 1) {
      const image = ck.MakeImageFromEncoded(rendered[index].bytes);
      if (!image)
        throw new Error(
          `could not decode rendered frame ${rendered[index].frame}`,
        );
      try {
        const x = (index % columns) * cellWidth;
        const y = Math.floor(index / columns) * cellHeight;
        canvas.drawImageRect(
          image,
          ck.XYWHRect(0, 0, width, height),
          ck.XYWHRect(x, y, cellWidth, imageHeight),
          null,
        );
        const marker = rendered[index].frame === posterFrame ? " · poster" : "";
        canvas.drawText(
          `checkpoint ${index + 1} · frame ${rendered[index].frame}${marker}`,
          x + 12,
          y + imageHeight + 22,
          textPaint,
          font,
        );
      } finally {
        image.delete();
      }
    }
    surface.flush();
    const image = surface.makeImageSnapshot();
    try {
      const png = image.encodeToBytes(ck.ImageFormat.PNG, 100);
      if (!png) throw new Error("could not encode storyboard");
      await writeFile(target, png);
      return sha256(png);
    } finally {
      image.delete();
    }
  } finally {
    surface.dispose();
    font.delete();
    textPaint.delete();
    typeface.delete();
  }
}
