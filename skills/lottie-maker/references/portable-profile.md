# Portable Capability Profile

Generated bundles target the deliberately small intersection needed for deterministic CanvasKit
preview and broad Lottie playback.

Allowed:

- Shape, image, text, and precomposition layers
- Local PNG/JPEG assets and local OpenType/TrueType fonts
- Masks, trim paths, fills, strokes, and 2D transforms
- Animated scalar, vector, color, path, and text-document properties
- Additional inert metadata such as `meta` and `slots`

Rejected:

- Expressions or executable source strings
- HTTP(S), data, or embedded image assets
- Audio, video, cameras, 3D layers, effects, and renderer extensions
- Asset symlinks, path traversal, or files outside the bundle

The validator also enforces bounded canvas, FPS, duration, asset count, per-asset size, and total
asset size. These are operational safeguards, not claims about the maximum Lottie specification.

`inspect` reports violations on imported JSON without rewriting it. `validate` fails new bundles
when any violation remains.
