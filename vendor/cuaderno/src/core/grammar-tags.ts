import { retainNotebookText } from './editor-operations.js';
import { foldLatin } from './library.js';
import type { TextPlacementV1 } from './edition-model.js';
import type { CorpusV1, GrammarTag } from './model.js';
import { validateCorpus } from './validation.js';

/**
 * Catálogo docente: etiquetas jerárquicas sin atribución automática.
 * Forma y función se clasifican por separado para permitir búsquedas
 * combinadas (p. ej. oración de infinitivo + perfecto + pasiva).
 */
const infinitiveTenses = ['presente', 'perfecto', 'futuro'] as const;
const infinitiveVoices = ['activo', 'pasivo', 'deponente'] as const;

const infinitiveForms = infinitiveTenses.flatMap(tense =>
  infinitiveVoices.map(voice => ({
    id: 'gram.inf.' + tense + '.' + voice,
    label: 'Infinitivo de ' + tense + ' ' + voice,
    kind: 'catalogue' as const,
    parentId: 'gram.inf.' + tense,
    voiceId: 'gram.inf.' + voice,
  })),
);
const infinitiveVoiceByForm = new Map(infinitiveForms.map(({id, voiceId}) => [id, voiceId]));

export const GRAMMAR_CATALOGUE: readonly GrammarTag[] = [
  {id:'gram.oracion',label:'Oraciones y construcciones',kind:'catalogue',parentId:null},
  {id:'gram.relativo',label:'Oración de relativo',kind:'catalogue',parentId:'gram.oracion'},
  {id:'gram.relativo.enlace',label:'Relativo de enlace (falso relativo)',kind:'catalogue',parentId:'gram.relativo'},
  {id:'gram.infinitivo',label:'Oración de infinitivo',kind:'catalogue',parentId:'gram.oracion'},
  {id:'gram.participio',label:'Participio concertado',kind:'catalogue',parentId:'gram.oracion'},
  {id:'gram.ablativo.absoluto',label:'Ablativo absoluto',kind:'catalogue',parentId:'gram.oracion'},
  {id:'gram.ut',label:'Oración con ut',kind:'catalogue',parentId:'gram.oracion'},
  {id:'gram.ut.completiva',label:'Ut completivo',kind:'catalogue',parentId:'gram.ut'},
  {id:'gram.ut.final',label:'Ut final',kind:'catalogue',parentId:'gram.ut'},
  {id:'gram.ut.consecutiva',label:'Ut consecutivo',kind:'catalogue',parentId:'gram.ut'},
  {id:'gram.cum.historico',label:'Cum histórico',kind:'catalogue',parentId:'gram.oracion'},
  {id:'gram.ne.final',label:'Ne + subjuntivo (final negativa)',kind:'catalogue',parentId:'gram.oracion'},
  {id:'gram.ne.completiva',label:'Ne + subjuntivo (completiva)',kind:'catalogue',parentId:'gram.oracion'},
  {id:'gram.interrogativa.indirecta',label:'Interrogativa indirecta',kind:'catalogue',parentId:'gram.oracion'},
  {id:'gram.condicional',label:'Oración condicional',kind:'catalogue',parentId:'gram.oracion'},
  {id:'gram.formas',label:'Formas verbales y voz',kind:'catalogue',parentId:null},
  {id:'gram.inf.forma',label:'Forma del infinitivo',kind:'catalogue',parentId:'gram.formas'},
  {id:'gram.inf.presente',label:'Infinitivo de presente',kind:'catalogue',parentId:'gram.inf.forma'},
  {id:'gram.inf.perfecto',label:'Infinitivo de perfecto',kind:'catalogue',parentId:'gram.inf.forma'},
  {id:'gram.inf.futuro',label:'Infinitivo de futuro',kind:'catalogue',parentId:'gram.inf.forma'},
  {id:'gram.inf.activo',label:'Infinitivo activo',kind:'catalogue',parentId:'gram.inf.forma'},
  {id:'gram.inf.pasivo',label:'Infinitivo pasivo',kind:'catalogue',parentId:'gram.inf.forma'},
  ...infinitiveForms.map(({id, label, kind, parentId}) => ({id, label, kind, parentId})),
  {id:'gram.voz.pasiva',label:'Voz pasiva',kind:'catalogue',parentId:'gram.formas'},
  {id:'gram.deponente',label:'Verbo deponente',kind:'catalogue',parentId:'gram.formas'},
  {id:'gram.gerundio',label:'Gerundio',kind:'catalogue',parentId:'gram.formas'},
  {id:'gram.gerundivo',label:'Gerundivo',kind:'catalogue',parentId:'gram.formas'},
  {id:'gram.subjuntivo',label:'Subjuntivo',kind:'catalogue',parentId:'gram.formas'},
  {id:'gram.part.forma',label:'Forma del participio',kind:'catalogue',parentId:'gram.formas'},
  {id:'gram.part.presente.activo',label:'Participio de presente activo',kind:'catalogue',parentId:'gram.part.forma'},
  {id:'gram.part.perfecto.pasivo',label:'Participio de perfecto pasivo',kind:'catalogue',parentId:'gram.part.forma'},
  {id:'gram.part.perfecto.deponente',label:'Participio de perfecto deponente',kind:'catalogue',parentId:'gram.part.forma'},
  {id:'gram.part.futuro.activo',label:'Participio de futuro activo',kind:'catalogue',parentId:'gram.part.forma'},
  {id:'gram.pronombres',label:'Pronombres y determinantes',kind:'catalogue',parentId:null},
  {id:'gram.pron.enfatico',label:'Pronombre enfático (ipse)',kind:'catalogue',parentId:'gram.pronombres'},
  {id:'gram.pron.relativo',label:'Pronombre relativo',kind:'catalogue',parentId:'gram.pronombres'},
  {id:'gram.pron.demostrativo',label:'Demostrativo',kind:'catalogue',parentId:'gram.pronombres'},
  {id:'gram.pron.proximo',label:'Cercanía (hic)',kind:'catalogue',parentId:'gram.pron.demostrativo'},
  {id:'gram.pron.medio',label:'Media distancia (iste)',kind:'catalogue',parentId:'gram.pron.demostrativo'},
  {id:'gram.pron.lejano',label:'Lejanía (ille)',kind:'catalogue',parentId:'gram.pron.demostrativo'},
  {id:'gram.pron.identidad',label:'Identidad (idem)',kind:'catalogue',parentId:'gram.pronombres'},
  {id:'gram.funciones',label:'Funciones sintácticas',kind:'catalogue',parentId:null},
  {id:'gram.agente',label:'Complemento agente',kind:'catalogue',parentId:'gram.funciones'},
  {id:'gram.acus.ext',label:'Acusativo de extensión',kind:'catalogue',parentId:'gram.funciones'},
  {id:'gram.doble.dativo',label:'Doble dativo',kind:'catalogue',parentId:'gram.funciones'},
  {id:'gram.dativo.aprox',label:'Dativo de aproximación',kind:'catalogue',parentId:'gram.funciones'},
  {id:'gram.genitivo.partitivo',label:'Genitivo partitivo',kind:'catalogue',parentId:'gram.funciones'},
];

