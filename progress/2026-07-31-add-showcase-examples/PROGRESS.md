# Add reproducible showcase examples

**Slug:** add-showcase-examples
**Status:** done
**Ticket:** N/A
**Related plan:** N/A
**Created:** 2026-07-31
**Updated:** 2026-08-08

---

## Scope

| Scope | Branch | Ticket | Notes |
|---|---|---|---|
| `skill-lottie-maker` | `main` | N/A | Reusable examples and deterministic verification |

## Background & goals

Add three article-backed examples that demonstrate semantic motion, reusable canvas profiles, and
diagnostic/deterministic gates without weakening the portable bundle contract.

## Task list

- [x] Add the gear improvement cycle, profile showcase, and verification gate examples.
- [x] Add an intentionally invalid remote-asset fixture with expected diagnostics.
- [x] Validate, render, visually inspect, and deterministically verify every valid example.
- [x] Extend repository verification and document reproducible commands.

## Work log

### 2026-07-31

- Baseline `bash scripts/verify.sh` passed: 9 tests, ESLint, Prettier, eval validation, and manifest checks.
- Added three portable examples plus one intentionally invalid remote-asset fixture.
- Visual QA caught hidden signal marks and unclear verification branches; corrected shape order and connectors.
- Final `bash scripts/verify.sh` passed: 3 deterministic examples, 1 diagnostic fixture, 9 tests,
  ESLint, Prettier, eval validation, and manifest checks.

### 2026-08-08

- Closed item as `done`.

## Outcome

Merged to main via 9e87f90/517efda. Three portable deterministic examples plus one intentionally invalid remote-asset fixture, included in the repository verification gate. The noted brag-talker article-delivery follow-up shipped separately in the sibling project.

**Final status:** done
**PR / Commit:** 9e87f90, 517efda
**Follow-ups:** None; the brag-talker-side follow-up was out of this repo's scope and has since shipped independently in that project.
