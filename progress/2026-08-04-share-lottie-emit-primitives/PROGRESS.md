# Share Lottie JSON emit primitives across generator and examples

**Slug:** share-lottie-emit-primitives
**Status:** review
**Ticket:** N/A
**Related plan:** N/A
**Created:** 2026-08-04
**Updated:** 2026-08-04

---

## Scope

| Scope             | Branch                                  | Ticket | Notes                                                  |
| ------------------ | ---------------------------------------- | ------ | ------------------------------------------------------- |
| `skill-lottie-maker` | `claude/skill-lottie-maker-port-ac5124` | N/A    | Second of three items porting a read-only sibling-project assessment (item C). Follows [2026-08-04-harden-bundle-validation](../2026-08-04-harden-bundle-validation/PROGRESS.md) |

## Background & goals

`createAnimation` (the `init` skeleton generator) and all three example `build.mjs` scripts each
hand-rolled their own copies of the same Lottie JSON construction patterns — a text layer's
document shape, a stroked rectangle group, an entrance-fade keyframe curve — with two of the three
builders sharing roughly 75% of their helpers at near-identical implementation, and the third
using an incompatible, mutually exclusive signature convention for the same concepts. This item
extracts one shared primitives module (`skills/lottie-maker/scripts/lib/emit.mjs`) and rewires
`createAnimation` and all three builders onto it, so a construction pattern is defined once instead
of once per caller. It also deduplicates two smaller byte-identical duplicates found during the
prior item's exploration: `estimateTextUnits` (copy-pasted between the generator and the
composition validator) and `pointerToken` (copy-pasted between the library and the CLI).

Explicitly not touched: `examples/skill-improvement-gear-loop` (hand-authored, no builder; its
tangent-only gear geometry is a known defect that the next item corrects) and the composition
validator's stroke-width blindness (item E's executable half, deferred to the next item where
rendered-mask geometry can enforce it exactly).

## Task list

- [x] Read all four construction sites (`createAnimation`, three `build.mjs` files) and design one
      reconciled options-object API covering every distinct behavior found (linear vs. eased
      entrance, with/without exit fade, static-at-zero shortcut, slide-in vs. static position,
      stroked vs. unstroked shapes)
- [x] Implement `scripts/lib/emit.mjs`; move `estimateTextUnits` to `scripts/lib/text-metrics.mjs`
      (imported by both `lottie.mjs` and `composition.mjs`); move `pointerToken` to `scripts/lib/io.mjs`
      (imported by both `lottie.mjs` and `lottie-maker.mjs`)
- [x] Rewire `createAnimation`; verify byte-identical output against the pre-refactor
      implementation across three varied inputs
- [x] Rewire `hello-lottie-maker/build.mjs`; verify determinism and pixel-identical render
- [x] Rewire `threads-skill-intro/build.mjs`; verify determinism and pixel-identical render
- [x] Rewire `build-showcases.mjs` (`profile-portability` + `deterministic-verification`); verify
      determinism and pixel-identical render for both
- [x] Add a builder-vs-artifact drift check to `examples/validate.mjs`; bump version 0.2.1 → 0.2.2;
      `bash scripts/verify.sh` green

## Work log

### 2026-08-04

- **Design.** Read `createAnimation` and all three `build.mjs` files in full before writing
  `emit.mjs`. Found the entrance-opacity behavior split into three genuinely distinct policies
  across the four sites: `hello-lottie-maker`/`threads-skill-intro` always fade in linearly with
  no eased curve; `createAnimation`/`build-showcases.mjs` use an eased bezier curve; and
  `build-showcases.mjs` additionally special-cases `start === 0` as fully static (no fade at all)
  — a real per-bundle authoring choice, not an artifact, so `entranceOpacity` takes it as an
  explicit `staticAtZero` option rather than a universal default. `threads-skill-intro` additionally
  supports an optional exit fade (`end`/`keep`) that no other site uses. Reconciled all four into
  one `entranceOpacity(start, {end, keep, eased, fadeInFrames, staticAtZero})`.
- Reconciled the two incompatible `transform`-shaped helpers: `threads-skill-intro`'s (takes a
  pre-built opacity *property object*) and `build-showcases.mjs`'s (takes a *start frame* and
  builds opacity internally) — the shared `transform`/`shapeLayer`/`textLayer` in `emit.mjs` take
  a pre-built `opacity` property (matching the more composable convention), and each builder's
  local wrapper computes that property itself before calling in.
- Implemented `skills/lottie-maker/scripts/lib/emit.mjs`: `staticProperty`, `keyframedProperty`,
  `entranceOpacity`, `slidePosition`, `transform`, `fillGroup`, `rectangle`, `ellipse`, `pathShape`,
  `textDocumentValue`, `textDocument`, `textLayer`, `shapeLayer`, `backgroundLayer`, `layerRank`.
  Kept genuinely bespoke choreography (gear tooth-path generation, the 4-keyframe "converging"
  position used once in `threads-skill-intro`) local to that builder rather than generalizing it —
  matches the plan's explicit scope boundary (share primitives, not a spec compiler).
