# lottie-maker

`lottie-maker` is a standalone, portable Agent Skill for creating, revising, diagnosing,
validating, and deterministically previewing Lottie JSON animation bundles. It generalizes the
motion-design workflow into reusable profiles and a custom canvas mode without tying the skill to
one publishing pipeline, aspect ratio, language, or product.

The canonical output is always `animation.json`. Each created bundle also keeps its editable brief,
motion rationale, local assets, deterministic preview report, poster, and contact sheet.

## What it does

- Creates landscape, portrait, square, icon, or custom-canvas Lottie bundles.
- Preserves unknown fields when revising imported JSON.
- Diagnoses expressions, unsupported layers, remote assets, missing files, symlinks, and timeline
  mismatches without rewriting the source.
- Applies a conservative portable subset on top of the official Lottie schema.
- Renders multilingual text with a bundled Noto Sans CJK TC font through CanvasKit/Skottie.
- Verifies reproducibility by comparing SHA-256 hashes from two renders.
- Optionally encodes complete frame sequences as MP4 or GIF when local `ffmpeg` is available.

## Requirements

- Node.js 22 or newer
- npm
- Optional: `ffmpeg` for MP4/GIF previews

Install runtime dependencies after cloning:

```bash
npm ci --ignore-scripts --prefix skills/lottie-maker
```

## Install as an Agent Skill

With the Skills CLI:

```bash
npx skills add FWcloud916/skill-lottie-maker --skill lottie-maker
```

With Codex, install the repository as a plugin or copy `skills/lottie-maker` into the active skills
directory. The plugin manifest lives at `.codex-plugin/plugin.json`.

With Claude Code:

```bash
claude plugin marketplace add FWcloud916/skill-lottie-maker
claude plugin install lottie-maker@skill-lottie-maker
```

## CLI quick start

```bash
node skills/lottie-maker/scripts/lottie-maker.mjs init \
  --id hello-motion --profile landscape-16x9 --title "Hello 動畫" \
  --out ./work --dry-run

node skills/lottie-maker/scripts/lottie-maker.mjs init \
  --id hello-motion --profile landscape-16x9 --title "Hello 動畫" \
  --out ./work

node skills/lottie-maker/scripts/lottie-maker.mjs validate ./work/hello-motion --json
node skills/lottie-maker/scripts/lottie-maker.mjs render ./work/hello-motion --out ./preview
node skills/lottie-maker/scripts/lottie-maker.mjs verify ./work/hello-motion --out ./verify
```

Profiles are `landscape-16x9`, `portrait-9x16`, `square-1x1`, `icon`, and `custom`. Custom mode also
requires `--width`, `--height`, `--fps`, and `--duration`.

To revise the only copy of an imported animation safely, clone it byte-for-byte and audit the
path-level diff after editing:

```bash
node skills/lottie-maker/scripts/lottie-maker.mjs clone ./original.json \
  --id revised-copy --out ./work --dry-run
node skills/lottie-maker/scripts/lottie-maker.mjs clone ./original.json \
  --id revised-copy --out ./work
node skills/lottie-maker/scripts/lottie-maker.mjs compare \
  ./original.json ./work/revised-copy/animation.json --json
```

## Bundle contract

```text
<id>/
├── brief.yaml
├── animation.json
├── motion.md
└── assets/
    └── fonts/
```

Render output is separate from the source bundle and contains sampled frames, `poster.png`,
`contact-sheet.png`, and `report.json`. See [project overview](docs/project-overview.md) and the
skill's [brief contract](skills/lottie-maker/references/brief-contract.md) for details.

## Development

```bash
npm test --prefix skills/lottie-maker
npm run lint --prefix skills/lottie-maker
npm run format:check --prefix skills/lottie-maker
bash scripts/verify.sh
```

Development progress is managed in `progress/` with the `progress-tracker` Agent Skill. WIP is one.

## Security and portability

The validator rejects expressions, remote/data URLs, escaping or symlinked assets, and unsupported
layer types. The skill does not fetch assets, call paid APIs, publish, upload, or access credentials.
The official schema result is reported separately as advisory because the Community Specification
schema does not currently cover every widely-rendered text-layer field.

## License

MIT. Bundled third-party material retains its own license; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
