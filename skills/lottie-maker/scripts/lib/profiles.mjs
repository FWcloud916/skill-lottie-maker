export const PROFILES = Object.freeze({
  "landscape-16x9": Object.freeze({
    width: 1200,
    height: 675,
    fps: 24,
    duration: 6,
    loop: false,
  }),
  "portrait-9x16": Object.freeze({
    width: 1080,
    height: 1920,
    fps: 24,
    duration: 6,
    loop: false,
  }),
  "square-1x1": Object.freeze({
    width: 1080,
    height: 1080,
    fps: 24,
    duration: 6,
    loop: false,
  }),
  icon: Object.freeze({
    width: 512,
    height: 512,
    fps: 30,
    duration: 2,
    loop: true,
  }),
});

export const LIMITS = Object.freeze({
  minDimension: 16,
  maxDimension: 4096,
  maxPixels: 8_294_400,
  minFps: 1,
  maxFps: 60,
  minDuration: 0.1,
  maxDuration: 60,
  maxAssets: 50,
  maxAssetBytes: 32_000_000,
  maxTotalAssetBytes: 256_000_000,
  largeRenderBytes: 4 * 1024 ** 3,
});

export function resolveProfile(brief) {
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) {
    throw new Error("brief must be an object");
  }
  const profileName = brief.profile;
  let base;
  if (profileName === "custom") {
    base = {};
  } else if (Object.hasOwn(PROFILES, profileName)) {
    base = PROFILES[profileName];
  } else {
    throw new Error(
      `profile must be one of ${[...Object.keys(PROFILES), "custom"].join(", ")}`,
    );
  }
  const canvas = brief.canvas ?? {};
  const width = canvas.width ?? base.width;
  const height = canvas.height ?? base.height;
  const fps = brief.fps ?? base.fps;
  const duration = brief.duration_seconds ?? base.duration;
  const loop = brief.loop ?? base.loop ?? false;
  for (const [name, value] of Object.entries({
    width,
    height,
    fps,
    duration,
  })) {
    if (typeof value !== "number" || !Number.isFinite(value))
      throw new Error(`${name} must be numeric`);
  }
  if (
    !Number.isInteger(width) ||
    width < LIMITS.minDimension ||
    width > LIMITS.maxDimension
  ) {
    throw new Error(
      `width must be an integer from ${LIMITS.minDimension} to ${LIMITS.maxDimension}`,
    );
  }
  if (
    !Number.isInteger(height) ||
    height < LIMITS.minDimension ||
    height > LIMITS.maxDimension
  ) {
    throw new Error(
      `height must be an integer from ${LIMITS.minDimension} to ${LIMITS.maxDimension}`,
    );
  }
  if (width * height > LIMITS.maxPixels)
    throw new Error(`canvas must not exceed ${LIMITS.maxPixels} pixels`);
  if (!Number.isInteger(fps) || fps < LIMITS.minFps || fps > LIMITS.maxFps) {
    throw new Error(
      `fps must be an integer from ${LIMITS.minFps} to ${LIMITS.maxFps}`,
    );
  }
  if (duration < LIMITS.minDuration || duration > LIMITS.maxDuration) {
    throw new Error(
      `duration_seconds must be from ${LIMITS.minDuration} to ${LIMITS.maxDuration}`,
    );
  }
  const frameCount = Math.round(duration * fps);
  if (Math.abs(frameCount / fps - duration) > 1e-8) {
    throw new Error(
      "duration_seconds * fps must produce an integer frame count",
    );
  }
  return {
    profile: profileName,
    width,
    height,
    fps,
    duration,
    frameCount,
    loop,
  };
}
