---
name: lottie-maker
description: Create, revise, inspect, diagnose, validate, and deterministically preview portable Lottie JSON animation bundles. Use when an agent needs to make a new Lottie animation for any canvas or language, modify an existing Lottie file without losing unknown data, investigate compatibility or asset problems, render poster/contact-sheet previews, or verify reproducible output. Do not use for raster image generation, After Effects project editing, publishing, or automatic network asset downloads.
---

# Lottie Maker

Build or diagnose one self-contained Lottie JSON bundle. Keep source assets local, preserve factual
copy supplied by the user, and use the bundled CLI for deterministic checks.

## Route the request

- **Create**: read [references/workflow.md](references/workflow.md) and
  [references/brief-contract.md](references/brief-contract.md) completely.
- **Revise**: read the workflow and [references/portable-profile.md](references/portable-profile.md).
  Preserve unknown fields by default; normalize only when the user explicitly requests it.
- **Diagnose**: run `inspect` before reading [references/troubleshooting.md](references/troubleshooting.md).
- **Render or verify**: read [references/qa.md](references/qa.md) before generating previews.
- **Choose motion**: read [references/motion-design.md](references/motion-design.md) when timing,
  easing, choreography, or poster selection is not already finalized.

Resolve `<skill-dir>` to this `SKILL.md` directory. Run the CLI with:

```bash
node <skill-dir>/scripts/lottie-maker.mjs help
```

## Create

1. Confirm the semantic goal, final copy, profile or custom canvas, duration, FPS, loop behavior,
   poster state, local assets, font, palette, and reduced-motion intent. Ask only for missing
   decisions that materially change the animation.
2. Dry-run the scaffold, then create the reserved bundle:

   ```bash
   node <skill-dir>/scripts/lottie-maker.mjs init \
     --id <kebab-id> --profile <profile> --out <output-dir> \
     --title <copy> --intent <semantic-goal> --dry-run
   node <skill-dir>/scripts/lottie-maker.mjs init \
     --id <kebab-id> --profile <profile> --out <output-dir> \
     --title <copy> --intent <semantic-goal>
   ```

   For `custom`, also pass `--width <px> --height <px> --fps <integer>` and
   `--duration <seconds>`; FPS multiplied by duration must be an integer frame count.

3. Write the rationale before changing `animation.json`. Treat `brief.yaml` as the copy, timing,
   font, asset, poster, and composition source of truth. Keep every text fallback playable without
   slot support.
4. Declare composition checkpoints at the poster and every stable information state. Give each
   visible block normalized bounds, a semantic role, and an explicit reading order. Text blocks
   also declare fit limits; card-backed blocks declare padding and, when applicable, an equal-size
   group. Use one focal group per checkpoint and recompose for a new aspect ratio instead of scaling
   a finished layout.
5. Use readable holds, motion with a semantic purpose, deterministic geometry, and a meaningful
   final state. Do not introduce facts or claims absent from user sources.
6. Validate, storyboard, inspect the checkpoint stills, then render, visually inspect, revise, and
   verify. Never silently switch renderer or loosen the portable profile after a failure.

## Revise

1. Confirm the requested timing outcome and a new kebab-case destination. Never edit the sole
   original. Dry-run `clone`, create the copy, and confirm `source_sha256` equals `cloned_sha256`:

   ```bash
   node <skill-dir>/scripts/lottie-maker.mjs clone <original> \
     --id <revision-id> --out <output-dir> --dry-run
   node <skill-dir>/scripts/lottie-maker.mjs clone <original> \
     --id <revision-id> --out <output-dir>
   ```

2. Run `inspect` on the copy and record unsupported features, schema advisories, layer/font
   inventory, and the original hash before editing. A cloned standalone JSON intentionally has no
   `brief.yaml`; add sidecars only when the user requests conversion into a managed bundle.
3. Locate the named text layer and the smallest timing property that implements the request. Change
   only those JSON paths. Preserve unknown keys and unsupported structures unless the
   user explicitly authorizes normalization and accepts its compatibility impact.
