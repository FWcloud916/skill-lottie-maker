# Port motion-craft numeric guidance and a pre-validation self-check

**Slug:** port-motion-craft-numerics
**Status:** done
**Ticket:** N/A
**Related plan:** N/A
**Created:** 2026-08-08
**Updated:** 2026-08-08

---

## Scope

| Scope | Branch | Ticket | Notes |
|---|---|---|---|
| `skill-lottie-maker` | `claude/port-motion-craft-numerics` | N/A | `motion-design.md`, new `pre-validation-self-check.md`, `workflow.md` |

## Background & goals

A read-only assessment of this repo alongside its sibling consumer project (`brag-talker`, which
generalized its motion-design workflow into this standalone skill) found that
`references/motion-design.md` here is craft guidance with almost no numbers: it says "prefer
ease-out entrances" but gives no frame counts, no easing curve, no hold-time formula, and no
step-by-step mechanical-derivation procedure. The consumer project independently accumulated all of
that as numeric guidance in its own `motion-craft.md`, driven by real incidents (two shipped gear
animations with visually impossible meshing because a claim was eyeballed, not derived) — this repo
even ported that project's incident-derived production guide once already
(`2026-08-01-port-lottie-production-guide`), but not its motion-craft numerics.

This item ports the numeric layer, generalized to this repo's actual audience (any canvas/aspect
ratio, not the consumer project's fixed Reel/article targets — see the anti-coupling grep in
`scripts/verify.sh` for the boundary): a signature easing curve, entrance/exit/stagger frame ranges
parameterized by FPS (not hard-coded to 24), a reading-hold-time formula generalized across
character-based and word-based languages (not hard-coded to Chinese), and the five-step mechanical-
credibility derivation procedure — plus the two concrete lessons this repo's own
`docs/lottie-production-guide.md` already records in narrative form (scaled layers shrink tooth
pitch; equal tooth count does not imply equal radius meshes) rewritten as operable rules a fresh
authoring pass can apply before generating geometry, not only diagnose after the fact.

It also ports the sibling project's `pre-handoff-self-check.md` pattern: an ordered self-check list
where each item names the actual finding code(s) it prevents, with a drift test pinning those codes
against the real validator source so the list cannot silently go stale. This repo currently only
has post-hoc human review (`references/qa.md`); a self-check run before `validate` catches the same
class of defect before spending a validation/render cycle on it.

Expected outcome: `motion-design.md` gains the numeric layer (word count roughly triples but every
number is checkable against something — the earlier content stays, prose-only items condensed
where a number now covers the same ground); a new `references/pre-validation-self-check.md` exists
with drift-tested finding-code citations, wired into `SKILL.md`'s create/revise routes before
`validate`; `workflow.md` and `motion-design.md` gain a one-line requirement that authored `motion.md`
files contain a beat sheet (this repo's storyboard is checkpoint stills, not a narrative structure,
so this is scoped to the rationale document, not a CLI change). `bash scripts/verify.sh` stays green
throughout.

## Task list

- [x] Extend `skills/lottie-maker/references/motion-design.md` with the numeric layer: signature
      easing, FPS-parameterized entrance/exit/stagger frame ranges, overshoot cap, a generalized
      reading-hold-time formula (CJK character-rate and Latin word-rate variants), and the five-step
      mechanical-credibility derivation procedure, plus the two gear-meshing lessons rewritten as
      operable pre-generation rules.
- [x] Add a one-line requirement to `motion-design.md` (and `references/workflow.md` where the
      create/revise flow is described) that authored `motion.md` contains a beat sheet.
- [x] Add `skills/lottie-maker/references/pre-validation-self-check.md`: an ordered self-check list,
      each item citing the real finding code(s) it prevents (drawn from
      `scripts/lib/composition.mjs`, `scripts/lib/geometry.mjs`, and the bundle validator), wired
      into `SKILL.md`'s create and revise routes immediately before `validate`.
- [x] Add a drift test pinning every finding code cited in the new self-check against the actual
      validator/composition/geometry source, mirroring the sibling project's pattern.
- [x] Run `bash scripts/verify.sh` end to end (manifest sync, eval matrix, examples, node tests,
      eslint, prettier, anti-coupling grep) and confirm it stays green.
- [x] Confirm no forbidden term (`brag-talker`, `imfw.io`, `social_card_style`, `article-lottie`,
      `reel spec`) was introduced — the anti-coupling grep in `verify.sh` is the enforcement, this
      is a pre-check before running it.

## Work log

### 2026-08-08

- Closed 7 stale `review`-status progress items that were already merged to `main` with passing
  gates (`showcase-five-examples`, `verify-rendered-geometry`, `share-lottie-emit-primitives`,
  `harden-bundle-validation`, `preserve-failed-bundles`, `add-showcase-examples`,
  `build-lottie-maker`) — a precondition the driving plan called out before opening new work here.
  `bash scripts/verify.sh` reconfirmed green (64/64) after the status-only edits.
- Scaffolded this item and opened `claude/port-motion-craft-numerics` from `main`.
- Implementation complete: motion-design.md numeric layer, pre-validation-self-check.md, workflow.md wiring, drift test. bash scripts/verify.sh green (67/67).
- Closed item as `done`.

## Outcome

Ported motion-craft's numeric layer (signature easing, FPS-parameterized entrance/exit/stagger frame ranges, overshoot cap, a generalized CJK-character-rate/Latin-word-rate hold-time formula, and the six-step mechanical-credibility derivation folding in this repo's own tooth-module/pitch lesson) into motion-design.md. Added pre-validation-self-check.md (9 ordered items, 8 citing exact validator error-message fragments, drift-tested against lottie.mjs/composition.mjs/geometry.mjs) wired into SKILL.md's Create and Revise routes before validate. Added a beat-sheet requirement for multi-phase motion.md. bash scripts/verify.sh green (67/67 tests, lint, format, evals, examples, anti-coupling grep).

**Final status:** done
**PR / Commit:** claude/port-motion-craft-numerics (not yet merged)
**Follow-ups:** None.
