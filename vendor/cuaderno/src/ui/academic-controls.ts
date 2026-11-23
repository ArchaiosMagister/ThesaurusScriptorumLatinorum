/** Puente de controles docentes con el motor académico del repositorio.
 * Solo propone candidatos elegibles y los confirma mediante CAS e historial.
 * Ningún cambio de menú, zoom o cantidad regenera términos automáticamente.
 */
import type {
  ChoiceOptionV1, NotebookEditionV1, QuestionV1, TextPlacementV1,
} from '../core/edition-model.js';
import {
  AcademicQuestionEngineV1, generatedAcademicValue, normalizeAcademicExercise, type AcademicPlanV1, type AcademicSlotTargetV1,
  type AcademicMorphTargetV1,
} from '../core/academic-engine.js';
import {
  AcademicMorphTokenSelectorV1, type MorphTokenTargetV1,
} from '../core/academic-morph-selection.js';
import { createOfflineTeacherBankV1, academicTeacherSnapshotV1 } from '../core/academic-teacher-bank.js';
import { teacherPreverbBases, teacherAuditRecord } from '../core/academic-teacher-adapter.js';
import { choosePreverbBases,preverbBaseKeyForForm,preverbStatement,type PreverbSelection } from '../core/preverb-selection.js';
import {validateEdition} from '../core/edition-validation.js';
import {morphologyOccurrencesFreshFirst} from '../core/academic-repetition.js';
import type {CollatinusGrammarToken} from '../core/collatinus-grammar.js';
import {MORPH_TYPES,MORPH_LABELS,morphTypeFromAnalysis,type MorphType} from '../core/morph-categories.js';
import {applyMorphologyChoices,removeMorphologyWord,selectMorphologyForPlacement} from '../core/morph-selection-collatinus.js';
import type { AcademicSlotKindV1 } from '../core/academic-bank.js';
import type { EditionSnapshotV1 } from '../storage/workspace-repository.js';
import { WorkspaceRepository } from '../storage/workspace-repository.js';

type Choice = Extract<QuestionV1,{kind:'choice'}>;
type Morph = Extract<QuestionV1,{kind:'morphology'}>;
type RangeTarget = {placementId:string;start:number;end:number};
type Candidate = {id:string;value:string;detail:string};
type CandidatePending = {
  type:'candidate';kind:'token'|'morph'|'slot';label:string;
  revision:number;baseline:string;target:MorphTokenTargetV1|AcademicMorphTargetV1|AcademicSlotTargetV1;
  candidates:Candidate[];chosen:string;locked:boolean;replaceLocked:boolean;
};
type PlanPending = {
  type:'plan';label:string;plan:AcademicPlanV1;details:string[];
};
type Pending = CandidatePending|PlanPending;
type ContextReading = {key:string;label:string;lemmaId:string;analysis:string;category:MorphType};
type ContextMorphReview = {
  wordId:string;placementId:string;questionId:string;revision:number;baseline:string;
  rows:ContextReading[];selected:string;
};
type Bindings = {
  snapshot:()=>EditionSnapshotV1|null;
  flush:()=>Promise<boolean>;
  saved:(next:EditionSnapshotV1)=>void;
  status:(message:string,error?:boolean)=>void;
  repaint:()=>void;
};
const defaults:Record<AcademicSlotKindV1,number>={preverb:5,phonetics:4,prefix:4,latinism:4};
function el<K extends keyof HTMLElementTagNameMap>(tag:K,cls='',text=''):HTMLElementTagNameMap[K]{
  const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;
}
function button(label:string,act:()=>void|Promise<void>):HTMLButtonElement{
  const b=el('button','btn btn-outline',label);b.type='button';
  if(/^(?:Regenerar|Generar|Proponer|Reanalizar|Sustituir)\b/.test(label))
    b.classList.add('cuaderno-ui-regen');
  if(/^(?:Añadir|Subrayar)\b/.test(label))b.classList.add('cuaderno-ui-add');
  b.addEventListener('click',()=>{void act();});return b;
}
function summary(error:unknown):string{return error instanceof Error?error.message:String(error);}
function randomSeed():number{return crypto.getRandomValues(new Uint32Array(1))[0]??0;}
function safeToken(value:string,start:number,end:number):boolean {
  return start>=0 && end>start && end<=value.length
    && /^[\p{L}\p{M}]+$/u.test(value.slice(start,end))
    && (start===0||!(/[\p{L}\p{M}]/u.test(value[start-1]!)))
    && (end===value.length||!(/[\p{L}\p{M}]/u.test(value[end]!)));
}
function optionName(kind:AcademicSlotKindV1):string{
  return ({preverb:'Modificación preverbial',phonetics:'Evolución fonética',
    prefix:'Prefijos',latinism:'Latinismos'})[kind];
}
function rangeInParagraph(p:HTMLElement,selection:Selection):{start:number;end:number}|null{
  if(selection.rangeCount!==1||selection.isCollapsed)return null;
  const range=selection.getRangeAt(0);
  if(!p.contains(range.startContainer)||!p.contains(range.endContainer))return null;
  const startRange=range.cloneRange();
  startRange.selectNodeContents(p);
  startRange.setEnd(range.startContainer,range.startOffset);
  const endRange=range.cloneRange();
  endRange.selectNodeContents(p);
  endRange.setEnd(range.endContainer,range.endOffset);
  const start=startRange.toString().length,end=endRange.toString().length;
  return safeToken(p.textContent??'',start,end)?{start,end}:null;
}

