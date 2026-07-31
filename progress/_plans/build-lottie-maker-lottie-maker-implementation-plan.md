# lottie-maker implementation plan

- Create an independent Agent Skills repository at `skill-lottie-maker` with the canonical skill in `skills/lottie-maker/`.
- Implement a Node.js ESM CLI for scaffold, inspect, validate, render, and verify workflows.
- Support landscape, portrait, square, icon, and custom profiles; generate portable Lottie JSON bundles with deterministic CanvasKit previews.
- Package the skill for Codex plugins, Claude Code plugins, and the Skills CLI.
- Add human and agent documentation, MIT and third-party notices, CI, tests, evals, and progress tracking.
- Verify unit/integration tests, lint, format, skill metadata, packaging consistency, multilingual rendering, and deterministic hashes.
