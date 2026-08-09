# Lottie production experience guide

> **Last updated:** 2026-08-09

Lessons distilled from real production use of this toolchain: constrained bundles that passed every
structural gate and still shipped visible or semantic defects. This guide explains why the layered
gates exist and where they end. It is the narrative layer; the operative rules live in the skill
references listed in section 3. It is also a living guide: when work exposes a failure mode it does
not cover, distill the lesson, rule, or boundary here in the same change.

## 1. Layered verification model

The recurring failure mode was never an inability to emit JSON or MP4. Several incorrect animations
passed schema validation, rendered deterministically, and produced identical hashes; the surviving
defects were visible or semantic. Each layer proves one narrow thing, and no layer replaces another:

| Layer | Establishes | Does not establish |
|---|---|---|
| Brief and bundle contract | Copy, timing, font, palette, assets, and allowed features agree | Visual meaning |
| Composition checkpoints | Hierarchy, reading order, safe bounds, fit, padding, and peer sizing | Connector topology or the value of decoration |
| Storyboard render | Declared stable states are visually reviewable before any full render | Pacing, transitions, and loop seams |
| CanvasKit render | The pinned Skottie runtime accepts and renders the bundle | Compatibility with any other player |
| Double render and hashes | The output is reproducible | That reproducible pixels are correct |
| Poster and contact sheet | Stable states and sampled transitions are reviewable | Every transient frame or loop boundary |
| Rendered-geometry contact verification | Declared `interlocked`/`disjoint`/`contained` claims, measured from isolated per-layer pixels over a contiguous sampled window with aliasing/static detection | Semantic meaning of contact, or any relation not declared as a claim |
| Full playback and targeted frames | Pacing, artifacts, and declared geometry can be judged | An automated semantic proof |
| Downstream runtime QA | The actual delivery player reproduces text and motion | Owned by the consuming pipeline; a `valid` result here is never an all-player guarantee |

## 2. Production lessons

### Encoding constraints are validation targets

A composition rendered perfect PNG frames, yet FFmpeg could not encode the `yuv420p` MP4 because the
canvas height was odd — nothing before the encoder exercised its pixel-format constraints. The
toolchain now pads odd dimensions only at the encoding boundary and regression-tests it; the lesson
generalizes: every downstream format constraint must be validated or exercised before output is
promised. In the same period, a declared font name did not prove the intended bundled font was
actually selected, and Skottie parser errors surfaced only as ignorable diagnostics. Encoding
limits, real font selection, and parser errors are all hard, tested failure conditions now.

### The preview renderer is not the delivery runtime

An animation that rendered flawlessly in CanvasKit dropped its CJK text in a browser player, because
the constrained authoring dialect omitted player-expected native-text fields and exporter
boilerplate. Passing the pinned preview renderer never implies another player works; consumers must
QA in their actual runtime and keep a poster fallback for when playback fails.

### Validated text can still be invisible

A bundle passed validation while every slot-substituted string rendered invisible: the substitution
supplied copy without the complete native-text style. String equality between slot and fallback is
not a text check — only inspecting the rendered hold is. The same period showed that any authoring
invariant left as prose (body limits, naming, keyframe restrictions, font metadata) will eventually
be violated; every invariant must be executable and fail closed before render.

### Line-break characters are not a line break

A two-line title validated at its widest declared line and still overflowed its safe area on
render. The composition checker split the text document's string on `\n` and measured each
resulting line separately, on the assumption that the renderer would break the line at the same
point. Measured against the pinned CanvasKit/Skottie build, `\n` is not honored as a line break at
all: it renders inline as a substitute glyph, and the true drawn width is the whole string
concatenated, not the widest split segment. `\r` happened to break the line in that same build,
but that behavior is undocumented and not established for any other Lottie player. No
line-separator character is portable authoring for multi-line text; a text document containing
one is rejected in a managed bundle, and the fit check now measures the concatenated string so an
import that still carries one is scored the way the renderer actually draws it, not the way the
split arithmetic assumed it would. Multi-line titles are authored as one text layer per line
instead.

### A valid background can still hide the scene

In the managed renderer, earlier root-layer array entries paint above later ones. An opaque
full-frame background placed first can therefore hide every text and shape layer while schema and
render checks still succeed. Managed bundles keep `background` as the final root layer and validate
that order before storyboard rendering. Bare imported JSON remains read-only and is not rejected or
normalized solely for this managed convention.

