import assert from "node:assert/strict";
import test from "node:test";

import { ffmpegArgs } from "../scripts/lib/media.mjs";

test("MP4 encoding pads odd dimensions for yuv420p", () => {
  const args = ffmpegArgs("frame-%04d.png", "preview.mp4", 24, "mp4");
  assert.deepEqual(args.slice(args.indexOf("-vf"), args.indexOf("-pix_fmt")), [
    "-vf",
    "pad=ceil(iw/2)*2:ceil(ih/2)*2",
  ]);
  assert.equal(args[args.indexOf("-pix_fmt") + 1], "yuv420p");
});

test("GIF encoding does not apply H.264 padding", () => {
  const args = ffmpegArgs("frame-%04d.png", "preview.gif", 30, "gif");
  assert.equal(args.includes("-vf"), false);
  assert.throws(
    () => ffmpegArgs("frames", "preview.webm", 30, "webm"),
    /unsupported media format/,
  );
});
