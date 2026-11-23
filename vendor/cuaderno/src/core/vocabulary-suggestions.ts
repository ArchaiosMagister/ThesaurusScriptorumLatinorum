/**
 * Preparador conservador de vocabulario: no confunde token, forma y lema.
 * Solo una ficha morfológica inequívoca y documentada permite proponer un lema.
 * El banco no contiene acepciones verificadas para todas las voces; jamás inventa significado.
 * La confirmación genera un cambio editable dentro del agregado NotebookEditionV1.
 */
import type { NotebookEditionV1, TextPlacementV1, VocabularyEntryV1 } from './edition-model.js';
import { validateEdition } from './edition-validation.js';
import type { VerifiedAcademicBankV1 } from './academic-bank.js';

export interface VocabularyProposalV1 {
  surface: string;
  occurrences: number;
  lemma: string | null;
  evidence: VocabularyEntryV1['provenance'];
  status: 'lemma-documented' | 'ambiguous' | 'unresolved';
  /** Solo se añade al documento tras decisión explícita del docente. */
  selected: boolean;
}
export interface VocabularyDecisionV1 {
  surface: string;
  selected: boolean;
  /** Enunciado editado por docente. No se deduce automáticamente de la forma. */
  headword: string;
  /** Significado facultativo escrito por docente. */
  meaning: string;
}
export class VocabularySuggestionError extends Error {
  constructor(message:string){super(message);this.name='VocabularySuggestionError';}
}
const normalize=(value:string):string=>value.normalize('NFC').toLocaleLowerCase('es').trim();

export function suggestVocabulary(placement:TextPlacementV1,bank:VerifiedAcademicBankV1):VocabularyProposalV1[]{
  const words=new Map<string,{surface:string;count:number}>();
  for(const match of placement.text.latin.matchAll(/[\p{L}\p{M}]+/gu)){
    const surface=match[0],key=normalize(surface);
    const found=words.get(key);
    if(found)found.count++;
    else words.set(key,{surface,count:1});
  }
  const existing=new Set(placement.vocabulary.flatMap(v=>[
    normalize(v.lemma),normalize(v.headword),normalize(v.headword.split(/[,;:()]/u)[0]??''),
  ]));
  const suggestions:VocabularyProposalV1[]=[];
  const existingLemmas=new Set(placement.vocabulary.map(v=>normalize(v.lemma)));
  for(const [key,record] of words){
    if(existing.has(key))continue;
    // Consulta el token exacto y la forma de caja baja si se trata de
    // mayúscula inicial. No se extiende ninguna evidencia al paradigma.
    const lookup=[record.surface,...(record.surface!==key?[key]:[])];
    const eligible=new Map<string,ReturnType<typeof bank.findVerified>>();
    for(const form of lookup){
      for(const row of bank.verified('morphology',form)){
        eligible.set(row.id,row);
      }
    }
    const verified=[...eligible.values()].filter((x):x is NonNullable<typeof x>=>x!==null);
    const lemmas=new Set(verified.map(row=>normalize(row.lemmaId??'')));
    const single=lemmas.size===1&&verified.length>0;
    if(single&&existingLemmas.has(normalize(verified[0]!.lemmaId??'')))continue;
    suggestions.push({
      surface:record.surface,occurrences:record.count,
      lemma:single?verified[0]!.lemmaId:null,
      evidence:single?verified[0]!.evidence:null,
      status:single?'lemma-documented':verified.length?'ambiguous':'unresolved',
      selected:single,
    });
  }
  return suggestions.sort((a,b)=>a.surface.localeCompare(b.surface,'es'));
}

/** No altera ni elimina entradas existentes (incluidas manuales y sus IDs). */
export function acceptVocabulary(
  edition:NotebookEditionV1,placementId:string,proposals:readonly VocabularyProposalV1[],
  decisions:readonly VocabularyDecisionV1[],nextId:()=>string,at:string,
):NotebookEditionV1 {
  const original=validateEdition(edition);
  const placement=original.placements.find(p=>p.id===placementId);
  if(!placement)throw new VocabularySuggestionError('Texto inexistente.');
  if(!Number.isFinite(Date.parse(at))||new Date(at).toISOString()!==at)
    throw new VocabularySuggestionError('Fecha inválida.');
  const available=new Map(proposals.map(p=>[normalize(p.surface),p]));
  if(available.size!==proposals.length)
    throw new VocabularySuggestionError('Hay candidaturas duplicadas.');
  const seen=new Set<string>(),created:VocabularyEntryV1[]=[];
  const existing=new Set(placement.vocabulary.map(x=>normalize(x.headword)));
  let order=placement.vocabulary.reduce((max,v)=>Math.max(max,v.order),-1)+1;
  for(const d of decisions){
    const surface=normalize(d.surface);
    const source=available.get(surface);
    if(!source||seen.has(surface))throw new VocabularySuggestionError('Candidatura ausente o duplicada.');
    seen.add(surface);
    if(!d.selected)continue;
    const headword=d.headword.trim(),meaning=d.meaning.trim();
    if(!headword||headword.length>500||meaning.length>1000)
      throw new VocabularySuggestionError('Enunciado vacío o demasiado largo.');
    if(existing.has(normalize(headword)))
      throw new VocabularySuggestionError('Ya existe esta entrada de vocabulario: '+headword);
    existing.add(normalize(headword));
    const id=nextId();
    const documented=source.status==='lemma-documented' && source.lemma===headword;
    const edited=headword!==(source.lemma??source.surface)||meaning.length>0;
    created.push({
      id,lemma:headword,headword,meaning:meaning||null,note:null,
      included:true,order:order++,
      // Solo se conserva evidencia del lema sin que se haya escrito una acepción ajena a esa evidencia.
      provenance:documented&&!edited?source.evidence:null,
      // Una entrada sin significado NUNCA se declara revisada, tampoco si el token es desconocido.
      reviewState:meaning?'manual':'needs-review',
      origin:edited?'manual':'generated',
      locked:edited,
    });
  }
  return validateEdition({...original,updatedAt:at,placements:original.placements.map(p=>p.id===placementId
    ?{...p,vocabulary:[...p.vocabulary,...created]}:p)});
}
