# deterministic-verification motion rationale

- Intent: Show unsafe input blocked and two deterministic renders producing matching hashes
- Profile: landscape-16x9 (1200x675, 24 FPS, 6s)
- Focal group: the inspection gate splitting unsafe input from deterministic rendering
- Poster frame: 108
- Assets: bundled Noto Sans CJK TC font only
- Frames 8–44: source and inspection gate appear; the unsafe branch stops visibly.
- Frames 50–94: two independent render cards resolve into one matching hash state.
- Frames 96–143: the complete blocked/pass evidence holds for the poster and reduced motion.
- QA: inspect branch order, stable hold, text shaping, safe area, final frame, and deterministic hashes.
