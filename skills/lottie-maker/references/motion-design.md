# Motion Design Guidance

Choose motion after deciding what the viewer must understand.

- Give each animation one focal group. Supporting motion explains sequence, connection, state, or
  attention; remove ambient motion without a job.
- Use readable entrances, stable holds, and a meaningful final state. A poster frame must work as a
  standalone still.
- Trace diagrams in reading order, activate nodes, then reveal labels. Prefer stable geometry over
  decorative path morphs.
- Differentiate anchor, support, and active typography. Do not give every element the same entrance.
- For loops, make the semantic end connect to the beginning and inspect the seam. For reduced motion,
  retain the complete information state rather than merely slowing the same movement.
- Author a multi-line title as one text layer per line, stacked and positioned, never as a single
  text document with an embedded `\n` or `\r`. Neither is a portable line break — see
  `references/brief-contract.md`.
- Budget clearance and containment for the full stroke width, not the nominal shape. A centered
  stroke paints half its width outward from the nominal path, so two shapes drawn tangent in their
  nominal geometry overlap once stroked; treat `nominal clearance − stroke width − antialiasing
allowance` as the real gap, not the declared padding alone.

Record timing, easing, focal group, poster choice, loop seam, reduced-motion state, and rejected
alternatives in `motion.md`. When the animation has more than one distinct phase or scene, add a
beat sheet — one entry per phase naming what it establishes, how it connects to the phase before
and after it, and which named move each element performs — so a reviewer can check the sequence
against a stated intent instead of only against the rendered frames.

## Easing

Use a single signature easing curve for the whole bundle unless the brief calls for a different
personality: `cubic-bezier(0.2, 0, 0, 1)` — fast departure, long settle. Apply it to entrances, node
activation, and state changes; avoid linear motion for anything that moves in space.

- A technical trace (a path drawing itself) may be near-linear, since the line is explaining a
  route rather than arriving somewhere — but the node and label that follow the trace MUST ease out;
  the trace explains the path, the easing marks the arrival.
- Overshoot is capped at 3% of the traveled distance and used at most once per bundle, as a
  deliberate emphasis choice. Text and technical diagrams do not overshoot by default.

## Timing, expressed in seconds and converted to frames

Author timing in seconds, then convert with `frames = round(seconds × fps)` so the guidance holds
at any frame rate, not only the FPS a particular example happened to use:

| Move                                           | Duration (seconds) | Frames @ 24 fps | Frames @ 30 fps |
| ---------------------------------------------- | ------------------ | --------------- | --------------- |
| Entrance                                       | 0.33–0.5           | 8–12            | 10–15           |
| Exit                                           | 0.25               | 6               | 8               |
| Stagger (supporting element behind its anchor) | 0.08–0.125         | 2–3             | 3–4             |

Spatial movement is never linear; use the signature easing above for every entry in this table.

## Reading-time hold budgeting

Budget every hold from the actual copy on screen, not from a fixed number — a hold sized to a
placeholder string is wrong the moment real copy replaces it. Two rate models cover most authoring:

- **Character-rate languages** (Chinese, Japanese, Korean): roughly 3–4 characters per second on a
  moving canvas. Hold every primary text state for at least
  `max(1 second, character_count ÷ 3.5 seconds⁻¹)` before the next entrance or exit begins.
- **Word-rate languages** (English and other space-delimited scripts): roughly 3 words per second
  on a moving canvas. Hold for at least `max(1 second, word_count ÷ 3 seconds⁻¹)`.

Convert the result to frames with the same `frames = round(seconds × fps)` rule. A checkpoint frame
must sit inside a hold, never inside a transition — the poster frame is the strongest fully settled
state. When the budget does not fit the intended duration, cut copy or split states; never compress
a hold below its floor to make room for more motion.

## Mechanical credibility

A drawing of a mechanism makes a physical claim, and `geometry`/`verify --geometry` measures
rendered contact, not physical validity — a claim can pass while the underlying shapes were never a
correct pair. Before declaring any meshing, rolling, linking, or synchronized motion:

1. **Derive the geometry numerically in `motion.md`**: radii, tooth or segment counts, center
   distances, contact points, and the angular-velocity ratio they imply.
2. **Drive every coupled part from that single derivation** — one rotation ratio, one phase offset
   — instead of animating each part independently until it "looks right."
3. **Match the derived scale, not just the derived shape, on every coupled part.** A gear (or any
   toothed/serrated profile) drawn at a smaller layer scale keeps its declared tooth count but
   shrinks its tooth pitch along with the layer — two parts sharing a tooth count at different
   radii have different-sized teeth and cannot mesh at any center distance. Make the tooth or
   segment count proportional to each part's own derived radius so the pitch (module) matches
   across every coupled part, and regenerate the path at that count rather than scaling a shared
   path down. `interlocked`/`contained` claims measure aggregate envelope contact and body
   clearance; neither one can see a tooth-by-tooth pitch mismatch, so this step is not optional
   just because a claim later passes.
4. **Budget clearance for the drawing, not only the geometry.** A centered stroke pushes half its
   width outward on both sides, so parts that are theoretically tangent overlap once rendered;
   subtract stroke width and an antialiasing allowance before calling the spacing correct.
5. **Check the approximation's worst case, not its nominal contact point**, when a shape stands in
   for a real profile — straight flanks for involute teeth, a polygon for a curve. A trapezoidal
   tooth touches at its corners, not where the ideal profile would.
6. **Declare the claim** in the bundle's `composition.geometry` block (see
   `references/brief-contract.md`) so it is measured against rendered pixels, not eyeballed — a
   claim that exists only as a sentence in `motion.md` is not verified by anything.

When a mechanism cannot be derived cleanly, simplify the visual claim (silhouettes, abstract
linkage, sequential highlights) rather than faking precision.
