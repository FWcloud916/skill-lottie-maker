# Add reproducible showcase examples

**Slug:** add-showcase-examples
**Status:** review
**Ticket:** N/A
**Related plan:** N/A
**Created:** 2026-07-31
**Updated:** 2026-07-31

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

## Outcome

Examples are reproducible, deterministic, documented, and included in the repository verification gate.

**Final status:** review
**PR / Commit:** `9e87f90`, `517efda`
**Follow-ups:** Finish the separate `brag-talker` article delivery adapters and review before publication.
