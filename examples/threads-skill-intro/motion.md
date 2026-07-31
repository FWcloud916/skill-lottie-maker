# threads-skill-intro motion rationale

- Intent: 用動態技術舞台介紹可攜、可驗證、可重組排版的 Lottie Agent Skill。
- Profile: custom (1920×1080, 24 FPS, 16 秒，不循環、無音訊)。
- Act 1 (0–4 秒): `copy`、`timing`、`assets`、`layout` 四個明確輸入收斂成可攜 bundle，建立「不只讓 JSON 動起來」的問題。
- Act 2 (4–8 秒): 16:9、9:16、1:1 使用不同幾何，表達內容重組而非等比縮放。
- Act 3 (8–12 秒): Create → Inspect → Render A/B → SHA-256 match；unsafe branch 被擋下。
- Act 4 (12–16 秒): 四個等齒數齒輪先依序進場，再從同一 frame 以半齒距相位差、棋盤格反向等速旋轉，表達 Create、Revise、Diagnose、Verify 循環改善。
- Focal groups: 每幕 composition checkpoint 恰有一個 anchor；其餘 block 依 reading order 支援。
- Easing: 10–12 frame ease-out entrance、2–4 frame stagger、穩定 hold；最後停在完整 CTA。
- Poster frame: 360，包含完整齒輪循環與「先要求它證明，再要求它輸出」。
- Palette: canonical gray + blue；無漸層、光暈、玻璃或 AI video。
- Assets: 僅 bundle 內 Noto Sans CJK TC 字型。
- Reduced motion: 直接顯示 frame 360 的完整改善循環與 CTA。
- QA: 檢查四個 checkpoint 的閱讀順序、safe area、文字 fit、卡片 padding、齒輪中心距、半齒距相位、等速反向、轉場、完整 MP4 與 deterministic hashes。
