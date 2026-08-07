# Harden bundle validation (line separators, slots, short-circuit)

**Slug:** harden-bundle-validation
**Status:** done
**Ticket:** N/A
**Related plan:** N/A
**Created:** 2026-08-04
**Updated:** 2026-08-08

---

## Scope

| Scope             | Branch                                  | Ticket | Notes                                                  |
| ------------------ | ---------------------------------------- | ------ | ------------------------------------------------------- |
| `skill-lottie-maker` | `claude/skill-lottie-maker-port-ac5124` | N/A    | First of three items porting a read-only sibling-project assessment (items A, B, F, plus documentation-only E and two CI gate gaps) |

## Background & goals

A read-only assessment of this skill against Lottie work done in a sibling project identified six
portable improvements (A–F). This item covers the three that are pure validator hardening with no
example rebuild: A (reject line-break characters in text documents), B (slot/fallback consistency),
and F (stop `validateBundle`'s single try/catch from discarding every finding after the first
profile-resolution failure) — plus the E lesson as documentation only, and two gaps found in the CI
gate along the way. Items C (shared emit primitives) and D (rendered-geometry contact verification)
are separate, later progress items because they rebuild example bytes and need fresh visual QA.

## Task list

- [x] Empirically measure line-separator rendering against the pinned CanvasKit/Skottie build
      before writing any rule (do not port the sibling project's assumption uncritically)
- [x] A: warn on `\n`/`\r` in `inspectAnimation`; promote to error in `validateBundle` when a brief
      is present; fix `composition.mjs`'s text-fit math to measure the concatenated string
- [x] B: add `validateSlots` — binding (sid or layer name), verbatim text, complete style set,
      `brief.copy` agreement
- [x] F: decompose `validateBundle`'s single try/catch into independently guarded groups
- [x] E (docs only): stroke-width clearance budget lesson in the production guide and
      `references/motion-design.md`
- [x] Gate gaps: add `threads-skill-intro` to `examples/validate.mjs`; fix the example count log;
      add the `marketplace.json` nested version to the manifest sync check
- [x] Tests for all of the above; version bump 0.2.0 → 0.2.1; `bash scripts/verify.sh` green

## Work log

### 2026-08-04

- **Empirical probe first.** Built throwaway bundles in the scratchpad with `\n`, `\r`, and `\r\n`
  titles and rendered them through the repo's pinned CanvasKit 0.41.1. Measured result, which
  **inverts** the sibling project's working assumption: `\n` is *not* honored as a line break — it
  renders as a single line with a substitute glyph inline. `\r` happens to break the line cleanly in
  this build (undocumented, not established for any other Lottie player). `\r\n` breaks the line but
  leaves a substitute-glyph artifact at the start of line two. Conclusion: ban **both** characters,
  not just `\n` — no line separator is portable authoring here, regardless of which one happens to
  work in this specific renderer build.
- Quantified the resulting silent false pass numerically using the real `estimateTextUnits`
  function: for a two-segment title the old per-line-`Math.max` fit math computed `requiredWidth`
  as low as half the true concatenated-line width (e.g. 432 vs. 864 estimated units against an
  800-unit available width — old math passes, true rendered width overflows).
- Implemented A in `skills/lottie-maker/scripts/lib/lottie.mjs` (`LINE_SEPARATOR_PATTERN`,
  `report.features.line_separators`, warning in `inspectAnimation`, promotion to error in
  `validateBundle`) and `scripts/lib/composition.mjs` (fit math now measures the concatenated
  string with separators stripped, matching what the renderer actually draws).
- Implemented B: `validateSlots(animation, brief)` in `lottie.mjs`. Confirmed empirically (grep)
  that no `sid` exists anywhere in this repo's examples, so slot binding checks both `sid` and
  layer-name paths. Enforces verbatim text match against the bound layer's fallback, complete style
  key coverage (`f`,`s`,`j`,`tr`,`lh`,`fc`) when the slot is a full text document, and agreement with
  `brief.copy` when both are declared.
- Implemented F: `validateBundle` now runs three independently guarded groups — brief-structural
  and profile-independent checks (copy binding, background order, slots, line-separator promotion),
  profile resolution in its own try/catch, and profile-dependent checks (canvas/timeline/poster
  range/composition) gated on `profile !== null`, with an explicit
  `"profile-dependent checks were skipped; re-run validate after fixing the profile"` message when
  they are. Verified with a CLI test that breaks both `fps` and the copy binding in the same brief
  edit: both errors now surface from one `validate` call, where previously only the profile error
  would.
- Wrote the E lesson (stroke gap budget) into `docs/lottie-production-guide.md` and
  `references/motion-design.md` as documentation only — no containment-check code change, since
  both example `build.mjs` builders emit a 2px stroke and an executable check would likely
  invalidate existing examples; that belongs to the later geometry item where the rendered-mask
  path can enforce it exactly instead of heuristically.
- Found and closed two CI gate gaps while reading `examples/validate.mjs`: `threads-skill-intro`
  (214 KB, the largest example) was absent from `validExamples` and so was never run through
  `validate`/`verify` by `scripts/verify.sh`; the closing log line also hardcoded "3" against a
  4-item loop. Added the example (confirmed it independently passes: ~9s for validate+verify) and
  made the count computed from `validExamples.length`.
- Added the `marketplace.json` nested plugin version to the manifest-sync assertion in
  `scripts/verify.sh` — it carries a fourth copy of the version that was previously unchecked.
- Tests added: `test/slots.test.mjs` (9 cases covering every `validateSlots` branch),
  `test/composition.test.mjs` (regression case proving the old per-line-max fit math missed an
  overflow the concatenated-string math catches), `test/cli.test.mjs` (2 cases: the bare-JSON
  warning / managed-bundle error promotion boundary for line separators, and the multi-error
  recovery for F). Full suite: 30/30 passing (was 18 before this item).
- Version bumped 0.2.0 → 0.2.1 across all four manifests
  (`skills/lottie-maker/package.json`, `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`,
  `.claude-plugin/marketplace.json`) plus `skills/lottie-maker/package-lock.json`'s embedded
  version fields; `npm ci --ignore-scripts` re-verified clean against the edited lockfile.
- `bash scripts/verify.sh` passes end to end: manifest sync (now 4-way) → eval trigger matrix →
  example validate/verify (now 5 examples) → `npm test` (30/30) → eslint (clean) → prettier
  (clean, after formatting the two edited reference docs) → anti-coupling grep (clean).

### 2026-08-08

- Closed item as `done`.

## Outcome

Merged to main via 5b98fc2. Rejected non-portable line-break characters in managed text documents, fixed composition text-fit math (concatenated width, not per-line max), added slot/fallback consistency validation, and decomposed validateBundle so one bad field no longer hides every other finding.

**Final status:** done
**PR / Commit:** 5b98fc2
**Follow-ups:** None.
