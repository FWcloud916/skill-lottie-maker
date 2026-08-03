# Validate managed background layer order

**Slug:** validate-managed-background-order
**Status:** done
**Ticket:** N/A
**Related plan:** N/A
**Created:** 2026-08-03
**Updated:** 2026-08-03

---

## Scope

| Scope | Branch | Ticket | Notes |
|---|---|---|---|
| `skill-lottie-maker` | `main` | N/A | Managed-bundle validation, brief contract, production guide, and tests |

## Background & goals

A managed Reel passed structural validation while an opaque full-frame `background` at the front of
the Lottie layer array hid every content layer. Standalone validation already collects composition
errors and exposes safe area through `brief.yaml`, so this task adds only the missing managed-layer
order rule while preserving bare imported JSON behavior.

## Task list

- [x] Reject a managed bundle whose named root background is not the final layer.
- [x] Document the z-order rule without imposing it on bare imported JSON.
- [x] Add regression coverage and pass the full verification gate.

## Work log

### 2026-08-03

- Baseline `bash scripts/verify.sh` passed 15 tests plus trigger, example, lint, format, and coupling gates.
- Added managed-only root background order validation and preserved standalone JSON import behavior.
- Updated the skill, brief/workflow references, and production guide with the final-layer rule.
- Final `bash scripts/verify.sh` passed 18 tests plus trigger, example, lint, format, and coupling gates.

## Outcome

Managed bundles now fail validation when a named background precedes visible root layers. Bare
imports retain their original layer order and are not rejected by this managed convention.

**Final status:** done
**PR / Commit:** this commit
**Follow-ups:** none
