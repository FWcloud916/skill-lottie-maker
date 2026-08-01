# Reproducible examples

These bundles demonstrate four distinct `lottie-maker` outcomes:

- `hello-lottie-maker`: the README hero — a 960×540, 24 FPS, four-second restrained opener with
  mixed-script copy, two composition checkpoints, and equal-size workflow chips. Its GIF, poster,
  and storyboard live in [`docs/media/`](../docs/media/).
- `skill-improvement-gear-loop`: a 720×720, 30 FPS, four-second semantic loop with multilingual copy.
- `profile-portability`: one focal signal adapted to the four built-in canvas families.
- `deterministic-verification`: an inspection gate, blocked unsafe branch, and matching render hashes.

`fixtures/unsafe-remote-asset.json` is intentionally invalid. It exists only to prove that `inspect`
reports a remote asset without fetching it. Never treat it as a playable example.

From the repository root:

```bash
node skills/lottie-maker/scripts/lottie-maker.mjs validate examples/hello-lottie-maker --json
node skills/lottie-maker/scripts/lottie-maker.mjs storyboard examples/hello-lottie-maker --out /tmp/hello-storyboard
node skills/lottie-maker/scripts/lottie-maker.mjs render examples/profile-portability --out /tmp/profile-preview
node skills/lottie-maker/scripts/lottie-maker.mjs verify examples/deterministic-verification --out /tmp/verify-preview
node skills/lottie-maker/scripts/lottie-maker.mjs inspect examples/fixtures/unsafe-remote-asset.json --json
```

Run `node examples/build-showcases.mjs` only when intentionally rebuilding the two generated
landscape examples, and `node examples/hello-lottie-maker/build.mjs` for the README hero. Committed
JSON remains the canonical source reviewed by visual QA.
