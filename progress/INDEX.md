# Progress Item Index

Items are created by `new_progress.py`, then maintained with
`update_progress.py` by developers or agents. See [`README.md`](README.md)
for usage and invoke the installed `progress-tracker` skill for the full
workflow.

## Items

| Status | Item | Folder | Scope | Ticket | Plan | Created | Notes |
|---|---|---|---|---|---|---|---|
| `done` | Add the README hero example animation | `progress/2026-08-01-add-readme-hero-example/` | `skill-lottie-maker` | N/A | N/A | 2026-08-01 | `hello-lottie-maker` bundle; README GIF/storyboard media |
| `done` | Add a storyboard preview stage | `progress/2026-08-01-add-storyboard-preview/` | `skill-lottie-maker` | N/A | N/A | 2026-08-01 | `storyboard` subcommand; checkpoint stills reviewed before full render |
| `done` | Port the Lottie production experience guide | `progress/2026-08-01-port-lottie-production-guide/` | `skill-lottie-maker` | N/A | N/A | 2026-08-01 | Docs only; consumer-incident lessons scoped to this repo |
| `done` | Correct Threads connectors and gears | `progress/2026-07-31-correct-threads-connectors-and-gears/` | `skill-lottie-maker` | N/A | N/A | 2026-07-31 | Edge connectors; synchronized gear mesh; MP4 `980394d8…2be4` |
| `done` | Revise Threads showcase for landscape | `progress/2026-07-31-revise-threads-showcase-landscape/` | `skill-lottie-maker` | N/A | N/A | 2026-07-31 | 16:9 verified; MP4 `695d1a75…3c83` |
| `done` | Strengthen layout contract and publish a Threads showcase | `progress/2026-07-31-strengthen-layout-contract/` | `skill-lottie-maker` | N/A | N/A | 2026-07-31 | 0.2.0 composition contract and deterministic portrait forward test verified |
| `review` | Add reproducible showcase examples | `progress/2026-07-31-add-showcase-examples/` | `skill-lottie-maker` | N/A | N/A | 2026-07-31 | 3 deterministic examples and 1 diagnostic fixture verified |
| `review` | Build lottie-maker standalone skill | `progress/2026-07-31-build-lottie-maker/` | `skill-lottie-maker` | N/A | [build-lottie-maker-lottie-maker-implementation-plan.md](_plans/build-lottie-maker-lottie-maker-implementation-plan.md) | 2026-07-31 |  |

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
