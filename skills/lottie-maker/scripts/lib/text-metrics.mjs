// Shared by the generator (lottie.mjs, sizing title text) and the validator
// (composition.mjs, checking declared text fit) so the two cannot desynchronize the way two
// copy-pasted implementations can.
export function estimateTextUnits(text) {
  return [...text].reduce((total, character) => {
    if (/\s/u.test(character)) return total + 0.35;
    if (/^[ -~]$/u.test(character)) return total + 0.58;
    return total + 1;
  }, 0);
}
