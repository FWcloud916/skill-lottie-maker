# Showcase all five examples in the README

**Slug:** showcase-five-examples
**Status:** review
**Ticket:** N/A
**Related plan:** N/A
**Created:** 2026-08-04
**Updated:** 2026-08-04

---

## Scope

| Scope             | Branch                                  | Ticket | Notes                                                  |
| ------------------ | ---------------------------------------- | ------ | ------------------------------------------------------- |
| `skill-lottie-maker` | `claude/skill-lottie-maker-port-ac5124` | N/A    | User request following the three-item port; documentation plus one real example bug fix |

## Background & goals

The README showcased only one example (`hello-lottie-maker`, the hero GIF) and described the
`examples/` directory in a single sentence ("four validated bundles" — already stale, since the
prior port added `threads-skill-intro` as a fifth). The user asked to put all five examples in the
README as a visible showcase, then — after seeing a first pass with static posters for all four
non-hero examples — asked specifically to (1) allow motion/video where it helps, (2) fix a rendering
defect spotted in one poster before shipping it, and (3) reconsider whether each example's chosen
frame actually represents it well.

## Task list

- [x] Render and visually review a preview for each of the four non-hero examples
- [x] Root-cause and fix a real rendering defect found in the `deterministic-verification` poster
- [x] Reconsider each example's representative image, not just accept the first render
- [x] Rewrite `## Reproducible examples` into a per-example gallery
- [x] Fix the stale "four validated bundles" text and an overstated "two of them carry geometry
      claims" line (only `skill-improvement-gear-loop` declares any)
- [x] `bash scripts/verify.sh` green after the example content fix

## Work log

### 2026-08-04 — first pass (static posters for all five)

Rendered a poster for each non-hero example and built a gallery section in the README, one
subsection per example with canvas/profile facts and a poster image.

**Found a defect while reviewing the `deterministic-verification` poster**: "Unsafe asset blocked"
rendered as "Unsate asset blocked". Initially treated this as a font-shaping bug and spawned a
background task to investigate later, to keep the first pass scoped to documentation only.

### 2026-08-04 — second pass, per user follow-up ("改善圖片")

The user asked to (1) fix the bug now rather than defer it, (2) consider motion/video, and (3)
reconsider whether each frame is actually representative. Dismissed the background task
(`task_0ec516e7`) and did the investigation directly instead of deferring it.

**Root-caused the "Unsafe" → "Unsate" defect — it was not a font bug.** Built an isolated test
bundle reproducing the exact text, size, color, and font in an otherwise-empty scene: it rendered
correctly. That ruled out font shaping and pointed at something contextual. Moving the real
`blocked` layer to an empty area of the same canvas (same file, same 19 layers, only its position
changed) also rendered correctly — proving it was position-dependent, not glyph-dependent.
Bisecting the vertical offset from its reference card (`blocked-card`) found the exact threshold:
15px clearance renders "Unsate"; 20px renders "Unsafe" correctly. Root cause: `blocked-card` is an
earlier root-layer array entry than `blocked`, so it paints in front of it (this repo's own
established z-order rule — see "A valid background can still hide the scene" in the production
guide); at 15px clearance the ascender of the tallest letter in the caption (the "f" in "Unsafe")
pokes up into the card above and gets clipped, while every other letter (and every other caption in
the same composition, all using 17.5–21px clearance) clears it untouched. Declared bounds looked
fine; only the rendered pixels showed the clip — the same category of defect this entire multi-item
port has been about, just manifesting as a caption-vs-card z-order clip instead of a stroke-width
or gear-mesh gap.

**Fixed** by moving the `blocked` label 10px further from its card in `examples/build-showcases.mjs`
(`[288, 570]` → `[288, 580]`, matching the 20px clearance used by the composition's other
card/caption pairs), regenerated `deterministic-verification/animation.json`, and confirmed:
`validate` → `valid`, `verify` → deterministic, and the poster now reads "Unsafe asset blocked"
correctly. Added a new lesson, "A caption can be clipped by its own reference card", to
`docs/lottie-production-guide.md` per this repo's living-guide convention, generalizing the finding
(vertical clearance must budget for the tallest ascender the copy can contain, not average letter
height) rather than describing only this one instance.

**Reconsidered representativeness per-example, not just accepted the first render:**

- `skill-improvement-gear-loop` — swapped its static poster for an animated GIF. This example's
  entire point (proven in the prior port item) is that the gears *actually mesh while turning*; a
  still frame can't show that. `render.mjs`'s own `--gif` encoding path (`media.mjs`, no palette
  generation) produced an unusably large 17MB file for 120 frames at 720×720, so the GIF was built
  directly from the already-rendered PNG frames via a two-pass `ffmpeg` palette (`palettegen` /
  `paletteuse`, 480×480, 15fps) instead of through the library's encoder — a workaround for this
  one documentation asset, not a change to `media.mjs` itself, since fixing the encoder's missing
  palette step is a separate, untested change out of scope here. Result: 607KB, visually clean, no
  perceptible banding.
- `threads-skill-intro` — swapped its single-frame poster (which only showed the finale, Act 4) for
  its storyboard image, which renders all four declared composition checkpoints side by side. For
  an example whose whole pitch is "a four-act narrative," one frame of the last act badly
  undersold it; the storyboard shows the actual four-act structure in one image.
- `profile-portability` and `deterministic-verification` kept their poster frames — both are
  single-state diagrams (not narratives), so their declared `poster_frame` was already the
  intended representative state; no swap needed.
- `hello-lottie-maker` was untouched (already the hero GIF plus a storyboard, both pre-existing).

### 2026-08-04 — third pass, per user follow-up ("齒輪咬合沒有對準")

