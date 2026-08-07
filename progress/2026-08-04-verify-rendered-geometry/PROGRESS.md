# Verify rendered geometry (contact claims + executable stroke budget)

**Slug:** verify-rendered-geometry
**Status:** done
**Ticket:** N/A
**Related plan:** N/A
**Created:** 2026-08-04
**Updated:** 2026-08-08

---

## Scope

| Scope             | Branch                                  | Ticket | Notes                                                  |
| ------------------ | ---------------------------------------- | ------ | ------------------------------------------------------- |
| `skill-lottie-maker` | `claude/skill-lottie-maker-port-ac5124` | N/A    | Third and final item porting a read-only sibling-project assessment (item D + executable E). Follows [2026-08-04-share-lottie-emit-primitives](../2026-08-04-share-lottie-emit-primitives/PROGRESS.md) |

## Background & goals

`docs/lottie-production-guide.md` already demanded that claims like "meshed" or "connected" be
derived from rendered geometry with explicit contact criteria — and, in the same breath, listed
"mechanical credibility" as something automation could not currently decide. This item closes that
gap: a new `composition.geometry` brief schema declares `interlocked` / `disjoint` / `contained`
relations between two named layers, a new `geometry.mjs` module renders each layer in isolation and
measures contact from the resulting pixel masks, and a new `geometry` CLI subcommand (plus
`verify --geometry`) makes the whole thing runnable. Along the way this also makes item E's stroke
gap budget lesson (documented-only in the first item of this port) executable for free, since an
isolated pixel mask already includes a stroke's full drawn width.

The item also corrects a real defect the assessment surfaced: `examples/skill-improvement-gear-loop`
was itself tangent-only (gear-main and gear-upper/lower were merely touching, not meshed) — the
exact failure mode this feature exists to catch, shipping in the one example that claims to
demonstrate mechanical meshing.

## Task list

- [x] `render.mjs`: export `canvasKit()`, extract `createManagedAnimation`, accept an injected `ck`
      in `renderFrameSet` — zero behavior change, verified against the existing render test suite
- [x] `composition.mjs`: `composition.geometry` schema + `validateGeometryClaims` static validation
      (structure only, no rendering) — 12 new tests
- [x] `geometry.mjs` pure math: `maskFromRgba`, `inradiusPx`, `measurePair`, `summarize`,
      `detectDegeneracy`, `evaluateClaim` — 12 new tests against synthetic disc geometry
- [x] `geometry.mjs` render path: `isolateAnimation`, `verifyGeometry` — 7 new tests, including a
      real render against the (then-still-defective) `skill-improvement-gear-loop` example
- [x] CLI: `geometry` subcommand, `verify --geometry`, `--frames` override, `--dry-run` — 7 new
      CLI-level tests
- [x] Correct `skill-improvement-gear-loop`'s tangent-only geometry; declare its
      `composition.geometry` claims; extend `examples/validate.mjs`; update docs; version bump
      0.2.2 → 0.3.0; `bash scripts/verify.sh` green

## Work log

### 2026-08-04

- **`render.mjs` enabling changes.** Exported `canvasKit()` and `loadAssets()`; extracted
  `createManagedAnimation(ck, animation, assets)` from the guard previously inlined in
  `renderFrameSet`; `renderFrameSet` now accepts an injected `{ ck }` so `verifyGeometry` can share
  one CanvasKit instance across every isolated layer instead of re-initializing WASM per layer.
  Preserved the original surface-disposal-on-throw behavior with an explicit try/catch, since the
  extraction moved that responsibility across a function boundary. Existing render tests pass
  unchanged.
- **`composition.mjs` geometry schema.** Added `GEOMETRY_FIELDS`/`CRITERIA_FIELDS`/
  `UNSUPPORTED_CRITERIA_FIELDS`/`GEOMETRY_RELATIONS` and `validateGeometryClaims(brief, animation,
  profile)`, wired into `validateComposition` so geometry errors surface in the same bare-string
  array checkpoint errors do. `min_clearance_px`/`min_padding_px` are explicitly rejected as
  "not supported yet" rather than silently accepted and ignored (a true minimum-distance criterion
  needs a distance transform — a second algorithm to test — and the binary overlap checks already
  catch every empirical failure this feature targets).
