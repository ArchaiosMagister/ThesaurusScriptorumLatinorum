import type {CorpusV1,GrammarTag} from './model.js';
import type {NotebookEditionV1} from './edition-model.js';
import {allGrammarTags,matchesGrammarTag,placementGrammarTags} from './grammar-tags.js';

export interface NotebookGrammarCount {
  id:string;label:string;kind:GrammarTag['kind'];parentId:string|null;count:number;
}
export interface NotebookOverview {
  total:number;distinctTexts:number;withoutTags:number;counts:NotebookGrammarCount[];
}

/** Cuenta apariciones en total, pero cada fuente solo una vez por etiqueta.
 * Dos apariciones de un mismo texto no inflan el resultado gramatical. */
export function summarizeNotebook(edition:NotebookEditionV1,corpus:CorpusV1):NotebookOverview{
  const distinct=new Map<string,Set<string>>();
  for(const p of edition.placements){
    const key=p.source.kind==='corpus'&&p.source.sourceId
      ? 'corpus:'+p.source.sourceId : 'placement:'+p.id;
    const tagIds=distinct.get(key)??new Set<string>();
    for(const id of placementGrammarTags(p))tagIds.add(id);
    distinct.set(key,tagIds);
  }
  const tags=allGrammarTags(corpus);
  const counts:NotebookGrammarCount[]=[];
  for(const tag of tags){
    let count=0;
    for(const ids of distinct.values())
      if([...ids].some(id=>matchesGrammarTag(id,tag.id,tags)))count++;
    if(count)counts.push({id:tag.id,label:tag.label,kind:tag.kind,parentId:tag.parentId,count});
  }
  return {total:edition.placements.length,distinctTexts:distinct.size,
    withoutTags:[...distinct.values()].filter(tags=>tags.size===0).length,counts};
}
