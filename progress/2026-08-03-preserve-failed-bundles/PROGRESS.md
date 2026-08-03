# Preserve failed Lottie bundle artifacts

**Slug:** preserve-failed-bundles
**Status:** review
**Ticket:** N/A
**Related plan:** N/A
**Created:** 2026-08-03
**Updated:** 2026-08-03

---

## Scope

| Scope | Branch | Ticket | Notes |
|---|---|---|---|
| `skill-lottie-maker` | `main` | N/A | Skill contract, workflow reference, production guide, and tests |

## Background & goals

Clarify that fail-closed validation or rendering stops completion but never authorizes deletion of
the bundle, previews, reports, or hash evidence. Cleanup remains a separate, exact-target operation
requiring explicit user confirmation. Keep retry budgets and consumer-specific restart choices out
of this standalone skill.

## Task list

- [x] Add artifact-retention and cleanup-authorization rules to the skill and workflow.
- [x] Record the failure mode in the production guide and add contract coverage.
- [x] Run full verification and a fresh-session forward test.

## Work log

### 2026-08-03

- Baseline `bash scripts/verify.sh` passed with 14 tests, lint, format, trigger evals, examples, and
  project-coupling scan.
- Added fail-closed retention and exact-target cleanup authorization rules to the skill contract,
  workflow reference, and production guide.
- The first fresh-session forward test exposed an overwrite interpretation, so failed bundles are
  now immutable evidence and every follow-up uses a new absent destination.
- The second forward test exposed a retry-versus-restart ambiguity. Retry and continue now clone
  the failed bundle; restart clones the unchanged original.
- `quick_validate.py` passed. Final `bash scripts/verify.sh` passed 15 tests plus lint, format,
  trigger evals, deterministic examples, diagnostic fixture, and project-coupling scan.
- The final fresh-session forward test selected the failed bundle as the retry source, proposed a
  new revision destination, retained both prior bundles and all artifacts, and rejected cleanup or
  overwrite authorization.

## Outcome

Fail-closed handling now preserves failed and partial Lottie bundles as immutable evidence. Retry
and continue clone the failed attempt to a new destination; restart clones the unchanged original.
Cleanup remains a separate destructive action requiring exact-target user confirmation.

**Final status:** review
**PR / Commit:** Uncommitted on `main` at baseline HEAD `6c5fce9`
**Follow-ups:** Review and commit the implementation.
