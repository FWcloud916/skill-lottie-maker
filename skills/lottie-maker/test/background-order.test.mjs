import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createAnimation,
  validateBundle,
  validateManagedBackgroundOrder,
} from "../scripts/lib/lottie.mjs";

const brief = {
  version: 1,
  id: "background-order",
  profile: "landscape-16x9",
  poster_frame: 100,
  copy: { title: "Background order" },
  palette: {},
  fonts: [],
};
const profile = {
  profile: "landscape-16x9",
  width: 1200,
  height: 675,
  fps: 24,
  frameCount: 144,
  loop: false,
};

function backgroundFirst() {
  const animation = createAnimation(brief, profile);
  animation.layers.unshift(animation.layers.pop());
  return animation;
}

test("managed background must be the final root layer", () => {
  const animation = backgroundFirst();
  assert.deepEqual(validateManagedBackgroundOrder(animation), [
    "/layers/0: managed background must be the final root layer",
  ]);
  animation.layers.push(animation.layers.shift());
  assert.deepEqual(validateManagedBackgroundOrder(animation), []);
});

test("bare imported JSON keeps its original layer order", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "lottie-maker-background-"),
  );
  const animationPath = path.join(root, "animation.json");
  const animation = backgroundFirst();
  await writeFile(animationPath, JSON.stringify(animation));

  const report = await validateBundle({
    root,
    animationPath,
    animation,
    brief: null,
  });

  assert.equal(
    report.errors.some((error) => error.includes("managed background")),
    false,
  );
});

test("managed bundle validation reports background order", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "lottie-maker-background-"),
  );
  const animationPath = path.join(root, "animation.json");
  const animation = backgroundFirst();
  await writeFile(animationPath, JSON.stringify(animation));

  const report = await validateBundle({
    root,
    animationPath,
    animation,
    brief,
  });

  assert(
    report.errors.includes(
      "/layers/0: managed background must be the final root layer",
    ),
  );
});
