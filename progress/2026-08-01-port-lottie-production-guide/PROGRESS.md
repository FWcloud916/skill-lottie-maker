# Port the Lottie production experience guide

**Slug:** port-lottie-production-guide
**Status:** done
**Ticket:** N/A
**Related plan:** N/A
**Created:** 2026-08-01
**Updated:** 2026-08-01

---

## Scope

| Scope | Branch | Ticket | Notes |
|---|---|---|---|
| `skill-lottie-maker` | `main` | N/A | Docs only; no runtime change |

## Background & goals

A downstream consumer project distilled its Lottie production incidents into an experience guide:
a layered verification model, pitfall narratives, and manual-review boundaries. Several lessons
originate from bundles produced with this toolchain, so the portable subset belongs here. Goal:
add `docs/lottie-production-guide.md` scoped to this repo (no publication, upload, or
consumer-pipeline concerns), route it from `AGENTS.md`, and link it from the quality strategy,
without duplicating the operative checklists in `skills/lottie-maker/references/`.

## Task list

- [x] Write `docs/lottie-production-guide.md` (verification-layer table, six lessons, checklist
      pointers, manual boundaries) with only in-scope content
- [x] Add the `AGENTS.md` "Read before work" routing row
- [x] Link the guide from `docs/project-overview.md` section 8 and bump its Last updated
- [x] Register this progress item in `progress/INDEX.md`
- [x] Pass `bash scripts/verify.sh` and record results

## Work log

### 2026-08-01

- Ported the guide from the consumer project's incident-derived document, rewriting it in
  repo-generic wording: dropped delivery-policy, immutable-upload, revision-budget, and
  browser-article QA lessons; reframed downstream player QA as a consumer-owned layer.
- Kept the guide as a narrative "why" layer: operative checklists remain solely in
  `references/qa.md` and `references/troubleshooting.md`, which the guide links instead of
  repeating.
- Added the AGENTS.md routing row and the project-overview quality-strategy link.
- `bash scripts/verify.sh` passed: manifest sync, eval and example validation, 13 node tests,
  ESLint, Prettier, and the decoupling grep. A manual grep confirmed the guide contains no
  consumer-project or out-of-scope tokens.
- Follow-up in the same day: declared the guide a living document — an AGENTS.md convention now
  requires distilling any newly exposed, uncovered failure mode into the guide in the same change.

## Outcome

**Final status:** done — guide added, routed, and verified; no runtime change.
**PR / Commit:** `4694d04`
**Follow-ups:** none
