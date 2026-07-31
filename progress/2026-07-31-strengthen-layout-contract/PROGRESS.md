# Strengthen layout contract and publish a Threads showcase

**Slug:** strengthen-layout-contract
**Status:** done
**Ticket:** N/A
**Related plan:** N/A
**Created:** 2026-07-31
**Updated:** 2026-07-31

---

## Scope

| Scope | Branch | Ticket | Notes |
|---|---|---|---|
| `skill-lottie-maker` | `main` | N/A | Composition checkpoints, layout validation, and deterministic Threads showcase |

## Background & goals

Add a portable, checkpoint-based composition contract that lets agents retain design freedom while
the CLI fails closed on unsafe text layout, card padding, and equal-size groups. Forward-test the
contract with a polished Traditional Chinese portrait animation introducing lottie-maker.

## Task list

- [x] Add the composition contract, validator, tests, and skill guidance.
- [x] Bump synchronized plugin/runtime metadata to 0.2.0.
- [x] Add and visually verify the deterministic Threads showcase.
- [x] Run `bash scripts/verify.sh` and record exact results.

## Work log

### 2026-07-31

- Baseline `bash scripts/verify.sh` passed: 9 tests, 3 deterministic examples, trigger evals,
  ESLint, Prettier, and manifest checks.
- Commit `57d15b5` added composition checkpoints, safe-area/non-overlap/text-fit/card validation,
  checkpoint-aware contact sheets, tests, documentation, and the synchronized 0.2.0 release bump.
- Commit `f6a6abc` added the 1080×1920, 24 FPS, 16-second `threads-skill-intro` bundle and
  reproducible builder. Visual QA covered stable holds and transition frames; the final version has
  no missing glyphs, overlap, clipping, or title ghosting, and uses four reasonably meshed,
  alternating-direction gears for the improvement loop.
- Final `bash scripts/verify.sh` passed: 13 tests, 3 deterministic examples plus the new managed
  showcase, 1 diagnostic fixture, 6 trigger cases, ESLint, Prettier, manifests, and smoke renders.
- Two complete 384-frame MP4 renders had identical reports and SHA-256
  `3bd141ff91dd422e7ff40ba132539c45ad0b98c243e9274e4b6b24ef0107bd73`.

## Outcome

> Composition v1 is executable, backward compatible for legacy briefs, documented, tested, and
> forward-verified by the deterministic Threads showcase.

**Final status:** done
**PR / Commit:** `57d15b5`, `f6a6abc`
**Follow-ups:** Push only after the user reviews the final local MP4 and QA images.