4. Run `compare <original> <revision> --json`. Review every `changed_paths` entry; if any path is
   unrelated to the request, restore it before continuing. Fail closed when `truncated` is true.
5. Re-run validation and all previews affected by the change. A changed render requires a fresh
   visual inspection and determinism check. Re-inspect the original and confirm its final hash still
   equals the initial hash. Report the initial original hash, byte-identical pre-edit clone hash,
   final unchanged-original hash, post-edit revision hash, and accepted changed paths.

## Diagnose

Ask for the failing player's name, version, and platform plus one known-good player when the issue
is player-specific. Without those details, report portable-profile findings as hypotheses rather
than attributing a player root cause.

Run inspection without writing output files:

```bash
node <skill-dir>/scripts/lottie-maker.mjs inspect <bundle-or-json> --json
```

Report animation version, structure, timeline, layer paths/types/ranges, assets, fonts, feature
inventory, portable-profile violations, schema advisories, warnings, and source SHA-256. Top-level
`valid` means only that this skill's portable profile passed; it is not an all-player guarantee. Do
not download missing assets, evaluate expressions, or rewrite the file.

## Validate and preview

```bash
node <skill-dir>/scripts/lottie-maker.mjs validate <bundle-or-json> --json
node <skill-dir>/scripts/lottie-maker.mjs storyboard <bundle-or-json> --out <storyboard-dir>
node <skill-dir>/scripts/lottie-maker.mjs render <bundle-or-json> --out <preview-dir>
node <skill-dir>/scripts/lottie-maker.mjs verify <bundle-or-json> --out <verify-dir>
```

`storyboard` renders only the declared checkpoint frames and writes a labeled `storyboard.png`;
review it against the storyboard tier of [references/qa.md](references/qa.md) before the first full
render.

Use `--all-frames` only for a complete sequence. Add `--mp4` or `--gif` only when the user requests
that preview and local `ffmpeg` exists. For a render estimated above 4 GiB raw, show the estimate
and obtain explicit confirmation before `--allow-large-render`.

## Completion contract

Return the bundle path, operation performed, validation status, preview paths, poster frame,
sampled frames, hashes, remaining compatibility warnings, and any skipped optional checks.
For revisions, also return the initial and final original hashes, pre-edit clone hash, post-edit
revision hash, and reviewed path-level diff.
If validation, storyboard, rendering, or verification fails, keep the bundle and every completed
preview, report, and hash record at their current paths. Report the failing gate, retained paths,
and available hashes; fail closed means the bundle is not complete, not that its evidence is
discarded. Treat that failed bundle as immutable evidence. To retry or continue the current
revision, clone the failed bundle to a new absent kebab-case destination. To restart, clone the
unchanged original to a different new destination. Neither request authorizes replacing retained
files.
Completion requires:

- `validate` passes for a new or normalized bundle.
- The storyboard checkpoint stills were inspected before the first full render of a new or
  composition-changing bundle.
- Poster and contact sheet were inspected for copy, font shaping, clipping, safe area, layer order,
  reading order, hierarchy, alignment, spacing, card consistency, pacing, transient states, final
  state, and reduced-motion meaning.
- Two identical renders have matching hashes via `verify`.
- All referenced assets remain local, contained, regular files; no credentials or remote content
  were introduced.

## Boundaries

- MUST NOT fetch assets, call paid APIs, publish, upload, or access credentials.
- MUST NOT execute Lottie expressions or accept remote/data URLs as portable assets.
- MUST NOT present MP4/GIF as the source animation; `animation.json` remains canonical.
- MUST NOT claim arbitrary third-party Lottie files are portable when `inspect` reports violations.
- MUST NOT delete, move, truncate, or overwrite a failed or partial bundle, preview, report, or hash
  record as cleanup. Cleanup is a separate destructive action and requires explicit user
  confirmation naming the exact targets.
- MAY diagnose an invalid import without making it conformant.
