# Build lottie-maker standalone skill

**Slug:** build-lottie-maker
**Status:** done
**Ticket:** N/A
**Related plan:** [build-lottie-maker-lottie-maker-implementation-plan.md](../_plans/build-lottie-maker-lottie-maker-implementation-plan.md)
**Created:** 2026-07-31
**Updated:** 2026-08-08

---

## Scope

| Scope | Branch | Ticket | Notes |
|---|---|---|---|
| `skill-lottie-maker` | `main` | N/A | Standalone public Agent Skill repository |

## Background & goals

Generalize the project-specific Lottie workflow into an independent, reusable Agent Skill. The
result must support creation, revision, diagnosis, validation, deterministic CanvasKit previews,
portable installation, multilingual text, and a custom profile without retaining brag-talker
coupling.

## Task list

- [x] Scaffold the standalone skill, runtime, and official schema/font assets.
- [x] Implement portable profiles, create/inspect/validate/render/verify CLI flows.
- [x] Add fail-closed asset, expression, Skottie, overwrite, and large-render safeguards.
- [x] Add multilingual deterministic tests, evals, manifests, CI, docs, and notices.
- [x] Run skill/plugin validation, dependency audit, complete verification, and visual QA.
- [x] Place the verified repository at the requested `skill-lottie-maker` destination.
- [x] Create the public GitHub repository and organize the implementation into feature commits.
- [x] Fix H.264 output for odd-height profiles discovered during the first trial video.

## Work log

### 2026-07-31

- Initialized the standalone repository and frozen implementation plan.
- Fixed CanvasKit font-family matching and promoted Skottie parser errors to hard failures.
- Passed 6 Node tests, ESLint, Prettier, eval validation, skill/plugin validation, and npm audit.
- Inspected multilingual poster/contact sheet and verified full-frame MP4 encoding with ffmpeg.
- Completed implementation verification; final requested-directory placement remains.
- Forward tests found and verified fixes for long-copy fitting, safe clone/diff preservation, and richer player diagnosis.
- Placed the verified clean repository at /Users/kdanmobile/Documents/private/skill-lottie-maker with node_modules excluded.
- Created https://github.com/FWcloud916/skill-lottie-maker and organized source, tests, docs, and distribution into focused commits.
- Prepared final progress commit after public repository creation.
- Trial-video rendering exposed 1200×675 yuv420p incompatibility; added deterministic 1px padding and regression coverage.

### 2026-08-08

- Closed item as `done`.

## Outcome

Repository implemented, verified, and published to https://github.com/FWcloud916/skill-lottie-maker on main; the item stayed in review only because this project commits straight to main with no PR-merge gate to trip the tracker automatically.

**Final status:** done
**PR / Commit:** 1888045, 43fe446, 6674eb7, f9baeef, 3f41c0e
**Follow-ups:** Install dependencies with npm ci --ignore-scripts --prefix skills/lottie-maker before local development.
