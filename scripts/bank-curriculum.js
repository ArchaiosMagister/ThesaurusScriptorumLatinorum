export const periods = [
  ['trimestre-1', 'Primer trimestre'],
  ['trimestre-2', 'Segundo trimestre'],
  ['trimestre-3', 'Tercer trimestre'],
  ['repaso', 'Repaso y refuerzo'],
  ['refuerzo-1', 'Refuerzo del primer trimestre'],
  ['refuerzo-2', 'Refuerzo del segundo trimestre'],
  ['refuerzo-3', 'Refuerzo del tercer trimestre']
];

export const communities = [
  'Andalucía', 'Aragón', 'Asturias', 'Canarias', 'Cantabria', 'Castilla-La Mancha',
  'Castilla y León', 'Cataluña', 'Ceuta', 'Comunidad de Madrid', 'Comunidad Valenciana',
  'Extremadura', 'Galicia', 'Islas Baleares', 'La Rioja', 'Melilla', 'Navarra',
  'País Vasco', 'Región de Murcia'
];

const retiredTags = new Set(['gram.interrogativa.indirecta', 'gram.gerundio', 'gram.gerundivo', 'gram.concordancia.nominal']);
export const isRetiredTag = id => retiredTags.has(id);
export const grammarGroupIds = new Set(['gram.voz.pasiva', 'gram.deponente', 'gram.subjuntivo']);
export const isGrammarGrouping = id => grammarGroupIds.has(id);
const finiteForm = /^gram\.verbo\.[^.]+\.(indicativo|subjuntivo|imperativo)\.(activo|pasivo|deponente)$/u;
// The generic labels remain stable search/template IDs, not new assignments.
export function matchesGrammarGrouping(id, group) {
  if (!isGrammarGrouping(group)) return false;
  if (id === group) return true; // old confirmed tags still work
  const finite = finiteForm.exec(id);
  if (group === 'gram.subjuntivo') return finite?.[1] === 'subjuntivo';
  if (group === 'gram.voz.pasiva') return finite?.[2] === 'pasivo' ||
    /^gram\.inf\.(presente|perfecto|futuro)\.pasivo$/u.test(id);
  return finite?.[2] === 'deponente' || id === 'gram.part.perfecto.deponente' ||
    /^gram\.inf\.(presente|perfecto|futuro)\.deponente$/u.test(id);
}
export function compactGrammarTags(ids) {
  return [...new Set(ids)].filter(id => id !== 'gram.concordancia.nominal' &&
    (!isGrammarGrouping(id) || !ids.some(other => other !== id && matchesGrammarGrouping(other, id))));
}

const hiddenTags = new Set([
  'gram.oracion', 'gram.formas', 'gram.pronombres', 'gram.funciones', 'gram.verbo',
  'gram.part.forma', 'gram.inf.forma', 'gram.pron.demostrativo', 'gram.cum.preposicion',
  'gram.cum.conjuncion', 'gram.ut'
]);

export const compoundPassiveTags = new Set([
  'gram.verbo.perfecto.indicativo.pasivo', 'gram.verbo.pluscuamperfecto.indicativo.pasivo',
  'gram.verbo.perfecto.subjuntivo.pasivo', 'gram.verbo.pluscuamperfecto.subjuntivo.pasivo'
]);
export const bankTagVisible = id => !isRetiredTag(id) && !hiddenTags.has(id) &&
  (!id.startsWith('gram.verbo.') || compoundPassiveTags.has(id));