export function createAcademicControls(repository:WorkspaceRepository,bind:Bindings,
  options:{autoApply?:boolean;onAnalyzeMorphology?:(latin:string)=>Promise<CollatinusGrammarToken[]>}={}){
  // El banco congelado no se modifica y se instancia únicamente cuando se abre un control.
  let services:ReturnType<typeof createOfflineTeacherBankV1>|null=null;
  let engine:AcademicQuestionEngineV1|null=null,selector:AcademicMorphTokenSelectorV1|null=null;
  const bases=teacherPreverbBases(academicTeacherSnapshotV1);
  const autoApply=options.autoApply===true;
  const counts=new Map<string,number>();
  const sourceForms=new Map<string,string[]>();
  const selectedBases=new Map<string,PreverbSelection>();
  const baseUsageSignatures=new Map<string,string>();
  const manuallySelectedBases=new Set<string>();
  const ruleFilters=new Map<string,Set<string>>();
  const rulesEnabled=new Set<string>();
  const replaceGroups=new Set<string>();
  let pending:Pending|null=null;
  let contextMorphReview:ContextMorphReview|null=null;
  let morphNotice:{wordId:string;message:string;error:boolean}|null=null;
  let paperRange:RangeTarget|null=null;
  let working=false;
  const allRules=Array.from({length:20},(_,i)=>'N'+String(i+1).padStart(2,'0'));
  function service(){
    if(!services){
      services=createOfflineTeacherBankV1();
      engine=new AcademicQuestionEngineV1(services.bank);
      selector=new AcademicMorphTokenSelectorV1(services.bank);
    }
    return {report:services,engine:engine!,selector:selector!};
  }
  function clear():void{pending=null;contextMorphReview=null;paperRange=null;morphNotice=null;}
  function reject(error:unknown):void{bind.status('Propuesta no aplicada: '+summary(error),true);}
  function current(){
    const state=bind.snapshot();
    if(!state)throw new Error('Abre primero un cuaderno editorial.');
    return state;
  }
  function countFor(o:ChoiceOptionV1):number{
    return counts.get(o.id)??(o.slots.length||defaults[o.kind]);
  }
  function preverbKeys(option:ChoiceOptionV1):string[]{
    if(option.statement.origin==='generated'&&option.preverbBaseIds)return [...option.preverbBaseIds];
    const found=option.statement.value.match(/\*([^*]+)\* \(3\) y de \*([^*]+)\* \(2\)/u);
    return found?[found[1]!,found[2]!].map(form=>
      preverbBaseKeyForForm(academicTeacherSnapshotV1,form)).filter((id):id is string=>Boolean(id)):[];
  }
  function usedPreverbKeys(excludingOptionId:string):string[]{
    const edition=bind.snapshot()?.edition;
    if(!edition)return [];
    const used=new Set<string>();
    for(const placement of edition.placements)for(const question of placement.questions){
      if(question.kind!=='choice')continue;
      for(const option of question.options){
        if(option.id===excludingOptionId||option.kind!=='preverb'||!option.enabled)continue;
        for(const key of preverbKeys(option))used.add(key);
      }
    }
    return [...used].sort();
  }
  function preverbBasesFor(o:ChoiceOptionV1,p:TextPlacementV1):PreverbSelection{
    const used=usedPreverbKeys(o.id),signature=used.join('\0');
    let selected=selectedBases.get(o.id);
    if(!manuallySelectedBases.has(o.id)&&o.preverbBasesProtected&&o.preverbBaseIds){
      const [first,second]=o.preverbBaseIds;
      const forms=o.statement.value.match(/\*([^*]+)\* \(3\) y de \*([^*]+)\* \(2\)/u);
      if(forms?.[1]&&forms[2]){
        selected={sourceKeys:[first,first,first,second,second],forms:[forms[1],forms[2]],source:'bank'};
        sourceForms.set(o.id,[...selected.sourceKeys]);
        return selected;
      }
    }
    if(!selected||(!manuallySelectedBases.has(o.id)&&baseUsageSignatures.get(o.id)!==signature)){
      selected=choosePreverbBases(academicTeacherSnapshotV1,p.text.latin,Math.random,used);
      selectedBases.set(o.id,selected);
      baseUsageSignatures.set(o.id,signature);
      sourceForms.set(o.id,[...selected.sourceKeys]);
    }
    return selected;
  }
  function sourceFor(o:ChoiceOptionV1,count=countFor(o),p?:TextPlacementV1):string[]{
    if(o.kind==='preverb'&&p)preverbBasesFor(o,p);
    const values=sourceForms.get(o.id)??[];
    return Array.from({length:count},(_,i)=>values[i]??'');
  }
  function rulesFor(q:Choice):readonly string[]|undefined{
    return rulesEnabled.has(q.id)?[...(ruleFilters.get(q.id)??new Set(allRules))]:undefined;
  }
  function replaceFor(id:string):boolean{return replaceGroups.has(id);}
  function fieldsFor(o:ChoiceOptionV1,p?:TextPlacementV1){
    const count=o.kind==='preverb'?5:countFor(o);
    return {
      count,
      sourceForms:o.kind==='preverb'?sourceFor(o,count,p):undefined,
      newSlotIds:Array.from({length:Math.max(0,count-o.slots.length)},()=> 'slot.'+crypto.randomUUID()),
    };
  }
  function prepareDetails(plan:AcademicPlanV1):string[]{
    const {report}=service();
    const old=JSON.parse(plan.baseline) as NotebookEditionV1;
    const placement=old.placements.find(p=>p.id===plan.target.placementId);
    const question=placement?.questions.find(q=>q.id===plan.target.questionId);
    if(!question||question.kind!=='choice')return [];
    const details:string[]=[];
    for(const group of plan.assignments){
      const option=question.options.find(o=>o.id===group.optionId);
      if(!option)continue;
      for(const item of group.items){
        const previous=option.slots.find(x=>x.id===item.slotId)?.value??'—';
        if(!item.candidateId){
          details.push(optionName(option.kind)+': se conserva «'+previous+'» (manual protegida).');
          continue;
        }
        const rec=report.bank.findVerified(item.candidateId);
        if(!rec)throw new Error('Candidato inexistente o no elegible.');
        const audit=teacherAuditRecord(report,item.candidateId);
        const existingSlots=old.placements.flatMap(placement=>placement.questions.flatMap(question=>
          question.kind==='choice'?question.options.flatMap(other=>other.slots):[]));
        const seenBefore=existingSlots.some(slot=>slot.id!==item.slotId&&
          slot.value.normalize('NFC').toLocaleLowerCase('es')===
            rec.value.normalize('NFC').toLocaleLowerCase('es'));
        details.push(optionName(option.kind)+': '+previous+' → '+
          generatedAcademicValue(option.kind,rec.value)+
          (seenBefore?' (reutilizada: no quedan nuevas candidatas compatibles)':'')+
          (audit?.semanticReviewRequired?' (significado orientativo; revisar)':''));
      }
    }
    return details;
  }
  function showCandidate(kind:CandidatePending['kind'],label:string,
    target:CandidatePending['target'],rows:Candidate[],locked:boolean,baseline:string,revision:number):void{
    if(!rows.length)throw new Error('No hay candidatos elegibles para esta selección; no se han modificado datos.');
    pending={type:'candidate',kind,label,target,candidates:rows,
      chosen:rows.length===1?rows[0]!.id:'',locked,replaceLocked:false,baseline,revision};
    bind.repaint();
  }
  async function withSaved(work:(s:EditionSnapshotV1)=>void|Promise<void>):Promise<void>{
    if(working)return;working=true;
    try{
      if(!await bind.flush())throw new Error('Primero resuelve los cambios que no se pudieron guardar.');
      await work(current());
    }catch(e){reject(e);}
    finally{working=false;}
  }
  function candidateRows(kind:'morphology'|AcademicSlotKindV1,
    rows:readonly {id:string;value:string;analysis:string|null;lemmaId:string|null}[]):Candidate[]{
    const report=service().report;
    return rows.map(r=>{
      const data=report.bank.findVerified(r.id),audit=teacherAuditRecord(report,r.id);
      return {id:r.id,value:r.value,
        detail:kind==='morphology'
          ? (r.lemmaId??'?')+' · '+(r.analysis??'Análisis no disponible')
          : (audit?.semanticReviewRequired?'Aviso: indicación semántica orientativa':'Ficha elegible del banco docente')+
            (data?.sourceForm?' · base '+data.sourceForm:'')};
    });
  }
  async function commitPlanDirect(plan:AcademicPlanV1,label:string,
    preverb?:{placementId:string;questionId:string;optionId:string;selection:PreverbSelection}):Promise<void>{
    let saved=await service().engine.commit(repository,plan,new Date().toISOString());
    if(preverb){
      const at=new Date().toISOString();
      const text=preverbStatement(preverb.selection.forms);
      const [first,,,second]=preverb.selection.sourceKeys;
      const preverbBaseIds:[string,string]|undefined=first&&second&&first!==second?[first,second]:undefined;
      // Enunciados editados manualmente no se reescriben al regenerar.
      const placement=saved.edition.placements.find(p=>p.id===preverb.placementId);
      const question=placement?.questions.find(q=>q.id===preverb.questionId);
      const option=question?.kind==='choice'
        ?question.options.find(o=>o.id===preverb.optionId):null;
      // El ejercicio pide al alumnado CINCO derivados: no deben aparecer
      // impresos en el examen. El motor utiliza cinco candidatos internos,
      // pero la hoja muestra solo los dos verbos de partida (3 + 2).
      // Las entradas añadidas manualmente por el profesor no se eliminan.
      if(option){
        saved=await repository.commitEdition(saved.edition.id,saved.revision,
          {command:'ui.preverb-statement',targetId:preverb.optionId,timestamp:at},original=>{
            if(!original)throw new Error('Se ha perdido el cuaderno editorial.');
            return validateEdition({...original,updatedAt:at,
              placements:original.placements.map(p=>p.id!==preverb.placementId?p:{
                ...p,questions:p.questions.map(q=>q.id!==preverb.questionId||q.kind!=='choice'?q:{
                  ...q,options:q.options.map(o=>o.id!==preverb.optionId?o:{
                    ...o,
                    ...(o.statement.locked&&o.statement.origin==='manual'?{}:{
                      statement:{value:text,origin:'generated' as const,locked:false,lastEditAt:null},
                      ...(preverbBaseIds?{preverbBaseIds}:{}),
                      ...(preverbBaseIds&&manuallySelectedBases.has(o.id)?{preverbBasesProtected:true}:{}),
                    }),
                    slots:o.slots.filter(slot=>slot.origin==='manual'),
                  }),
                }),
              }),
            });
          });
      }
    }
    pending=null;paperRange=null;replaceGroups.clear();
    bind.saved(saved);
    const repeated=prepareDetails(plan).filter(x=>x.includes('(reutilizada:')).length;
    bind.status(label+' aplicado directamente. Puedes cambiar cada término individualmente.'+
      (repeated?' Reutilizadas por agotamiento del banco: '+repeated+'.':''));
  }
  async function chooseCandidateDirect(kind:CandidatePending['kind'],
    target:CandidatePending['target'],rows:Candidate[],locked:boolean):Promise<void>{
    if(!rows.length)throw new Error('No hay propuestas documentadas para esta palabra.');
    if(locked){
      bind.status('Palabra manual protegida: se conserva sin reemplazarla.');
      return;
    }
    // En modo directo NO tomar siempre la primera ficha: con un banco grande
    // se alternaba permanentemente entre sus dos primeras palabras.
    const chosen=kind==='slot'?rows[randomSeed()%rows.length]!.id:rows[0]!.id;
    const saved=current();
    let next:EditionSnapshotV1;
    const {engine,selector}=service();
    if(kind==='token'){
      const plan=selector.prepare(saved.edition,target as MorphTokenTargetV1,chosen);
      next=await selector.commit(repository,plan,new Date().toISOString());
    }else if(kind==='morph'){
      const plan=engine.prepareMorph(saved.edition,target as AcademicMorphTargetV1,chosen,false);
      next=await engine.commit(repository,plan,new Date().toISOString());
    }else{
      const plan=engine.prepareSlot(saved.edition,target as AcademicSlotTargetV1,chosen,
        randomSeed(),false);
      next=await engine.commit(repository,plan,new Date().toISOString());
    }
    bind.saved(next);
    bind.status('Aplicado directamente'+(rows.length>1?
      ' · varias lecturas posibles: revisa la forma elegida.':'.'));
  }

  function requestSlot(p:TextPlacementV1,q:Choice,o:ChoiceOptionV1,slotId:string,index:number):void{
    void withSaved(async s=>{
      const target:AcademicSlotTargetV1={
        placementId:p.id,questionId:q.id,optionId:o.id,slotId,expectedRevision:s.revision,
        ...(o.kind==='preverb'?{sourceForm:sourceFor(o)[index]??''}:{}),
        ...(o.kind==='phonetics'&&rulesFor(q)!==undefined?{phoneticRules:rulesFor(q) as readonly string[]}:{}),
      };
      const academic=service().engine;
      const view=academic.previewSlot(s.edition,target);
      const rows=candidateRows(o.kind,view.candidates);
      if(autoApply)await chooseCandidateDirect('slot',target,rows,view.status==='locked');
      else showCandidate('slot','Sustituir una palabra de '+optionName(o.kind),target,
        rows,view.status==='locked',JSON.stringify(s.edition),s.revision);
    });
  }

  async function fillMorphology(placementId:string,replaceWordId:string|null=null):Promise<void>{
    if(!options.onAnalyzeMorphology){
      bind.status('El análisis contextual de Collatinus no está disponible en esta edición.',true);
      return;
    }
    await withSaved(async state=>{
      const p=state.edition.placements.find(p=>p.id===placementId);
      if(!p)throw new Error('Texto latino no encontrado.');
      const rows=await options.onAnalyzeMorphology!(p.text.latin);
      // Preferir siempre una ficha ya verificada. Una forma ambigua del banco
      // verificado (p. ej., dux NOM/VOC) NO se elige sin intervención docente.
      const verified=[] as import('../core/morph-categories.js').MorphChoice[];
      const ambiguousStarts=new Set<number>();
      for(const match of p.text.latin.matchAll(/[\p{L}\p{M}]+/gu)){
        const records=service().report.bank.verified('morphology',match[0]);
        if(records.length>1){ambiguousStarts.add(match.index!);continue;}
        const record=records[0];
        if(!record?.lemmaId||!record.analysis)continue;
        const category=morphTypeFromAnalysis(record.analysis);
        if(!category)continue;
        verified.push({surface:match[0],start:match.index!,end:match.index!+match[0].length,
          key:match[0].normalize('NFC').toLocaleLowerCase('es'),
          category,lemmaId:record.lemmaId,analysis:record.analysis,source:'verified',
          candidateId:record.id,evidence:record.evidence});
      }
      const selected=selectMorphologyForPlacement(state.edition,placementId,
        rows.filter(t=>!ambiguousStarts.has(t.s)),replaceWordId,verified);
      if(!selected.length){
        bind.status(replaceWordId?'No quedan alternativas de la misma categoría para sustituir esta palabra.':
          'No se han encontrado más tipos distintos de palabra con análisis contextual. No se han repetido categorías.');
        return;
      }
      const at=new Date().toISOString();
      const changed=await repository.commitEdition(state.edition.id,state.revision,{
        command:'ui.morphology-contextual-categories',targetId:replaceWordId??placementId,timestamp:at,
      },original=>{
        if(!original)throw new Error('El cuaderno ya no existe.');
        return applyMorphologyChoices(original,placementId,selected,at,replaceWordId);
      });
      contextMorphReview=null;
      bind.saved(changed);
      const q=changed.edition.placements.find(p=>p.id===placementId)?.questions.find(q=>q.kind==='morphology');
      bind.status('Morfología: '+(q?.kind==='morphology'?q.words.length:0)+
        '/4 tipos distintos seleccionados. Se ha aplicado la lectura contextual más probable de Collatinus; puedes modificar cada análisis.');
    });
  }
  function removeMorphWord(p:TextPlacementV1,wordId:string,locked:boolean):void{
    const permitted=window.confirm(locked?
      'La forma está protegida por una decisión docente. ¿Autorizas retirar exclusivamente esta aparición y su subrayado?':
      '¿Quitar esta aparición y su subrayado del texto? Las demás palabras permanecerán intactas.');
    if(!permitted)return;
    void withSaved(async s=>{
      const at=new Date().toISOString();
      const saved=await repository.commitEdition(s.edition.id,s.revision,{
        command:'ui.remove-morphology-appearance',targetId:wordId,timestamp:at,
      },original=>{
        if(!original)throw new Error('El cuaderno ya no existe.');
        return removeMorphologyWord(original,p.id,wordId,at,locked);
      });
      bind.saved(saved);
      bind.status('Aparición retirada. Puedes seleccionar otra categoría.');
    });
  }
  async function confirmContextMorph():Promise<void>{
    const review=contextMorphReview;
    if(!review||!review.selected)return;
    await withSaved(async state=>{
      if(state.revision!==review.revision||JSON.stringify(state.edition)!==review.baseline)
        throw new Error('El cuaderno cambió desde la propuesta. Vuelve a revisar esta aparición.');
      const choice=review.rows.find(row=>row.key===review.selected);
      if(!choice)throw new Error('Análisis contextual no disponible.');
      const at=new Date().toISOString();
      const changed=await repository.commitEdition(state.edition.id,state.revision,{
        command:'ui.confirm-collatinus-morphology',targetId:review.wordId,timestamp:at,
      },edition=>{
        if(!edition)throw new Error('El cuaderno ya no existe.');
        const p=edition.placements.find(p=>p.id===review.placementId);
        const q=p?.questions.find(q=>q.id===review.questionId);
        if(!p||!q||q.kind!=='morphology')throw new Error('La pregunta cambió.');
        const existing=q.words.find(w=>w.id===review.wordId);
        if(!existing||existing.locked)throw new Error('La aparición no existe o está protegida.');
        const collision=q.words.some(w=>w.id!==existing.id&&
          (w.schoolCategory??morphTypeFromAnalysis(w.analysis))===choice.category);
        if(collision)throw new Error('Otra aparición ya utiliza esa categoría gramatical.');
        return validateEdition({...edition,updatedAt:at,placements:edition.placements.map(x=>x.id===p.id?
          {...x,questions:x.questions.map(item=>item.id===q.id?
            {...q,words:q.words.map(w=>w.id===existing.id?{...w,
              lemmaId:choice.lemmaId,analysis:choice.analysis,schoolCategory:choice.category,
              reviewState:'manual' as const}:w)}:item)}:x)});
      });
      contextMorphReview=null;morphNotice=null;
      bind.saved(changed);
      bind.status('Interpretación revisada y guardada como decisión docente; no es una verificación automática de Collatinus.');
    });
  }
  function renderContextMorphReview():HTMLElement|null{
    const review=contextMorphReview;
    if(!review)return null;
    const box=el('section','edition-academic-review edition-morph-inline-review');
    box.setAttribute('aria-label','Lecturas contextuales de Collatinus');
    box.append(el('h4','','Cambiar análisis contextual'),
      el('p','hint','Ya está aplicada la lectura más probable de Collatinus. Puedes conservarla o seleccionar otra; ninguna lectura constituye una verificación automática.'));
    const label=el('label','edition-field');
    label.append(el('span','edition-field-label','Análisis morfológico'));
    const select=el('select','field-control');
    const initial=el('option','','Elige una interpretación');initial.value='';select.append(initial);
    for(const item of review.rows){
      const option=el('option','',item.label+' · '+MORPH_LABELS[item.category]);
      option.value=item.key;select.append(option);
    }
    select.value=review.selected;
    select.addEventListener('change',()=>{if(contextMorphReview===review)review.selected=select.value;});
    label.append(select);box.append(label);
    const actions=el('div','edition-inline-edit');
    actions.append(button('Confirmar lectura',confirmContextMorph),
      button('Cancelar',()=>{contextMorphReview=null;bind.repaint();}));
    box.append(actions);return box;
  }

  function requestMorph(p:TextPlacementV1,q:Morph,wordId:string):void{
    void withSaved(async s=>{
      morphNotice=null;
      const target:AcademicMorphTargetV1={
        placementId:p.id,questionId:q.id,wordId,expectedRevision:s.revision,
      };
      const word=s.edition.placements.find(x=>x.id===p.id)?.questions
        .find(x=>x.id===q.id&&x.kind==='morphology');
      const currentWord=word?.kind==='morphology'?word.words.find(w=>w.id===wordId):null;
      if(!currentWord)throw new Error('La aparición morfológica ya no existe.');
      if(currentWord.locked){
        const message='Este análisis está bloqueado. Desbloquéalo antes de modificarlo.';
        morphNotice={wordId,message,error:false};bind.repaint();bind.status(message);return;
      }
      if(options.onAnalyzeMorphology&&currentWord.provenance?.provider.startsWith('Collatinus')){
        const placement=s.edition.placements.find(x=>x.id===p.id);
        const mark=placement?.text.markup.find(m=>m.id===currentWord.markId);
        if(!placement||!mark)throw new Error('El subrayado ya no coincide con el texto.');
        const tokens=await options.onAnalyzeMorphology(placement.text.latin);
        const token=tokens.find(t=>t.s===mark.startUtf16&&t.e===mark.endUtf16&&t.w===currentWord.surface);
        const occupied=new Set(q.words.filter(w=>w.id!==wordId)
          .map(w=>w.schoolCategory??morphTypeFromAnalysis(w.analysis))
          .filter((type):type is MorphType=>type!==null));
        const available=(token?.cands??[]).flatMap(candidate=>candidate.morphos.map((analysis,index)=>{
          const cat=morphTypeFromAnalysis(analysis,candidate.pos,candidate.im);
          return cat?{key:String(candidate.lid)+':'+index,label:candidate.lemma+' · '+analysis,
            lemmaId:candidate.lemma,analysis,category:cat}:null;
        }).filter((x):x is ContextReading=>x!==null&&!occupied.has(x.category)));
        // La lectura almacenada es la propuesta activa; si ya la corrigió el
        // profesor, su elección es la que se preselecciona al reabrir el menú.
        const preferred=available.find(row=>row.lemmaId===currentWord.lemmaId&&
          row.analysis===currentWord.analysis);
        if(preferred)available.sort((a,b)=>Number(b===preferred)-Number(a===preferred));
        if(!available.length){
          const message='Collatinus no ofrece lecturas clasificables para esta aparición.';
          morphNotice={wordId,message,error:false};bind.repaint();bind.status(message);return;
        }
        contextMorphReview={wordId,placementId:p.id,questionId:q.id,revision:s.revision,
          baseline:JSON.stringify(s.edition),rows:available,selected:preferred?.key??''};
        pending=null;bind.repaint();
        bind.status('Elige el análisis contextual de «'+currentWord.surface+'» y confirma la lectura.');
        return;
      }
      let view:ReturnType<AcademicQuestionEngineV1['previewMorph']>;
      try {
        view=service().engine.previewMorph(s.edition,target);
      }catch(error){
        const message='No se puede revisar esta aparición: '+summary(error);
        morphNotice={wordId,message,error:true};
        bind.repaint();bind.status(message,true);return;
      }
      if(!view.candidates.length){
        const message='No hay análisis verificados disponibles para «'+currentWord.surface+
          '». No se ha modificado nada.';
        morphNotice={wordId,message,error:false};
        bind.repaint();bind.status(message);return;
      }
      const only=view.candidates.length===1?view.candidates[0]:null;
      if(only&&currentWord.reviewState==='verified'&&!currentWord.locked&&
        only.lemmaId===currentWord.lemmaId&&only.analysis===currentWord.analysis){
        const message='«'+currentWord.surface+
          '» ya tiene su único análisis verificado. No hay una interpretación alternativa en el banco.';
        morphNotice={wordId,message,error:false};
        bind.repaint();bind.status(message);return;
      }
      // Ni siquiera en el modo automático elegir arbitrariamente la primera
      // lectura: cada aparición se revisa y confirma en su propio panel.
      const otherTypes=new Set(q.words.filter(w=>w.id!==wordId)
        .map(w=>w.schoolCategory??morphTypeFromAnalysis(w.analysis))
        .filter((x):x is MorphType=>x!==null));
      const available=options.onAnalyzeMorphology?view.candidates.filter(c=>{
        const type=morphTypeFromAnalysis(c.analysis);
        return type&&!otherTypes.has(type);
      }):view.candidates;
      if(!available.length){
        const message='Ningún análisis verificado permite cambiar esta aparición sin repetir categoría.';
        morphNotice={wordId,message,error:false};bind.repaint();bind.status(message);return;
      }
      const rows=candidateRows('morphology',available);
      showCandidate('morph','Revisar análisis de «'+currentWord.surface+'»',target,
        rows,view.status==='locked',JSON.stringify(s.edition),s.revision);
      bind.status('Revisa el análisis de «'+currentWord.surface+
        '» debajo de su aparición y confirma tu elección.');
    });
  }
  function requestGroup(p:TextPlacementV1,q:Choice,o:ChoiceOptionV1):void{
    void withSaved(async s=>{
      const f=fieldsFor(o,p);
      const plan=service().engine.prepareSubquestion(s.edition,{
        placementId:p.id,questionId:q.id,optionId:o.id,expectedRevision:s.revision,
        desiredCount:f.count,newSlotIds:f.newSlotIds,
        ...(f.sourceForms?{sourceForms:f.sourceForms}:{}),
        ...(rulesFor(q)!==undefined?{phoneticRules:rulesFor(q) as readonly string[]}:{}),
        allowManualReplacement:replaceFor(o.id),seed:randomSeed(),
      });
      const details=prepareDetails(plan);
      if(!plan.assignments.some(g=>g.items.some(x=>x.candidateId))){
        throw new Error('No hay términos que sustituir; las palabras manuales permanecen protegidas.');
      }
      if(autoApply){
        const picked=o.kind==='preverb'?preverbBasesFor(o,p):null;
        await commitPlanDirect(plan,optionName(o.kind),
          picked?{placementId:p.id,questionId:q.id,optionId:o.id,selection:picked}:undefined);
      }else{
        pending={type:'plan',label:'Regenerar solo '+optionName(o.kind),plan,details};
        bind.repaint();
      }
    });
  }
  function requestQuestion(p:TextPlacementV1,q:Choice):void{
    void withSaved(async s=>{
      const desiredCountByKind:Partial<Record<AcademicSlotKindV1,number>>={};
      const sourceFormsByKind:Partial<Record<AcademicSlotKindV1,readonly string[]>>={};
      const newSlotIdsByKind:Partial<Record<AcademicSlotKindV1,readonly string[]>>={};
      for(const o of q.options.filter(x=>x.enabled)){
        const f=fieldsFor(o,p);
        desiredCountByKind[o.kind]=f.count;
        newSlotIdsByKind[o.kind]=f.newSlotIds;
        if(f.sourceForms)sourceFormsByKind[o.kind]=f.sourceForms;
      }
      const plan=service().engine.prepareChoiceQuestion(s.edition,{
        placementId:p.id,questionId:q.id,expectedRevision:s.revision,
        desiredCountByKind,sourceFormsByKind,newSlotIdsByKind,
        ...(rulesFor(q)!==undefined?{phoneticRules:rulesFor(q) as readonly string[]}:{}),
        allowManualReplacement:replaceFor(q.id),seed:randomSeed(),
      });
      const details=prepareDetails(plan);
      if(!plan.assignments.some(g=>g.items.some(x=>x.candidateId)))
        throw new Error('No hay términos que regenerar.');
      if(autoApply){
        const preverb=q.options.find(o=>o.kind==='preverb'&&o.enabled);
        const picked=preverb?preverbBasesFor(preverb,p):null;
        await commitPlanDirect(plan,'Pregunta 4',
          preverb&&picked?{placementId:p.id,questionId:q.id,optionId:preverb.id,selection:picked}:undefined);
      }else{
        pending={type:'plan',label:'Regenerar solo la pregunta 4',plan,details};
        bind.repaint();
      }
    });
  }
  function requestToken(target:RangeTarget):void{
    void withSaved(async s=>{
      const p=s.edition.placements.find(x=>x.id===target.placementId);
      const q=p?.questions.find(x=>x.kind==='morphology');
      if(!p||!q)throw new Error('No se encontró la pregunta de morfología.');
      if(!safeToken(p.text.latin,target.start,target.end))
        throw new Error('Selecciona exactamente una palabra latina completa.');
      const t:MorphTokenTargetV1={
        editionId:s.edition.id,placementId:p.id,questionId:q.id,expectedRevision:s.revision,
        startUtf16:target.start,endUtf16:target.end,markId:'mark.'+crypto.randomUUID(),
        wordId:'morph.'+crypto.randomUUID(),
      };
      const view=service().selector.preview(s.edition,t);
      if(options.onAnalyzeMorphology&&q.words.length>=4)
        throw new Error('Ya hay cuatro apariciones morfológicas. Quita una antes de añadir otra.');
      const existing=new Set(q.words.map(w=>w.schoolCategory??morphTypeFromAnalysis(w.analysis))
        .filter((x):x is MorphType=>x!==null));
      if(options.onAnalyzeMorphology&&view.status==='no-candidates'){
        const tokens=await options.onAnalyzeMorphology(p.text.latin);
        const selected=selectMorphologyForPlacement(s.edition,p.id,
          tokens.filter(token=>token.s===target.start&&token.e===target.end));
        if(!selected.length)
          throw new Error('Collatinus no propone un análisis que aporte una categoría nueva para esta aparición.');
        const at=new Date().toISOString();
        const saved=await repository.commitEdition(s.edition.id,s.revision,{
          command:'ui.morphology-contextual-selection',targetId:p.id,timestamp:at,
        },original=>{
          if(!original)throw new Error('El cuaderno ya no existe.');
          return applyMorphologyChoices(original,p.id,selected,at);
        });
        contextMorphReview=null;
        bind.saved(saved);
        bind.status('Lectura contextual de Collatinus aplicada. Puedes cambiarla en «Revisar análisis».');
        return;
      }
      const eligible=options.onAnalyzeMorphology?
        view.candidates.filter(x=>{
          const category=morphTypeFromAnalysis(x.analysis);
          return category&&!existing.has(category);
        }):view.candidates;
      const rows=eligible.map(x=>({id:x.id,value:view.surface,
        detail:x.lemmaId+' · '+x.analysis+' · '+x.reference}));
      if(!rows.length)throw new Error(options.onAnalyzeMorphology?
        'Esta forma no añade un tipo nuevo, es invariable o carece de clasificación verificada.':
        'No hay candidatos elegibles para esta palabra.');
      if(autoApply&&rows.length===1)await chooseCandidateDirect('token',t,rows,false);
      else showCandidate('token','Subrayar y analizar «'+view.surface+'»',t,rows,false,
        JSON.stringify(s.edition),s.revision);
    });
  }
  async function confirm():Promise<void>{
    if(!pending||working)return;
    const original=pending;
    await withSaved(async s=>{
      if(!pending||pending!==original||s.revision!==(original.type==='plan'?
        original.plan.target.expectedRevision:original.revision)
        ||JSON.stringify(s.edition)!==(original.type==='plan'?
          original.plan.baseline:original.baseline)){
        throw new Error('El cuaderno cambió desde la propuesta. Solicita una nueva.');
      }
      const {engine,selector}=service();
      let next:EditionSnapshotV1;
      if(original.type==='plan'){
        next=await engine.commit(repository,original.plan,new Date().toISOString());
      }else{
        if(!original.chosen)throw new Error('Elige una propuesta verificada antes de confirmar.');
        if(original.locked&&!original.replaceLocked)
          throw new Error('La palabra manual está protegida. Autoriza expresamente su sustitución.');
        const e=s.edition;
        if(original.kind==='token'){
          const plan=selector.prepare(e,original.target as MorphTokenTargetV1,original.chosen);
          next=await selector.commit(repository,plan,new Date().toISOString());
        }else if(original.kind==='morph'){
          const target=original.target as AcademicMorphTargetV1;
          const placement=e.placements.find(p=>p.id===target.placementId);
          const question=placement?.questions.find(q=>q.id===target.questionId);
          const word=question?.kind==='morphology'?
            question.words.find(w=>w.id===target.wordId):null;
          const selected=engine.previewMorph(e,target).candidates
            .find(row=>row.id===original.chosen);
          if(word&&selected&&word.reviewState==='verified'&&
            word.lemmaId===selected.lemmaId&&word.analysis===selected.analysis){
            const message='Ese análisis ya estaba confirmado para «'+word.surface+
              '». No se han modificado los datos.';
            pending=null;
            morphNotice={wordId:word.id,message,error:false};
            bind.repaint();bind.status(message);return;
          }
          const plan=engine.prepareMorph(e,target,original.chosen,original.replaceLocked);
          next=await engine.commit(repository,plan,new Date().toISOString());
        }else{
          const plan=engine.prepareSlot(e,original.target as AcademicSlotTargetV1,
            original.chosen,randomSeed(),original.replaceLocked);
          next=await engine.commit(repository,plan,new Date().toISOString());
        }
      }
      pending=null;morphNotice=null;paperRange=null;replaceGroups.clear();
      bind.saved(next);
      bind.status('Propuesta confirmada y guardada con historial. Revisión '+next.revision+'.');
    });
  }
  function review(inlineMorph=false):HTMLElement|null{
    if(!pending)return null;
    const morphCandidate=pending.type==='candidate'&&pending.kind==='morph';
    // El panel morfológico aparece junto a la palabra, no lejos en la cabecera.
    if(morphCandidate!==inlineMorph)return null;
    const box=el('section','edition-academic-review');
    box.setAttribute('aria-label','Revisar propuesta académica');
    box.append(el('h3','',pending.label),
      el('p','hint','Comprueba la propuesta. Ninguna palabra cambiará hasta que confirmes.'));
    if(pending.type==='candidate'){
      const label=el('label','edition-field');
      label.append(el('span','edition-field-label','Candidatura verificada'));
      const select=el('select','field-control');
      const blank=el('option','','Selecciona un análisis o término');blank.value='';select.append(blank);
      for(const row of pending.candidates){
        const opt=el('option','',row.value+' — '+row.detail);opt.value=row.id;select.append(opt);
      }
      select.value=pending.chosen;
      select.addEventListener('change',()=>{
        if(pending?.type==='candidate')pending.chosen=select.value;
      });
      label.append(select);box.append(label);
      if(pending.locked){
        const consent=el('label','edition-option-head');
        const check=el('input');check.type='checkbox';check.checked=pending.replaceLocked;
        check.addEventListener('change',()=>{if(pending?.type==='candidate')pending.replaceLocked=check.checked;});
        consent.append(check,el('span','','Autorizo sustituir esta decisión manual protegida.'));
        box.append(consent);
      }
    }else{
      const items=el('ul','edition-academic-diff');
      for(const line of pending.details){items.append(el('li','',line));}
      box.append(items);
      if(pending.plan.replaceLocked)box.append(el('p','edition-error',
        'Has autorizado sustituir términos manuales en el alcance indicado.'));
    }
    const tools=el('div','edition-inline-edit');
    const accept=button('Confirmar propuesta',confirm);
    accept.classList.add('btn-primary');accept.classList.remove('btn-outline');
    const cancel=button('Cancelar',()=>{pending=null;bind.repaint();});
    tools.append(accept,cancel);box.append(tools);
    return box;
  }
  function setSourcesUi(section:HTMLElement,p:TextPlacementV1,o:ChoiceOptionV1):void{
    if(o.kind!=='preverb')return;
    const picked=preverbBasesFor(o,p);
    const wrap=el('fieldset','edition-source-forms');
    wrap.append(el('legend','','Dos verbos de partida: tres derivados + dos derivados'));
    const values=sourceFor(o,5,p);
    for(const [index,count] of [[0,3],[1,2]] as const){
      const label=el('label','edition-field');
      label.append(el('span','edition-field-label',
        'Verbo '+(index+1)+' · '+count+' derivados'+
        (picked.forms[index]?' · '+picked.forms[index]:'') ));
      const select=el('select','field-control');
      for(const base of bases){
        const opt=el('option','',base.enunciado+(base.requiresDisambiguation?' · homónimo':''));opt.value=base.selectionKey;
        select.append(opt);
      }
      select.value=values[index===0?0:3]??'';
      select.addEventListener('change',()=>{
        const first=index===0?select.value:values[0]!;
        const second=index===1?select.value:values[3]!;
        sourceForms.set(o.id,[first,first,first,second,second]);
        manuallySelectedBases.add(o.id);
        // Una elección manual sustituye la forma tomada del pasaje
        // por el lema del banco, sin declarar que aparece en el texto.
        const baseA=bases.find(x=>x.selectionKey===first);
        const baseB=bases.find(x=>x.selectionKey===second);
        if(baseA&&baseB){
          selectedBases.set(o.id,{sourceKeys:[first,first,first,second,second],
            forms:[baseA.lemma,baseB.lemma],source:'bank'});
        }
        bind.repaint();
      });
      label.append(select);wrap.append(label);
    }
    wrap.append(el('p','hint','Se priorizan bases del pasaje no utilizadas en otros textos; después se buscan nuevas en el banco. Solo se reutilizan si no quedan bases válidas.'));
    section.append(wrap);
  }
  function phoneticControls(section:HTMLElement,q:Choice):void{
    const details=el('details','edition-rules');
    const title=el('summary','','Normas fonéticas permitidas (N01–N20)');
    details.append(title);
    const enabled=el('label','edition-option-head');
    const check=el('input');check.type='checkbox';check.checked=rulesEnabled.has(q.id);
    check.addEventListener('change',()=>{
      if(check.checked)rulesEnabled.add(q.id);else rulesEnabled.delete(q.id);
      bind.repaint();
    });
    enabled.append(check,el('span','','Restringir a las normas seleccionadas'));
    details.append(enabled);
    if(rulesEnabled.has(q.id)){
      const rules=ruleFilters.get(q.id)??new Set(allRules);
      const grid=el('div','edition-rule-grid');
      for(const code of allRules){
        const label=el('label','edition-option-head');
        const input=el('input');input.type='checkbox';input.checked=rules.has(code);
        input.addEventListener('change',()=>{
          const next=new Set(ruleFilters.get(q.id)??allRules);
          if(input.checked)next.add(code);else next.delete(code);
          ruleFilters.set(q.id,next);
        });
        label.append(input,el('span','',code));grid.append(label);
      }
      details.append(grid);
    }
    section.append(details);
  }
  function consent(section:HTMLElement,key:string):void{
    const label=el('label','edition-option-head');
    const input=el('input');input.type='checkbox';input.checked=replaceGroups.has(key);
    input.addEventListener('change',()=>{
      if(input.checked)replaceGroups.add(key);else replaceGroups.delete(key);
    });
    label.append(input,el('span','','Permitir sustituir palabras manuales protegidas en esta operación'));
    section.append(label);
  }
  function renderOption(section:HTMLElement,p:TextPlacementV1,q:Choice,o:ChoiceOptionV1):void{
    const ui=el('div','edition-academic-option');
    const label=el('label','edition-field');
    label.append(el('span','edition-field-label','Cantidad para este apartado (sin regenerar automáticamente)'));
    const count=el('input','field-control');count.type='number';count.min='1';count.max='30';
    count.value=String(o.kind==='preverb'?5:countFor(o));
    if(o.kind==='preverb')count.disabled=true;
    count.addEventListener('change',()=>{
      const n=Number(count.value);
      if(!Number.isInteger(n)||n<1||n>30){count.value=String(countFor(o));return;}
      counts.set(o.id,n);bind.repaint();
    });
    label.append(count);ui.append(label);
    setSourcesUi(ui,p,o);
    consent(ui,o.id);
    ui.append(button((autoApply?'Generar ':'Proponer apartado ')+optionName(o.kind),()=>requestGroup(p,q,o)));
    section.append(ui);
  }
  function renderSlot(section:HTMLElement,p:TextPlacementV1,q:Choice,o:ChoiceOptionV1,slotId:string,index:number):void{
    // Examinator2: «Otra» / «Otro» junto a cada término. Mantener el nombre
    // accesible anterior y exactamente el mismo manejador de propuesta.
    const short=o.kind==='preverb'||o.kind==='latinism'?'Otro':'Otra';
    const propose=button(short,()=>requestSlot(p,q,o,slotId,index));
    propose.title='Proponer solo esta palabra';
    propose.setAttribute('aria-label','Proponer solo esta palabra');
    propose.classList.add('cuaderno-ui-regen','edition-slot-regenerate');
    section.append(propose);
  }
  function renderQuestion(section:HTMLElement,p:TextPlacementV1,q:Choice):void{
    const ui=el('div','edition-academic-question');
    phoneticControls(ui,q);
    consent(ui,q.id);
    ui.append(button(autoApply?'Generar pregunta 4':'Proponer pregunta 4 completa',()=>requestQuestion(p,q)),
      el('p','hint',autoApply?'Los candidatos documentados se aplican directamente. Puedes editarlos después.':
        'Los apartados desactivados y las otras preguntas quedan intactos. Las propuestas se revisan antes de guardar.'));
    section.append(ui);
  }
  function renderMorph(section:HTMLElement,p:TextPlacementV1,q:Morph):void{
    const ui=el('div','edition-academic-morph');
    const selectedTypes=new Set(q.words.map(w=>w.schoolCategory??morphTypeFromAnalysis(w.analysis))
      .filter((x):x is MorphType=>x!==null));
    ui.append(el('h4','','Cuatro apariciones · cuatro tipos distintos ('+q.words.length+'/4)'));
    const legend=el('div','edition-morph-category-legend');
    legend.setAttribute('aria-label','Tipos gramaticales disponibles');
    for(const type of MORPH_TYPES){
      const badge=el('span','edition-morph-category',MORPH_LABELS[type]);
      badge.dataset.category=type;
      badge.dataset.selected=String(selectedTypes.has(type));
      badge.title=selectedTypes.has(type)?'Tipo ya utilizado en este texto':'Tipo disponible';
      legend.append(badge);
    }
    ui.append(legend);
    if(q.words.length){
      for(const word of q.words){
        const line=el('div','edition-academic-morph-row');
        const type=word.schoolCategory??morphTypeFromAnalysis(word.analysis);
        const tag=el('span','edition-morph-category',type?MORPH_LABELS[type]:'Sin clasificar');
        if(type)tag.dataset.category=type;
        line.append(tag,el('span','',word.surface+' · '+(word.analysis??'Pendiente')+
          (word.reviewState==='needs-review'?' · lectura contextual propuesta (editable)':'')+
          (word.reviewState==='manual'?' · análisis elegido por el docente':'')+
          (word.locked?' · manual protegida':'')));
        const revisit=button('Revisar análisis',()=>requestMorph(p,q,word.id));
        revisit.setAttribute('aria-label','Revisar análisis de '+word.surface);
        line.append(revisit);
        if(options.onAnalyzeMorphology){
          const another=button('Otra',()=>{void fillMorphology(p.id,word.id);});
          another.setAttribute('aria-label','Otra palabra en lugar de '+word.surface);
          line.append(another);
        }
        const remove=button('Quitar',()=>removeMorphWord(p,word.id,word.locked));
        remove.setAttribute('aria-label','Quitar aparición de '+word.surface);
        line.append(remove);
        ui.append(line);
        if(morphNotice?.wordId===word.id){
          const notice=el('p','edition-morph-feedback',morphNotice.message);
          notice.setAttribute('role',morphNotice.error?'alert':'status');
          ui.append(notice);
        }
        if(contextMorphReview?.wordId===word.id){
          const contextual=renderContextMorphReview();
          if(contextual)ui.append(contextual);
        }
        if(pending?.type==='candidate'&&pending.kind==='morph'&&
          (pending.target as AcademicMorphTargetV1).wordId===word.id){
          const inline=review(true);
          if(inline){
            inline.classList.add('edition-morph-inline-review');
            ui.append(inline);
          }
        }
      }
    }
    if(options.onAnalyzeMorphology){
      const complete=button('Completar hasta cuatro tipos',()=>{void fillMorphology(p.id);});
      complete.disabled=q.words.length>=4;
      ui.append(complete,el('p','hint',
        'Solo se seleccionan formas presentes en este pasaje. No se repiten tipos; si faltan categorías, se dejan huecos. Se aplica el análisis más probable de Collatinus, que puedes cambiar en «Revisar análisis».'));
    }else{
      ui.append(el('p','hint',
        'Para añadir una aparición, selecciona una palabra completa en el campo Texto latino o sobre la hoja A4. Solo se admiten análisis individuales elegibles.'));
    }
    section.append(ui);
  }
  function renderTextSelect(p:TextPlacementV1,area:HTMLTextAreaElement):HTMLElement{
    const row=el('div','edition-inline-edit edition-academic-select');
    const label=el('span','hint','Selecciona una palabra concreta en el campo latino.');
    const add=button('Subrayar palabra seleccionada',()=>{
      const start=area.selectionStart,end=area.selectionEnd;
      requestToken({placementId:p.id,start,end});
    });
    row.append(label,add);
    return row;
  }
  function capturePaperSelection(root:HTMLElement):RangeTarget|null{
    const selection=window.getSelection();
    if(!selection||selection.isCollapsed)return null;
    const range=selection.getRangeAt(0);
    const startNode=range.startContainer instanceof Element?range.startContainer:range.startContainer.parentElement;
    const paragraph=startNode?.closest<HTMLElement>('.edition-latin');
    if(!paragraph||!root.contains(paragraph)||!paragraph.dataset.placementId)return null;
    const offsets=rangeInParagraph(paragraph,selection);
    return offsets?{placementId:paragraph.dataset.placementId,start:offsets.start,end:offsets.end}:null;
  }
  function renderPaperSelect(root:HTMLElement):HTMLButtonElement{
    const add=button('Subrayar selección de la hoja',()=>{
      const selected=capturePaperSelection(root)??paperRange;
      if(!selected){bind.status('Selecciona una palabra latina completa en la hoja antes de pulsar el botón.',true);return;}
      requestToken(selected);
    });
    // Los tiradores de Safari pueden colapsar la selección al tocar el botón.
    // Guardamos exclusivamente la selección del texto de la hoja actual.
    add.addEventListener('pointerdown',()=>{paperRange=capturePaperSelection(root)??paperRange;});
    return add;
  }
  function savePaperSelection(root:HTMLElement):void{
    const selection=capturePaperSelection(root);
    if(selection)paperRange=selection;
  }
  /** Al incorporar un texto nuevo se rellenan las preguntas disponibles
   * sin formularios previos. El motor evita repetir fichas en el cuaderno
   * mientras existan otras candidatas documentadas.
   * No altera preguntas redactadas o protegidas por el docente.
   */
  async function generateInitial(placementId:string):Promise<void>{
    if(!autoApply)return;
    await withSaved(async first=>{
      const p=first.edition.placements.find(x=>x.id===placementId);
      if(!p)return;
      const question=p.questions.find(q=>q.kind==='choice');
      if(!question||question.kind!=='choice')return;
      // Solo se completa la pregunta original vacía, nunca se regenera
      // una ya preparada o modificada manualmente.
      if(question.options.some(o=>o.slots.length>0||
        (o.statement.locked&&o.statement.origin==='manual')))return;
      const desiredCountByKind:Partial<Record<AcademicSlotKindV1,number>>={};
      const sourceFormsByKind:Partial<Record<AcademicSlotKindV1,readonly string[]>>={};
      const newSlotIdsByKind:Partial<Record<AcademicSlotKindV1,readonly string[]>>={};
      for(const option of question.options.filter(x=>x.enabled)){
        const fields=fieldsFor(option,p);
        desiredCountByKind[option.kind]=fields.count;
        newSlotIdsByKind[option.kind]=fields.newSlotIds;
        if(fields.sourceForms)sourceFormsByKind[option.kind]=fields.sourceForms;
      }
      const plan=service().engine.prepareChoiceQuestion(first.edition,{
        placementId:p.id,questionId:question.id,expectedRevision:first.revision,
        desiredCountByKind,sourceFormsByKind,newSlotIdsByKind,
        seed:randomSeed(),allowManualReplacement:false,
      });
      if(plan.assignments.some(g=>g.items.some(x=>x.candidateId))){
        const preverb=question.options.find(o=>o.kind==='preverb'&&o.enabled);
        const picked=preverb?preverbBasesFor(preverb,p):null;
        await commitPlanDirect(plan,'Preguntas iniciales',
          preverb&&picked?{placementId:p.id,questionId:question.id,
            optionId:preverb.id,selection:picked}:undefined);
      }
    });
    if(options.onAnalyzeMorphology){
      await fillMorphology(placementId);
      return;
    }
    // Para el editor clásico se conserva el selector individual anterior.
    await withSaved(async first=>{
      const p=first.edition.placements.find(x=>x.id===placementId);
      const question=p?.questions.find(q=>q.kind==='morphology');
      if(!p||!question||question.kind!=='morphology'||question.words.length)return;
      const tokens=[...p.text.latin.matchAll(/[\p{L}\p{M}]+/gu)];
      const already=new Set(first.edition.placements.flatMap(x=>
        x.questions.filter(q=>q.kind==='morphology').flatMap(q=>
          q.kind==='morphology'?q.words.map(w=>w.surface.toLocaleLowerCase('es')):[])));
      const possible=tokens.flatMap(t=>{
        const surface=t[0],key=surface.toLocaleLowerCase('es');
        const records=service().report.bank.verified('morphology',surface);
        const unambiguous=new Set(records.map(r=>(r.lemmaId??'')+'|'+(r.analysis??''))).size===1;
        return records.length&&unambiguous
          ?[{surface,start:t.index!,end:t.index!+surface.length,key}]:[];
      });
      // Si solo queda una forma inédita, utilizarla primero y completar
      // únicamente lo que falte con formas previamente usadas.
      const pool=morphologyOccurrencesFreshFirst(possible,already);
      const taken=new Set<string>();
      for(const token of pool){
        if(taken.size>=2)break;
        if(taken.has(token.key))continue;
        const currentState=current();
        const currentPlacement=currentState.edition.placements.find(x=>x.id===placementId);
        if(!currentPlacement||currentPlacement.text.markup.some(m=>
          token.start<m.endUtf16&&m.startUtf16<token.end))continue;
        const target:MorphTokenTargetV1={
          editionId:currentState.edition.id,placementId,questionId:question.id,
          expectedRevision:currentState.revision,startUtf16:token.start,
          endUtf16:token.end,markId:'mark.'+crypto.randomUUID(),
          wordId:'morph.'+crypto.randomUUID(),
        };
        const inspection=service().selector.preview(currentState.edition,target);
        if(inspection.status!=='ready')continue;
        const plan=service().selector.prepare(currentState.edition,target);
        const saved=await service().selector.commit(repository,plan,new Date().toISOString());
        taken.add(token.key);bind.saved(saved);
      }
    });
  }
  function inspectRepetitions(state:EditionSnapshotV1){
    const groups=new Map<string,{title:string;kind:AcademicSlotKindV1;word:string;
      target:AcademicSlotTargetV1;protected:boolean}[]>();
    const morphology=new Map<string,{title:string;surface:string;protected:boolean}[]>();
    const baseCounts=new Map<string,string[]>();
    for(const placement of state.edition.placements)for(const question of placement.questions){
      if(!question.enabled)continue;
      if(question.kind==='morphology'){
        for(const word of question.words){
          const key=normalizeAcademicExercise(word.surface);
          const uses=morphology.get(key)??[];
          uses.push({title:placement.text.title,surface:word.surface,
            protected:word.locked||word.reviewState==='manual'});
          morphology.set(key,uses);
        }
        continue;
      }
      if(question.kind!=='choice')continue;
      for(const option of question.options){
        if(!option.enabled)continue;
        if(option.kind==='preverb'){
          for(const base of preverbKeys(option)){
            const uses=baseCounts.get(base)??[];
            uses.push(placement.text.title);baseCounts.set(base,uses);
          }
          continue;
        }
        for(const slot of option.slots){
          // Evitar repetir la misma palabra incluso entre tipos distintos de ejercicio.
          const key=normalizeAcademicExercise(slot.value);
          const uses=groups.get(key)??[];
          uses.push({title:placement.text.title,kind:option.kind,word:slot.value,
            protected:slot.locked||slot.origin==='manual',
            target:{placementId:placement.id,questionId:question.id,optionId:option.id,
              slotId:slot.id,expectedRevision:state.revision,
              ...(rulesFor(question)!==undefined?{phoneticRules:rulesFor(question)!}:{})}});
          groups.set(key,uses);
        }
      }
    }
    return {duplicates:[...groups.values()].filter(uses=>uses.length>1),
      morphologyDuplicates:[...morphology.values()].filter(uses=>uses.length>1),
      baseCounts};
  }
  function repetitionNotice():HTMLElement|null{
    const state=bind.snapshot();
    if(!state)return null;
    const {duplicates,morphologyDuplicates,baseCounts}=inspectRepetitions(state);
    const repeatedBases=[...baseCounts.values()].filter(uses=>uses.length>1).length;
    if(!duplicates.length&&!repeatedBases&&!morphologyDuplicates.length)return null;
    const notice=el('p','hint edition-repetition-notice',
      'Repeticiones: '+duplicates.length+(duplicates.length===1?' palabra':' palabras')+
      ', '+morphologyDuplicates.length+(morphologyDuplicates.length===1?' forma morfológica':' formas morfológicas')+
      ' y '+repeatedBases+(repeatedBases===1?' base preverbial':' bases preverbiales')+
      (autoApply?'. Organizar → Revisar cuaderno.':'. Cuaderno → Revisar cuaderno.'));
    notice.setAttribute('role','status');
    return notice;
  }
  function reviewPreverbBases(result:HTMLElement,state:EditionSnapshotV1,counts:Map<string,string[]>):void{
    const repeated=new Set([...counts].filter(([,uses])=>uses.length>1).map(([base])=>base));
    for(const base of repeated)
      result.append(el('p','','Base preverbial repetida · '+base+' · '+counts.get(base)!.join(', ')));
    if(!repeated.size)return;
    for(const placement of state.edition.placements)for(const question of placement.questions){
      if(!question.enabled||question.kind!=='choice')continue;
      const option=question.options.find(item=>item.enabled&&item.kind==='preverb');
      if(!option||!preverbKeys(option).some(key=>repeated.has(key)))continue;
      if(option.statement.origin!=='generated'||option.statement.locked||option.slots.length
        ||option.preverbBasesProtected||manuallySelectedBases.has(option.id)){
        result.append(el('p','',placement.text.title+' · Bases protegidas'));
        continue;
      }
      const used=[...counts.keys()];
      const replacement=choosePreverbBases(academicTeacherSnapshotV1,placement.text.latin,()=>0,used);
      const [first,,,second]=replacement.sourceKeys;
      const canApply=(current:EditionSnapshotV1)=>service().engine.prepareSubquestion(current.edition,{
        placementId:placement.id,questionId:question.id,optionId:option.id,expectedRevision:current.revision,
        desiredCount:5,sourceForms:replacement.sourceKeys,
        newSlotIds:Array.from({length:5},()=> 'slot.'+crypto.randomUUID()),
        allowManualReplacement:false,seed:0,
      }).assignments.some(group=>group.items.length===5&&group.items.every(item=>item.candidateId));
      if(!first||!second||used.includes(first)||used.includes(second)||!canApply(state)){
        result.append(el('p','',placement.text.title+' · Sin pareja de bases verificadas libres'));
        continue;
      }
      result.append(button(placement.text.title+' · Sustituir bases por '+replacement.forms.join(' y '),async()=>{
        await withSaved(async latest=>{
          if(latest.edition.id!==state.edition.id||latest.revision!==state.revision||!canApply(latest))
            throw new Error('La revisión ha caducado. Vuelve a revisar el cuaderno.');
          const at=new Date().toISOString();
          const saved=await repository.commitEdition(latest.edition.id,latest.revision,
            {command:'ui.replace-repeated-preverb',targetId:option.id,timestamp:at},previous=>{
              if(!previous)throw new Error('Se ha perdido el cuaderno editorial.');
              return {...previous,updatedAt:at,placements:previous.placements.map(p=>p.id!==placement.id?p:{
                ...p,questions:p.questions.map(q=>q.id!==question.id||q.kind!=='choice'?q:{
                  ...q,options:q.options.map(o=>o.id!==option.id?o:{
                    ...o,preverbBaseIds:[first,second],
                    statement:{...o.statement,value:preverbStatement(replacement.forms)},
                  }),
                }),
              })};
            });
          bind.saved(saved);
          bind.status('Bases preverbiales sustituidas. Se mantienen tres y dos derivados.');
        });
      }));
    }
  }
  function renderNotebookAudit():HTMLElement{
    const details=el('details','edition-audit');
    details.append(el('summary','','Revisar cuaderno'));
    const result=el('div');details.append(result);
    async function inspect():Promise<void>{
      await withSaved(state=>{
        const {duplicates,morphologyDuplicates,baseCounts}=inspectRepetitions(state);
        result.replaceChildren(el('p','',state.edition.placements.length+' textos revisados · '+
          baseCounts.size+' bases preverbiales distintas'));
        result.append(el('p','hint','Las palabras se comparan en todo el cuaderno, '+
          'también entre apartados distintos. Las decisiones manuales están protegidas; '+
          'si el banco verificado no ofrece alternativas nuevas, la repetición es inevitable.'));
        for(const kind of ['phonetics','prefix','latinism'] as const){
          const rows=duplicates.filter(uses=>uses[0]?.kind===kind);
          result.append(el('h4','',optionName(kind)+' · '+rows.length+' palabras repetidas'));
          for(const uses of rows){
            const first=uses[0]!;
            result.append(el('p','',first.word+' · '+uses.map(use=>
              use.title+(use.protected?' (protegida)':'')+
                (use.kind!==first.kind?' ['+optionName(use.kind)+']':'')).join(', ')));
            const preserved=uses.find(use=>use.protected)??first;
            for(const use of uses.filter(use=>use!==preserved&&!use.protected)){
              const engine=service().engine;
              const choices=engine.previewSlot(state.edition,use.target,true).candidates;
              const candidate=choices[0];
              if(!candidate){
                result.append(el('p','',use.title+
                  ' · Repetición inevitable: no quedan alternativas nuevas verificadas con los filtros actuales'));
                continue;
              }
              result.append(button(use.title+' · Sustituir por '+candidate.value+' ('+
                choices.length+' alternativas)',async()=>{
                await withSaved(async latest=>{
                  const target={...use.target,expectedRevision:latest.revision};
                  if(latest.revision!==state.revision||JSON.stringify(latest.edition)!==JSON.stringify(state.edition)
                    ||!engine.previewSlot(latest.edition,target,true).candidates.some(row=>row.id===candidate.id))
                    throw new Error('La revisión ha caducado. Vuelve a revisar el cuaderno.');
                  const plan=engine.prepareSlot(latest.edition,target,candidate.id);
                  await commitPlanDirect(plan,'Sustitución de la palabra repetida');
                });
              }));
            }
          }
        }
        result.append(el('h4','','Morfología · '+morphologyDuplicates.length+
          (morphologyDuplicates.length===1?' forma repetida':' formas repetidas')));
        for(const uses of morphologyDuplicates){
          result.append(el('p','',uses[0]!.surface+' · '+uses.map(use=>use.title+
            (use.protected?' (manual protegida)':'')).join(', ')+
            ' · La forma se conserva; comprueba si hay otra forma verificable en el pasaje.'));
        }
        reviewPreverbBases(result,state,baseCounts);
      });
    }
    details.addEventListener('toggle',()=>{if(details.open)void inspect();});
    return details;
  }
  return {
    clear,generateInitial,review,repetitionNotice,renderNotebookAudit,renderOption,renderSlot,renderQuestion,renderMorph,renderTextSelect,
    renderPaperSelect,savePaperSelection,
  };
}
