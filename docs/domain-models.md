# Domain models

> **Last updated:** 2026-07-31

## Bundle

A bundle is a directory containing `brief.yaml`, `animation.json`, `motion.md`, and local assets.
Its kebab-case directory name equals `brief.id`. The bundle is source material; preview output lives
outside it.

## Brief

The version-1 brief is the source of truth for canvas profile, custom dimensions, FPS, duration,
loop intent, poster frame, safe area, composition checkpoints, copy, palette, fonts, assets, and
motion rationale. Custom profiles require explicit width, height, FPS, and duration whose product is
an integer frame count.

## Composition checkpoint

A composition checkpoint binds one stable timeline frame to normalized, safe-area-contained visual
blocks and an exact reading order. Blocks carry hierarchy roles and may bind named text or rectangle
card layers. Validation checks overlap, text fit, font floor, card padding, and equal-size groups.
The contract records intent while `animation.json` remains the source of actual geometry.

## Animation

`animation.json` is the canonical playable artifact. Root width, height, FPS, in-point, and out-point
must agree with the brief. Named text layers provide fallback copy, so playback does not depend on
slot support. Imported unknown fields are preserved during revisions.

## Asset reference

An asset reference is a non-empty relative path to a regular file within the real bundle root. It
cannot be absolute, remote, embedded, symlinked, missing, or escape through path traversal. Fonts
are declared in both the brief and Lottie font list using the actual family and style metadata.

## Validation report

A validation report contains status, dimensions, frame and layer counts, resolved assets, portable
errors and warnings, composition findings, layer/font/feature inventories, official-schema advisory
results, and source SHA-256. Portable errors are hard failures. The status scope is explicitly this
project's portable profile, not universal player compatibility; official schema gaps do not override
that validator.

## Render report

A render report records CanvasKit version, canvas, FPS, frame count, sampled frames, poster frame,
per-frame hashes, poster hash, and Skottie warnings. Any Skottie error aborts rendering. A verify
report is valid only when two independently rendered ordered hash sets match.
