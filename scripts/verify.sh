#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
skill_root="$repo_root/skills/lottie-maker"

node -e '
const fs = require("node:fs");
const root = process.argv[1];
const npm = JSON.parse(fs.readFileSync(`${root}/skills/lottie-maker/package.json`, "utf8"));
const codex = JSON.parse(fs.readFileSync(`${root}/.codex-plugin/plugin.json`, "utf8"));
const claude = JSON.parse(fs.readFileSync(`${root}/.claude-plugin/plugin.json`, "utf8"));
if (npm.version !== codex.version || npm.version !== claude.version) throw new Error("manifest versions differ");
if (codex.name !== "skill-lottie-maker" || claude.name !== "lottie-maker") throw new Error("plugin names are invalid");
' "$repo_root"

node "$repo_root/evals/validate.mjs"
node "$repo_root/examples/validate.mjs"
npm test --prefix "$skill_root"
npm run lint --prefix "$skill_root"
npm run format:check --prefix "$skill_root"

if rg -n -i 'brag-talker|imfw\.io|social_card_style|article-lottie|reel spec' "$skill_root" \
  --glob '!scripts/schemas/lottie.schema.json'; then
  echo "project-specific coupling found in portable skill" >&2
  exit 1
fi

echo "verification passed"
