# Brief Contract

`brief.yaml` version 1 is the human-editable source of truth.

```yaml
version: 1
id: onboarding-flow
profile: landscape-16x9
poster_frame: 108
loop: false
safe_area: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 }
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

Every `copy` value is a non-empty string. Bind it to a same-named native text layer with identical
fallback text. Slots are optional metadata; if added, retain the native fallback so players that
ignore or reject slots still render copy.
