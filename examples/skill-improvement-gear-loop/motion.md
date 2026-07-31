# skill-improvement-gear-loop motion rationale

- Intent: 用互相咬合並無縫循環的齒輪表達 skill 透過觀察、改善、驗證與重複而持續進化
- Profile: custom (720x720, 30 FPS, 4s)
- Focal group: three continuously meshing gears
- Poster frame: 90
- Assets: bundled Noto Sans CJK TC font only
- Timing: all information remains visible while the large gear completes one turn and each small gear completes two counter-rotations over 4 seconds.
- Easing: linear rotation preserves mechanical continuity; no entrance or exit interrupts the loop.
- Loop seam: frame 120 returns to the exact frame-0 transforms; the exported 0–119 sequence joins without a state jump.
- Reduced motion: hold poster frame 90 with all gears and the Observe → Refine → Verify → Repeat cycle visible.
- Rejected: decorative particles, bounce, and text entrances because they would weaken the continuous-improvement metaphor.
- QA: inspect gear meshing, loop seam, text shaping, safe area, poster state, and deterministic hashes.
