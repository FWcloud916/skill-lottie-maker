# hello-lottie-maker motion rationale

- Intent: a restrained four-second opener that introduces the skill's three-step workflow.
- Canvas: custom 960x540 at 24 FPS so the README GIF stays small; 96 frames, no loop.
- Focal order: the `lottie-maker` title anchors first with an accent underline, the muted subtitle
  states the value proposition, then three equal workflow chips (`Create 建立`, `Validate 驗證`,
  `Render 渲染`) enter with an 8-frame stagger.
- Poster frame 84 sits inside the final complete hold; every element is settled from frame 56.
- Motion: opacity fades plus a 26 px settle from below; no rotation, scaling, or exits.
- Reduced motion: hold the poster state.
- Assets: bundled Noto Sans CJK TC font only.
- QA: inspect the storyboard checkpoints (frames 24 and 84), the poster, mixed-script shaping,
  chip equal sizing, and deterministic verify hashes.
- Rebuild with `node examples/hello-lottie-maker/build.mjs`; the committed `animation.json`
  remains the canonical reviewed source.
