# Revise Threads showcase for landscape

**Slug:** revise-threads-showcase-landscape
**Status:** done
**Ticket:** N/A
**Related plan:** N/A
**Created:** 2026-07-31
**Updated:** 2026-07-31

---

## Scope

| Scope | Branch | Ticket | Notes |
|---|---|---|---|
| `skill-lottie-maker` | `main` | N/A | Recompose the Threads showcase as 16:9 and correct semantic inputs and gear meshing |

## Background & goals

The reviewed portrait showcase left four unlabeled blue boxes with no visible purpose and used gear
rotations without a tooth-pitch phase offset. Recompose the full video for 16:9, make every card
semantic, and keep equal gears meshed through the full improvement cycle.

## Task list

- [x] Recompose all four stable states for a 1920×1080 canvas.
- [x] Replace empty fragments and pipeline nodes with labeled inputs and steps.
- [x] Apply a half-tooth phase offset and equal opposite rotation to adjacent gears.
- [x] Run the complete verification gate and inspect poster, contact sheet, and full MP4.
- [x] Copy the accepted media into brag-talker and update its manifest description.

## Work log

### 2026-07-31

- Started from standalone commit `166191f` with a clean worktree.
- Reopened visual QA as a separate WIP item because the prior feature is already terminal `done`.
- Rebuilt the showcase as a native 1920×1080 composition with labeled `copy`, `timing`, `assets`,
  and `layout` inputs plus labeled validation nodes.
- Adjacent 12-tooth gears now use a 15-degree half-pitch phase offset and all four begin their
  equal-magnitude, opposite-direction rotation at frame 300; five actual-video samples confirmed
  that horizontal and vertical contact points remain meshed.
- `bash scripts/verify.sh` passed: 13 tests, ESLint, Prettier, trigger/eval/example checks, and smoke
  renders. Two complete 384-frame MP4 renders matched SHA-256
  `695d1a75e3e45efb4aebf68cd21cb99fd07aba119b25fef7326ebf74c9fa3c83`.

## Outcome

The deterministic Threads showcase is now a verified 16:9 bundle with semantic inputs and
synchronized gears. Publishing and upload remain outside this repository.

**Final status:** done
**PR / Commit:** `9f2daf9`
**Follow-ups:** Review the copied media in brag-talker before any R2 upload or Threads publication.
