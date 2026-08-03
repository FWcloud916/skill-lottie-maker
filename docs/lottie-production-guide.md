# Lottie production experience guide

> **Last updated:** 2026-08-03

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

### A valid background can still hide the scene

In the managed renderer, earlier root-layer array entries paint above later ones. An opaque
full-frame background placed first can therefore hide every text and shape layer while schema and
render checks still succeed. Managed bundles keep `background` as the final root layer and validate
that order before storyboard rendering. Bare imported JSON remains read-only and is not rejected or
normalized solely for this managed convention.

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

- **Semantic meaning** — whether a legal, in-bounds shape communicates anything.
- **Mechanical credibility** — whether contact actually occurs; a careless visual pass can report a
  false positive.
- **Poster representativeness** — whether a valid frame shows the strongest complete state.
- **Downstream runtime coverage** — whether every consumer player reproduces the bundle; delivery
  and publication QA belong to the consuming pipeline.
