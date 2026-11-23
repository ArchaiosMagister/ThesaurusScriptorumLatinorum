export const difficultyLevels = ['Muy fácil', 'Fácil', 'Media', 'Difícil', 'Muy difícil'];

const structureFamilies = [
  /^gram\.(?:infinitivo|inf\.(?:perfecto|futuro)\.(?:activo|pasivo|deponente))$/u,
  /^gram\.(?:participio|ablativo\.absoluto)$/u,
  /^gram\.relativo(?:\.enlace)?$/u,
  /^gram\.(?:subjuntivo|verbo\.[^.]+\.subjuntivo\.[^.]+|ut\.(?:completiva|final|consecutiva)|ne\.(?:final|completiva)|cum\.historico|condicional)$/u
];

const measured = new WeakMap();

function measure(text) {
  const previous = measured.get(text);
  if (previous?.latin === text.latin) return previous;
  let words = 0;
  let longest = 0;
  for (const sentence of text.latin.replace(/\[[^\]]*\]/gu, ' ').split(/[.!?;:]+/u)) {
    const count = sentence.match(/\p{L}[\p{L}\p{M}]*/gu)?.length ?? 0;
    words += count;
    longest = Math.max(longest, count);
  }
  const result = { latin: text.latin, words, longest };
  measured.set(text, result);
  return result;
}

export function assessBankDifficulty(text, automatic = []) {
  const { words, longest } = measure(text);
  const tags = [...(text.tagIds ?? []), ...automatic];
  const structures = structureFamilies.filter(family => tags.some(id => family.test(id))).length;
  const lengthBonus = Number(words >= 100 && (longest >= 18 || structures > 0));
  const scores = [lengthBonus, Number(longest >= 18) + Number(longest >= 32), Math.min(2, structures)];
  const estimate = words ? Math.min(5, 1 + scores.reduce((total, score) => total + score, 0)) : null;
  return { level: text.difficulty ?? estimate, manual: text.difficulty !== undefined, estimate, words, longest, structures };
}

export function difficultyText(level) {
  return level ? level + '/5 · ' + difficultyLevels[level - 1] : 'Sin estimación';
}

export function difficultyEvidence({ words, longest, structures }) {
  return words + ' palabras · frase más larga: ' + longest + ' palabras · ' +
    structures + (structures === 1 ? ' familia gramatical' : ' familias gramaticales');
}
