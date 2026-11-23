/** Banco preferente del cuaderno experimental: nunca comparte la clave con Examinator2 estable. */
export const PREFERRED_VOCABULARY_KEY='cuaderno-examinator.vocabulario.v1';
export type VocabularyQuantityMode='modelo'|'todas'|'largas'|'ninguna';
export type VocabularySelectionMode='elegir'|'todo';
export interface PreferredVocabulary {
  lemma:string;
  headword:string;
  meaning:string;
  note:string;
  glossesSeparated:boolean;
}
export function vocabularyKey(value:string):string {
  const first=String(value??'').split(/[,\s(]/u)[0]??'';
  return first.toLocaleLowerCase('es').normalize('NFD')
    .replace(/[\u0300-\u036f]/gu,'').replaceAll('æ','ae').replaceAll('œ','oe')
    .replaceAll('j','i').replaceAll('v','u').replace(/\d+$/u,'').trim();
}
// El diccionario y los glosarios de Word pueden dar el topónimo en
// nominativo, en una forma flexionada o con la grafía Siria.
// Un glosario docente también usa ў cirílica como si fuera una y con breve.
export function isSyriaVocabulary(value:string):boolean {
  return /^(?:syria|siria)(?:e|m|s|rum)?$/u.test(vocabularyKey(value).replaceAll('у','y'));
}
export function vocabularyIdentity(value:string):string {
  return isSyriaVocabulary(value)?'syria':vocabularyKey(value);
}
export function vocabularySortKey(value:string):string {
  return String(value??'').toLocaleLowerCase('es')
    .replaceAll('æ','ae').replaceAll('œ','oe');
}
export function parsePreferredVocabulary(raw:string|null):PreferredVocabulary[]{
  if(raw===null||raw==='')return [];
  const value:unknown=JSON.parse(raw);
  if(!Array.isArray(value))throw Error('El vocabulario preferente no es una lista.');
  const seen=new Set<string>();
  return value.map((v:unknown,i:number)=>{
    if(!v||typeof v!=='object')throw Error('Entrada preferente inválida: '+(i+1));
    const r=v as Record<string,unknown>;
    const lemma=typeof r.lemma==='string'?r.lemma.trim():'';
    const headword=typeof r.headword==='string'?r.headword.trim():'';
    const meaning=typeof r.meaning==='string'?r.meaning.trim():'';
    const note=typeof r.note==='string'?r.note.trim():'';
    const key=vocabularyKey(lemma);
    if(!key||!headword||!meaning||seen.has(key)||
      lemma.length>250||headword.length>500||meaning.length>1000||note.length>2000){
      throw Error('Entrada preferente incompleta o repetida: '+(i+1));
    }
    seen.add(key);
    return {lemma,headword,meaning,note,glossesSeparated:r.glossesSeparated===true};
  });
}
export function putPreferredVocabulary(rows:readonly PreferredVocabulary[],
  entry:PreferredVocabulary):PreferredVocabulary[]{
  // Nunca descartar silenciosamente una lista inválida al guardar otra entrada.
  const validated=parsePreferredVocabulary(JSON.stringify([entry]));
  const key=vocabularyKey(validated[0]!.lemma);
  const rest=rows.filter(v=>vocabularyKey(v.lemma)!==key);
  return parsePreferredVocabulary(JSON.stringify([...rest,validated[0]]));
}
export function preferredFor(rows:readonly PreferredVocabulary[],lemma:string):PreferredVocabulary|null {
  const key=vocabularyKey(lemma);
  return rows.find(x=>vocabularyKey(x.lemma)===key)??null;
}