export const GRAMMAR_GROUP_IDS = [
  'gram.oracion','gram.formas','gram.pronombres','gram.funciones',
] as const;

export function allGrammarTags(corpus:CorpusV1,additional:readonly GrammarTag[]=[]):GrammarTag[]{
  const all=new Map<string,GrammarTag>();
  for(const tag of GRAMMAR_CATALOGUE)all.set(tag.id,tag);
  for(const tag of corpus.tags)if(!all.has(tag.id))all.set(tag.id,tag);
  for(const tag of additional)if(!all.has(tag.id))all.set(tag.id,tag);
  return [...all.values()];
}

/** Al guardar no añade al banco etiquetas que el docente no haya seleccionado. */
export function attachGrammarTags(corpus:CorpusV1,textId:string,ids:readonly string[],
  custom:readonly GrammarTag[]=[]):CorpusV1{
  const byId=new Map(allGrammarTags(corpus,custom).map(tag=>[tag.id,tag]));
  const selected=[...new Set(ids)];
  const tagMap=new Map(corpus.tags.map(tag=>[tag.id,tag]));
  function include(id:string,visiting=new Set<string>()):void{
    const tag=byId.get(id);
    if(!tag)throw Error('Etiqueta desconocida: '+id);
    if(visiting.has(id))throw Error('Jerarquía circular: '+id);
    if(tagMap.has(id))return;
    visiting.add(id);
    if(tag.parentId)include(tag.parentId,visiting);
    tagMap.set(id,tag);
    visiting.delete(id);
  }
  for(const id of selected)include(id);
  const original=corpus.texts.find(text=>text.id===textId);
  const preserved=original && JSON.stringify(original.tagIds)!==JSON.stringify(selected)
    ? retainNotebookText(corpus,original) : corpus;
  return validateCorpus({
    ...preserved,tags:[...tagMap.values()],
    texts:corpus.texts.map(text=>text.id===textId?{...text,tagIds:selected}:text),
  });
}

