# Workflow

## Contents

1. Inputs
2. Bundle lifecycle
3. Editing imported files
4. Rendering and handoff

## Inputs

Collect the operation (`create`, `revise`, or `diagnose`), output location, semantic goal, final
copy, canvas/profile, timing, poster state, assets, fonts, palette, and compatibility target.
Structural examples may guide JSON shape but are never factual sources.

Use only reviewed local files. For an imported animation, compute and retain its source hash before
editing. Never use a remote URL, data URL, symlink, or path outside the bundle.

## Bundle lifecycle

1. Reserve a kebab-case bundle ID and confirm the destination is absent.
2. Run `init --dry-run`, inspect the paths, then scaffold.
3. Finalize `brief.yaml`; define composition checkpoints for stable holds and update `motion.md`
   before authoring JSON.
4. Bind each `copy` entry to a same-named native text layer. Add a slot only when the target player
   supports it, and always retain the matching fallback.
5. Run `validate`. Fix copy binding, safe-area, overlap, reading-order, text-fit, card-padding, and
   equal-size errors without switching profile or renderer.
6. Run sampled `render`; inspect poster, early, quarter, middle, three-quarter, late, and final frames.
7. Revise, regenerate previews, and run `verify` until deterministic.
8. Generate full frames or MP4/GIF only when the user requests them.

## Editing imported files

Inspection is read-only. For a sole original, require an absent destination and use `clone --dry-run`
then `clone`; matching source and cloned hashes are the edit authorization boundary. Confirm the
requested timing in frames or seconds before changing keyframes. Edit the smallest relevant JSON
path and use `compare` to inventory every changed path. Preserve unknown JSON keys and unsupported
feature structures on ordinary revisions. Treat a truncated diff as a failure. At completion,
re-hash the original and prove it still matches its initial hash; retain separate evidence for the
pre-edit clone and post-edit revision hashes.

If a requested edit cannot be made inside the portable profile, explain the conflict and ask whether
to retain the feature without a rendering guarantee or explicitly normalize it. A standalone JSON
clone may remain without `brief.yaml` and `motion.md`; report skipped sidecars instead of modifying
the original or inventing metadata.

Normalization is a separate user-authorized operation. Save to a new bundle, update the rationale,
list removed/replaced features, and require the same gates as a new animation.

## Rendering and handoff

The default renderer samples frames, writes `poster.png`, `contact-sheet.png`, and `report.json`,
and does not retain a full sequence. `verify` renders twice and compares frame SHA-256 values.
Treat renderer success as necessary but not sufficient: the agent must inspect visual output.

Handoff paths relative to the bundle whenever possible. State skipped checks exactly; for example,
`MP4 skipped: not requested` or `full-sequence render skipped: sampled verification only`.