- Moved `estimateTextUnits` to `scripts/lib/text-metrics.mjs` and `pointerToken` to
  `scripts/lib/io.mjs`; both were byte-identical duplicates found during the prior item's
  exploration. Both call sites now import from one place.
- **Verification methodology.** Every rewrite was checked two ways before moving to the next:
  (1) a semantic JSON diff between the pre-refactor committed `animation.json` and the freshly
  rebuilt one, leaf by leaf; (2) an ImageMagick `compare -metric AE` pixel diff between a
  storyboard/contact-sheet render captured *before* the rewrite and the same render *after*.
  - `createAnimation`: byte-identical (`JSON.stringify` equal) across three varied inputs
    (CJK title / no title / mixed CJK+ASCII; preset and custom profiles; loop true and false) —
    confirmed with a standalone comparison script, not just test-suite passage.
  - `hello-lottie-maker`: 1 semantic leaf diff — the background rectangle's original code passed
    the same color as both fill and stroke (a self-colored, visually inert stroke); the shared
    `backgroundLayer` helper omits the stroke entirely. **AE = 0** (pixel-identical).
  - `threads-skill-intro`: 2 semantic leaf diffs, both isolated to the background layer — the same
    inert self-colored stroke removed, and a bare `r: 0` (the original background call bypassed
    the `shapeLayer` wrapper and hit `transform`'s own unwrapped default) now `r: {a:0,k:0}`.
    **AE = 0**.
  - `profile-portability` / `deterministic-verification`: 8 and 17 leaf diffs respectively, all the
    same shape — every `start > 0` entrance gained a leading `{t:0,s:[0]}` hold keyframe that the
    original `opacity(start)` omitted (a keyframed property already holds its first keyframe's
    value for any earlier time, so this is a no-op). **AE = 0** for both contact sheets.
  - Every diff found was anticipated by the design read *before* running the comparison, not
    discovered after the fact — the tool confirmed the prediction each time.
- Also confirmed (`--json validate` + `verify --out`) all four rebuilt bundles report
  `status: "valid"` and `deterministic: true`.
- **Builder-vs-artifact drift check.** Added `checkBuilderDrift` to `examples/validate.mjs`: for
  each builder, copies it plus `emit.mjs` into a temp directory replicating the real relative
  import depth (the builder under a stand-in `examples/`, the shared lib one level above,
  matching the exact `../` count each builder's import actually uses), runs it there, and diffs
  its output against the committed file — byte for byte, throwing on any mismatch. Verified the
  check actually catches drift by temporarily corrupting `hello-lottie-maker/animation.json` and
  confirming the check failed with the expected message, then restored and re-confirmed the
  restored file matches a fresh rebuild exactly.
- Also documented `threads-skill-intro`'s build command in `examples/README.md` (it was previously
  undocumented there, matching its earlier absence from the CI gate closed in the prior item) and
  noted that all three builders now share `emit.mjs`.
- Version bumped 0.2.1 → 0.2.2 across all four manifests and the lockfile's embedded version
  fields (new brief/behavior surface is unchanged — this bump is for the shared-library
  refactor and example-byte changes, not a new feature).
- `bash scripts/verify.sh` passes end to end, including the new drift check riding in through the
  existing `examples/validate.mjs` call: manifest sync → eval trigger matrix → example
  validate/verify/drift (5 examples, 1 fixture, 3 builders) → `npm test` (30/30, unchanged from
  the prior item — this item touched no test files) → eslint → prettier (skill scope; the touched
  `examples/*.mjs` files were also formatted for hygiene, though they are outside the gated scope)
  → anti-coupling grep.

### Rebuilt example hashes (sha256 of committed `animation.json`)

| Example | sha256 |
|---|---|
| `hello-lottie-maker` | `59319880f6e3f412c532a4f230f7482330e8a847fbae5b02114947dbef560556` |
| `threads-skill-intro` | `7875e72a4719cef422587fddaac0c05147125db58c6119b3d622b9565fecd13d` |
| `profile-portability` | `3f2c1f0927a54c535dfb1bb9fffa546487f607753d61d6a96baeb321b451723c` |
| `deterministic-verification` | `61818e063f11d4cc7cea8a04f9f095e3ad6b90adce54ca61a9a43634b6bc7bb5` |

## Outcome

**Final status:** Complete — all task-list items done, `bash scripts/verify.sh` green, every
rebuilt example verified pixel-identical (AE = 0) to its pre-refactor render.
**PR / Commit:** Not yet opened; changes are on `claude/skill-lottie-maker-port-ac5124`.
**Follow-ups:** Item 3 (`verify-rendered-geometry`, item D + executable E) is the last item in this
port. It corrects `examples/skill-improvement-gear-loop`'s known tangent-only gear geometry
(~1.58px measured envelope engagement) and makes the stroke-width clearance lesson (item E,
documented only so far) executable via rendered-mask contact criteria.
