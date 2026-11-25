// Required source patches must fail closed instead of silently disappearing
// when the incorporated engines change. Preserve native String.replace semantics.
export function requiredPatch(source, anchor, replacement, label = String(anchor)) {
  let count;
  if (typeof anchor === 'string') {
    if (!anchor) throw Error('Anclaje vacío: ' + label);
    count = source.split(anchor).length - 1;
  } else {
    const flags = anchor.flags.includes('g') ? anchor.flags : anchor.flags + 'g';
    count = [...source.matchAll(new RegExp(anchor.source, flags))].length;
  }
  if (count !== 1)
    throw Error('Parche de integración ausente o ambiguo (' + count + '): ' + label);
  return source.replace(anchor, replacement);
}

export function requiredPatches(source, patches, label) {
  return patches.reduce((current, [anchor, replacement], index) =>
    requiredPatch(current, anchor, replacement, label + ' · paso ' + (index + 1) + ': ' + String(anchor)), source);
}

/** Multiple occurrences are intentional here; zero is still a regression. */
export function requiredReplaceAll(source, anchor, replacement, label = String(anchor)) {
  if (!anchor || !source.includes(anchor)) throw Error('Parche de integración ausente: ' + label);
  return source.replaceAll(anchor, replacement);
}
