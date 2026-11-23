/**
 * El campo de significado permanece sin comillas para facilitar su edición.
 * La hoja A4 y Word añaden automáticamente las comillas tipográficas.
 * Si el docente ha escrito comillas explícitas, se respeta su elección.
 */
/** Glosas separadas por |: solo cuando el docente activa expresamente la opción. */
export function formattedVocabularyMeaning(value:string|null,separate=false):string|null{
  if(!separate||!value?.includes('|'))return quotedMeaning(value);
  const pieces=value.split('|').map(x=>x.trim()).filter(Boolean);
  return pieces.length?pieces.map(v=>quotedMeaning(v)).join(' '):quotedMeaning(value);
}
export function quotedMeaning(value:string|null):string|null{
  if(value===null||!value.trim())return null;
  const text=value.trim();
  const paired=[
    ["‘","’"],["“","”"],["«","»"],["'","'"],['"','"'],
    ["‹","›"],
  ];
  if(paired.some(([a,b])=>text.startsWith(a!)&&text.endsWith(b!)&&text.length>2))
    return text;
  return '‘'+text+'’';
}
