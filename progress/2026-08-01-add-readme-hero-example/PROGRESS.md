# Add the README hero example animation

**Slug:** add-readme-hero-example
**Status:** done
**Ticket:** N/A
**Related plan:** N/A
**Created:** 2026-08-01
**Updated:** 2026-08-01

---

## Scope

| Scope | Branch | Ticket | Notes |
|---|---|---|---|
| `skill-lottie-maker` | `main` | N/A | New example bundle plus committed README media |

## Background & goals

The README described the skill but showed no motion. Goal: author a small validated example
animation with this skill's own workflow, commit lightweight preview media, and surface both the
animation and the new storyboard stage in the README.

## Task list

- [x] Author `examples/hello-lottie-maker` (960x540, 24 FPS, 4 s, two composition checkpoints,
      mixed-script copy, equal-size workflow chips) via a bundle-local `build.mjs`
- [x] Pass validate; review the storyboard; render, inspect the contact sheet, and hash-verify
- [x] Commit `docs/media/` GIF (12 FPS, 480 px, 71 KB), poster, and storyboard with a scoped
      `!docs/media/*.gif` ignore exception
- [x] Register the bundle in `examples/validate.mjs` and `examples/README.md`
- [x] Add the README hero section and a reproduce-with-storyboard block
- [x] Pass `bash scripts/verify.sh` and record results

## Work log

### 2026-08-01

- The fail-closed validator rejected the first two composition drafts (card containment, then text
  line height versus declared bounds); fixed by enlarging chip cards to 220x72 and declaring
  0.06-height bounds with 12 px padding.
- Storyboard review caught a title underline that stopped mid-word; widened it from 190 px to
  310 px to match the title, confirmed by pixel measurement of the rendered frame (x 70-379).
- `verify` reported deterministic hashes across two renders; the contact sheet shows the intended
  entrance, stagger, and final-hold phases.

- `bash scripts/verify.sh` passed with the new bundle included in the example gate: manifest sync,
  eval validation, four double-rendered hash-compared examples, 14 node tests, ESLint, Prettier,
  and the decoupling grep.

## Outcome

**Final status:** done — example bundle, committed media, and README sections verified.
**PR / Commit:** `4ef4afd`
**Follow-ups:** none