- **`geometry.mjs` pure math.** One combined pixel-pass (`measurePair`) computes overlap, envelope
  engagement (phase-insensitive projection onto the mating axis, quantized to 1e-6 for
  determinism), and `outside_pixels` for `contained`. `inradiusPx` ray-marches from the centroid
  and returns `null` for a hollow/stroke-only shape rather than fabricating a body radius.
  `detectDegeneracy` flags a claim when every measured metric has exactly one distinct value across
  3+ samples — this is the executable form of the guide's "sampled across the full motion interval"
  requirement, since aliasing against a mechanism's period cannot be predicted, only detected.
  Verified against synthetic discs with known analytic geometry (e.g. two r=50 discs 99px apart →
  engagement exactly 1, matching `50+50-99`).
- **The render path found a real bug, not a design bug.** The first end-to-end run against the real
  gear-loop bundle measured every mask as *empty* (`a_pixels: 0`) despite the isolated render
  visibly showing a gear when saved to PNG via the already-proven `makeImageSnapshot` path. Root
  cause: `Canvas.readPixels`'s `dest` parameter must be a `CanvasKit.Malloc`-backed buffer — a
  plain `Uint8Array` is silently accepted by the WASM binding but the call then returns `null`
  instead of writing into it. Fixed by allocating the readback buffer via `kit.Malloc(Uint8Array,
  width*height*4)` and freeing it in the `finally` block. Confirmed the fix by testing all three
  variants (plain array, no `dest` at all, `Malloc`-backed) directly against CanvasKit before
  touching the implementation — the plain-array and `Malloc` paths both returned `null` and a valid
  array respectively, as expected, isolating the exact cause before writing the fix.
- **Empirical measurement of the real defect** (before correcting it): `gear-main`/`gear-upper`
  measured `envelope_engagement_px` ranging from **-2.418 to 1.208** across a contiguous 24-frame
  window (mean -0.162, 13 distinct values — genuine rotation-driven variation, not degenerate).
  This is consistent with, and more precise than, the assessment's hand-calculated static estimate
  of ~1.58px (which used frame-0 nominal radii only; the real rendered geometry varies because the
  gears rotate). Saved the evidence composite render and both isolated masks; the composite
  visually confirms a gap between the gears' teeth, not meshing.
