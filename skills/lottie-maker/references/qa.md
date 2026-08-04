# Visual QA

## Storyboard tier — composition, before any full render

Run `storyboard` after `validate` passes and inspect every checkpoint still:

- Copy matches `brief.yaml`; spelling and language are intact.
- Local font loads and shapes Latin, CJK, punctuation, and mixed-script text correctly.
- Essential content stays inside the declared safe area and never clips.
- Each composition checkpoint has an obvious anchor, a deliberate reading order, consistent
  alignment and spacing, fitted text, and equal peer cards where declared.
- Every visible block has a named semantic role; connectors meet their endpoints.
- Aspect-ratio variants are recomposed for their canvas; they are not scaled copies with accidental
  whitespace, crowding, or broken hierarchy.

Fix storyboard findings before rendering; composition defects found later cost a full render per
revision.

## Geometry tier — when the brief declares `composition.geometry`

Run `geometry` and inspect the report for every declared claim:

- A `failed` claim's evidence — the worst frame's composite render plus each isolated layer mask —
  shows the actual measured contact, not the nominal or intended one; look at the masks, not only
  the numbers.
- A `degenerate` claim means every sampled metric measured identically across the window: either
  the sample stride aliased against the mechanism's period, or the geometry is not actually moving.
  Read the finding's own diagnosis before treating it as a false alarm.
- `interlocked` failing on engagement alone (tangent-only) is a different fix than failing on body
  clearance (interpenetration) — moving parts closer fixes the first and can cause the second.

Never treat a `valid` geometry status as a semantic guarantee: it proves the declared claim, not
that the contact means anything to a viewer.

## Motion tier — after the sampled render

Inspect the actual rendered poster and contact sheet after every material animation change:

- Layer order, opacity, masks, paths, and asset placement remain stable.
- Entrance, hold, transition, exit, final state, and loop seam communicate the intended sequence.
- Poster is complete, readable, representative, and not an empty transition frame.
- Reduced-motion intent preserves the same information.
- Two identical verification renders return identical hashes.

For complete video output, also play the media from start to finish. A contact sheet cannot expose
every transient artifact or an incorrect loop boundary.
