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

## Motion tier — after the sampled render

Inspect the actual rendered poster and contact sheet after every material animation change:

- Layer order, opacity, masks, paths, and asset placement remain stable.
- Entrance, hold, transition, exit, final state, and loop seam communicate the intended sequence.
- Poster is complete, readable, representative, and not an empty transition frame.
- Reduced-motion intent preserves the same information.
- Two identical verification renders return identical hashes.

For complete video output, also play the media from start to finish. A contact sheet cannot expose
every transient artifact or an incorrect loop boundary.