- **Correcting the example.** `gear-main` outer/root radii are 135.0/109.8px (150.0/122.0 local ×
  90% scale); `gear-upper`/`gear-lower` are 90.0/73.2px (× 60% scale) — both originally 223.44px
  from `gear-main` (by symmetry, `gear-lower` had the identical tangent-only defect the assessment
  didn't explicitly flag). Moved both to 205px along their original bearing from `gear-main`
  (naive engagement ≈20px, naive body clearance ≈22px, matching the plan's target), and moved the
  matching background-colored "hub hole" ellipses in the `gear-holes` layer to the same new
  positions — these are separate shape items that visually punch a hole through each gear's hub
  and were not otherwise tied to the gear layers' transforms, so missing this would have left a
  hole floating at the old position. Re-measured post-fix: `main-upper-mesh` engagement 16.0–19.5px
  (11 distinct values), `main-lower-mesh` 16.0–19.5px (10 distinct values), both non-degenerate,
  both `valid`. Visually confirmed genuine tooth interlock across the full contact sheet (8 sampled
  frames spanning the rotation cycle), not just the poster frame.
- **The bundle had no `composition` block at all** (predates the composition contract). Added a
  minimal single-checkpoint block (title + cycle text, bound via existing slots) so `validate`
  passes, plus three geometry claims: `main-upper-mesh` and `main-lower-mesh` (`interlocked`,
  `min_engagement_px: 8`) and `upper-lower-disjoint` (`disjoint`, proving the two driven gears never
  touch each other — measured -233.6 to -230.7px envelope engagement, comfortably disjoint).
- **Gate wiring.** `examples/validate.mjs` now runs `geometry --json` for every example in
  `validExamples`; `geometry` itself reports `status: "skipped"` (not an error) for examples
  declaring no claims, so this is a no-op for the four examples that don't use the feature. Total
  gate time for `examples/validate.mjs` rose from ~9s to ~12.5s.
- **`CANVASKIT_VERSION` cleanup.** Was a hand-maintained literal (`"0.41.1"`) decoupled from the
  actual `canvaskit-wasm` dependency and echoed into every render/geometry report. Now read from
  the installed package's own `package.json` via `import.meta.resolve("canvaskit-wasm/package.json")`
  at module load, so the reported version cannot drift from what actually rendered the bundle.
- **Test suite growth:** 64 → nothing further changed post-fix (64 was already inclusive of all
  item-3 tests); two tests needed updating after the gear-loop correction landed, since they had
  asserted against the *live* committed file rather than fixed values: the tangent-only empirical
  anchor now hardcodes the original pre-fix coordinates (530,220) so it remains a permanent
  regression fixture proving the tool catches a real historical defect, independent of what the
  shipped example currently contains; a new test asserts the *corrected* committed example passes
  all three declared claims. A third test ("skipped when no claims") was repointed from gear-loop
  (which now has claims) to `hello-lottie-maker` (which doesn't).
- **Docs.** `docs/lottie-production-guide.md`: added a layered-verification-model table row for
  rendered-geometry contact verification; expanded "Geometry claims need rendered evidence" with
  the three concrete lessons (isolation vs. palette separation, the two-condition interlocked
  split, contiguous-window sampling); updated the "Mechanical credibility" manual-review boundary
  to state what is now automated vs. what remains manual (semantic meaning, and any relation not
  declared as a claim). `docs/domain-models.md`: added Geometry claim and Geometry report entries.
  `docs/project-overview.md` §5/§8: added `emit.mjs`/`text-metrics.mjs`/`geometry.mjs` to the
  runtime architecture list and the new test coverage to the quality-strategy summary.
  `skills/lottie-maker/references/brief-contract.md`: full `composition.geometry` schema
  documentation, including the root-layers-only limitation and the track-matte refusal.
  `references/workflow.md`: inserted a geometry step between storyboard and sampled render (kept
  the prose-pinned fail-closed paragraph untouched — only the numbered list changed).
  `references/qa.md`: new "Geometry tier" checklist. `references/troubleshooting.md`: five new
  rows for tangent-only, interpenetration, degenerate, hollow-part, and matte-refusal symptoms.
- Version bumped 0.2.2 → 0.3.0 (new brief schema surface, not a patch) across all four manifests
  and the lockfile's embedded version fields; reinstalled clean against the edited lockfile.
- `bash scripts/verify.sh` passes end to end: manifest sync → eval trigger matrix → example
  validate/verify/geometry/drift (5 examples including the corrected gear-loop, 1 fixture,
  3 builders) → `npm test` (64/64) → eslint → prettier → anti-coupling grep.

### Final gear-loop hash

`examples/skill-improvement-gear-loop/animation.json` sha256:
`aff31ca4ef0393e42c1eadeac253fa308a8c3ebe88af9739dc7ec99f320bc8ed`

### 2026-08-08

- Closed item as `done`.

## Outcome

Merged to main via 5b98fc2. New geometry.mjs + geometry CLI subcommand; composition.geometry claims (interlocked/disjoint/contained) checked by isolated-layer rendering and mask contact measurement; corrected gear-loop's tangent-only defect. This closes the 3-item sibling-project port.

**Final status:** done
**PR / Commit:** 5b98fc2
**Follow-ups:** Possible future work, not required: a true minimum-distance criterion via distance transform; extending geometry claims to layers nested inside precomp assets.
