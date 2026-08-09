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
- A text block whose stable window ends before the timeline does must hold at least the reading
  budget `motion-design.md` derives from its actual copy, measured from the layer's last incoming
  transform to its next outgoing one at the slot's first declared checkpoint. Text with no exit is
  exempt — a standalone Lottie persists on its final frame, so copy that never leaves stays
  readable indefinitely. A deliberate exception is declared on that first-checkpoint block as
  `hold_waiver: <reason of at least 10 characters>`; a waiver whose hold already meets the budget
  is itself an error, so an exemption cannot outlive its excuse.
- A card-backed block may set `card_layer` and pixel `padding`. `equal_size_group` requires matching
  rectangle dimensions across peer cards. A centered stroke paints half its width outward from the
  nominal shape, so `padding` and any declared clearance must budget for the full stroke width plus
  an antialiasing allowance — nominal-tangent geometry is drawn overlapping once a stroke is added.

A text document's `t` must not contain `\n`, `\r`, or any other line-break character. Neither is a
portable line break: measured against the pinned CanvasKit/Skottie build, `\n` renders inline as a
substitute glyph rather than breaking the line, and no other Lottie player's handling of either
character is established. Author a multi-line title as one text layer per line, each its own
composition block, instead of embedding a separator in a single text document.

Declare another checkpoint whenever hierarchy or block positions materially change. For another
aspect ratio, write new bounds and geometry; do not derive a portrait composition by uniformly
scaling a landscape composition.

Every `copy` value is a non-empty string. Bind it to a same-named native text layer with identical
fallback text. Slots are optional metadata; if added, retain the native fallback so players that
ignore or reject slots still render copy. A slot must bind to either a `sid` present on a property
in the animation or an existing native layer name — an unbound slot key is inert metadata that can
silently drift from what actually renders. Its resolved text must match the bound layer's fallback
`t` verbatim, and it must also match `brief.copy` when both are declared. A slot expressed as a
full text document (not a bare string property) must carry the complete style set the bound layer
declares — `f`, `s`, `j`, `tr`, `lh`, and `fc` — not only `t`, `f`, and `s`; a slot document missing
style fields has substituted copy that can render invisible even though the text itself is correct.

## Geometry claims

`composition.geometry` is optional and declares a mechanical relation between two named root
layers, checked from rendered pixels rather than declared bounds:

```yaml
composition:
  version: 1
  geometry:
    - id: main-upper-mesh
      relation: interlocked # interlocked | disjoint | contained
      layers: [gear-main, gear-upper]
      frames: { start: 0, count: 24, stride: 1 } # optional; defaults to a 24-frame contiguous window
      criteria:
        min_engagement_px: 8 # required for interlocked; at least 2
        min_overlap_pixels: 4 # default 4 — below this, antialiasing can fabricate contact
        min_body_clearance_px: 0 # default 0
        body_layers: [main-hub, upper-hub] # optional; enables an exact body-overlap test
        alpha_threshold: 128 # default 128, the half-coverage edge
      note: teeth engage without the hubs touching
```

A fourth relation, `connected`, proves a connector's declared endpoint actually touches its
target's rendered pixels — a claim the bounds-level checks cannot make:

```yaml
- id: rail-to-node
  relation: connected
  layers: [flow-rail, node-card] # [connector, target]
  frames: { start: 96, count: 24 }
  criteria:
    ends: end # start | end | both — which declared endpoint must attach
    max_gap_px: 3 # default 3 — half a stroke width plus antialiasing
```

The connector itself is never isolation-rendered: a trim-revealed connector is invisible or
partial at most sampled frames, so its rendered pixels are not stable ground truth — its declared
`sh` path vertices are, since trim changes how much of the path is drawn, never the vertices. The
endpoint is read once from the path (through the shape group's and layer's static transforms;
keyframed ones cannot be reduced to one coordinate and fail the claim), and only the target is
rendered per sampled frame. The degeneracy detector is deliberately not applied to `connected`
claims: it exists because a periodic mechanism can alias against a matching sample stride, and a
connector-target pair has no periodic motion — a constant gap across every sampled frame is the
expected, correct outcome for a properly attached connector.

Run `geometry <bundle> --out <dir>` (or `verify --geometry`) to measure it. `id` is kebab-case and
unique; `layers` names exactly two distinct existing root layers; the sampling window stays inside
the timeline and covers at least 3 frames. A claim with no `composition.geometry` block is a no-op
— `geometry` reports `status: "skipped"` rather than an error, so declaring no claims is always
valid — unless the animation _looks_ mechanical, in which case `validate` forces a decision:

## Mechanics declaration

A drawing that looks mechanical makes a contact claim whether or not the author declared one. Two
channels force that claim to become measurable. Automatically: an animation with two or more
independently rotating non-background root layers (a keyframed `ks.r` whose values actually vary)
and no `composition.geometry` claims fails `validate` until the author either declares the claim
or sets the root brief field `mechanics: decorative`, attesting the rotation makes no contact
claim. Explicitly: `mechanics: declared` requires at least one geometry claim, for mechanisms
rotation-counting cannot see — belts, pistons, ratchets. `mechanics: decorative` alongside
declared geometry claims is a contradiction and is rejected.

The two layers are rendered in isolation — every other root layer's opacity zeroed — so the
measurement comes from which layer drew a pixel, never from its color; palette-based part
separation is not used and would not be reliable (see `docs/lottie-production-guide.md`). Sampling
is a contiguous window, not a fixed stride or percentile spread, because aliasing against a
mechanism's period cannot be predicted ahead of time — only detected: a claim whose every sampled
metric measures identically is reported as degenerate, whether the cause is aliasing or the
geometry genuinely being static. `contained`'s `layers` is ordered `[inner, outer]`.

Geometry claims see only **root layers**; a layer nested inside a precomp asset cannot be named
directly. This is the same lookup `composition.checkpoints`' `card_layer` uses; the copy-binding
check elsewhere in this contract recurses into precomps, so root-layer names are not guaranteed
unique across both checks in the same bundle. Track mattes are not supported: isolating a layer by
zeroing every other layer's opacity cannot reproduce a matte, so a bundle with any track matte
fails the whole geometry pass rather than measuring an approximation.

For a managed bundle, keep the root shape layer named `background` as the final entry in
`animation.json`'s root `layers` array. Earlier root entries paint above later entries in the managed
renderer, so a background placed first can hide an otherwise valid composition. This managed-bundle
rule is enforced only when `brief.yaml` exists; inspecting or validating a standalone imported JSON
does not normalize or reject its original layer order.
