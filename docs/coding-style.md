# Coding style

> **Last updated:** 2026-07-31

## JavaScript

- Use Node ESM with explicit `.mjs` extensions and Node 22+ APIs.
- Use two spaces, semicolons, double quotes, trailing commas where Prettier chooses them, and
  descriptive names.
- Order imports as `node:`, third-party, then local modules.
- Keep filesystem boundaries explicit. Resolve and validate paths before reading assets.
- Throw `Error` with actionable messages; the CLI owns stderr and exit-code translation.
- Keep stdout as one parseable JSON document for `--json`, render, and verify commands.

## CLI behavior

- `--dry-run` performs complete argument/profile validation and writes nothing.
- Creation refuses an existing destination.
- Inspection is read-only, including for invalid inputs.
- Validation precedes every render.
- Large full renders require the explicit acknowledgement flag.
- MP4/GIF encoding requires a complete frame sequence and local `ffmpeg`.

## Tests

- Use built-in `node:test` and strict assertions.
- Isolate filesystem tests in OS temp directories.
- Cover both successful output and fail-closed behavior.
- Include Traditional Chinese plus Latin text in renderer tests.
- Assert deterministic hashes, not timestamps or platform-specific paths.

## Documentation and dependencies

- Keep `SKILL.md` concise and route details to references.
- Update the last-updated line for modified docs.
- Pin runtime dependencies and use `npm ci --ignore-scripts`.
- Record copied schemas, fonts, and adapted concepts in `THIRD_PARTY_NOTICES.md`.