Looking at the new gear-loop GIF, the user reported the mesh didn't look aligned. It didn't:
`main-upper-mesh`/`main-lower-mesh` measured as `valid` by the prior port item's own geometry
claims, but a visual inspection across a full-cycle montage (12 frames cropped to the contact
region) showed the two gears' teeth were visibly different sizes at the contact point.

**Root cause: `gear-upper`/`gear-lower` reuse `gear-main`'s tooth path (`gear-precomp`, 12 teeth,
local outer/root 150/122) at 60% layer scale instead of `gear-main`'s 90%.** Scaling a fixed tooth
path shrinks the tooth pitch along with the gear — real meshing gears need matching tooth *module*
(pitch-circle arc length per tooth), which requires tooth count proportional to radius, not the
same tooth count at every scale. The prior port item's fix only moved the smaller gears to a center
distance where the pixel-contact criteria passed in aggregate (envelope engagement, body clearance)
— those criteria cannot detect that the individual teeth are the wrong size to interlock, only that
the two rendered regions touch appropriately as a whole. Confirmed this is the cause, not a
positioning issue, before touching anything: an isolated synthetic reproduction wasn't needed here
since the mismatch was directly visible once magnified.

**Fix — redesigned the driven gears with a physically consistent tooth count:**
1. Computed `gear-main`'s tooth module from its world-space geometry (pitch radius 122.4, 12
   teeth → arc length 64.06px/tooth).
2. Solved for a driven-gear tooth count matching that module at a similar visual size: 8 teeth
   gives pitch radius 81.6 (exactly `122.4 × 8/12`, since matching module divides pitch radius
   in the same ratio as tooth count) and, using the same absolute addendum/dedendum as the drive
   gear (12.6px, i.e. constant tooth depth across the gear train — the standard real-gear
   convention), outer/root radii of 94.2/69.0.
3. Generated a new tooth path with the exact vertex-generation algorithm already used by
   `threads-skill-intro/build.mjs`'s `gearPath(teeth, outer, root)` (verified the existing
   `gear-precomp`'s 48 vertices match that algorithm to within float rounding before reusing it),
   added it as a second precomp asset (`gear-precomp-small`), and re-pointed `gear-upper`/
   `gear-lower` to it at 100% layer scale (no more scale-based resizing, since the local units
   are now the target world units directly).
4. Corrected the rotation *speed* ratio for rolling-without-slipping meshing
   (ω_small/ω_main = teeth_main/teeth_small = 12/8 = 1.5, opposite direction): the driven gears
   previously did 2 full rotations per 1 of the drive gear (a 2:1 ratio, inconsistent with equal
   tooth counts, let alone the new 12:8 pair); corrected to 1.5 rotations.
5. **Used the geometry tool itself to tune the two remaining free parameters** — rotation phase and
   center distance — by measurement rather than by eye: swept phase in 5° steps over one driven-gear
   tooth pitch (45°), measuring `overlap_pixels` and `envelope_engagement_px` across a contiguous
   24-frame window at each candidate; the sweep showed `overlap_pixels` varying from a mean of 3
   (phase 22°) to 227 (phase 32°) while `body_clearance_px` stayed essentially constant (as
   expected — it depends only on the root-circle radii, not tooth phase), confirming phase, not
   distance, was what controlled tooth-to-tooth register. Phase 22° minimized envelope overlap.
   At that phase, `overlap_pixels` still touched 0 at some frames (a razor-thin fit with no
   backlash margin) — `evaluateClaim`'s own `min_overlap_pixels: 4` guard against antialiasing
   noise correctly flagged this as `failed`, not a false alarm from the tool. A second sweep over
   small center-distance reductions at that phase found `−2px` (204→202) gave a solid, consistent
   grip (`overlap_pixels` min 9, mean 27.6) with body clearance still far from zero (min 24px, no
   interpenetration risk).
6. Synced the `gear-holes` hub-hole decoration ellipses (position and proportional size) to the
   new gear positions and root radius, matching the same convention the prior port item established.

**Verified:** `validate` → `valid`; `geometry --json` → all three claims (`main-upper-mesh`,
`main-lower-mesh`, `upper-lower-disjoint`) `valid`, non-degenerate, engagement 23.2–25.8px, overlap
8–46px; `verify` → deterministic. Visually confirmed via a 12-frame full-cycle montage cropped to
the contact region: consistent, evenly-sized tooth interlock at every sampled frame, no gaps, no
crashes. Regenerated the README GIF from the corrected render (632KB, same encoding recipe as
before). Added a fourth lesson bullet to the "Geometry claims need rendered evidence" section of
`docs/lottie-production-guide.md`: a passing claim proves the declared contact, not that the
underlying shapes were a valid pair to begin with — and that the same measurement tool that gates a
claim can be used to search a design's free parameters for the best configuration, not just
accept or reject one.

## Outcome

**Final status:** Complete. README shows all five examples: two with motion (hero GIF,
gear-loop GIF), two with a multi-checkpoint storyboard (hero, threads-skill-intro), two with a
single representative poster (profile-portability, deterministic-verification). Two real content
defects found along the way were fixed at the source, not papered over in the screenshots:
`deterministic-verification`'s clipped caption, and `skill-improvement-gear-loop`'s mismatched
tooth module (a defect the prior port item's own geometry claims had not been capable of
detecting, since they measure aggregate contact, not tooth-level shape agreement). Both are
documented as production lessons. `bash scripts/verify.sh` green (64/64 tests, including the
examples' own validate/verify/geometry/drift checks).
**PR / Commit:** Not yet opened; changes are on `claude/skill-lottie-maker-port-ac5124`.
**Follow-ups:** None. The previously-spawned background task for the caption bug was withdrawn
since the fix landed in this item instead.