### A caption can be clipped by its own reference card

A caption below a decorative card validated and looked correct in a spot check, then shipped with
one letter silently broken: "Unsafe asset blocked" rendered as "Unsate asset blocked". The card sat
15px above the caption's baseline — less clearance than every sibling caption in the same
composition (17.5–21px) — and the card paints in front of the caption beneath it (earlier root
entries paint over later ones, the same ordering rule as the background lesson above). At that
clearance, only a character with a tall ascender reaching above the block's typical cap-height (the
"f" in "Unsafe") poked into the card and had its top clipped; every other letter, and every other
caption in the same composition, rendered untouched. Declared bounds and a first glance both looked
fine — the defect was one specific glyph in one specific caption, invisible until read character by
character. Vertical clearance between a caption and any shape painted in front of it must budget
for the tallest ascender the copy can contain, not the block's average letter height, and a
one-glyph difference is not something a skim catches — it needs to be read, not glanced at.

### Legal shapes are not meaningful shapes

Structural checks accepted hidden marks, an empty decorative card, and unlabeled boxes, because a
schema cannot infer whether a visible object communicates anything. Peer cards also drifted in size
and containment until checkpoints compared them. In restrained technical motion, every visible block
needs a named semantic role, and peer elements need enforced equal sizing, padding, and reading
order.

### Geometry claims need rendered evidence

Connector lines that looked attached were moving or disconnected at their endpoints; a rail crossed
cards and labels; a poster frame was sampled before the strongest complete state. Gear trains passed
review twice while mechanically wrong — bodies overlapping, then merely tangent tips — and one
visual pass reported meshing that did not exist because it judged nominal geometry on sparse
samples. Claims such as "meshed", "connected", or "contained" must be derived from the actual
rendered geometry with explicit contact criteria, sampled across the full motion interval, with the
measured values and inspected frames recorded.

This is now executable for two-layer relations. `composition.geometry` declares an `interlocked`,
`disjoint`, or `contained` claim between two named layers; `geometry` (and `verify --geometry`)
render each named layer in isolation — every other root layer's opacity zeroed, so the mask
records which layer drew a pixel, never what color it drew — and measure contact from the
resulting occupancy masks. Two lessons shaped the measurement itself:

- **Separating overlapping parts by palette color is unreliable.** A fill only 18 units from the
  canvas color, plus stroke antialiasing landing inside another swatch's tolerance, measured an
  engagement depth 4.5× wrong. Isolated rendering removes the need to separate parts by color at
  all.
