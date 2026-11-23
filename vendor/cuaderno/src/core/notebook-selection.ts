import type { CorpusV1, GrammarTag, LatinText } from './model.js';
import { allGrammarTags, matchesGrammarTag } from './grammar-tags.js';

export interface GrammarCount {
  id:string;
  label:string;
  count:number;
  kind:GrammarTag['kind'];
  parentId:string|null;
}

/** El recuento representa TEXTOS distintos, no coincidencias de etiquetas.
 * Para una categoría padre se incluyen sus subetiquetas, una vez por texto. */
export function summarizeSelection(corpus:CorpusV1,selectedIds:readonly string[]):{
  total:number;
  withoutTags:number;
  counts:GrammarCount[];
}{
  const ids=new Set(selectedIds);
  const selected:LatinText[]=corpus.texts.filter(t=>ids.has(t.id));
  const tags=allGrammarTags(corpus);
  const counts:GrammarCount[]=[];
  for(const tag of tags){
    const count=selected.filter(t=>t.tagIds.some(id=>matchesGrammarTag(id,tag.id,tags))).length;
    if(count)counts.push({id:tag.id,label:tag.label,count,kind:tag.kind,parentId:tag.parentId});
  }
  return {total:selected.length,
    withoutTags:selected.filter(t=>t.tagIds.length===0).length,
    counts,
  };
}