export const infinitiveId = 'gram.inf.forma';
export const infinitiveTenses = ['presente', 'perfecto', 'futuro'];
export const infinitiveVoices = ['activo', 'pasivo', 'deponente'];
const infinitiveForm = /^gram\.inf\.(presente|perfecto|futuro)(?:\.(activo|pasivo|deponente))?$/u;
const infinitiveVoice = /^gram\.inf\.(activo|pasivo|deponente)$/u;
export const isInfinitiveTag = id => id === infinitiveId || infinitiveForm.test(id) || infinitiveVoice.test(id);
export const bankTagAssignable = id => !isGrammarGrouping(id) && (bankTagVisible(id) || Boolean(finiteForm.test(id))) && (!isInfinitiveTag(id) || Boolean(infinitiveForm.exec(id)?.[2]));
// El planificador ofrece las formas completas. Las etiquetas generales de
// infinitivo conservan sus IDs y su alcance en las plantillas ya guardadas.
const plannerHeadings = new Set(['gram.oracion', 'gram.formas', 'gram.pronombres', 'gram.funciones', 'gram.verbo', 'gram.part.forma']);
// Presentation families only: templates and stored text tags retain their original IDs.
export const plannerFiniteFamilies = [
  'Infectum · indicativo activo', 'Infectum · indicativo pasivo',
  'Infectum · subjuntivo activo', 'Infectum · subjuntivo pasivo',
  'Perfectum · indicativo activo', 'Perfectum · indicativo pasivo',
  'Perfectum · subjuntivo activo', 'Perfectum · subjuntivo pasivo',
  'Imperativo'
];
export function plannerFiniteFamily(id) {
  const finite = /^gram\.verbo\.(.+?)\.(indicativo|subjuntivo|imperativo)\.(activo|pasivo|deponente)$/u.exec(id);
  if (!finite) return null;
  const [, tense, mood, voice] = finite;
  if (voice === 'deponente') return 'Verbos deponentes';
  if (mood === 'imperativo') return 'Imperativo';
  const theme = /^(presente|imperfecto|futuro|futuro-imperfecto|futuro\.imperfecto)$/u.test(tense) ? 'Infectum' :
    /^(perfecto|pluscuamperfecto|futuro-anterior|futuro-perfecto|futuroperfecto|futuro\.perfecto)$/u.test(tense) ? 'Perfectum' : '';
  return theme ? theme + ' · ' + mood + ' ' + voice : null;
}

export const plannerTagVisible = id => !isRetiredTag(id) && !plannerHeadings.has(id) &&
  (!isInfinitiveTag(id) || Boolean(infinitiveForm.exec(id)?.[2]));
export const curriculumTags = catalogue => catalogue.filter(tag => tag.kind === 'catalogue' &&
  (tag.id === infinitiveId || (bankTagVisible(tag.id) && !isInfinitiveTag(tag.id))));

export function matchesInfinitive(ids, tense, voice) {
  if (!tense && !voice) return ids.some(isInfinitiveTag);
  return ids.some(id => {
    const form = infinitiveForm.exec(id);
    if (form) return (!tense || form[1] === tense) && (!voice || form[2] === voice);
    return !tense && infinitiveVoice.exec(id)?.[1] === voice;
  });
}


/** Keep the exact session wording in the import identity; never infer it from the year. */
export function selectividadSession(text) {
  if (!text.selectividad) return null;
  const key = String(text.pauCv ?? text.teacherDocx?.pauCv ?? '');
  const notes = String(text.notes ?? '');
  const match = /^(\d{4})\s+(.+?)\s*\/\s*([AB])$/iu.exec(key);
  const fallback = /^PAU CV\s*·\s*(.+?)\s+(\d{4})\s*·\s*Opción\s+([AB])\b/iu.exec(notes);
  const raw = match?.[2] ?? fallback?.[1];
  const option = (match?.[3] ?? fallback?.[3])?.toUpperCase();
  if (!raw) return null;
  const source = raw.trim().toLocaleLowerCase('es');
  const reserve = /\breserva\b/u.test(source);
  const name = source.replace(/\s*\(reserva\)\s*/gu,'').trim();
  const kind = /^(junio|ordinaria)$/u.test(name) ? 'Ordinaria'
    : /^(julio|septiembre|extraordinaria)$/u.test(name) ? 'Extraordinaria' : '';
  const month = /^(junio|julio|septiembre)$/u.test(name) ? name : '';
  const label = [kind || raw.trim(), month ? '(' + month + ')' : '', reserve ? '· Reserva' : '', option ? '· Opción ' + option : ''].filter(Boolean).join(' ');
  return {kind, reserve, option, label};
}
export function selectividadLabel(text) {
  if (!text.selectividad) return '';
  return ['Selectividad', text.selectividad.year, selectividadSession(text)?.label, text.selectividad.community].filter(Boolean).join(' · ');
}
/** Undated records always trail dated exams. Same-year calls keep chronological order. */
export function compareSelectividadYear(a,b,descending=false) {
  const left=a.selectividad?.year, right=b.selectividad?.year;
  if (!Number.isInteger(left) || !Number.isInteger(right)) return Number(Number.isInteger(right))-Number(Number.isInteger(left));
  if (left!==right) return descending ? right-left : left-right;
  const rank = s => s?.kind==='Ordinaria' ? (s.reserve?1:0) : s?.kind==='Extraordinaria' ? (s.reserve?3:2) : 4;
  const x=selectividadSession(a),y=selectividadSession(b);
  return rank(x)-rank(y) || (x?.option==='B'?1:x?.option==='A'?0:2)-(y?.option==='B'?1:y?.option==='A'?0:2);
}

