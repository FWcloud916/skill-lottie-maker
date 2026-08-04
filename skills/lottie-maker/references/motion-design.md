# Motion Design Guidance

Choose motion after deciding what the viewer must understand.

- Give each animation one focal group. Supporting motion explains sequence, connection, state, or
  attention; remove ambient motion without a job.
- Use readable entrances, stable holds, and a meaningful final state. A poster frame must work as a
  standalone still.
- Prefer ease-out entrances and ease-in exits. Use overshoot only when the requested personality
  benefits from it; keep text and technical diagrams stable by default.
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
alternatives in `motion.md`.
