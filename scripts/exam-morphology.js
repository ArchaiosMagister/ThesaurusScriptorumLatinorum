import { MORPH_TYPES, MORPH_LABELS, morphChoiceFromToken, morphTypeFromAnalysis, selectDiverseMorphology } from '../cuaderno-integrado/core/morph-categories.js';

const legacy = { n: 'sustantivo', a: 'adjetivo', p: 'pronombre', v: 'verbo-personal' };
export const categories = MORPH_TYPES;
export const label = category => MORPH_LABELS[legacy[category] ?? category] ?? 'Sin clasificar';
export const categoryOf = (mark, token, latin) => mark.category ?? (token && morphChoiceFromToken(token, latin)?.category) ?? legacy[mark.cat] ?? mark.cat;
const entry = (token, reading, manual = false) => ({ cat: reading?.category ?? 'manual', category: reading?.category ?? 'manual',
  toks: [token.i], analysis: reading?.analysis ?? null, lemmaId: reading?.lemmaId ?? null, manual });

export function chooseMarks(state, kept = [], excluded = []) {
  const occupied = new Set([...kept.flatMap(mark => mark.toks), ...excluded]);
  const candidates = state.tokens.filter(token => !occupied.has(token.i))
    .map(token => morphChoiceFromToken(token, state.texto)).filter(Boolean);
  const types = new Set(kept.map(mark => categoryOf(mark, state.tokens[mark.toks[0]], state.texto)).filter(type => MORPH_TYPES.includes(type)));
  const selected = selectDiverseMorphology(candidates, new Set(), types, new Map(), 4 - kept.length + types.size);
  const byStart = new Map(state.tokens.map(token => [token.s, token]));
  return [...kept, ...selected.map(reading => entry(byStart.get(reading.start), reading))]
    .sort((a, b) => a.toks[0] - b.toks[0]);
}

export function setMark(state, token, replaceIndex) {
  const marks = state.subr.filter((mark, index) => index !== replaceIndex && mark.toks.length && !mark.toks.includes(token.i));
  if (marks.length >= 4) return false;
  state.subr = [...marks, entry(token, morphChoiceFromToken(token, state.texto), true)]
    .sort((a, b) => a.toks[0] - b.toks[0]);
  return true;
}

export function readings(token) {
  return (token?.cands ?? []).flatMap(candidate => candidate.morphos.flatMap(analysis => {
    const category = morphTypeFromAnalysis(analysis, candidate.pos, candidate.im);
    return category ? [{ category, lemmaId: candidate.lemma, analysis }] : [];
  })).filter((reading, index, rows) => rows.findIndex(row => row.lemmaId === reading.lemmaId && row.analysis === reading.analysis) === index);
}

function formKey(value) {
  return value.normalize('NFC').toLocaleLowerCase('es');
}

export function replaceMark(state, mark, confirmDifferent = () => false) {
  const type = categoryOf(mark, state.tokens[mark.toks[0]], state.texto);
  const blocked = new Set(state.subr.flatMap(item => item.toks));
  const wordForms = new Set(state.subr.flatMap(item => item.toks).map(i => state.tokens[i]?.w).filter(Boolean).map(formKey));
  const occupiedTypes = new Set(state.subr.filter(item => item !== mark)
    .map(item => categoryOf(item, state.tokens[item.toks[0]], state.texto)));
  const alternatives = state.tokens
    .filter(token => !blocked.has(token.i) && !wordForms.has(formKey(token.w)))
    .map(token => [token, morphChoiceFromToken(token, state.texto)]).filter(([, reading]) => reading);
  const same = alternatives.find(([, reading]) => reading.category === type);
  const next = same ?? alternatives.find(([, reading]) => !occupiedTypes.has(reading.category));
  if (!next || (!same && !confirmDifferent(next[1]))) return false;
  state.subr = state.subr.map(item => item === mark ? entry(...next) : item);
  return true;
}
