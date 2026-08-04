# Domain models

> **Last updated:** 2026-08-04

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

## Geometry claim

An optional `composition.geometry` entry declares a mechanical relation — `interlocked`,
`disjoint`, or `contained` — between exactly two named root layers, over a contiguous sampled frame
window, with relation-specific pixel criteria. Unlike a composition checkpoint, which checks
*declared* bounds against the brief, a geometry claim is checked against *rendered* pixels: each
named layer is rendered in isolation and the two resulting occupancy masks are measured directly.
A bundle with no geometry claims is unaffected; geometry verification is a no-op for it.

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
report is valid only when two independently rendered ordered hash sets match. A storyboard report
records the same renderer fields plus the declared checkpoint frames and the labeled storyboard
sheet hash; the per-frame hashes always describe the unlabeled frame images.

## Geometry report

A geometry report is `"skipped"` when the brief declares no claims, `"dry-run"` when previewing a
plan without rendering, or otherwise carries per-claim status, degeneracy, every frame's raw
measurements and their summary statistics, findings, and — for a failed or degenerate claim only —
bounded evidence (the worst frame's composite render and each isolated layer's mask). A
`measurements_sha256` covers every claim's rounded, canonicalized measurements, playing the same
role for geometry that the render report's frame hashes play for pixels: a value to compare across
revisions to prove a geometry change was intentional. It is not compared automatically the way
`verify` compares two renders — the isolated-render pipeline is already proven deterministic by the
renderer's own verify gate, so geometry does not re-render twice.
