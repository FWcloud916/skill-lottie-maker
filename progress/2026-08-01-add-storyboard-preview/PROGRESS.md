# Add a storyboard preview stage

**Slug:** add-storyboard-preview
**Status:** in-progress
**Ticket:** N/A
**Related plan:** N/A
**Created:** 2026-08-01
**Updated:** 2026-08-01

---

## Scope

| Scope | Branch | Ticket | Notes |
|---|---|---|---|
| `skill-lottie-maker` | `main` | N/A | New `storyboard` CLI subcommand plus workflow/QA docs |

## Background & goals

Most recorded production defects were composition errors visible in the declared stable states, yet
the first reviewable artifact today appears only after a full sampled render. Checkpoint frames are
already declared and validated but never rendered on their own. Goal: add a `storyboard` subcommand
that renders exactly the declared checkpoint frames with a labeled sheet, and insert a storyboard
review step between `validate` and `render` so composition findings are fixed before any full
render.

## Task list

- [x] Extract `checkpointFrames` and a shared frame-set renderer in `lib/render.mjs`
- [x] Add `renderStoryboard` with a labeled `storyboard.png` (CanvasKit text, bundled font) and
      `storyboard-report.json`; frame hashes stay unlabeled
- [x] Wire the `storyboard` subcommand into usage and dispatch
- [x] Add a determinism test rendering exactly the declared checkpoint frames twice
- [x] Update `workflow.md` (new lifecycle step), `qa.md` (storyboard tier vs motion tier),
      `SKILL.md` (create sequence, preview commands, completion contract)
- [x] Update `docs/lottie-production-guide.md` verification-layer table and
      `docs/domain-models.md` render-report model
- [ ] Pass `bash scripts/verify.sh` and record results

## Work log

### 2026-08-01

- Implemented the subcommand and library support; a real 640x360 demo storyboard was rendered and
  visually inspected: checkpoint still plus `checkpoint 1 · frame 18 · poster` label with correct
  Traditional Chinese shaping.
- Split the visual QA checklist into a storyboard (composition) tier and a motion (render) tier so
  the new stage has explicit criteria.

## Outcome

> Fill in after development finishes.

**Final status:**
**PR / Commit:**
**Follow-ups:**
