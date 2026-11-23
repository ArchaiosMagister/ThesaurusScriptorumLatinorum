import type {TextPlacementV1,QuestionWordSlotV1,VocabularyEntryV1} from './edition-model.js';
import {fingerprintForMark} from './edition-validation.js';
import {isSyriaVocabulary,vocabularyKey} from './vocabulary-preferences.js';
import {preverbStatement} from './preverb-selection.js';
import type {ParsedTeacherDocx,LexKind} from './docx-import.js';

/** Aplica los datos docentes sobre un texto ya creado por la plantilla.
 * Si el motor ha generado términos, los aportados en Word tienen prioridad,
 * y solo se conservan los generados para cubrir los huecos.
 */
export function applyParsedTeacherDocx(
  base:TextPlacementV1,doc:ParsedTeacherDocx,nextId:()=>string
):TextPlacementV1 {
  const markup=doc.underlines.length?doc.underlines.map(mark=>({
    id:nextId(),kind:'morph-underline' as const,
    startUtf16:mark.startUtf16,endUtf16:mark.endUtf16,exact:mark.exact,
    textFingerprint:fingerprintForMark(doc.latin,mark.startUtf16,mark.endUtf16),
    reviewRequired:false,
  })):base.text.markup;
  const seenVocabulary=new Set<string>();
  const vocab:VocabularyEntryV1[]=[];
  let syria:VocabularyEntryV1|undefined;
  for(const item of doc.vocabulary){
    const m=item.meaning?.match(/^(.*?)\s+\(([^()]*)\)$/u);
    const meaning=(m?.[1]??item.meaning)?.trim()||null;
    const note=m?.[2]?.trim()||null;
    if(syria&&isSyriaVocabulary(item.headword)){
      const unquote=(value:string)=>value.replace(/^[‘’“”"'«»]+|[‘’“”"'«»]+$/gu,'').trim();
      if(meaning&&(!syria.meaning||unquote(syria.meaning).toLowerCase()!==unquote(meaning).toLowerCase())){
        syria.glossesSeparated=Boolean(syria.meaning);
        syria.meaning=syria.meaning?unquote(syria.meaning)+' | '+unquote(meaning):meaning;
      }
      if(note&&syria.note!==note)syria.note=syria.note?syria.note+'; '+note:note;
      continue;
    }
    const key=JSON.stringify([vocabularyKey(item.headword),meaning?.normalize('NFC'),note?.normalize('NFC')]);
    if(seenVocabulary.has(key))continue;
    seenVocabulary.add(key);
    const entry:VocabularyEntryV1={
      id:nextId(),lemma:item.headword.split(/[,;(]/u)[0]!.trim().slice(0,250),
      headword:item.headword,meaning,note,
      included:true,order:vocab.length,provenance:null,reviewState:'manual',
      origin:'manual',locked:true,
    };
    vocab.push(entry);
    if(isSyriaVocabulary(entry.headword))syria=entry;
  }
  const questions=base.questions.map(q=>{
    if(q.kind==='morphology'){
      return {...q,words:doc.underlines.length?markup.map(m=>({
        id:nextId(),markId:m.id,surface:m.exact,lemmaId:null,analysis:null,
        provenance:null,reviewState:'needs-review' as const,locked:false,
      })):q.words};
    }
    if(q.kind!=='choice')return q;
    return {...q,options:q.options.map(o=>{
      if(o.kind==='preverb'){
        return {...o,enabled:true,
          ...(doc.preverbBases?{
            statement:{value:preverbStatement(doc.preverbBases),origin:'manual' as const,
              locked:true,lastEditAt:null},
          }:{}),
        };
      }
      const originals=doc.lexical[o.kind as LexKind];
      const chosen=new Set(originals.map(x=>x.toLocaleLowerCase('es').normalize('NFC')));
      const actual:QuestionWordSlotV1[]=originals.slice(0,4).map(value=>({
        id:nextId(),value,proposedLemmaId:null,origin:'manual',locked:true,provenance:null,
      }));
      for(const generated of o.slots){
        const key=generated.value.normalize('NFC').toLocaleLowerCase('es');
        if(actual.length===4)break;
        if(!chosen.has(key)){
          chosen.add(key);
          actual.push(generated);
        }
      }
      return {...o,enabled:true,slots:actual};
    })};
  });
  return {...base,
    text:{...base.text,title:doc.title,author:doc.author,work:doc.work,
      reference:doc.reference,latin:doc.latin,markup},
    questions,vocabulary:vocab};
}
