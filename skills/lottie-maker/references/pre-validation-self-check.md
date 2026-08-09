# Pre-Validation Self-Check

Run every applicable item, in order, after finalizing `brief.yaml` and `animation.json` but before
running `validate` — this is workflow step 5. On a revision, re-run the whole list, not only the
items touching the requested change: fixing one reported defect while introducing or missing
another burns a validation-and-render cycle checking something a reviewer could have caught by eye
first. A revision driven by a visual or composition finding additionally starts by re-inspecting
the storyboard checkpoint stills before editing (see the Revise route in `SKILL.md`): items 5 and
6 below are fit arithmetic — they prove a string fits its declared box, never that the composed
frame reads correctly next to every other element. Each item quotes the exact fragment of the error string `validate` (or, for item 8,
`geometry`/`verify --geometry`) would report if the check fails, so the citation stays checkable
against the actual validator rather than a paraphrase that can drift from it.

1. **Copy and slot binding.** Every `brief.copy` entry is non-empty and matches its named text
   layer verbatim. Every `slots` entry is bound to either an `sid` or a same-named layer — not
   left as inert metadata — and its resolved text matches both the layer fallback and
   `brief.copy` exactly, including any style field the fallback declares. Prevents: `must be a
non-empty string`, `must match its named text layer`, `not bound to any sid or layer name`,
   `does not match its layer fallback verbatim`, `does not match brief.copy`, `text document is
missing style fields present on its layer fallback`.
2. **Background order and line separators.** The managed `background` layer is the last entry in
   the root `layers` array, and no text document contains a `\n` or `\r` — a multi-line title is
   one text layer per line, stacked and positioned, never an embedded line break. Prevents:
   `managed background must be the final root layer`, `line separators are not portable in a
managed bundle`.
3. **Canvas, timeline, and poster identity.** The animation's `w`/`h`, `fr`, and frame count match
   the resolved profile exactly, and `poster_frame` is an integer inside the timeline. Prevents:
   `animation canvas does not match brief`, `animation timeline does not match brief`,
   `poster_frame must point inside the timeline`.
4. **Checkpoint structure.** Every checkpoint frame is a unique integer inside the timeline, the
   poster frame is a declared checkpoint, and each checkpoint's `reading_order` names every block
   id exactly once. Prevents: `must point inside the timeline`, `must be unique`, `must include
poster_frame`, `reading_order must contain every block id exactly once`.
5. **Block geometry and text fit.** Every block's `bounds` stays inside `safe_area` and does not
   overlap another block at the same checkpoint. Text blocks fit their declared bounds at
   `min_font_size` within `max_lines` — compute the rendered width and line count before handoff
   rather than trusting a bounds box that looks generous. Prevents: `bounds must stay inside
safe_area`, `bounds overlaps`, `exceeds max_lines`, `is below min_font_size`, `text exceeds
declared width`, `text exceeds declared height`.
6. **Card padding and equal-size groups.** Every `card_layer` names an actual rectangle shape
   layer whose drawn size contains its block's bounds plus the declared `padding` (non-negative).
   Peer cards sharing an `equal_size_group` measure the same size within 1px. Prevents: `card_layer
must name a rectangle shape layer`, `padding must be non-negative`, `does not contain the block
plus padding`, `differs from equal_size_group`.
7. **Geometry claim declaration.** Every `composition.geometry` claim has a kebab-case, unique
   `id`, names exactly two distinct existing root layers, and declares a `frames` window that
   stays inside the timeline. A claim on a layer nested inside a precomp asset cannot be named at
   all — flatten it to a root layer first, or drop the claim. A `connected` claim declares which
   endpoint attaches (`ends`), and its connected-only criteria stay off every other relation.
   Prevents: `id must be kebab-case`, `must name exactly two distinct layers`, `frames must stay
inside the timeline`, `criteria.ends must be start, end, or both`, `only applies to a connected
claim`.
8. **Rendered geometry claim risk** (only when the brief declares `composition.geometry` claims;
   checked after `validate` passes, before the first full render — workflow step 8, not step 5,
   since it requires an actual render). Per [motion-design.md](motion-design.md)'s
   mechanical-credibility derivation: if two coupled parts were scaled independently rather than
   regenerated at a matching module, or a stroke's width was not budgeted into the declared
   clearance, expect the measurement to report contact as `tangent-only`, bodies as
   `interpenetrate`, or a `hollow, stroke-only shape` that defeats the default clearance
   heuristic — declare `criteria.body_layers` for an exact body-overlap test in that last case
   rather than treating a missing measurement as a pass. For a `connected` claim, the endpoint is
   read from the connector's declared path vertices — a trim-revealed connector's rendered pixels
   are not stable ground truth — so a closed path, a keyframed path, or a keyframed connector
   transform cannot be measured at all, and the declared endpoint must actually land on the
   target's rendered pixels. Prevents (as findings, once measured): `contact is tangent-only`,
   `bodies interpenetrate`, `hollow, stroke-only shape`, `exceeds max_gap_px`, `start and end are
undefined for a loop`.
9. **Beat sheet and vocabulary discipline** (only when the bundle has more than one distinct
   phase or scene). `motion.md`'s beat sheet has one entry per phase, each naming what it
   establishes and how it connects to its neighbors. No two adjacent phases repeat the same
   establishing move without a stated reason — an unexplained repeat reads as an unfinished
   design pass, not a deliberate rhythm. This item has no validator finding: `validate` cannot see
   narrative structure, only JSON structure, so a bundle can pass every check above and still fail
   this one silently unless it is checked by eye.
10. **Reading-hold budget.** Every text block whose stable window ends before the timeline does
    holds at least [motion-design.md](motion-design.md)'s reading budget for its actual copy,
    measured from the layer's last incoming transform to its next outgoing one; text with no exit
    is exempt, since a standalone Lottie persists on its final frame. Each checkpoint frame sits
    inside a hold, never inside a transition. A deliberate exception is a per-block `hold_waiver`
    with a real reason; a waiver whose hold already passes must be removed. Prevents: `reading
budget`, `sits inside a transition, not a hold`, `hold_waiver is unused`, `must be a string of at
least 10 characters`, `only counts at the slot's first checkpoint`.
11. **Mechanics declaration.** A bundle with two or more independently rotating non-background
    root layers makes a visible contact claim: declare it in `composition.geometry`, or set
    `mechanics: decorative` when the rotation genuinely claims no contact. `mechanics: declared`
    exists for mechanisms rotation-counting cannot see (belts, pistons, ratchets) and requires at
    least one claim. Prevents: `rotate independently`, `mechanics must be declared or decorative`,
    `requires at least one composition.geometry claim`, `contradicts declared composition.geometry
claims`.
