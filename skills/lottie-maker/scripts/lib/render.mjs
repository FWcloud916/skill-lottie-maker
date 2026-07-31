import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import CanvasKitInit from "canvaskit-wasm/full";

import { LIMITS } from "./profiles.mjs";
import { sha256 } from "./io.mjs";

const CANVASKIT_VERSION = "0.41.1";

async function canvasKit() {
  const base = path.dirname(
    new URL(import.meta.resolve("canvaskit-wasm/full")).pathname,
  );
  return CanvasKitInit({ locateFile: (file) => path.join(base, file) });
}

function sampleFrames(frameCount, posterFrame) {
  const candidates = [
    0,
    Math.floor(frameCount * 0.1),
    Math.floor(frameCount * 0.25),
    Math.floor(frameCount * 0.5),
    Math.floor(frameCount * 0.75),
    Math.floor(frameCount * 0.9),
    frameCount - 1,
    posterFrame,
  ];
  return [
    ...new Set(
      candidates.map((frame) => Math.max(0, Math.min(frameCount - 1, frame))),
    ),
  ].sort((a, b) => a - b);
}

async function loadAssets(assetEntries) {
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
    : sampleFrames(frameCount, posterFrame);
  const ck = await canvasKit();
  const surface = ck.MakeSurface(animation.w, animation.h);
  if (!surface)
    throw new Error("CanvasKit could not create a software surface");
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
    await loadAssets(report.assets),
    "",
    null,
    logger,
  );
  if (!managed) {
    surface.dispose();
    throw new Error("CanvasKit could not load the Lottie document");
  }
  const skottieErrors = skottieMessages.filter(
    (entry) => entry.level === "error",
  );
  if (skottieErrors.length) {
    managed.delete();
    surface.dispose();
    throw new Error(
      `Skottie rejected the document: ${skottieErrors.map((entry) => entry.message).join("; ")}`,
    );
  }
  const [renderWidth, renderHeight] = managed.size();
  if (renderWidth !== animation.w || renderHeight !== animation.h)
    throw new Error("CanvasKit size does not match the animation");
  await mkdir(outputDir, { recursive: true });
  const rendered = [];
  try {
    const canvas = surface.getCanvas();
    for (const frame of frames) {
      canvas.clear(ck.TRANSPARENT);
      managed.seekFrame(frame);
      managed.render(canvas, ck.LTRBRect(0, 0, animation.w, animation.h));
      surface.flush();
      const image = surface.makeImageSnapshot();
      try {
        const png = image.encodeToBytes(ck.ImageFormat.PNG, 100);
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
    const poster = rendered.find((item) => item.frame === posterFrame);
    if (!poster) throw new Error("poster frame was not rendered");
    await writeFile(path.join(outputDir, "poster.png"), poster.bytes);
    await writeContactSheet(
      ck,
      rendered,
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
  } finally {
    managed.delete();
    surface.dispose();
  }
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
