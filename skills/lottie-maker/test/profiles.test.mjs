import assert from "node:assert/strict";
import test from "node:test";

import { PROFILES, resolveProfile } from "../scripts/lib/profiles.mjs";

test("preset profiles resolve to integer timelines", () => {
  for (const profile of Object.keys(PROFILES)) {
    const resolved = resolveProfile({ profile });
    assert.equal(resolved.frameCount, resolved.fps * resolved.duration);
    assert.ok(Number.isInteger(resolved.frameCount));
  }
});

test("custom profiles enforce dimensions and integral frame counts", () => {
  assert.deepEqual(
    resolveProfile({
      profile: "custom",
      canvas: { width: 320, height: 180 },
      fps: 10,
      duration_seconds: 1.5,
      loop: true,
    }),
    {
      profile: "custom",
      width: 320,
      height: 180,
      fps: 10,
      duration: 1.5,
      frameCount: 15,
      loop: true,
    },
  );
  assert.throws(
    () =>
      resolveProfile({
        profile: "custom",
        canvas: { width: 320, height: 180 },
        fps: 24,
        duration_seconds: 0.11,
      }),
    /integer frame count/,
  );
  assert.throws(
    () =>
      resolveProfile({
        profile: "custom",
        canvas: { width: 5000, height: 180 },
        fps: 24,
        duration_seconds: 1,
      }),
    /width/,
  );
});
