# Reproducible examples

These bundles demonstrate three distinct `lottie-maker` outcomes:

- `skill-improvement-gear-loop`: a 720×720, 30 FPS, four-second semantic loop with multilingual copy.
- `profile-portability`: one focal signal adapted to the four built-in canvas families.
- `deterministic-verification`: an inspection gate, blocked unsafe branch, and matching render hashes.

`fixtures/unsafe-remote-asset.json` is intentionally invalid. It exists only to prove that `inspect`
reports a remote asset without fetching it. Never treat it as a playable example.

From the repository root:

```bash
node skills/lottie-maker/scripts/lottie-maker.mjs validate examples/skill-improvement-gear-loop --json
node skills/lottie-maker/scripts/lottie-maker.mjs render examples/profile-portability --out /tmp/profile-preview
node skills/lottie-maker/scripts/lottie-maker.mjs verify examples/deterministic-verification --out /tmp/verify-preview
node skills/lottie-maker/scripts/lottie-maker.mjs inspect examples/fixtures/unsafe-remote-asset.json --json
```

Run `node examples/build-showcases.mjs` only when intentionally rebuilding the two generated
landscape examples. Their committed JSON remains the canonical source reviewed by visual QA.
