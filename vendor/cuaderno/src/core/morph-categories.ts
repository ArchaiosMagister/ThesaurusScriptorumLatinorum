/** Tipología escolar de las apariciones: no agrupar infinitivos/participios con verbos personales. */
import type {CollatinusGrammarCandidate,CollatinusGrammarToken} from './collatinus-grammar.js';
import type {EvidenceV1} from './edition-model.js';

export const MORPH_TYPES=[
  'verbo-personal','pronombre','infinitivo','participio','sustantivo','adjetivo','numeral',
] as const;
export type MorphType=typeof MORPH_TYPES[number];
export const MORPH_LABELS:Record<MorphType,string>={
  'verbo-personal':'Verbo personal',pronombre:'Pronombre',infinitivo:'Infinitivo',
  participio:'Participio',sustantivo:'Sustantivo',adjetivo:'Adjetivo',numeral:'Numeral',
};
export function morphTypeFromAnalysis(analysis:string|null|undefined,pos='',indMorph=''):MorphType|null{
  const a=(analysis??'').toLocaleLowerCase('es').trim();
  const p=pos.toLocaleLowerCase('es').trim();
  const im=indMorph.toLocaleLowerCase('es').trim();
  const invariable=/\b(?:invariable|preposición|conjunción|adverbio|interjección)\b|\b(?:inv|prep|adv|conj|interj)\./u;
  if(invariable.test(a+' '+im) ||
    /^(?:i|r|c|d|prep|adv|conj|interj)$/u.test(p))return null;
  if(/\b(?:numeral|num\.|ordinal|cardinal)\b/u.test(a+' '+im+' '+p) ||
    /^num/u.test(p))return 'numeral';
  if(/\b(?:participio|part\.|ptcp|gerundivo|adjetivo verbal)\b/u.test(a))return 'participio';
  if(/\b(?:infinitivo|inf\.)\b/u.test(a))return 'infinitivo';
  if(/\b(?:indicativo|subjuntivo|imperativo)\b/u.test(a)||
    /^v;(?:ind|subj|imp);/iu.test(analysis??''))return 'verbo-personal';
  if(/^v;(?:ptcp|part);/iu.test(analysis??''))return 'participio';
  if(/^v;inf;/iu.test(analysis??''))return 'infinitivo';
  if(/^pron\b|^p\b|\bpronombre\b/u.test(p+' '+im) || /^pron;/iu.test(analysis??''))return 'pronombre';
  if(/^adj\b|^a\b|\badjetivo\b/u.test(p+' '+im) || /^adj;/iu.test(analysis??''))return 'adjetivo';
  if(/^n\b|^s\b|\bsustantivo\b/u.test(p+' '+im) || /^n;/iu.test(analysis??''))return 'sustantivo';
  // Una forma verbal sin tiempo/modo inequívoco NO se etiqueta como personal.
  return null;
}
export interface MorphChoice{
  surface:string;start:number;end:number;key:string;category:MorphType;
  lemmaId:string;analysis:string;source:'collatinus'|'verified';candidateId?:string;
  evidence?:EvidenceV1;
}
export function morphChoiceFromToken(token:CollatinusGrammarToken,latin:string):MorphChoice|null{
  if(!Number.isSafeInteger(token.s)||!Number.isSafeInteger(token.e)||token.e<=token.s||
    token.s<0||latin.slice(token.s,token.e)!==token.w||!token.sel)return null;
  const candidate=(token.cands??[]).find((row:CollatinusGrammarCandidate)=>
    row.lid===token.sel?.lid&&row.morphos.includes(token.sel.morpho));
  if(!candidate)return null;
  const category=morphTypeFromAnalysis(token.sel.morpho,candidate.pos,candidate.im);
  if(!category)return null;
  return {surface:token.w,start:token.s,end:token.e,key:token.w.normalize('NFC').toLocaleLowerCase('es'),
    category,lemmaId:candidate.lemma,analysis:token.sel.morpho,source:'collatinus',candidateId:String(candidate.lid)};
}
/** Selección sin categorías duplicadas, sin tocar marcas existentes ni términos reservados
 * hasta agotar las alternativas nuevas. A igualdad se favorecen los tipos menos
 * representados en el cuaderno y los menos abundantes en el propio texto.
 */
export function selectDiverseMorphology(
  candidates:readonly MorphChoice[],usedForms:ReadonlySet<string>,
  existingCategories:ReadonlySet<MorphType>,usedCategoryCounts:ReadonlyMap<MorphType,number>,
  max=4,
):MorphChoice[]{
  const pool=candidates.filter(c=>MORPH_TYPES.includes(c.category)&&
    Number.isSafeInteger(c.start)&&Number.isSafeInteger(c.end)&&c.end>c.start);
  const frequencies=new Map<MorphType,number>();
  for(const c of pool)frequencies.set(c.category,(frequencies.get(c.category)??0)+1);
  const choices=[...pool].sort((a,b)=>
    // Primera prioridad docente: no repetir una palabra usada en el cuaderno
    // cuando existe otra inédita de un tipo compatible.
    Number(usedForms.has(a.key))-Number(usedForms.has(b.key))||
    (usedCategoryCounts.get(a.category)??0)-(usedCategoryCounts.get(b.category)??0)||
    (frequencies.get(a.category)??0)-(frequencies.get(b.category)??0)||
    Number(a.source!=='verified')-Number(b.source!=='verified')||
    a.start-b.start);
  const chosen:MorphChoice[]=[],types=new Set(existingCategories),words=new Set<string>();
  for(const c of choices){
    if(chosen.length+existingCategories.size>=max)break;
    if(types.has(c.category)||words.has(c.key)||chosen.some(x=>c.start<x.end&&x.start<c.end))continue;
    // Las palabras nuevas tienen preferencia dentro de cada categoría.
    const sameCat=pool.filter(x=>x.category===c.category&&!words.has(x.key));
    if(usedForms.has(c.key)&&sameCat.some(x=>!usedForms.has(x.key)))continue;
    chosen.push(c);types.add(c.category);words.add(c.key);
  }
  return chosen.sort((a,b)=>a.start-b.start);
}
