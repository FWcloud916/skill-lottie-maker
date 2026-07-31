# Correct Threads connectors and gears

**Slug:** correct-threads-connectors-and-gears
**Status:** done
**Ticket:** N/A
**Related plan:** N/A
**Created:** 2026-07-31
**Updated:** 2026-07-31

---

## Scope

| Scope | Branch | Ticket | Notes |
|---|---|---|---|
| `skill-lottie-maker` | `main` | N/A | Keep pipeline connectors outside cards and mesh the four-gear transmission by rendered tooth-envelope geometry |

## Background & goals

Visual review found that the Act 3 rail crossed its labels and the Act 4 gears remained separated.
Split the rail into edge-to-edge connector segments and derive gear centers from the actual polygon
tooth envelope instead of the outer diameter.

## Task list

- [x] Replace the continuous pipeline rail with three between-card segments.
- [x] Set the equal-gear working center distance to 251 px from the rendered tooth envelope.
- [x] Center tooth／valley contact with 3.75°／18.75° checkerboard phases.
- [x] Validate, render twice, inspect actual video frames, and copy accepted media.

## Work log

### 2026-07-31

- Started from standalone commit `e4eceb3` and brag-talker commit `500d16c`, both clean.
- Split the Act 3 rail into three card-edge connectors and confirmed frame 264 visually.
- Set the four equal gears to a 251 px working center distance with checkerboard phases of
  3.75°／18.75° and a shared frame-300 rotation start.
- Rendered all 384 frames twice; both MP4 files produced SHA-256
  `980394d8d45a229f539b85070cfade6b0b9f1cf666a92c88cb5cfc67df732be4`.
- Inspected a full-video contact sheet plus gear frames 300／315／330／345／360／375; all four
  horizontal and vertical contacts remain engaged while adjacent gears rotate equally in opposite
  directions.
- `bash scripts/verify.sh`: passed 13 tests, ESLint, Prettier, 6 trigger cases, 3 deterministic
  examples, and 1 diagnostic fixture.
- Feature commit: `383ab8d` (`fix: correct Threads connector and gear geometry`).

## Outcome

The 16:9 Threads showcase now keeps connector strokes outside every pipeline card and presents one
visually engaged four-gear transmission with deterministic, synchronized motion. The accepted MP4
was copied into brag-talker for its own media and publication-gate validation; no upload or social
publication was performed.