/** Solo se compara el conjunto de etiquetas de una misma ocurrencia. */
export function conflictsWithGrammarForm(existing: readonly string[], incoming: string): boolean {
  const incomingVoice = infinitiveVoiceByForm.get(incoming);
  const passive = (id: string) => id === 'gram.voz.pasiva' || id === 'gram.inf.pasivo'
    || id === 'gram.part.perfecto.pasivo' || infinitiveVoiceByForm.get(id) === 'gram.inf.pasivo';
  const deponent = (id: string) => id === 'gram.deponente' || id === 'gram.part.perfecto.deponente'
    || infinitiveVoiceByForm.get(id) === 'gram.inf.deponente';
  return existing.some(id => id !== incoming && (
    (incomingVoice && infinitiveVoiceByForm.has(id))
    || (passive(id) && deponent(incoming)) || (deponent(id) && passive(incoming))
  ));
}

/** Buscar etiqueta padre incluye subetiquetas (sin borrar la distinción). */
export function matchesGrammarTag(tagId:string,filterId:string,tags:readonly GrammarTag[]):boolean{
  const byId=new Map(tags.map(tag=>[tag.id,tag]));
  if(infinitiveVoiceByForm.get(tagId)===filterId)return true;
  let current:string|null=tagId;
  const seen=new Set<string>();
  while(current&&!seen.has(current)){
    if(current===filterId)return true;
    seen.add(current);
    current=byId.get(current)?.parentId??null;
  }
  return false;
}

export function matchesGrammarFilters(ids:readonly string[],filters:readonly string[],
  tags:readonly GrammarTag[]):boolean{
  return filters.every(filter=>ids.some(id=>matchesGrammarTag(id,filter,tags)));
}

export function findTagByLabel(label:string,tags:readonly GrammarTag[]):GrammarTag|undefined{
  const target=foldLatin(label);
  return tags.find(tag=>foldLatin(tag.label)===target);
}

export function catalogDepth(tag:GrammarTag,tags:readonly GrammarTag[]):number{
  const byId=new Map(tags.map(entry=>[entry.id,entry]));
  let depth=0,current=tag.parentId;
  const seen=new Set<string>();
  while(current&&!seen.has(current)){
    seen.add(current);depth++;current=byId.get(current)?.parentId??null;
  }
  return Math.min(depth,4);
}

export function isCustomTagLabelValid(label:string):boolean{
  return label.trim().length>0&&label.trim().length<=160;
}


export function placementGrammarTags(placement:TextPlacementV1):string[]{
  return [...new Set([
    ...placement.grammaticalTagIds,
    ...(placement.grammaticalSpans??[]).filter(span=>!span.reviewRequired).flatMap(span=>span.tagIds),
  ])];
}
