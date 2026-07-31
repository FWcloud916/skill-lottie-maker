# Brief Contract

`brief.yaml` version 1 is the human-editable source of truth.

```yaml
version: 1
id: onboarding-flow
profile: landscape-16x9
poster_frame: 108
loop: false
safe_area: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 }
composition:
  version: 1
  checkpoints:
    - frame: 108
      reading_order: [title]
      blocks:
        - id: title
          slot: title
          role: anchor
          bounds: [0.08, 0.36, 0.84, 0.28]
          align: left
          max_lines: 2
          min_font_size: 24
motion:
  intent: Explain the three-step onboarding flow
  personality: restrained
  reduced_motion: Hold the complete final state
copy:
  title: Start in three steps
palette:
  background: [0.976, 0.98, 0.984, 1]
  foreground: [0.082, 0.145, 0.267, 1]
fonts:
  - name: Noto Sans CJK TC
    family: Noto Sans CJK TC
    style: Regular
    path: assets/fonts/NotoSansCJKtc-Regular.otf
assets: []
```

Profiles provide default canvas, FPS, duration, and loop behavior:

| Profile          |    Canvas | FPS | Duration | Loop |
| ---------------- | --------: | --: | -------: | ---- |
| `landscape-16x9` |  1200×675 |  24 |      6 s | no   |
| `portrait-9x16`  | 1080×1920 |  24 |      6 s | no   |
| `square-1x1`     | 1080×1080 |  24 |      6 s | no   |
| `icon`           |   512×512 |  30 |      2 s | yes  |

Profiles accept explicit `canvas`, `fps`, `duration_seconds`, and `loop` overrides. `custom` requires
all canvas and timing fields. `poster_frame` is always explicit and must point inside the timeline.

## Composition checkpoints

`composition.version: 1` adds executable layout intent without replacing Lottie geometry. Existing
version-1 briefs without it remain valid; every newly created managed bundle declares it. A
checkpoint describes a stable information state:

- `frame` is unique, inside the timeline, and the checkpoint list includes `poster_frame`.
- `reading_order` contains every block ID exactly once.
- `role` is `anchor`, `support`, or `active`; use one clear anchor per information state.
- `bounds` is normalized `[x, y, width, height]`, stays inside `safe_area`, and does not overlap
  another block at the same checkpoint.
- A text block sets `slot`, `align`, `max_lines`, and `min_font_size`. Its named native text layer,
  sampled anchor, line count, estimated width, and height must fit the declared block.
- A card-backed block may set `card_layer` and pixel `padding`. `equal_size_group` requires matching
  rectangle dimensions across peer cards.

Declare another checkpoint whenever hierarchy or block positions materially change. For another
aspect ratio, write new bounds and geometry; do not derive a portrait composition by uniformly
scaling a landscape composition.

Every `copy` value is a non-empty string. Bind it to a same-named native text layer with identical
fallback text. Slots are optional metadata; if added, retain the native fallback so players that
ignore or reject slots still render copy.
