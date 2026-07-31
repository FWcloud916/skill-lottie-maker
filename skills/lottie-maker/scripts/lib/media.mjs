export function ffmpegArgs(pattern, target, fps, format) {
  if (format === "mp4") {
    return [
      "-y",
      "-framerate",
      String(fps),
      "-i",
      pattern,
      "-vf",
      "pad=ceil(iw/2)*2:ceil(ih/2)*2",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      target,
    ];
  }
  if (format === "gif")
    return ["-y", "-framerate", String(fps), "-i", pattern, target];
  throw new Error(`unsupported media format: ${format}`);
}
