# lottie-maker — Agent Guide

Standalone Agent Skill for creating and verifying portable Lottie JSON bundles.

## Hard constraints

- MUST keep `skills/lottie-maker/` as the canonical skill source.
- MUST preserve unknown imported JSON fields unless normalization is explicitly requested.
- MUST NOT fetch assets, evaluate expressions, publish, upload, call paid APIs, or access secrets.
- MUST keep all referenced assets as regular local files contained by the bundle.
- MUST treat `animation.json` as canonical; MP4 and GIF are previews only.
- MUST inspect poster and contact sheet after every render-affecting change.
- MUST pass `bash scripts/verify.sh` before declaring code changes complete.
- MUST manage feature work in `progress/` with progress-tracker and WIP = 1.

## Read before work

| Task | Read first |
|---|---|
| Architecture or workflow | `docs/project-overview.md` |
| Bundle fields and invariants | `docs/domain-models.md` |
| JavaScript or test changes | `docs/coding-style.md` |
| Skill behavior | `skills/lottie-maker/SKILL.md` and the routed references |

## Commands

```bash
npm ci --ignore-scripts --prefix skills/lottie-maker
npm test --prefix skills/lottie-maker
npm run lint --prefix skills/lottie-maker
npm run format:check --prefix skills/lottie-maker
bash scripts/verify.sh
node skills/lottie-maker/scripts/lottie-maker.mjs help
```

## Session routine

1. Read `progress/INDEX.md` and resume the only in-progress item.
2. Run `git log -3`, `git status`, and the last recorded test gate.
3. Make bounded changes; do not overwrite user bundles or unrelated work.
4. Run `bash scripts/verify.sh`, visually inspect any changed render, then update progress with
   actual results, current state, and next steps.

## Conventions

- Use Node ESM, two-space indentation, semicolons, and explicit file extensions.
- Use `node:` imports before third-party and local imports.
- Keep CLI stdout machine-readable; errors go to stderr and nonzero exit codes.
- A dry-run MUST NOT write files.
- New files use kebab-case except ecosystem-required filenames.
- Tests use `node:test`, temp directories, multilingual copy, and deterministic assertions.
- Update `> **Last updated:** YYYY-MM-DD` in every modified file under `docs/`.
- Keep versions synchronized across npm, Codex, and Claude manifests.
