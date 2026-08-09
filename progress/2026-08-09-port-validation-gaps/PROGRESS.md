# Port the consumer project's validation-gap gates (hold budget, connected claim, mechanics declaration, storyboard-before-revise)

**Slug:** port-validation-gaps
**Status:** done
**Ticket:** N/A
**Related plan:** N/A
**Created:** 2026-08-09
**Updated:** 2026-08-09

---

## Scope

| Scope | Branch | Ticket | Notes |
|---|---|---|---|
| `skill-lottie-maker` | `claude/port-validation-gaps` | N/A | `composition.mjs`, `geometry.mjs`, `brief-contract.md`, `motion-design.md`, `pre-validation-self-check.md`, `SKILL.md` |

## Background & goals

The sibling consumer project (`brag-talker`) closed a set of validation gaps under its Feature #37
(five slices, completed 2026-08-09): its reading-hold budget became a blocking finding instead of a
warning nothing reads; its geometry verifier gained a `connected` claim that pixel-proves a
connector endpoint touches its target; content that *looks* mechanical (two or more independently
rotating layers) now requires a geometry declaration instead of silently shipping an unverified
contact claim; and its authoring contract now requires re-reading storyboard evidence before
revising a composition finding. This repo already ported that project's rendered-geometry
verification (`2026-08-04-verify-rendered-geometry`) and motion-craft numerics
(`2026-08-08-port-motion-craft-numerics`), so it has the measurement machinery and the hold-time
formula — but the formula is guidance only, the claim vocabulary stops at
`interlocked`/`disjoint`/`contained`, nothing forces a mechanical-looking bundle to declare any
claim, and the revise route never requires re-inspecting storyboard stills.

This item ports the four applicable gates, adapted to this repo's single-bundle model (no
multi-scene checks — the consumer's monotony/duplicate-copy slice does not apply):

1. **Hold-budget gate**: `validate` derives each text block's hold (first declared checkpoint to
   the layer's next outgoing transform keyframe or the timeline end) and fails when it is below
   `motion-design.md`'s reading-time formula; a deliberate exception is declared per block as
   `hold_waiver` with a reason, and an unused waiver is itself an error so exemptions cannot
   outlive their excuse.
2. **`connected` geometry relation**: the endpoint is read once from the connector's declared path
   vertices (a trim-revealed connector renders empty or partial at most sampled frames, so its
   pixels are not stable ground truth — its declared vertices are); only the target is isolation-
   rendered, and the per-frame gap must stay within `max_gap_px`. The degeneracy detector is
   deliberately not applied: a connector-target pair has no periodic motion, so a constant gap is
   the expected correct outcome, not aliasing.
3. **Mechanics declaration**: a brief whose animation has two or more independently rotating
   non-background root layers must either declare `composition.geometry` claims or set
   `mechanics: decorative` (attesting the rotation makes no contact claim); `mechanics: declared`
   forces claims for mechanisms the rotation heuristic cannot see (belts, pistons, ratchets).
4. **Storyboard-before-revise**: a revision driven by a visual or composition finding re-inspects
   the storyboard checkpoint stills before editing, because fit arithmetic proves a string fits its
   box, never that the composed frame reads correctly.

## Task list

- [x] B3: `connected` relation in `geometry.mjs` + structural validation in `composition.mjs` + CLI/docs
- [x] B1: hold-budget gate in `composition.mjs` with per-block `hold_waiver` + unused-waiver audit
- [x] B4: `mechanics` brief field (`declared`/`decorative`) + rotating-layer heuristic
- [x] B5: storyboard-before-revise rule in `SKILL.md`/`workflow.md`/self-check
- [x] Tests for all four gates; examples stay green as regression
- [x] Docs: `brief-contract.md`, `motion-design.md`, `pre-validation-self-check.md`, production guide
- [x] `bash scripts/verify.sh` green; INDEX + Outcome updated

## Work log

### 2026-08-09

- Created item; branch `claude/port-validation-gaps` from main at `b3f0552`. Design decisions
  recorded in Background & goals.
- Implemented all four gates. The hold gate needed one semantic adaptation discovered by its own
  first run: the consumer's Reel scenes cut away (text gone at scene end), but a standalone Lottie
  persists on its final frame, so text whose stable window runs to the timeline end is exempt —
  without that, `init`'s own scaffold failed its own validator on short custom timelines.
- The B4 heuristic immediately caught the shipped Threads showcase: its `motion.md` asserted a
  251px working-center-distance gear mesh since first publication, with no measurable claim.
  Declared 4 interlocked + 2 disjoint claims and measured them for real (engagement 35–38px, body
  clearance ~25px, diagonals zero overlap); calibrated `min_engagement_px: 30` from the
  measurements. The same run surfaced one genuine reading-hold debt (act1 body, 68 < 82 frames),
  migrated as a documented `hold_waiver` rather than silently retimed.
- Tests: hold gate (fail/waiver/unused-waiver/exempt/transition), budget formula, stableWindow,
  connected structural + pure endpoint/gap math + a render-backed CLI case (attached endpoint
  passes, far endpoint fails, degenerate stays false), mechanics heuristic/declared/decorative.
  Full `bash scripts/verify.sh` green (all tests, eslint, prettier).

## Outcome

> Fill in after development finishes.

**Final status:** done — all four gates ported, measured, and regression-covered; the shipped
Threads showcase now carries 6 pixel-verified geometry claims and 1 documented hold waiver.
**PR / Commit:** this commit on `claude/port-validation-gaps`, merged to `main`.
**Follow-ups:** none planned. The consumer project's storyboard-evidence packet convention
(absolute path + sha256) has no counterpart here because this repo has no main-agent/subagent
split; revisit only if one appears.
