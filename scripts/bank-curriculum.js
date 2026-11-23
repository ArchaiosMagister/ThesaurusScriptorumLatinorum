export const periods = [
  ['trimestre-1', 'Primer trimestre'],
  ['trimestre-2', 'Segundo trimestre'],
  ['trimestre-3', 'Tercer trimestre'],
  ['repaso', 'Repaso y refuerzo']
];

export const communities = [
  'Andalucía', 'Aragón', 'Asturias', 'Canarias', 'Cantabria', 'Castilla-La Mancha',
  'Castilla y León', 'Cataluña', 'Ceuta', 'Comunidad de Madrid', 'Comunidad Valenciana',
  'Extremadura', 'Galicia', 'Islas Baleares', 'La Rioja', 'Melilla', 'Navarra',
  'País Vasco', 'Región de Murcia'
];

const hiddenTags = new Set([
  'gram.oracion', 'gram.formas', 'gram.pronombres', 'gram.funciones', 'gram.verbo',
  'gram.part.forma', 'gram.inf.forma', 'gram.pron.demostrativo', 'gram.cum.preposicion',
  'gram.cum.conjuncion', 'gram.ut'
]);

export const bankTagVisible = id => !hiddenTags.has(id) && !id.startsWith('gram.verbo.');
export const curriculumTags = catalogue => catalogue.filter(tag => tag.kind === 'catalogue' && bankTagVisible(tag.id) &&
  !/^gram\.inf\.(?:presente|perfecto|futuro)\./u.test(tag.id));

export function matchesSelectividad(text, year, community, only) {
  if (!only && !year && !community) return true;
  return Boolean(text.selectividad &&
    (!year || String(text.selectividad.year) === year) &&
    (!community || text.selectividad.community === community));
}

const compare = new Intl.Collator('es', { numeric: true, sensitivity: 'base' }).compare;
const levelOf = row => row.level ?? 6;
const byDifficulty = (a, b) => levelOf(a) - levelOf(b) || compare(a.text.title, b.text.title) ||
  (a.text.id < b.text.id ? -1 : a.text.id > b.text.id ? 1 : 0);

function coveringSubset(rows, required, capacity) {
  const bits = new Map([...required].map((id, index) => [id, 1n << BigInt(index)]));
  const all = (1n << BigInt(bits.size)) - 1n;
  const signatures = new Map();
  for (const row of rows) {
    const mask = row.tags.reduce((value, id) => value | (bits.get(id) ?? 0n), 0n);
    if (mask && !signatures.has(mask)) signatures.set(mask, row);
  }
  // Search only when greedy selection uses every slot and leaves real gaps.
  const masks = [...signatures.keys()];
  if (masks.length > 2000) return null;
  const byBit = [...bits.values()].map(bit => [bit, masks.filter(mask => mask & bit)])
    .sort((a, b) => a[1].length - b[1].length);
  const visited = new Map();
  let budget = 12000;
  function find(needed, slots) {
    if (!needed) return [];
    if (!slots || --budget < 0 || (visited.get(needed) ?? 0) >= slots) return null;
    visited.set(needed, slots);
    const [, options] = byBit.find(([bit]) => needed & bit);
    for (const mask of options) {
      if (budget < 0) break;
      const rest = find(needed & ~mask, slots - 1);
      if (rest) return [signatures.get(mask), ...rest];
    }
    return null;
  }
  return find(all, capacity);
}

export function buildCurriculum(rows, requested, sizes) {
  const capacity = sizes.reduce((sum, size) => sum + size, 0);
  const available = [...new Map(rows.map(row => [row.text.id, row])).values()].sort(byDifficulty);
  const required = new Set(requested);
  const missing = [...required].filter(tag => !available.some(row => row.tags.includes(tag)));
  const remaining = new Set([...required].filter(tag => !missing.includes(tag)));
  const taken = new Set();
  const chosen = [];
  const take = row => {
    taken.add(row.text.id);
    chosen.push(row);
    for (const tag of row.tags) remaining.delete(tag);
  };

  while (remaining.size && chosen.length < capacity) {
    let best, gain = 0;
    for (const row of available) {
      if (taken.has(row.text.id)) continue;
      const added = row.tags.filter(tag => remaining.has(tag)).length;
      if (added > gain) { best = row; gain = added; }
    }
    if (!best) break;
    take(best);
  }

  if (remaining.size && chosen.length === capacity) {
    const solution = coveringSubset(available, [...required].filter(tag => !missing.includes(tag)), capacity);
    if (solution) {
      chosen.length = 0;
      taken.clear();
      for (const row of solution) take(row);
    }
  }

  // Space the remaining examples across the range of difficulties.
  const fillers = available.filter(row => !taken.has(row.text.id));
  const slots = Math.min(capacity - chosen.length, fillers.length);
  for (let i = 0; i < slots; i++) take(fillers[Math.floor((i + 0.5) * fillers.length / slots)]);

  chosen.sort(byDifficulty);
  const coreSize = sizes.slice(0, 3).reduce((sum, size) => sum + size, 0);
  const reviewCount = Math.max(0, chosen.length - coreSize);
  const review = new Set();
  const seen = new Set();
  for (let index = 0; index < reviewCount; index++) {
    const target = 1 + index * 4 / Math.max(1, reviewCount - 1);
    let best, score = Infinity;
    for (const row of chosen) {
      if (review.has(row)) continue;
      const next = Math.abs(levelOf(row) - target) * 2 - Number(row.tags.some(tag => !seen.has(tag)));
      if (next < score) { best = row; score = next; }
    }
    review.add(best);
    for (const tag of best.tags) seen.add(tag);
  }
  const core = chosen.filter(row => !review.has(row));
  let cursor = 0;
  const groups = periods.map(([period, label], index) => {
    const entries = index === 3 ? [...review].sort(byDifficulty) : core.slice(cursor, cursor + sizes[index]);
    cursor += sizes[index];
    return { period, label, entries };
  });
  return { groups, missing, uncovered: [...remaining], count: chosen.length, capacity };
}
