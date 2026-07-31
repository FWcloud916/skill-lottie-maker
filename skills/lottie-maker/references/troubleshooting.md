# Troubleshooting

For a player-specific failure, record the failing and working player names, versions, platforms,
and the smallest reproducible JSON before assigning a cause. Portable-profile violations identify
cross-player risks; they do not by themselves prove a particular player bug.

| Symptom                  | Check                                           | Resolution                                                       |
| ------------------------ | ----------------------------------------------- | ---------------------------------------------------------------- |
| Missing glyphs           | Declared font file and text layer `f`           | Add an authorized local font and re-render                       |
| Asset not found          | `u` + `p`, bundle containment, symlink status   | Copy the asset into the bundle and use a relative path           |
| Renderer rejects JSON    | Root fields, timeline, layer types, expressions | Use `inspect --json`; fix only supported structures              |
| Poster is blank          | `poster_frame`, entrance/exit timing            | Select a complete held frame and update the brief                |
| Hashes differ            | Input, fonts, assets, runtime version           | Pin inputs and CanvasKit; remove nondeterministic generation     |
| Imported file is invalid | Unsupported features or absent local assets     | Diagnose without mutation; normalize only with approval          |
| MP4/GIF fails            | `ffmpeg` availability and full-frame output     | Install externally or hand off PNG previews; never hide the skip |

Do not bypass a failing check by fetching remote assets, evaluating expressions, or switching to an
unverified converter.
