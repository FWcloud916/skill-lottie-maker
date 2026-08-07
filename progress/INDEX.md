# Progress Item Index

Items are created by `new_progress.py`, then maintained with
`update_progress.py` by developers or agents. See [`README.md`](README.md)
for usage and invoke the installed `progress-tracker` skill for the full
workflow.

## Items

| Status | Item | Folder | Scope | Ticket | Plan | Created | Notes |
|---|---|---|---|---|---|---|---|
| `done` | Showcase all five examples in the README | `progress/2026-08-04-showcase-five-examples/` | `skill-lottie-maker` | N/A | N/A | 2026-08-04 | Gallery mixing GIF/storyboard/poster; fixed a caption-clipping bug and a gear-tooth-module mismatch the geometry claims couldn't detect |
| `done` | Verify rendered geometry (contact claims + executable stroke budget) | `progress/2026-08-04-verify-rendered-geometry/` | `skill-lottie-maker` | N/A | N/A | 2026-08-04 | New `geometry.mjs` + `geometry` CLI subcommand; corrected gear-loop's tangent-only defect; 0.3.0; 3rd of 3 port items |
| `done` | Share Lottie emit primitives across generator and examples | `progress/2026-08-04-share-lottie-emit-primitives/` | `skill-lottie-maker` | N/A | N/A | 2026-08-04 | New `scripts/lib/emit.mjs`; all 4 example JSONs rebuilt, pixel-verified (AE=0); 0.2.2; 2nd of 3 port items |
| `done` | Harden bundle validation (line separators, slots, short-circuit) | `progress/2026-08-04-harden-bundle-validation/` | `skill-lottie-maker` | N/A | N/A | 2026-08-04 | Line-separator ban, slot/fallback consistency, `validateBundle` decomposition; 0.2.1; 1st of 3 port items |
| `done` | Validate managed background layer order | `progress/2026-08-03-validate-managed-background-order/` | `skill-lottie-maker` | N/A | N/A | 2026-08-03 | Managed bundles keep an opaque background below content without changing bare-import diagnostics |
| `done` | Preserve failed Lottie bundle artifacts | `progress/2026-08-03-preserve-failed-bundles/` | `skill-lottie-maker` | N/A | N/A | 2026-08-03 | Fail closed retains bundle evidence; cleanup requires confirmation |
| `done` | Add the README hero example animation | `progress/2026-08-01-add-readme-hero-example/` | `skill-lottie-maker` | N/A | N/A | 2026-08-01 | `hello-lottie-maker` bundle; README GIF/storyboard media |
| `done` | Add a storyboard preview stage | `progress/2026-08-01-add-storyboard-preview/` | `skill-lottie-maker` | N/A | N/A | 2026-08-01 | `storyboard` subcommand; checkpoint stills reviewed before full render |
| `done` | Port the Lottie production experience guide | `progress/2026-08-01-port-lottie-production-guide/` | `skill-lottie-maker` | N/A | N/A | 2026-08-01 | Docs only; consumer-incident lessons scoped to this repo |
| `done` | Correct Threads connectors and gears | `progress/2026-07-31-correct-threads-connectors-and-gears/` | `skill-lottie-maker` | N/A | N/A | 2026-07-31 | Edge connectors; synchronized gear mesh; MP4 `980394d8…2be4` |
| `done` | Revise Threads showcase for landscape | `progress/2026-07-31-revise-threads-showcase-landscape/` | `skill-lottie-maker` | N/A | N/A | 2026-07-31 | 16:9 verified; MP4 `695d1a75…3c83` |
| `done` | Strengthen layout contract and publish a Threads showcase | `progress/2026-07-31-strengthen-layout-contract/` | `skill-lottie-maker` | N/A | N/A | 2026-07-31 | 0.2.0 composition contract and deterministic portrait forward test verified |
| `done` | Add reproducible showcase examples | `progress/2026-07-31-add-showcase-examples/` | `skill-lottie-maker` | N/A | N/A | 2026-07-31 | 3 deterministic examples and 1 diagnostic fixture verified |
| `done` | Build lottie-maker standalone skill | `progress/2026-07-31-build-lottie-maker/` | `skill-lottie-maker` | N/A | [build-lottie-maker-lottie-maker-implementation-plan.md](_plans/build-lottie-maker-lottie-maker-implementation-plan.md) | 2026-07-31 |  |
| `done` | Port motion-craft numeric guidance and a pre-validation self-check | `progress/2026-08-08-port-motion-craft-numerics/` | `skill-lottie-maker` | N/A | N/A | 2026-08-08 |  |

## Status legend

Keep each item's status here identical to the Status field in its
`PROGRESS.md`.

<!-- STATUS_LIFECYCLE_START -->
Status enum: `planning`, `in-progress`, `review`, `blocked`, `done`, `abandoned`

```
planning → in-progress ⇄ review → done
                ↕
             blocked

Any non-terminal status → abandoned
```
<!-- STATUS_LIFECYCLE_END -->

| Status | Meaning |
|---|---|
| `planning` | Item created, implementation not started (scaffold-script default) |
| `in-progress` | Under active development |
| `review` | PR/MR opened, in code review / QA — **not** `done`; that comes after merge |
| `blocked` | Paused on an external dependency |
| `done` | Development complete (PR/MR merged) |
| `abandoned` | Stopped without completing |