- **"Meshed" needs two separate conditions, not one.** A single overlap threshold cannot
  distinguish envelope tangency from body interpenetration — the two failure modes recorded above.
  `interlocked` requires both a minimum envelope engagement (kills "the parts never even reach
  each other") and a minimum body clearance or zero body-layer overlap (kills "the envelopes
  overlap but the load-bearing bodies pass through each other").
- **Sampling still has to be a contiguous window, not a fixed stride or percentile spread.**
  Aliasing depends on the mechanism's period, not the sample count, and cannot be predicted ahead
  of time — a 384-frame animation sampled at stride 15 for 6 frames, or 144 frames at stride 12
  for 12 frames, can measure the identical value at every sample purely because the stride is
  commensurate with the period. The fix is not a smarter stride; it is detecting zero variance
  across a contiguous window after the fact and treating it as a failed claim, whether the cause
  is aliasing or the geometry genuinely being static.
- **A passing claim proves the declared contact, not that the shapes were a valid pair to begin
  with.** The first fix for the gear-loop example above only moved two gears to a center distance
  that made an `interlocked` claim pass — center distance was the one variable it changed. The
  claim passed, and it still looked wrong: the two driven gears reused the drive gear's tooth path
  at a smaller layer scale, which shrinks the tooth pitch along with the gear, so two gears sharing
  the same tooth count at different radii have different-sized teeth and cannot mesh correctly at
  any center distance. Envelope engagement and body clearance can both look healthy while individual
  teeth visibly clash or gap, because those criteria measure aggregate contact, not tooth-by-tooth
  agreement. The real fix regenerated the smaller gears with a tooth count proportional to their
  radius so the tooth module matched the drive gear, then used the same measurement tool to search
  the remaining free variables (rotation phase, then center distance) for the configuration that
  minimized envelope overlap variance across the full cycle — the tool is precise enough to tune a
  design with, not just gate one after the fact.

What remains manual: whether the claimed contact means anything (see the manual-review boundary
below), and any geometric relation not expressed as a declared claim.

### An undeclared mechanical claim ships anyway

The sibling consumer project published an article figure with three independently rotating gears
and alt text asserting the exact contact claim its geometry verifier exists to prove — with no
claim declared, so nothing measured it. The same gap existed here: the Threads showcase's four
gears asserted a 251px working center distance in `motion.md` since first publication, but no
`composition.geometry` claim made that sentence measurable until the rotation heuristic forced
one — the retro-declared claims then measured 35–38px of real tooth engagement with ~25px of body
clearance, evidence the prose alone never carried. `validate` now blocks two or more independently
rotating layers with no geometry claims; the escape for rotation that genuinely claims nothing is
an attested `mechanics: decorative`, and `mechanics: declared` covers mechanisms rotation-counting
cannot see. The lesson generalizes: a claim that exists only as a sentence in a rationale is not
verified by anything, and nothing detects its absence until a heuristic makes the common case
undeniable.

### A traced connector's rendered pixels are not ground truth — its declared vertices are

Isolation-rendering a trim-revealed connector to test whether its endpoint touches a target
frequently measures an empty or partial mask: before the trace starts the stroke is entirely
invisible, and during it only a fragment is drawn. The `connected` claim therefore never renders
the connector — trim changes how much of the path is drawn, never the vertices, so the endpoint is
read once from the declared `sh` path (through static transforms) and only the target is rendered
per sampled frame. The degeneracy detector is deliberately not applied to these claims: it exists
because a periodic mechanism can alias against a matching sample stride, and a connector-target
pair has no periodic motion — a constant gap across every sampled frame is the expected, correct
outcome. Reuse a check's mechanism only as far as its underlying assumption holds.

### Nominal clearance is not drawn clearance

A card containment check compared a shape layer's nominal rectangle size against its declared
block bounds plus padding, and passed. The shape also carried a centered stroke, which paints half
its width outward from the nominal path — so geometry that was tangent in the declared numbers
necessarily overlapped once drawn. A zero-clearance design with a 2px stroke measured 80px of
actual overlap; the same design at 0.78 units of nominal clearance with a 1px stroke measured
zero. Any clearance or containment budget stated in nominal shape sizes must subtract the full
stroke width plus an antialiasing allowance, not just padding — nominal geometry is not drawn
geometry.

### Aspect ratios are compositions, not transforms

A reviewed portrait showcase became an incoherent landscape one, because safe-area validation says
nothing about suitability for another aspect ratio. Each ratio is its own composition: rebuild the
stable states natively and review that variant's own checkpoints.

### Fail closed is not cleanup

A failed bundle still contains useful design decisions, diagnostics, previews, and hashes. Treating
a validation or rendering failure as permission to delete those artifacts destroys the evidence
needed to revise or compare the work. Fail closed only withholds completion: preserve the bundle and
all completed outputs at their current paths, report the failed gate, and keep cleanup as a separate
exact-target action requiring explicit user confirmation. Retrying, revising, diagnosing, or
starting another bundle never implies cleanup or replacement. A retry clones the failed bundle into
a new destination; a restart clones the unchanged original into a separate new destination. Both
paths preserve the failed bundle as immutable comparison evidence.

## 3. Operative checklists

This guide intentionally repeats no checklist items. Apply:

- [`skills/lottie-maker/references/qa.md`](../skills/lottie-maker/references/qa.md) — the visual QA
  checklist run after every material animation change.
- [`skills/lottie-maker/references/troubleshooting.md`](../skills/lottie-maker/references/troubleshooting.md)
  — symptom, check, and resolution for known failure signatures.

## 4. Manual-review boundaries

Automation cannot currently decide:

- **Semantic meaning** — whether a legal, in-bounds shape communicates anything, or whether
  measured contact between two layers means anything to a viewer.
- **Mechanical credibility beyond a declared claim** — whether contact between two named layers
  actually occurs is now measured (see "Geometry claims need rendered evidence"), removing the
  false positives a careless visual pass on sparse samples could report. What remains manual is
  everything not expressed as a `composition.geometry` claim, and judging whether the measured
  numbers matter for the design's intent.
- **Poster representativeness** — whether a valid frame shows the strongest complete state.
- **Downstream runtime coverage** — whether every consumer player reproduces the bundle; delivery
  and publication QA belong to the consuming pipeline.