export function matchesSelectividad(text, year, community, only, exclude = false) {
  if (exclude) return !text.selectividad;
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
  const groups = periods.slice(0, 4).map(([period, label], index) => {
    const entries = index === 3 ? [...review].sort(byDifficulty) : core.slice(cursor, cursor + sizes[index]);
    cursor += sizes[index];
    return { period, label, entries };
  });
  return { groups, missing, uncovered: [...remaining], count: chosen.length, capacity };
}

export function planCurriculum(rows, settings, equivalent) {
  const { terms, progression, exam, excludedCourses } = settings;
  const available = [...new Map(rows.filter(({ text }) => {
    const courses = text.courseIds ?? [];
    return matchesSelectividad(text, '', '', exam === 'only', exam === 'exclude') &&
      !courses.some(course => excludedCourses.includes(course)) &&
      (courses.length > 0 || !excludedCourses.includes('unassigned'));
  }).map(row => [row.text.id, row])).values()].sort(byDifficulty);
  const groups = [];
  const introduced = new Set();
  const specifications = terms.map(({ tags }, index) => {
    for (const tag of tags) introduced.add(tag);
    return {
      requested: tags,
      applicable: progression === 'specific' ? tags : [...new Set([...tags, ...introduced])],
      later: [...new Set(terms.slice(index + 1).flatMap(term => term.tags).filter(tag => !introduced.has(tag)))]
    };
  });
  const pools = new Map();
  function candidates(group) {
    if (!pools.has(group)) {
      const applicable = new Set(group.applicable);
      pools.set(group, !applicable.size ? available : available.filter(row => row.tags.some(tag => applicable.has(tag))));
    }
    return pools.get(group);
  }
  function choose(group, omitted) {
    const entries = groups.flatMap(section => section.entries).filter(row => row !== omitted);
    const covered = new Set(group.entries.filter(row => row !== omitted).flatMap(row => row.tags));
    const authors = new Map();
    const origins = new Map();
    for (const { text } of entries) {
      const author = text.source.author;
      const origin = text.origin?.kind;
      authors.set(author, (authors.get(author) ?? 0) + 1);
      origins.set(origin, (origins.get(origin) ?? 0) + 1);
    }
    let best;
    let bestScore = -Infinity;
    const inUse = new Set(entries);
    for (const row of candidates(group)) {
      if (row === omitted || inUse.has(row)) continue;
      const gains = group.requested.filter(tag => row.tags.includes(tag) && !covered.has(tag));
      const later = group.later.some(tag => row.tags.includes(tag));
      const target = group.review ? 1 + 4 * (group.entries.length % 5) / 4 : 1 + 2 * group.term;
      const score = gains.length * 100 + Number(!later) * 50 +
        group.requested.filter(tag => row.tags.includes(tag)).length * 5 -
        Math.abs(levelOf(row) - target) -
        Math.min(authors.get(row.text.source.author) ?? 0, 8) / 2 -
        Math.min(origins.get(row.text.origin?.kind) ?? 0, 8) / 10;
      if (score > bestScore && !entries.some(used => equivalent(used.text, row.text))) {
        best = row;
        bestScore = score;
      }
    }
    return best;
  }
  for (const review of [false, true]) {
    terms.forEach((term, index) => {
      const [period, label] = periods[review ? index + 4 : index];
      groups.push({ period, label, review, term: index, size: review ? term.review : term.count,
        ...specifications[index], entries: [] });
    });
  }
  const allocationOrder = groups.filter(group => group.size).map(group => [group, candidates(group).length])
    .sort(([a, aCount], [b, bCount]) => aCount - bCount ||
      b.requested.length - a.requested.length || a.term - b.term || Number(a.review) - Number(b.review));
  for (const [group] of allocationOrder) {
    while (group.entries.length < group.size) {
      const row = choose(group);
      if (!row) break;
      group.entries.push(row);
    }
    const order = row => group.applicable.findIndex(tag => row.tags.includes(tag));
    group.entries.sort((a, b) => (order(a) < 0 ? Infinity : order(a)) -
      (order(b) < 0 ? Infinity : order(b)) || byDifficulty(a, b));
  }
  return {
    groups,
    coverage(group) {
      const covered = new Set(group.entries.flatMap(row => row.tags));
      return {
        candidates: candidates(group).length,
        covered: group.requested.filter(tag => covered.has(tag)),
        uncovered: group.requested.filter(tag => !covered.has(tag)),
        later: group.later.filter(tag => covered.has(tag))
      };
    },
    replace(group, index) {
      const previous = group.entries[index];
      if (!previous) return false;
      const replacement = choose(group, previous);
      if (!replacement) return false;
      group.entries[index] = replacement;
      return true;
    }
  };
}
