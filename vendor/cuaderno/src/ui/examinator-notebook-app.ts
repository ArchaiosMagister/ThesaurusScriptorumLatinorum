import { conflictsWithGrammarForm } from '../core/grammar-tags.js';
import type {GrammarReviewDecisionV1} from '../core/edition-model.js';
import {fingerprintForMark} from '../core/edition-validation.js';
import {proposeCollatinusGrammar,type CollatinusGrammarToken,type CollatinusGrammarCandidate,type CollatinusGrammarProposal} from '../core/collatinus-grammar.js';
import {renderGrammarEditor} from './grammar-editor.js';
import {createCuadernoPwaControls,startCuadernoPwa} from './pwa-controls.js';
import type {CorpusV1,GrammarTag,LatinText} from '../core/model.js';
import {validateCorpus} from '../core/validation.js';
import {InvalidCorpusError} from '../core/errors.js';
/**
 * Primera conexión funcional de CuadernoTextosLatinos sobre el DOM y la
 * biblioteca originales de Examinator2. No recrea sus plantillas ni su CSS.
 * El único estado académico pertenece a EditionPane + WorkspaceRepository.
 */
import {createEditionPane,WORKING_EDITION_ID} from './edition-app.js';
import {IndexedDbCorpusRepository} from '../storage/indexeddb-corpus-repository.js';
import {WorkspaceRepository,WorkspaceConflictError,type EditionSnapshotV1} from '../storage/workspace-repository.js';
import {openSupabaseSyncModal} from './supabase-sync-modal.js';
import {combineNotebookCorpora,createNotebookBackup,createWorkspaceBackup,importNotebookDependencies,prepareWorkspaceRestore,readNotebookBackup,restoreWorkspaceBackup,WORKSPACE_BACKUP_MAX_CHARACTERS} from '../storage/workspace-backup.js';
import {DownloadedWorksRepository} from '../storage/downloaded-works.js';
import {deleteText,upsertText,requiresDistinctDocxSource,type TextDraft} from '../core/editor-operations.js';
import {auditLibraryDuplicates,findPossibleDuplicates,type LibraryDuplicatePair} from '../core/text-duplicates.js';
import {nextNotebookTextTitle} from '../core/notebook-titles.js';
import {readTeacherDocx,type ParsedTeacherDocx} from '../core/docx-import.js';
import {parseExaminatorCatalogue,originalWorkUrl,convertPerseusXml,
  type ExaminatorCatalogue,type ExaminatorEntry} from '../core/examinator-library.js';
import {foldLatin,type LibraryEntry,type LibraryWork} from '../core/library.js';
import {allGrammarTags,attachGrammarTags,catalogDepth,findTagByLabel,GRAMMAR_GROUP_IDS,isCustomTagLabelValid,matchesGrammarFilters,matchesGrammarTag,placementGrammarTags} from '../core/grammar-tags.js';
import {PREFERRED_VOCABULARY_KEY,parsePreferredVocabulary,preferredFor,vocabularyKey,
  type VocabularyQuantityMode} from '../core/vocabulary-preferences.js';
import type {CollatinusVocabularyCandidate} from './edition-app.js';

type Entry=ExaminatorEntry & {local?:LibraryEntry};
type DisplayEntry=Entry & {i:number;have:boolean;builtin:boolean};
type SelectionInput={urn:string;text:string;author:string;obra:string;cita:string};
type OriginalBridge={
  Propose?:{citeRef:(a:string,b:string,levels?:string[])=>string};
  openLibrary?:()=>Promise<void>;
  setTextFromLibrary?:(selection:SelectionInput)=>void;
  toast:(text:string,duration?:number)=>void;
  modal:(title:string,body:HTMLElement|string,
    actions:{label:string;primary?:boolean;onclick?:()=>void|false|Promise<void|false>}[],options?:{noFocus?:boolean;width?:string})=>{close:()=>void};
  roman:(n:string|number)=>string;
};
const host=window as unknown as Window & {
  M:OriginalBridge;
  api:{
    web:boolean;
    call:(method:string,args?:{ids?:number[];urn?:string})=>Promise<unknown>;
    on:(event:string,listener:(payload:any)=>void)=>void;
  };
};
const M=host.M;
if(!M)throw new Error('No se ha cargado el código original de Examinator2.');
const repo=new IndexedDbCorpusRepository();
const workspace=new WorkspaceRepository();
const downloads=new DownloadedWorksRepository('cuaderno-original-examinator2-obras');
const composer=createEditionPane({
  autoApply:true,
  autoVocabulary:false,
  findCorpusSource:async id=>(await loadCombinedCorpus()).texts.find(text=>text.id===id),
  onEditGrammarTags:()=>openGrammarEditor(),
  // El editor puede solicitar etiquetas antes de que termine la carga asíncrona
  // del banco. No interpretar esa condición como datos dañados del usuario.
  tagLabel:id=>corpus?allGrammarTags(corpus).find(tag=>tag.id===id)?.label??id:id,
  onAnalyzeVocabulary:(latin,quantity)=>collatinusVocabulary(latin,quantity),
  onAnalyzeMorphology:latin=>analyzeLatin(latin),
});
const works=new Map<string,LibraryWork>();
const ownCache=new Set<string>();
let corpus:CorpusV1;
let notebooks:EditionSnapshotV1[]=[];
let currentId:string|null=null;
const lastNotebookKey='cuaderno-examinator-ultimo-v1';
function rememberNotebook():void{
  try{
    if(currentId)localStorage.setItem(lastNotebookKey,currentId);
    else localStorage.removeItem(lastNotebookKey);
  }catch{/* almacenamiento opcional */}
}
function downloadBackup(json:string,name:string):void{
  const url=URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));
  const link=el('a');link.href=url;
  link.download=name+'-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.append(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function restoreNotebooks(file:File):Promise<void>{
  if(file.size>WORKSPACE_BACKUP_MAX_CHARACTERS)throw Error('La copia supera 64 MiB.');
  if(!await composer.flush())throw Error('No se han guardado los cambios pendientes.');
  const json=await file.text();
  const backup=await readNotebookBackup(json);
  if(backup){
    const {edition,fingerprint,dependencies}=backup;
    const id='edition.import.'+fingerprint;
    if(await workspace.loadEdition(id)){
      await openNotebook(id);M.toast('Esta copia ya se había importado.');
      return;
    }
    if(!window.confirm('¿Importar «'+edition.title+'» como cuaderno independiente?'))return;
    const timestamp=new Date().toISOString();
    try{
      const imported={...edition,id,legacyNotebookId:null,updatedAt:timestamp};
      const historical=(await repo.load()).corpus;
      await workspace.commitEdition(id,0,{command:'ui.restore-notebook',targetId:id,timestamp},
        ()=>imported,dependencies?local=>importNotebookDependencies(imported,dependencies,local,historical):undefined);
    }catch(error){
      if(!(error instanceof WorkspaceConflictError)||!await workspace.loadEdition(id))throw error;
    }
    await openNotebook(id);
    return;
  }
  const preview=await prepareWorkspaceRestore(workspace,json);
  if(!window.confirm('La copia contiene '+preview.target.notebookCount+
    ' cuadernos. ¿Descargar un respaldo del espacio actual antes de sustituirlo?'))return;
  downloadBackup(preview.currentSafetyBackupJson,'copia-antes-de-restaurar');
  if(!window.confirm('Comprueba que has guardado el JSON. ¿Confirmas la sustitución del espacio editorial?'))return;
  await restoreWorkspaceBackup(workspace,json,{
    confirmReplace:true,safetyBackupExported:true,
    currentSafetyBackupJson:preview.currentSafetyBackupJson,
    expectedWorkspaceRevision:preview.expectedWorkspaceRevision,
  });
  composer.closeEdition();currentId=null;rememberNotebook();
  await reload();render();
  M.toast('Espacio editorial restaurado.');
}
let catalogue:ExaminatorCatalogue;
let allEntries:Entry[]=[];
let busy=false;
const listeners=new Map<string,Set<(value:any)=>void>>();
const notify=(event:string,value:unknown)=>{
  for(const cb of listeners.get(event)??[]){try{cb(value);}catch(error){console.error(error);}}
};
const el=<K extends keyof HTMLElementTagNameMap>(name:K,cls='',label=''):HTMLElementTagNameMap[K]=>{
  const n=document.createElement(name);if(cls)n.className=cls;if(label)n.textContent=label;return n;
};
function button(text:string,onClick:()=>void|Promise<void>,cls='tbtn'):HTMLButtonElement{
  const b=el('button',cls,text);b.type='button';
  // Clases de presentación únicamente; la acción original permanece intacta.
  if(/\bWord\b/.test(text))b.classList.add('cuaderno-ui-word');
  if(/\bPDF\b/.test(text))b.classList.add('cuaderno-ui-pdf');
  if(/^(?:Exportar|PDF \/ Imprimir|Imprimir borrador)/.test(text))b.classList.add('cuaderno-ui-export');
  if(/^(?:Regenerar|Generar|Proponer|Reanalizar|Sustituir)\b/.test(text))b.classList.add('cuaderno-ui-regen');
  if(/^\+?\s*(?:Añadir|Agregar)\b|^Pegar (?:en el banco|texto propio)\b/.test(text))b.classList.add('cuaderno-ui-add');
  if(/^(?:Eliminar|Borrar|Retirar|Quitar(?! filtros\b))\b/.test(text))b.classList.add('cuaderno-ui-remove');
  if(/^Guardar\b/.test(text))b.classList.add('cuaderno-ui-save');
  // Una excepción síncrona del controlador también debe mostrar un aviso.
  b.addEventListener('click',()=>{void Promise.resolve().then(onClick).catch(error=>M.toast(String(error),5500));});
  return b;
}
function active():boolean{return Boolean(currentId&&composer.activeEdition()?.id===currentId);}
async function loadCombinedCorpus():Promise<CorpusV1>{
  const [historical,editorial]=await Promise.all([repo.load(),workspace.loadCorpus()]);
  return combineNotebookCorpora(editorial.corpus,historical.corpus);
}
async function reload():Promise<void>{
  [corpus,notebooks]=await Promise.all([loadCombinedCorpus(),workspace.listEditions()]);
}
function item(urn:string):Entry{
  const found=allEntries.find(e=>e.urn===urn);
  if(!found)throw new Error('La obra no existe en el catálogo original.');
  return found;
}
function available(entry:Entry):boolean{return Boolean(entry.local||ownCache.has(entry.urn));}
async function loadWork(urn:string):Promise<LibraryWork>{
  const cached=works.get(urn);
  if(cached)return cached;
  const meta=item(urn);
  let work:LibraryWork|null=null;
  if(meta.local){
    const response=await fetch(new URL('../library/'+meta.local.file,import.meta.url));
    if(!response.ok)throw new Error('No se ha podido leer la obra '+meta.title+'.');
    work=await response.json() as LibraryWork;
  }else work=await downloads.get(urn);
  if(!work||work.urn!==urn||!Array.isArray(work.lines)||!work.lines.length)
    throw new Error('Primero descarga esta obra desde la biblioteca.');
  works.set(urn,work);
  return work;
}
const indexCatalogue=():DisplayEntry[]=>allEntries.map((meta,i)=>({
  ...meta,i,have:available(meta),builtin:Boolean(meta.local),
}));
async function downloadWorks(ids:number[]):Promise<{started:boolean;total:number;busy?:boolean}>{
  if(busy)return {started:false,total:0,busy:true};
  const chosen=ids.map(i=>indexCatalogue()[i]).filter((x):x is DisplayEntry=>Boolean(x&&!x.have&&x.path));
  if(!chosen.length)return {started:false,total:0};
  busy=true;
  // Conservamos los mensajes originales de progreso y el evento dl-done.
  void (async()=>{
    const errors:{author:string;title:string;error:string}[]=[];
    let done=0;
    for(const entry of chosen){
      try{
        const source=originalWorkUrl(catalogue,entry);
        const response=await fetch(source);
        if(!response.ok)throw new Error('HTTP '+response.status);
        const converted=convertPerseusXml(await response.text(),entry,source);
        await downloads.save(converted);ownCache.add(entry.urn);works.set(entry.urn,converted);
      }catch(error){errors.push({author:entry.author,title:entry.title,error:String(error)});}
      done++;
      notify('dl-progress',{done,total:chosen.length,current:entry.author+' · '+entry.title});
    }
    busy=false;
    notify('dl-done',{done,total:chosen.length,errors,error:errors.length?'Algunas obras no se han descargado.':''});
  })();
  return {started:true,total:chosen.length};
}
async function removeWorks(ids:number[]):Promise<void>{
  for(const i of ids){
    const entry=indexCatalogue()[i];
    if(!entry||entry.builtin)continue;
    await downloads.remove(entry.urn);
    ownCache.delete(entry.urn);works.delete(entry.urn);
  }
}
function citation(a:string,b:string):string{
  const format=(c:string):string[]=>{
    const p=String(c).split('.');
    if(p.length>1&&/^\d+$/.test(p[0]!))p[0]=M.roman(p[0]!);
    return p;
  };
  const join=(p:string[])=>p.length>2?p[0]+' '+p.slice(1).join(', '):p.join(' ');
  const A=format(a);
  if(!b||b===a)return join(A);
  const B=format(b);
  let k=0;
  while(k<A.length-1&&k<B.length-1&&A[k]===B[k])k++;
  if(k===A.length-1&&A.length===B.length)return join(A)+'-'+B[B.length-1];
  return join(A)+' – '+join(B);
}
M.Propose={citeRef:(a,b)=>citation(a,b)};
host.api={
  web:true,
  on(event,listener){
    if(!listeners.has(event))listeners.set(event,new Set());
    listeners.get(event)!.add(listener);
  },
  async call(method,args={}){
    switch(method){
      case 'catalog':return indexCatalogue();
      case 'work':return loadWork(String(args.urn??''));
      case 'download':return downloadWorks(args.ids??[]);
      case 'deleteTexts':return removeWorks(args.ids??[]);
      default:throw new Error('Método de escritorio no disponible en el cuaderno: '+method);
    }
  },
};
/** Conexión real con el lematizador de Examinator2 (Collatinus).
 * Se carga de forma diferida y NO se reutiliza la base de Examinator2 original.
 * Su análisis no sustituye una verificación individual ni una decisión docente.
 */
function isRejectedProposal(proposal: CollatinusGrammarProposal, rejected: ReadonlySet<string>,
  tags: readonly GrammarTag[]): boolean {
  const key = proposal.start + ':' + proposal.end + ':';
  if (rejected.has(key + proposal.tagId)) return true;
  if (!/^gram\.inf\.(?:presente|perfecto|futuro)\.(?:activo|pasivo|deponente)$/u.test(proposal.tagId)) return false;
  return [...rejected].some(entry => {
    if (!entry.startsWith(key)) return false;
    const tag = entry.slice(key.length);
    return /^gram\.inf\.(?:presente|perfecto|futuro|activo|pasivo)$/u.test(tag)
      && matchesGrammarTag(proposal.tagId, tag, tags);
  });
}
function proposalContext(latin: string, proposal: CollatinusGrammarProposal): HTMLElement {
  const context = el('p', 'cuaderno-proposal-context');
  const start = Math.max(0, proposal.start - 65);
  const end = Math.min(latin.length, proposal.end + 65);
  context.append((start ? '…' : '') + latin.slice(start, proposal.start),
    el('mark', '', latin.slice(proposal.start, proposal.end)),
    latin.slice(proposal.end, end) + (end < latin.length ? '…' : ''));
  return context;
}
type LatinLemma={lid:number;head:string;trad:string;note:string;proper:boolean};
type CollatinusMethod = 'analyze' | 'vocabEntries' | 'warm';
let collatinusWorker: Worker | null = null;
let requestId = 0;
const requests = new Map<number, { resolve: (result: unknown) => void; reject: (error: Error) => void }>();
let collatinusWarmTask:Promise<void>|null=null;

function callCollatinus(method: CollatinusMethod, args: Record<string, unknown>): Promise<unknown> {
  if (!collatinusWorker) {
    const worker = new Worker(new URL('./collatinus/worker.js', document.baseURI));
    collatinusWorker = worker;
    worker.addEventListener('message', ({ data }) => {
      const pending = requests.get(data.id);
      if (!pending) return;
      requests.delete(data.id);
      if (data.error) pending.reject(new Error(data.error));
      else pending.resolve(data.result);
    });
    worker.addEventListener('error', event => {
      worker.terminate();
      collatinusWorker = null;
      collatinusWarmTask = null;
      for (const request of requests.values()) request.reject(new Error(event.message || 'Collatinus no se pudo iniciar.'));
      requests.clear();
    });
  }
  const worker = collatinusWorker;
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    requests.set(id, { resolve, reject });
    try {
      worker.postMessage({ id, method, args });
    } catch (error) {
      requests.delete(id);
      reject(error);
    }
  });
}

/** Solo se anticipa la preparación tras una acción docente de abrir etiquetas.
 * Nunca se precarga en Inicio ni modifica el texto o las propuestas.
 * Si falla, el análisis explícito conserva su mensaje de error habitual. */
function prepareCollatinusForReview():void{
  if(collatinusWarmTask)return;
  try{
    const pending=callCollatinus('warm',{}).then(()=>undefined);
    collatinusWarmTask=pending;
    void pending.catch(()=>{
      if(collatinusWarmTask===pending)collatinusWarmTask=null;
    });
  }catch{
    collatinusWarmTask=null;
  }
}

interface AnalysisToken extends CollatinusGrammarToken {
  lplain?: string;
  lemma?: string;
  cands?: (CollatinusGrammarCandidate & { trad?: string })[];
}
const analyses = new Map<string, Promise<AnalysisToken[]>>();
const maxCachedAnalyses = 6;
async function analyzeLatin(latin: string): Promise<AnalysisToken[]> {
  const cached = analyses.get(latin);
  if (cached) {
    analyses.delete(latin);
    analyses.set(latin, cached);
    return cached;
  }
  const pending = callCollatinus('analyze', { text: latin }).then(raw => {
    if (!Array.isArray(raw)) throw new Error('Collatinus devolvió un análisis inesperado.');
    return raw as AnalysisToken[];
  }).catch(error => {
    if (analyses.get(latin) === pending) analyses.delete(latin);
    throw error;
  });
  analyses.set(latin, pending);
  if (analyses.size > maxCachedAnalyses) analyses.delete(analyses.keys().next().value!);
  if (latin.length > 20_000) {
    const clear = () => { if (analyses.get(latin) === pending) analyses.delete(latin); };
    void pending.then(clear, clear);
  }
  return pending;
}
/** No se infiere un gentilicio por su sufijo: lista editorial de gentilicios
 * latinos ya presentes en el repertorio docente/Collatinus. */
const GENTILICS=new Set([
  'romanus','gallus','helvetius','helvetii','graecus','latinus',
  'hispanus','hispaniensis','atheniensis','sabinus','sequanus',
  'poenus','punicus','italus','lacedemonius','lacaedemonius',
]);
/** Lemas de Collatinus para cualquier palabra reconocida del texto.
 * Los significados se toman solo de Collatinus o del banco preferente del cuaderno.
 * Ninguna ficha se presenta como verificación docente individual.
 */
async function collatinusVocabulary(latin:string,quantity:VocabularyQuantityMode):
  Promise<CollatinusVocabularyCandidate[]>{
  const tokens=await analyzeLatin(latin);
  const ids=[...new Set(tokens.filter(t=>t.sel).map(t=>t.sel!.lid))];
  if(!ids.length)return [];
  const entries=await callCollatinus('vocabEntries',{lids:ids,mode:quantity}) as LatinLemma[];
  if(!Array.isArray(entries))throw new Error('Collatinus no devolvió enunciados.');
  const tokenGlosses=new Map<number,string>(),tokenLemmas=new Map<number,string>();
  const forms=new Map<number,Set<string>>();
  for(const token of tokens){
    if(!token.sel)continue;
    const existingForms=forms.get(token.sel.lid)??new Set<string>();
    existingForms.add(token.w);forms.set(token.sel.lid,existingForms);
    if(!tokenLemmas.has(token.sel.lid))
      tokenLemmas.set(token.sel.lid,token.lplain||token.lemma||token.w);
    const gloss=token.cands?.find(c=>c.lid===token.sel?.lid)?.trad?.trim();
    if(gloss&&!tokenGlosses.has(token.sel.lid))tokenGlosses.set(token.sel.lid,gloss);
  }
  let preferred:ReturnType<typeof parsePreferredVocabulary>=[];
  try{preferred=parsePreferredVocabulary(localStorage.getItem(PREFERRED_VOCABULARY_KEY));}
  catch(error){console.warn('El vocabulario preferente necesita revisión:',error);}
  return entries.filter(x=>ids.includes(x.lid)).map(x=>{
    const lemma=tokenLemmas.get(x.lid)||x.head.split(',')[0]||'';
    const saved=preferredFor(preferred,lemma);
    const proper=x.proper||GENTILICS.has(vocabularyKey(lemma));
    return {
      lemma,
      headword:saved?.headword??x.head,
      meaning:saved?.meaning??x.trad?.trim()??tokenGlosses.get(x.lid)??null,
      note:saved?.note??x.note??null,
      proper,forms:[...(forms.get(x.lid)??[])],
      glossesSeparated:saved?.glossesSeparated??false,
    };
  });
}
// La escritura diferida del vocabulario comparte la revisión editorial con las incorporaciones.
let pendingSourceWrite:Promise<unknown>=Promise.resolve();
function writeSource<T>(operation:()=>Promise<T>):Promise<T>{
  const next=pendingSourceWrite.then(operation);
  pendingSourceWrite=next.catch(()=>{});
  return next;
}
async function enrichVocabulary(latin:string,placementId:string,editionId:string):Promise<void>{
  try{
    const placement=composer.activeEdition()?.placements.find(x=>x.id===placementId);
    const entries=await collatinusVocabulary(latin,placement?.vocabularyQuantityMode??'modelo');
    await writeSource(async()=>{
      if(currentId!==editionId||composer.activeEdition()?.id!==editionId||
         !composer.activeEdition()?.placements.some(x=>x.id===placementId&&x.text.latin===latin.trim()))return;
      await composer.addCollatinusVocabulary(placementId,entries,latin.trim());
    });
  }catch(error){
    console.warn('No se pudo terminar la lematización Collatinus:',error);
    M.toast('El texto se ha guardado; el análisis Collatinus queda pendiente. '
      +'Puedes editar su vocabulario manualmente.',6000);
  }
}
function addText(input:TextDraft):Promise<void>{
  const target=currentId;
  return writeSource(async()=>{
    if(currentId!==target)throw Error('El cuaderno activo cambió antes de añadir el texto.');
    await addSourceText(input);
  });
}
/** Advierte sin bloquear ni fusionar automáticamente las fuentes coincidentes. */
function confirmPossibleDuplicates(current:CorpusV1,input:TextDraft,excludeId?:string):boolean{
  const matches=findPossibleDuplicates(current.texts,{
    latin:input.latin,author:input.author,work:input.work,reference:input.reference,
  },excludeId,3);
  if(!matches.length)return true;
  const summary=matches.map(match=>{
    const label=match.kind==='identical'?'Texto idéntico'
      :match.kind==='overlap'?'Fragmento compartido ('+match.sharedWords+' palabras)'
      :'Misma referencia bibliográfica';
    return '• '+label+': '+match.title+'\n  '+match.excerpt;
  }).join('\n\n');
  return window.confirm('Posibles textos repetidos en el banco:\n\n'+summary+
    '\n\n¿Quieres continuar? Puedes reutilizar el pasaje intencionadamente.');
}
async function addSourceText(input:TextDraft):Promise<void>{
  if(!active())throw new Error('Primero abre o crea un cuaderno.');
  if(!input.title.trim()||!input.latin.trim())throw new Error('El fragmento y el título no pueden estar vacíos.');
  const before=await repo.load();
  const match=before.corpus.texts.find(t=>t.latin===input.latin.trim()
    &&t.source.author===(input.author.trim()||null)
    &&t.source.work===(input.work.trim()||null)
    &&t.source.reference===(input.reference.trim()||null));
  if(!match&&!confirmPossibleDuplicates(before.corpus,input))return;
  const id=match?.id??'doc.'+crypto.randomUUID();
  if(!match){
    await repo.save(upsertText(before.corpus,input,id,new Date().toISOString()),before.revision);
    window.dispatchEvent(new CustomEvent('corpus-updated'));
  }
  // El título de la aparición es propio del cuaderno, aunque el fragmento
  // ya exista en la biblioteca con un título distinto (o en otro cuaderno).
  if(!await composer.addSourceToNotebook(id,input.title))
    throw new Error('No se ha podido añadir el pasaje al cuaderno.');
  await reload();
  render();M.toast('Fragmento incorporado al cuaderno.');
  const editionId=currentId,placement=composer.activePlacement();
  if(editionId&&placement){
    void enrichVocabulary(input.latin,placement.id,editionId);
  }
}
M.setTextFromLibrary=(fragment)=>{
  void addText({
    // 1A: título didáctico numerado dentro de cada cuaderno; nunca obra/capítulo.
    title:nextNotebookTextTitle(composer.activeEdition()?.placements??[]),
    latin:fragment.text,author:fragment.author,work:fragment.obra,reference:fragment.cita,
  }).catch(error=>M.toast('No se ha guardado el fragmento: '+String(error),6500));
};

function currentTitle():string{
  return composer.activeEdition()?.title??'Ningún cuaderno abierto';
}
async function createNotebook():Promise<void>{
  const title=window.prompt('Título del nuevo cuaderno');
  if(!title?.trim())return;
  const id=await composer.createNotebookNamed(title);
  if(!id)throw new Error('El editor no ha creado el cuaderno.');
  currentId=id;rememberNotebook();await reload();render();
  M.toast('Cuaderno creado. Selecciona un pasaje en Biblioteca.');
}
async function openNotebook(id:string):Promise<void>{
  if(!await composer.openEdition(id))throw new Error('No se ha podido abrir el cuaderno.');
  currentId=id;rememberNotebook();await reload();render();
}
let deletingNotebook=false;
async function deleteNotebook(id:string):Promise<void>{
  if(deletingNotebook)return;
  deletingNotebook=true;
  try{
    if(!await composer.flush())throw Error('No se han guardado los cambios pendientes.');
    const snapshot=await workspace.loadEdition(id);
    if(!snapshot||snapshot.edition.legacyNotebookId!==null)
      throw Error('Este cuaderno no se puede eliminar.');
    const title=snapshot.edition.title;
    if(!window.confirm('¿Eliminar definitivamente «'+title+'» y su historial? '+
      'Te recomendamos hacer antes una copia de seguridad desde la tarjeta del cuaderno, '+
      'pero no es obligatorio. Esta acción no se puede deshacer.'))return;
    await workspace.deleteEdition(id,snapshot.revision);
    if(currentId===id){
      currentId=null;rememberNotebook();
      composer.closeEdition();
    }
    await reload();render();
    M.toast('Cuaderno eliminado.');
  }finally{deletingNotebook=false;}
}
function openNotebooks():void{
  const content=el('div','');
  const saved=notebooks.filter(n=>n.edition.id!==WORKING_EDITION_ID)
    .sort((a,b)=>b.edition.updatedAt.localeCompare(a.edition.updatedAt));
  if(!saved.length)content.append(el('p','muted','Todavía no hay cuadernos guardados.'));
  let close=()=>{};
  for(const x of saved){
    const row=el('div','row original-open-row');
    const details=el('span','',x.edition.title);
    details.append(el('small','muted',' · '+x.edition.placements.length+(x.edition.placements.length===1?' texto · ':' textos · ')+
      new Date(x.edition.updatedAt).toLocaleString('es')));
    row.append(details,button('Abrir',async()=>{
      close();await openNotebook(x.edition.id);
    },'hbtn'));
    row.append(button('Hacer copia',async()=>{
      if(!await composer.flush())throw Error('Hay cambios pendientes de guardar.');
      const saved=await workspace.loadEdition(x.edition.id);
      if(!saved)throw Error('El cuaderno ya no está disponible.');
      downloadBackup(await createNotebookBackup(saved.edition,await loadCombinedCorpus()),'copia-cuaderno');
    },'tbtn'));
    if(x.edition.legacyNotebookId===null){
      const remove=button('Eliminar',async()=>{
        await deleteNotebook(x.edition.id);
        if(notebooks.some(n=>n.edition.id===x.edition.id))return;
        close();openNotebooks();
      },'tbtn');
      remove.setAttribute('aria-label','Eliminar cuaderno '+x.edition.title);
      row.append(remove);
    }else row.append(el('small','muted','Cuaderno histórico protegido'));
    content.append(row);
  }
  const m=M.modal('Gestionar cuadernos',content,[{label:'Cerrar'}]);
  close=m.close;
}
async function saveNotebook():Promise<void>{
  if(!active())throw new Error('Primero crea o abre un cuaderno.');
  if(!await composer.flush())throw new Error('El guardado no ha terminado correctamente.');
  await reload();M.toast('Cuaderno guardado.');
}
function openLibrary():void{
  if(!active()){M.toast('Abre o crea un cuaderno antes de seleccionar textos.',5000);return;}
  if(!M.openLibrary)throw new Error('La biblioteca original no se ha cargado.');
  void M.openLibrary().catch(e=>M.toast('Biblioteca: '+String(e),5500));
}
function openOwnTexts():void{
  // El banco que se consulta desde el editor es el mismo que el de Inicio.
  // Se filtran etiquetas confirmadas en la fuente, nunca las de otros cuadernos.
  const panel=el('div','original-bank-picker');
  panel.append(el('p','muted','Elige textos del banco propio. Puedes combinar varias etiquetas '+
    '(deben cumplirse todas) y buscar por título, autor, obra o referencia.'));
  const input=el('input');input.type='search';input.placeholder='Buscar en el banco propio…';
  input.setAttribute('aria-label','Buscar textos guardados');
  const count=el('p','small muted original-bank-result-count');
  const list=el('div','original-own-list');
  const tags=allGrammarTags(corpus),selected=new Set<string>();
  const placements=composer.activeEdition()?.placements??[];
  const usedIds=new Set(placements.flatMap(p=>p.source.sourceId?[p.source.sourceId]:[]));
  // También reconocer pasajes que se importaron directamente (sin ID del banco).
  const alreadyUsed=(text:LatinText):boolean=>usedIds.has(text.id)||placements.some(p=>
    p.text.latin===text.latin&&p.text.author===text.source.author&&
    p.text.work===text.source.work&&p.text.reference===text.source.reference);
  const availableTexts=corpus.texts.filter(t=>!alreadyUsed(t));
  const alreadyCount=corpus.texts.length-availableTexts.length;
  if(alreadyCount)panel.append(el('p','small muted original-bank-hidden-count',
    alreadyCount+(alreadyCount===1?' texto ya incorporado se oculta.':
      ' textos ya incorporados se ocultan.')+
    ' Puedes seguir consultándolos en el banco general de Inicio.'));
  const filtersPanel=el('details','original-bank-filters');
  const filtersHeading=el('summary','','Filtrar por etiquetas');
  filtersPanel.append(filtersHeading);
  const filterSearch=el('input');filterSearch.type='search';
  filterSearch.placeholder='Buscar etiqueta…';
  filterSearch.setAttribute('aria-label','Buscar etiqueta para filtrar');
  filtersPanel.append(filterSearch);
  const filterGroups=el('div','original-bank-filter-groups');
  const tagCheckboxes=new Map<string,HTMLInputElement>();
  const tagCount=(tagId:string)=>availableTexts.filter(t=>
    matchesGrammarFilters(t.tagIds,[tagId],tags)).length;
  for(const root of tags.filter(t=>t.parentId===null)){
    const children=tags.filter(t=>matchesGrammarTag(t.id,root.id,tags));
    const available=children.filter(t=>tagCount(t.id)>0);
    if(!available.length)continue;
    const group=el('details','original-bank-filter-group');
    group.append(el('summary','',root.label+' ('+tagCount(root.id)+')'));
    const choices=el('div','original-bank-filter-choices');
    for(const tag of available){
      const label=el('label','original-bank-filter-option'),check=el('input');
      check.type='checkbox';check.value=tag.id;check.setAttribute('aria-label',tag.label);
      check.addEventListener('change',()=>{
        if(check.checked)selected.add(tag.id);else selected.delete(tag.id);
        filtersHeading.textContent='Filtrar por etiquetas'+(selected.size?' ('+selected.size+')':'');
        visibleLimit=40;populate();
      });
      tagCheckboxes.set(tag.id,check);
      const name=el('span','','· '.repeat(catalogDepth(tag,tags))+tag.label);
      const amount=el('small','muted',String(tagCount(tag.id)));
      label.append(check,name,amount);choices.append(label);
    }
    group.append(choices);filterGroups.append(group);
  }
  filterSearch.addEventListener('input',()=>{
    const query=foldLatin(filterSearch.value);
    for(const group of Array.from(filterGroups.children) as HTMLDetailsElement[]){
      let matches=0;
      for(const label of Array.from(group.querySelectorAll<HTMLElement>('.original-bank-filter-option'))){
        const text=label.querySelector('span')?.textContent??'';
        const shown=!query||foldLatin(text).includes(query);
        label.hidden=!shown;if(shown)matches++;
      }
      group.hidden=!matches;
      if(query&&matches)group.open=true;
    }
  });
  const clearFilters=button('Quitar filtros de etiquetas',()=>{
    selected.clear();
    for(const check of tagCheckboxes.values())check.checked=false;
    filtersHeading.textContent='Filtrar por etiquetas';
    visibleLimit=40;populate();
  },'tbtn');
  filtersPanel.append(filterGroups,clearFilters);
  panel.append(input,count,filtersPanel,list);
  let close=()=>{},visibleLimit=40;
  const populate=()=>{
    list.replaceChildren();
    const needle=foldLatin(input.value);
    const filters=[...selected];
    const matching=availableTexts.filter(t=>
      foldLatin([t.title,t.source.author??'',t.source.work??'',t.source.reference??'']
        .join(' ')).includes(needle)&&matchesGrammarFilters(t.tagIds,filters,tags));
    count.textContent=matching.length+' de '+availableTexts.length+
      (availableTexts.length===1?' texto del banco':' textos del banco')+
      (alreadyCount?' · '+alreadyCount+' ya incorporado'+(alreadyCount===1?' oculto':'s ocultos'):'');
    for(const t of matching.slice(0,visibleLimit)){
      const row=el('article','original-own-row');
      row.append(el('strong','',t.title));
      const source=[t.source.author,t.source.work,t.source.reference].filter(Boolean).join(' · ');
      if(source)row.append(el('small','muted',source));
      row.append(el('p','original-bank-excerpt',t.latin.slice(0,160)+
        (t.latin.length>160?'…':'')));
      if(t.tagIds.length){
        const badges=el('div','grammar-chips');
        for(const tagId of t.tagIds.slice(0,5)){
          const tag=tags.find(item=>item.id===tagId);
          if(tag)badges.append(el('span','grammar-chip',tag.label));
        }
        row.append(badges);
      }
      if(active()){
        const add=button('Añadir al cuaderno',async()=>{
          close();
          if(!await writeSource(()=>composer.addSourceToNotebook(t.id)))
            throw Error('No se ha añadido el texto.');
          await reload();render();
          const editionId=currentId,placement=composer.activePlacement();
          if(editionId&&placement)void enrichVocabulary(placement.text.latin,placement.id,editionId);
        },'hbtn primary');
        add.setAttribute('aria-label','Añadir «'+t.title+'» al cuaderno');
        row.append(add);
      }
      row.append(button('Editar ficha',()=>{close();openBankTextEditor(t);},'tbtn'));
      const remove=button('Quitar del banco',async()=>{
        if(!window.confirm('¿Quitar «'+t.title+'» del banco? Los cuadernos conservarán sus textos.'))return;
        await writeSource(async()=>{
          for(const repository of [repo,workspace]){
            const saved=await (repository===repo?repo.load():workspace.loadCorpus());
            if(!saved.corpus.texts.some(text=>text.id===t.id))continue;
            const next=deleteText(saved.corpus,t.id);
            if(repository===repo)await repo.save(next,saved.revision);
            else await workspace.saveCorpus(next,saved.revision);
          }
        });
        await reload();populate();M.toast('Texto retirado del banco.');
      },'tbtn');
      remove.setAttribute('aria-label','Quitar del banco: '+t.title);
      row.append(remove);list.append(row);
    }
    if(!matching.length)list.append(el('p','muted','No hay textos con ese filtro.'));
    if(matching.length>visibleLimit)list.append(button(
      'Mostrar más ('+(matching.length-visibleLimit)+' restantes)',()=>{
        visibleLimit+=40;populate();
      },'tbtn'));
  };
  input.addEventListener('input',()=>{visibleLimit=40;populate();});
  populate();
  if(active())panel.append(button('Pegar texto propio',()=>{close();pasteText();},'tbtn'));
  const modal=M.modal('Banco de textos',panel,[{label:'Cerrar'}],
    {width:'min(760px, 96vw)'});close=modal.close;
}

/** Edición autónoma del banco. No altera las copias editoriales de los cuadernos. */
function openBankTextEditor(source:LatinText):void{
  const form=el('form','original-paste');
  const inputs=new Map<string,HTMLInputElement|HTMLTextAreaElement>();
  const original={
    title:source.title,author:source.source.author??'',work:source.source.work??'',
    reference:source.source.reference??'',latin:source.latin,
  };
  for(const [key,label] of [
    ['title','Título didáctico'],['author','Autor'],['work','Obra'],
    ['reference','Referencia'],['latin','Texto latino'],
  ] as const){
    const wrapper=el('label','field');
    const field=key==='latin'?el('textarea'):el('input');
    if(key==='latin')(field as HTMLTextAreaElement).rows=12;
    field.value=original[key];field.setAttribute('aria-label',label);
    inputs.set(key,field);wrapper.append(el('span','',label),field);form.append(wrapper);
  }
  if(source.teacherDocx)form.append(el('p','small muted',
    'Este texto conserva subrayados, vocabulario y apartados importados de Word. '+
    'Si cambias el pasaje latino, se guardará una copia independiente; la fuente '+
    'original y sus anotaciones permanecerán intactas.'));
  let close=()=>{};
  const save=button('Guardar cambios',async()=>{
    const value=(key:string)=>inputs.get(key)?.value.trim()??'';
    const data:TextDraft={title:value('title'),author:value('author'),work:value('work'),
      reference:value('reference'),latin:value('latin')};
    if(!data.title||!data.latin)throw Error('El título y el texto latino son obligatorios.');
    save.disabled=true;
    try{
      const loaded=await repo.load();
      const current=loaded.corpus.texts.find(t=>t.id===source.id);
      if(!current)throw Error('La fuente ya no está en el banco propio. Recarga la biblioteca.');
      if(current.updatedAt!==source.updatedAt)
        throw Error('La fuente se modificó en otra pestaña. Recarga antes de guardar.');
      const same=data.title===current.title&&data.latin===current.latin&&
        data.author===(current.source.author??'')&&
        data.work===(current.source.work??'')&&
        data.reference===(current.source.reference??'');
      if(same){close();return;}
      const changedLatin=data.latin!==current.latin;
      const linked=loaded.corpus.notebooks.some(book=>book.textIds.includes(current.id));
      const saveCopy=linked||(changedLatin&&Boolean(current.teacherDocx));
      if(saveCopy&&!window.confirm('Esta fuente está vinculada a un cuaderno histórico '+
        'o contiene marcas importadas de Word. Para conservarlas, los cambios se '+
        'guardarán como una ficha nueva, sin sobrescribir la original. ¿Continuar?'))return;
      if(!confirmPossibleDuplicates(loaded.corpus,data,current.id))return;
      const id=saveCopy?'doc.'+crypto.randomUUID():current.id;
      let next=upsertText(loaded.corpus,{...data,id},id,new Date().toISOString());
      if(!saveCopy&&current.teacherDocx){
        const doc={...current.teacherDocx,title:data.title,
          author:data.author||null,work:data.work||null,reference:data.reference||null};
        next=validateCorpus({...next,texts:next.texts.map(t=>t.id===id
          ?{...t,teacherDocx:doc}:t)});
      }
      await repo.save(next,loaded.revision);
      await reload();close();render();
      M.toast(saveCopy?'Versión nueva guardada; el original está protegido.':
        'Ficha del banco actualizada.');
    }finally{save.disabled=false;}
  },'hbtn primary');
  form.append(save);
  form.addEventListener('submit',event=>{event.preventDefault();save.click();});
  const modal=M.modal('Editar texto del banco',form,[{label:'Cancelar'}],
    {width:'min(760px, 96vw)',noFocus:true});
  close=modal.close;
}

/** Guardado de fuentes autónomas. Un DOCX conserva los datos de preguntas,
 * subrayados y glosario; añadirlo a un cuaderno no modifica esta fuente. */
async function saveBankText(input:TextDraft,documentData?:ParsedTeacherDocx,reviewedBatch=false):Promise<void>{
  const clean={...input,title:input.title.trim(),latin:input.latin.trim()};
  if(!clean.title||!clean.latin)throw new InvalidCorpusError('El título y el pasaje latino son obligatorios.');
  const saved=await repo.load();
  const match=saved.corpus.texts.find(t=>t.latin===clean.latin
    &&t.source.author===(clean.author.trim()||null)
    &&t.source.work===(clean.work.trim()||null)
    &&t.source.reference===(clean.reference.trim()||null));
  const normalized=documentData?{...documentData,title:clean.title,latin:clean.latin,
    author:clean.author.trim()||null,work:clean.work.trim()||null,
    reference:clean.reference.trim()||null}:undefined;
  // Dos Word con el mismo pasaje pueden tener subrayados y preguntas distintos.
  // No sobrescribir silenciosamente el DOCX anterior al reutilizar una ficha.
  const distinctDocx=requiresDistinctDocxSource(match,normalized);
  if(!reviewedBatch&&!confirmPossibleDuplicates(saved.corpus,clean,distinctDocx?undefined:match?.id))
    throw Error('Guardado cancelado: no se ha modificado el banco.');
  const id=distinctDocx?'doc.'+crypto.randomUUID():match?.id??'doc.'+crypto.randomUUID();
  const at=new Date().toISOString();
  const updated=upsertText(saved.corpus,{...clean,id},id,at);
  const next=normalized?validateCorpus({...updated,texts:updated.texts.map(t=>t.id===id
    ?{...t,teacherDocx:normalized}:t)}):updated;
  await repo.save(next,saved.revision);
  if(reviewedBatch)return;
  await reload();render();
  M.toast(distinctDocx?'Se ha guardado otra versión del Word; se conservan los subrayados de la anterior.':
    match?'Fuente existente actualizada en el banco.':'Texto guardado en el banco propio.');
}
/** Los cuadernos editoriales conservan sus apariciones; los cuadernos
 * históricos, que todavía dependen del banco, se protegen del borrado. */
function protectedBankSourceIds():Set<string>{
  return new Set(corpus.notebooks.flatMap(book=>book.textIds));
}
async function removeBankTexts(ids:readonly string[]):Promise<void>{
  const unique=[...new Set(ids)].filter(id=>corpus.texts.some(t=>t.id===id));
  if(!unique.length)return;
  const protectedIds=protectedBankSourceIds();
  if(unique.some(id=>protectedIds.has(id)))
    throw Error('Hay textos vinculados a cuadernos antiguos. No se han borrado.');
  const count=unique.length;
  const warning=count===1?'¿Quitar este texto del banco?':
    '¿Quitar '+count+' textos seleccionados del banco?';
  if(!window.confirm(warning+' Los cuadernos editoriales conservarán sus textos y preguntas. '+
    'Esta retirada del banco no se puede deshacer sin una copia de seguridad.'))return;
  await writeSource(async()=>{
    // Verificar ambos repositorios antes de empezar a escribir. Como los datos
    // viven en dos IndexedDB, se mantienen las validaciones de revisión CAS.
    const editorial=await repo.load(),working=await workspace.loadCorpus();
    for(const saved of [editorial,working]){
      if(saved.corpus.notebooks.some(book=>book.textIds.some(id=>unique.includes(id))))
        throw Error('Uno de los textos pertenece a un cuaderno antiguo. Operación cancelada.');
    }
    const selected=new Set(unique);
    const removeBatch=(source:CorpusV1):CorpusV1=>{
      const texts=source.texts.filter(text=>!selected.has(text.id));
      return texts.length===source.texts.length?source:validateCorpus({...source,texts});
    };
    const nextEditorial=removeBatch(editorial.corpus);
    const nextWorking=removeBatch(working.corpus);
    // Cada repositorio se valida una sola vez, incluso para miles de textos.
    if(nextEditorial!==editorial.corpus)await repo.save(nextEditorial,editorial.revision);
    if(nextWorking!==working.corpus)await workspace.saveCorpus(nextWorking,working.revision);
  });
  await reload();render();
  M.toast(count===1?'Texto retirado del banco.':count+' textos retirados del banco.');
}
async function removeBankText(text:LatinText):Promise<void>{
  return removeBankTexts([text.id]);
}
function tagBankText(text:LatinText):void{
  const panel=el('div','cuaderno-bank-tag-editor');
  panel.append(el('p','muted','Etiquetas de la fuente. Sólo se guardan tus decisiones; '+
    'los cuadernos ya creados conservan sus propias etiquetas.'));
  const all=allGrammarTags(corpus);
  const nameOf=(id:string)=>all.find(t=>t.id===id)?.label??id;
  const selected=new Set(text.tagIds);
  const tagInputs=new Map<string,HTMLInputElement>();
  const current=el('div','grammar-chips cuaderno-bank-current');
  current.setAttribute('aria-label','Etiquetas confirmadas para el banco');
  function paintCurrent():void{
    current.replaceChildren();
    if(!selected.size){
      current.append(el('span','small muted','Sin etiquetas confirmadas'));
      return;
    }
    for(const id of selected){
      const chip=el('span','grammar-chip',nameOf(id));
      chip.dataset.group=GRAMMAR_GROUP_IDS.find(group=>matchesGrammarTag(id,group,all))??'custom';
      current.append(chip);
    }
  }
  function setTag(id:string,checked:boolean):void{
    if(checked)selected.add(id);else selected.delete(id);
    const input=tagInputs.get(id);if(input)input.checked=checked;
    paintCurrent();
  }
  paintCurrent();panel.append(current);
  const manual=el('details','cuaderno-bank-manual');
  manual.append(el('summary','','Añadir o quitar etiquetas manualmente'));
  const search=el('input');search.type='search';
  search.placeholder='Buscar etiqueta gramatical…';
  search.setAttribute('aria-label','Buscar etiqueta en el catálogo');
  manual.append(search);
  const list=el('div','cuaderno-bank-tag-options');
  for(const tag of all){
    const label=el('label','cuaderno-bank-tag-option'),check=el('input');
    check.type='checkbox';check.checked=selected.has(tag.id);check.value=tag.id;
    check.addEventListener('change',()=>setTag(tag.id,check.checked));
    tagInputs.set(tag.id,check);
    label.append(check,el('span','',('· '.repeat(catalogDepth(tag,all)))+tag.label));
    list.append(label);
  }
  search.addEventListener('input',()=>{
    const key=foldLatin(search.value);
    for(const label of Array.from(list.children) as HTMLElement[])
      label.hidden=Boolean(key)&&!foldLatin(label.textContent??'').includes(key);
  });
  manual.append(list);panel.append(manual);
  const review=el('section','cuaderno-bank-collatinus');
  review.append(el('h3','','Propuestas de Collatinus'));
  review.append(el('p','small muted','Las propuestas requieren confirmación. '+
    'Collatinus puede reconocer formas morfológicas, pero no determina con certeza '+
    'el valor sintáctico de una construcción.'));
  const result=el('div','cuaderno-bank-collatinus-results');
  const status=el('p','small muted');
  status.setAttribute('role','status');
  const rejected=new Set<string>();
  const corrected=new Map<string,string>();
  let reviewKey: string | undefined;
  const selections=new Map<string,string>();
  let pending:CollatinusGrammarProposal[]=[];
  const proposalKey=(p:CollatinusGrammarProposal)=>[p.start,p.end,p.tagId].join(':');
  function renderProposals():void{
    result.replaceChildren();
    if(!pending.length){result.append(el('p','muted','No hay propuestas para este pasaje.'));return;}
    const toolbar=el('div','cuaderno-bank-proposal-toolbar');
    toolbar.append(el('p','small muted',
      pending.length+' candidaturas · '+rejected.size+' descartadas'));
    const acceptMultiple=button('Aceptar seleccionadas',()=>{
      for(const [key, tagId] of selections) confirmProposal(key, tagId);
      selections.clear();renderProposals();
    },'hbtn');
    acceptMultiple.disabled=!selections.size;
    toolbar.append(acceptMultiple);result.append(toolbar);
    for(const proposal of pending){
      const key=proposalKey(proposal);
      const acceptedTag=corrected.get(key) ?? proposal.tagId;
      const discarded=isRejectedProposal(proposal,rejected,all),accepted=selected.has(acceptedTag);
      const row=el('details','grammar-proposal-card');
      row.dataset.state=discarded?'dismissed':accepted?'confirmed':'pending';
      const phrase=text.latin.slice(proposal.start,proposal.end);
      const label=discarded?'Descartada':accepted?'Confirmada':'Pendiente';
      row.append(el('summary','',phrase+' · '+nameOf(accepted ? acceptedTag : proposal.tagId)+' · '+label));
      row.append(proposalContext(text.latin, proposal));
      if(proposal.syntaxReview)row.append(el('p','hint','Requiere revisión sintáctica.'));
      const evidence=el('details','cuaderno-bank-evidence');
      evidence.append(el('summary','','Ver análisis y evidencia'));
      for(const item of proposal.evidence)evidence.append(el('p','small',item));
      if(proposal.alternatives.length)evidence.append(el('p','small',
        'Lecturas alternativas: '+proposal.alternatives.join(' / ')));
      row.append(evidence);
      if(!discarded){
        const controls=el('div','cuaderno-bank-proposal-actions');
        const choose=el('select');
        choose.setAttribute('aria-label','Etiqueta que se confirmará para '+phrase);
        for(const tag of all){
          const opt=el('option','',tag.label);opt.value=tag.id;choose.append(opt);
        }
        choose.value=selections.get(key)??proposal.tagId;
        const box=el('input');box.type='checkbox';box.checked=selections.has(key);
        const selectedLabel=el('label','');
        selectedLabel.append(box,el('span','','Seleccionar'));
        function changeSelection():void{
          if(box.checked)selections.set(key,choose.value);
          else selections.delete(key);
          acceptMultiple.disabled=!selections.size;
        }
        box.addEventListener('change',changeSelection);
        choose.addEventListener('change',changeSelection);
        controls.append(choose,selectedLabel,
          button('Aceptar',()=>{confirmProposal(key,choose.value);selections.delete(key);renderProposals();},'hbtn'),
          button('Descartar',()=>{rejected.add(key);corrected.delete(key);selections.delete(key);renderProposals();},'tbtn'));
        row.append(controls);
      }
      result.append(row);
    }
  }
  function confirmProposal(key: string, tagId: string): void {
    rejected.delete(key);
    corrected.set(key, tagId);
    setTag(tagId, true);
  }
  const analyze=button('Analizar con Collatinus',async()=>{
    analyze.disabled=true;status.textContent='Analizando el pasaje…';
    try{
      if (!reviewKey) {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text.latin));
        const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('');
        reviewKey = 'cuaderno-banco-review-v1:' + text.id + ':' + hash;
        try {
          const saved = JSON.parse(localStorage.getItem(reviewKey) ?? 'null');
          for (const key of saved?.rejected ?? []) if (typeof key === 'string') rejected.add(key);
          for (const [key, value] of saved?.corrected ?? []) {
            if (typeof key === 'string' && selected.has(value)) corrected.set(key, value);
          }
        } catch { /* La revisión manual sigue disponible. */ }
      }
      const tokens=await analyzeLatin(text.latin);
      pending=proposeCollatinusGrammar(text.latin,tokens);
      status.textContent=pending.length+' propuestas obtenidas; ninguna se añade automáticamente.';
      renderProposals();
    }catch(error){
      status.textContent='No se pudo analizar el texto: '+String(error);
    }finally{analyze.disabled=false;}
  },'hbtn');
  const passage=el('details','cuaderno-review-passage');
  passage.open=true;
  passage.append(el('summary','','Texto latino'),el('p','',text.latin));
  review.append(passage,analyze,status,result);panel.append(review);
  prepareCollatinusForReview();
  M.modal('Etiquetas de «'+text.title+'»',panel,[{label:'Cancelar'},
    {label:'Guardar etiquetas',primary:true,onclick:async()=>{
      await writeSource(async()=>{
        let found=false;
        for(const repository of [repo,workspace]){
          const saved=await (repository===repo?repo.load():workspace.loadCorpus());
          if(!saved.corpus.texts.some(t=>t.id===text.id))continue;
          const next=attachGrammarTags(saved.corpus,text.id,[...selected],allGrammarTags(corpus));
          if(repository===repo)await repo.save(next,saved.revision);
          else await workspace.saveCorpus(next,saved.revision);
          found=true;
        }
        if(!found)throw Error('La fuente ya no está en el banco editable.');
      });
      if (reviewKey) {
        try {
          localStorage.setItem(reviewKey, JSON.stringify({ rejected: [...rejected], corrected: [...corrected] }));
        } catch {
          M.toast('Se guardaron las etiquetas. No se pudo guardar el historial de propuestas.');
          await reload();render();return;
        }
      }
      await reload();render();M.toast('Etiquetas de la fuente guardadas.');
    }}]);
}

function pasteText(destination:'notebook'|'bank'='notebook'):void{
  if(destination==='notebook'&&!active())return;
  const form=el('form','original-paste');
  const inputs=new Map<string,HTMLInputElement|HTMLTextAreaElement>();
  for(const [field,name] of [
    ['title','Título'],['author','Autor'],['work','Obra'],
    ['reference','Referencia'],['latin','Texto latino'],
  ] as const){
    const label=el('label','field'),caption=el('span','',name);
    const input=field==='latin'?el('textarea'):el('input');
    if(field==='latin')(input as HTMLTextAreaElement).rows=7;
    input.setAttribute('aria-label',name);
    if(field==='title'&&destination==='notebook')input.value=nextNotebookTextTitle(composer.activeEdition()?.placements??[]);
    inputs.set(field,input);label.append(caption,input);form.append(label);
  }
  let close=()=>{};
  const save=button(destination==='bank'?'Guardar en el banco':'Añadir al cuaderno',async()=>{
    const value=(name:string)=>inputs.get(name)?.value.trim()??'';
    save.disabled=true;
    try{
      const data={title:value('title'),author:value('author'),work:value('work'),
        reference:value('reference'),latin:value('latin')};
      if(destination==='bank')await writeSource(()=>saveBankText(data));
      else await addText(data);
      close();
    }finally{save.disabled=false;}
  },'hbtn primary');
  form.append(save);
  form.addEventListener('submit',event=>{event.preventDefault();save.click();});
  const modal=M.modal('Pegar texto latino',form,[{label:'Cancelar'}],{noFocus:true});close=modal.close;
  inputs.get('title')?.focus();
}

function reviewWordImport(documents:{file:string;data:ParsedTeacherDocx}[],failures:string[],editionId:string|null):void{
  const panel=el('div','word-review');
  const pending=[...documents];
  let importing=false;
  let savedToBank=0;
  const failuresList=el('ul','word-import-errors');
  for(const problem of failures)failuresList.append(el('li','',problem));
  if(failures.length)panel.append(failuresList);
  const cards=new Map<ParsedTeacherDocx,HTMLElement>();
  const toBank=editionId===null;
  for(const [position,{file,data}] of documents.entries()){
    const card=el('details','word-review-item');
    card.open=documents.length===1;
    const heading=el('summary','','');
    const title=el('span','',data.title||file);
    heading.append(title);
    if(documents.length>1&&file!==data.title)heading.append(el('small','muted',' · '+file));
    card.append(heading);
    const fields=el('div','word-review-fields');
    for(const [key,label] of [
      ['title','Título del texto'],['author','Autor'],['work','Obra'],['reference','Libro, capítulo o referencia'],
    ] as const){
      const field=el('label','field',label),input=el('input');
      input.value=data[key]??'';input.setAttribute('aria-label',label);
      input.addEventListener('input',()=>{
        if(key==='title'){
          data.title=input.value.trim();
          title.textContent=data.title||file;
        }else data[key]=input.value.trim()||null;
      });
      field.append(input);fields.append(field);
    }
    card.append(fields);
    const preview=el('textarea');preview.rows=3;preview.readOnly=true;preview.value=data.latin;
    preview.setAttribute('aria-label','Texto latino');
    card.append(preview,el('p','small muted',data.underlines.length+' subrayados · '+
      data.vocabulary.length+' entradas reales de vocabulario.'));
    if(toBank){
      // La confirmación del lote es deliberada. Mostrar posibles coincidencias
      // antes de pulsarla evita diálogos repetidos que interrumpen varios Word.
      const earlier=documents.slice(0,position).map(({file:previousFile,data:previous},index)=>({
        id:'import.preview.'+index,title:previous.title||previousFile,latin:previous.latin,
        source:{author:previous.author,work:previous.work,reference:previous.reference},
      }));
      const matches=findPossibleDuplicates([...corpus.texts,...earlier],{
        latin:data.latin,author:data.author,work:data.work,reference:data.reference,
      },undefined,3);
      if(matches.length)card.append(el('p','small muted',
        'Posibles repeticiones: '+matches.map(m=>m.title+' ('+
          (m.kind==='citation'?'misma referencia':'fragmento coincidente')+')').join('; ')+
        '. Revisa los textos antes de confirmar el lote.'));
    }
    if(data.warnings.length){
      const warnings=el('details');warnings.append(el('summary','','Avisos ('+data.warnings.length+')'));
      const list=el('ul');for(const warning of data.warnings)list.append(el('li','',warning));
      warnings.append(list);card.append(warnings);
    }
    cards.set(data,card);panel.append(card);
  }
  const importLabel=toBank
    ?(documents.length===1?'Guardar en el banco':'Guardar '+documents.length+' textos en el banco')
    :(documents.length===1?'Incorporar al cuaderno':'Incorporar '+documents.length+' textos');
  const confirm=async():Promise<void|false>=>{
    if(importing)return false;
    importing=true;
    try{
      if(!toBank&&pending.some(({data})=>!data.title)){
        M.toast('Introduce un título para cada texto.');return false;
      }
      while(pending.length){
        const {data,file}=pending[0]!;
        if(toBank){
          try{
            await writeSource(()=>saveBankText({title:data.title,latin:data.latin,
              author:data.author??'',work:data.work??'',reference:data.reference??''},data,true));
            savedToBank++;
          }catch(error){
            if(!(error instanceof InvalidCorpusError))throw error;
            const problem=file+' · '+error.message;
            failures.push(problem);
            failuresList.append(el('li','',problem));
            if(!failuresList.isConnected)panel.prepend(failuresList);
          }
        }else{
          const placement=await writeSource(async()=>{
            if(currentId!==editionId)throw Error('Vuelve al cuaderno donde elegiste los archivos.');
            if(!await composer.importTeacherDocument(data))throw Error('No se ha podido importar '+file+'.');
            return composer.activePlacement();
          });
          if(placement&&editionId)void enrichVocabulary(data.latin,placement.id,editionId);
        }
        pending.shift();
        if(pending.length)cards.get(data)?.remove();
      }
      await reload();render();
      if(toBank&&failures.length){
        const report=el('div');
        report.append(el('p','',savedToBank+(savedToBank===1?' archivo guardado · ':' archivos guardados · ')+
          failures.length+(failures.length===1?' omitido.':' omitidos.')));
        report.append(el('h3','','Archivos para revisión manual'),failuresList);
        M.modal('Resultado de la importación Word',report,[{label:'Cerrar',primary:true}]);
      }else{
        M.toast(toBank?savedToBank+' textos Word guardados en el banco.':
          (documents.length===1?'Word añadido y guardado en el cuaderno.':
          documents.length+' textos añadidos y guardados en el cuaderno.'));
      }
    }catch(error){
      await reload();render();M.toast(String(error),8000);return false;
    }finally{importing=false;}
  };
  M.modal('Revisar importación Word',panel,[{label:'Cancelar'},
    ...(documents.length?[{label:importLabel,primary:true,onclick:confirm}]:[])],
    {width:'min(700px, 96vw)',noFocus:true});
}
function importWord(destination:'notebook'|'bank'='notebook'):void{
  if(destination==='notebook'&&(!active()||!currentId)){
    M.toast('Abre o crea un cuaderno antes de importar.');return;
  }
  const editionId=destination==='bank'?null:currentId;
  const picker=el('input');picker.type='file';picker.multiple=true;
  picker.accept='.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  picker.style.display='none';document.body.append(picker);
  picker.addEventListener('cancel',()=>picker.remove(),{once:true});
  picker.addEventListener('change',async()=>{
    const files=Array.from(picker.files??[]);picker.remove();
    if(!files.length)return;
    const documents:{file:string;data:ParsedTeacherDocx}[]=[],failures:string[]=[];
    for(const file of files){
      try{documents.push({file:file.name,data:await readTeacherDocx(file)});}
      catch(error){failures.push(file.name+' · '+String(error instanceof Error?error.message:error));}
    }
    reviewWordImport(documents,failures,editionId);
  },{once:true});
  picker.click();
}
function selectFormat():void{
  if(!active()){M.toast('Abre un cuaderno para configurar el formato.');return;}
  const controls=Array.from(composer.element.querySelectorAll<HTMLButtonElement>('.edition-menu-nav button'));
  const format=controls.find(b=>b.textContent?.includes('Formato'));
  if(!format){M.toast('Abre un texto para cambiar el formato.');return;}
  format.click();document.querySelector('#editor')?.scrollTo({top:0,behavior:'smooth'});
}
function exportDoc(type:'word'|'pdf'):void{
  if(!active()){M.toast('Abre un cuaderno para exportarlo.');return;}
  const candidates=Array.from(composer.element.querySelectorAll<HTMLButtonElement>('.edition-toolbar-actions button'));
  const action=candidates.find(b=>type==='word'?
    b.textContent?.includes('Exportar Word'):b.textContent?.includes('PDF / Imprimir'));
  if(!action){M.toast('No se ha encontrado la exportación del cuaderno.',4500);return;}
  action.click();
}
async function openGrammarEditor():Promise<void>{
  if(!await composer.flush())throw Error('No se han guardado los cambios pendientes.');
  const placement=composer.activePlacement();
  if(!placement)return;
  prepareCollatinusForReview();
  const panel=el('div');
  const manual=el('div');
  const suggestions=el('div','collatinus-grammar-review');
  const notice=(message:string)=>M.toast(message,5000);
  panel.append(manual,button('Analizar etiquetas con Collatinus',analyze,'hbtn'),suggestions);
  let analyzing=false;
  async function analyze():Promise<void>{
    if(analyzing)return;
    analyzing=true;
    try{
      const latest=composer.activePlacement();
      if(!latest||latest.id!==placement!.id)return;
      const latin=latest.text.latin;
      suggestions.replaceChildren(el('p','','Analizando el pasaje…'));
      const tokens=await analyzeLatin(latin);
      const rejected=new Set<string>();
      const corrections=new Map<number,{lid:number;morpho:string}>();
      const retired=(latest.grammarReview??[]).filter(item=>item.reviewRequired);
      for(const item of latest.grammarReview??[]){
        if(item.reviewRequired)continue;
        if(item.kind==='rejected')rejected.add([item.startUtf16,item.endUtf16,item.tagId].join(':'));
        else corrections.set(item.startUtf16,{lid:item.lid,morpho:item.morpho});
      }
      if(!latest.grammarReview){
        const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(latin)));
        const identity=Array.from(digest,n=>n.toString(16).padStart(2,'0')).join('');
        const key='cuaderno-collatinus-revision-v1:'+currentId+':'+latest.id+':'+identity;
        try{
          const state=JSON.parse(localStorage.getItem(key)??'null') as {
            rejected:string[];corrections:[number,{lid:number;morpho:string}][];
          }|null;
          for(const id of state?.rejected??[])if(typeof id==='string')rejected.add(id);
          for(const [position,reading] of state?.corrections??[])corrections.set(position,reading);
        }catch{/* el análisis continúa sin estas preferencias */ }
        if(rejected.size||corrections.size)await remember();
      }
      async function remember():Promise<void>{
        const decisions:GrammarReviewDecisionV1[]=[...retired];
        function anchor(start:number,end:number){
          return {startUtf16:start,endUtf16:end,exact:latin.slice(start,end),
            textFingerprint:fingerprintForMark(latin,start,end),reviewRequired:false};
        }
        for(const id of rejected){
          const match=/^(\d+):(\d+):([a-zA-Z0-9._-]+)$/u.exec(id);
          if(!match)continue;
          const start=Number(match[1]),end=Number(match[2]);
          if(start<end&&end<=latin.length&&latin.slice(start,end).trim())
            decisions.push({...anchor(start,end),kind:'rejected',tagId:match[3]!});
        }
        for(const token of tokens){
          const reading=corrections.get(token.s);
          if(reading&&token.w===latin.slice(token.s,token.e)
            &&token.cands?.some(c=>c.lid===reading.lid&&c.morphos.includes(reading.morpho)))
            decisions.push({...anchor(token.s,token.e),kind:'reading',...reading});
        }
        if(!await composer.setGrammarReview(latest!.id,latin,decisions))
          throw Error('No se ha podido guardar la decisión de revisión.');
      }
      const tags=allGrammarTags(corpus);
      const label=(id:string)=>tags.find(tag=>tag.id===id)?.label??id;
      function verifyText():boolean{
        const current=composer.activePlacement();
        return current?.id===latest!.id&&current.text.latin===latin;
      }
      function show():void{
        const annotated=tokens.map(token=>{
          const corrected=corrections.get(token.s);
          const found=token.cands?.find(c=>c.lid===corrected?.lid&&c.morphos.includes(corrected.morpho));
          return found&&corrected?{...token,sel:corrected,cands:[{...found,morphos:[corrected.morpho]}]}:token;
        });
        const proposals=proposeCollatinusGrammar(latin,annotated);
        const current=composer.activePlacement();
        const confirmed=current?.grammaticalSpans?.filter(span=>!span.reviewRequired)??[];
        const unresolved=tokens.filter(token=>!token.sel).map(token=>token.w);
        const ambiguous=tokens.filter(token=>(token.cands??[]).reduce((n,c)=>n+c.morphos.length,0)>1);
        suggestions.replaceChildren(el('p','','Propuestas de Collatinus · '+proposals.length+
          ' candidaturas · '+rejected.size+' descartadas'));
        if(unresolved.length)suggestions.append(el('p','','Sin análisis: '+unresolved.join(', ')));
        if(ambiguous.length){
          const ambiguity=el('details');
          ambiguity.append(el('summary','','Lecturas alternativas ('+ambiguous.length+')'));
          for(const token of ambiguous){
            const row=el('label','field',token.w);
            const choose=el('select');choose.setAttribute('aria-label','Lectura de '+token.w+' en posición '+token.s);
            const automatic=el('option','','Análisis de Collatinus');automatic.value='';choose.append(automatic);
            const readings=(token.cands??[]).flatMap(c=>c.morphos.map(morpho=>({
              lid:c.lid,morpho,label:c.lemma+' · '+(morpho||c.im),
            })));
            readings.forEach((reading,index)=>{
              const option=el('option','',reading.label);option.value=String(index);choose.append(option);
            });
            const correction=corrections.get(token.s);
            const index=readings.findIndex(reading=>reading.lid===correction?.lid&&reading.morpho===correction?.morpho);
            choose.value=index===-1?'':String(index);
            choose.addEventListener('change',async()=>{
              const reading=readings[Number(choose.value)];
              if(choose.value&&reading)corrections.set(token.s,{lid:reading.lid,morpho:reading.morpho});
              else corrections.delete(token.s);
              try{await remember();show();}catch(error){notice(String(error));}
            });
            row.append(choose);ambiguity.append(row);
          }
          suggestions.append(ambiguity);
        }
        const passage=el('details','cuaderno-review-passage');
        passage.open=true;
        passage.append(el('summary','','Texto latino'),el('p','',latin));
        suggestions.append(passage);
        const selectedProposals=new Map<CollatinusGrammarProposal,string>();
        async function accept(selections:Map<CollatinusGrammarProposal,string>):Promise<void>{
          if(!verifyText())throw Error('El pasaje cambió. Vuelve a analizarlo.');
          const assignments=[...selections].map(([proposal,tagId])=>({
            start:proposal.start,end:proposal.end,tagId,
            ...(tagId===proposal.tagId?{evidence:{
              engine:'Collatinus / instantánea integrada de Examinator2',
              rule:'cuaderno-gramatica-v1:'+proposal.tagId,evidence:proposal.evidence,
            }}:{}),
          }));
          if(!await composer.addGrammarSpans(assignments))throw Error('No se han guardado las etiquetas.');
          await update();show();
        }
        const acceptSelected=button('Aceptar las seleccionadas',()=>accept(selectedProposals),'hbtn');
        acceptSelected.disabled=true;
        suggestions.append(acceptSelected);
        for(const proposal of proposals){
          const id=[proposal.start,proposal.end,proposal.tagId].join(':');
          const row=el('details','grammar-proposal-card');
          const accepted=confirmed.some(span=>span.startUtf16===proposal.start&&span.endUtf16===proposal.end
            &&span.tagIds.includes(proposal.tagId));
          const discarded=isRejectedProposal(proposal,rejected,tags);
          const conflicts=confirmed.some(span=>span.startUtf16===proposal.start&&span.endUtf16===proposal.end
            &&conflictsWithGrammarForm(span.tagIds, proposal.tagId));
          if(conflicts&&!accepted)continue;
          row.dataset.state=accepted?'confirmed':discarded?'dismissed':'pending';
          row.append(el('summary','',latin.slice(proposal.start,proposal.end)+' · '+label(proposal.tagId)+
            (accepted?' · Confirmada':discarded?' · Descartada':' · Pendiente')));
          row.append(proposalContext(latin, proposal));
          row.append(el('p','',proposal.evidence.join(' / ')));
          if(proposal.alternatives.length)row.append(el('p','','Lecturas alternativas: '+proposal.alternatives.join(' / ')));
          if(proposal.syntaxReview)row.append(el('p','hint','Requiere revisión sintáctica.'));
          if(!accepted&&!discarded){
            const choose=el('select');choose.setAttribute('aria-label','Etiqueta que se confirmará');
            for(const tag of tags){
              const option=el('option','',tag.label);option.value=tag.id;choose.append(option);
            }
            choose.value=proposal.tagId;
            const check=el('input');check.type='checkbox';
            const selectionLabel=el('label','','Seleccionar propuesta');selectionLabel.prepend(check);
            function selectProposal():void{
              if(check.checked)selectedProposals.set(proposal,choose.value);
              else selectedProposals.delete(proposal);
              acceptSelected.disabled=!selectedProposals.size;
            }
            check.addEventListener('change',selectProposal);choose.addEventListener('change',selectProposal);
            row.append(choose,selectionLabel,button('Aceptar',
              ()=>accept(new Map([[proposal,choose.value]])),'hbtn'),button('Descartar',async()=>{
              rejected.add(id);await remember();show();
            },'hbtn'));
          }
          suggestions.append(row);
        }
      }
      if(!verifyText())throw Error('El pasaje cambió. Vuelve a analizarlo.');
      show();
    }catch(error){
      suggestions.replaceChildren(el('p','','No se pudo analizar el pasaje. '+String(error)));
    }finally{analyzing=false;}
  }
  async function update():Promise<void>{
    await reload();
    const latest=composer.activePlacement();
    if(!latest||latest.id!==placement!.id)return;
    const filter=manual.querySelector<HTMLInputElement>('.grammar-tag-search')?.value;
    manual.replaceChildren(renderGrammarEditor(latest,corpus,{
      open:true,toggle:()=>{},notice,
      addSpan:composer.addGrammarSpan,removeSpan:composer.removeGrammarSpan,
      updated:update,
      saveTags:async ids=>{
        if(!await composer.setActiveTags(ids)){notice('No se han guardado las etiquetas.');return;}
        await update();
      },
      addCustomTag:async label=>{
        try{
          if(!isCustomTagLabelValid(label)){notice('Revisa el nombre de la etiqueta.');return;}
          const previous=await repo.load();
          let tag=findTagByLabel(label,allGrammarTags(await loadCombinedCorpus()));
          if(!tag){
            tag={id:'custom.'+crypto.randomUUID(),label:label.trim(),kind:'custom',parentId:null};
            await repo.save(validateCorpus({...previous.corpus,tags:[...previous.corpus.tags,tag]}),previous.revision);
          }
          if(!await composer.setActiveTags([...latest.grammaticalTagIds,tag.id]))
            throw Error('No se ha podido asignar la etiqueta.');
          await update();
        }catch(error){notice(String(error));}
      },
    }));
    if(filter){
      const search=manual.querySelector<HTMLInputElement>('.grammar-tag-search');
      if(search){search.value=filter;search.dispatchEvent(new Event('input'));}
    }
  }
  await update();
  M.modal('Etiquetas del texto',panel,[{label:'Cerrar',onclick:async()=>{
    // El editor se actualiza internamente al confirmar etiquetas; la cabecera
    // externa también debe reflejar las etiquetas nuevas al cerrar la revisión.
    await reload();render();
  }}]);
}

async function returnToHome():Promise<void>{
  if(!await composer.flush())throw Error('No se han podido guardar los cambios pendientes.');
  composer.closeEdition();currentId=null;rememberNotebook();
  await reload();render();
}
/** Informe global de solo lectura: nunca descarta ni fusiona fuentes automáticamente. */
function openDuplicateAudit():void{
  const all=corpus.texts;
  const pairs=auditLibraryDuplicates(all);
  const sources=new Map(all.map(text=>[text.id,text]));
  const panel=el('div','cuaderno-duplicate-audit');
  panel.append(el('p','small muted',all.length+' textos revisados · '+pairs.length+
    (pairs.length===1?' pareja posiblemente repetida.':' parejas posiblemente repetidas.')+
    ' No se cambia ni se borra ningún texto. Comprueba los pasajes antes de editar.'));
  const stats=el('p','small muted',
    'Textos idénticos: '+pairs.filter(pair=>pair.kind==='identical').length+
    ' · Fragmentos compartidos: '+pairs.filter(pair=>pair.kind==='overlap').length+
    ' · Misma referencia: '+pairs.filter(pair=>pair.kind==='citation').length);
  panel.append(stats);
  const controls=el('div','cuaderno-duplicate-controls');
  const filterLabel=el('label','field'),filter=el('select');
  filter.setAttribute('aria-label','Tipo de coincidencia');
  for(const [value,label] of [
    ['all','Todas las coincidencias'],['identical','Textos idénticos'],
    ['overlap','Fragmentos compartidos'],['citation','Misma referencia bibliográfica'],
  ] as const){
    const option=el('option');option.value=value;option.textContent=label;filter.append(option);
  }
  filterLabel.append(el('span','','Tipo de coincidencia'),filter);
  const findLabel=el('label','field'),search=el('input');
  search.type='search';search.placeholder='Buscar título, autor u obra';
  search.setAttribute('aria-label','Buscar en coincidencias');
  findLabel.append(el('span','','Buscar'),search);
  controls.append(filterLabel,findLabel);panel.append(controls);
  const count=el('p','small muted'),results=el('div','cuaderno-duplicate-results');
  panel.append(count,results);
  const kindLabel:Record<LibraryDuplicatePair['kind'],string>={
    identical:'Texto idéntico',overlap:'Fragmento compartido',
    citation:'Misma referencia bibliográfica',
  };
  const sourceReference=(text:LatinText):string=>
    [text.source.author,text.source.work,text.source.reference].filter(Boolean).join(' · ')
      || 'Sin referencia bibliográfica';
  const referencedIn=(id:string):string=>{
    const names=new Set<string>();
    for(const book of corpus.notebooks)if(book.textIds.includes(id))names.add(book.title);
    for(const record of notebooks)if(record.edition.placements.some(p=>p.source.sourceId===id))
      names.add(record.edition.title);
    return names.size?[...names].join('; '):'Sin vinculación directa identificada';
  };
  const passage=(text:LatinText,excerpt:string,showMatch:boolean):HTMLElement=>{
    const line=el('p','cuaderno-duplicate-latin');
    // Nunca se interpreta el texto latino del usuario como HTML.
    const at=showMatch&&excerpt?text.latin.indexOf(excerpt):-1;
    if(at===-1){line.textContent=text.latin.slice(0,650)+(text.latin.length>650?'…':'');return line;}
    const start=Math.max(0,at-65),end=Math.min(text.latin.length,at+excerpt.length+65);
    if(start)line.append(document.createTextNode('…'));
    line.append(document.createTextNode(text.latin.slice(start,at)));
    line.append(el('mark','',excerpt));
    line.append(document.createTextNode(text.latin.slice(at+excerpt.length,end)));
    if(end<text.latin.length)line.append(document.createTextNode('…'));
    return line;
  };
  let close=()=>{},visible=30;
  const renderResults=():void=>{
    results.replaceChildren();
    const query=foldLatin(search.value.trim());
    const chosen=pairs.filter(pair=>{
      if(filter.value!=='all'&&pair.kind!==filter.value)return false;
      if(!query)return true;
      return [pair.firstTitle,pair.secondTitle].some(title=>foldLatin(title).includes(query))
        || [pair.firstId,pair.secondId].some(id=>{
          const text=sources.get(id);
          return Boolean(text&&foldLatin(sourceReference(text)).includes(query));
        });
    });
    count.textContent=chosen.length+' coincidencia'+(chosen.length===1?'':'s')+' con el filtro actual';
    if(!chosen.length)results.append(el('p','muted',
      pairs.length?'No hay coincidencias para este filtro.':'No se han detectado textos repetidos.'));
    for(const pair of chosen.slice(0,visible)){
      const first=sources.get(pair.firstId),second=sources.get(pair.secondId);
      if(!first||!second)continue;
      const card=el('details','cuaderno-duplicate-result');
      const summary=el('summary','',kindLabel[pair.kind]+' · '+pair.firstTitle+' / '+pair.secondTitle);
      card.append(summary);
      const quality=pair.kind==='citation'?'Coincidencia bibliográfica: comprueba los límites del fragmento':
        pair.sharedWords+' palabras compartidas';
      card.append(el('p','small muted',quality));
      for(const [order,text] of [['Primera ficha',first],['Segunda ficha',second]] as const){
        const group=el('div','cuaderno-duplicate-source');
        group.append(el('strong','',order+': '+text.title),
          el('p','small muted',sourceReference(text)),
          el('p','small muted','Cuadernos: '+referencedIn(text.id)),
          passage(text,pair.excerpt,pair.kind!=='citation'));
        group.append(button('Editar '+order.toLowerCase(),()=>{
          close();openBankTextEditor(text);
        },'tbtn'));
        card.append(group);
      }
      results.append(card);
    }
    if(chosen.length>visible)results.append(button(
      'Mostrar más coincidencias ('+(chosen.length-visible)+')',()=>{
        visible+=30;renderResults();
      },'tbtn'));
  };
  filter.addEventListener('change',()=>{visible=30;renderResults();});
  search.addEventListener('input',()=>{visible=30;renderResults();});
  renderResults();
  const modal=M.modal('Auditoría de textos repetidos',panel,[{label:'Cerrar'}],
    {width:'min(900px, 96vw)',noFocus:true});
  close=modal.close;
}

/** Pantalla de entrada, independiente de la hoja A4 y de cualquier cuaderno activo. */
function renderHome():HTMLElement{
  const home=el('section','card cuaderno-home');
  home.append(el('h3','','Cuaderno de textos latinos'));
  const heading=el('div','cuaderno-home-heading');
  heading.append(el('h4','','Mis cuadernos'));
  const actions=el('div','cuaderno-home-actions');
  // Reutilizar el botón original, con su manejador y su id, en vez de crear
  // un control redundante. Las pruebas y la accesibilidad conservan su acceso.
  const newButton=document.getElementById('btnNew');
  if(newButton instanceof HTMLButtonElement){
    newButton.textContent='Nuevo cuaderno';newButton.className='hbtn primary';
    actions.append(newButton);
  }else actions.append(button('Nuevo cuaderno',createNotebook,'hbtn primary'));
  const restore=el('input');restore.type='file';restore.accept='.json,application/json';restore.hidden=true;
  restore.setAttribute('aria-label','Seleccionar copia de cuaderno');
  restore.addEventListener('change',async()=>{
    const file=restore.files?.[0];restore.value='';
    if(!file)return;
    try{await restoreNotebooks(file);}catch(error){M.toast('No se pudo importar la copia: '+String(error),6500);}
  });
  actions.append(button('Importar cuaderno',()=>restore.click(),'hbtn'),restore);
  heading.append(actions);home.append(heading);
  const pwaArea=el('section','cuaderno-home-pwa');
  const pwaControls=createCuadernoPwaControls(()=>composer.flush());
  const pwaDetails=el('details','cuaderno-home-pwa-details');
  pwaDetails.append(el('summary','','Instalación y actualizaciones'));
  // Contraer solo las acciones: el aviso de estado permanece visible fuera
  // del desplegable, conservando el panel y sus controladores originales.
  const pwaButtons=pwaControls.querySelector<HTMLElement>('.cuaderno-pwa-actions');
  if(pwaButtons)pwaDetails.append(pwaButtons);
  pwaControls.prepend(pwaDetails);
  pwaArea.append(pwaControls);
  home.append(pwaArea);
  const grid=el('div','cuaderno-home-grid');
  const saved=notebooks.filter(n=>n.edition.id!==WORKING_EDITION_ID)
    .sort((a,b)=>b.edition.updatedAt.localeCompare(a.edition.updatedAt));
  if(!saved.length)grid.append(el('p','muted','No hay cuadernos todavía. Puedes crear uno nuevo.'));
  for(const record of saved){
    const edition=record.edition;
    const card=el('article','cuaderno-home-card');
    card.append(el('h5','',edition.title));
    card.append(el('p','small muted',edition.placements.length+' textos · '+
      new Date(edition.updatedAt).toLocaleDateString('es')));
    if(edition.legacyNotebookId!==null)card.append(el('p','small muted','Cuaderno histórico protegido'));
    const buttons=el('div','cuaderno-home-card-actions');
    buttons.append(button('Abrir',()=>openNotebook(edition.id),'hbtn primary'),
      button('Hacer copia',async()=>{
        if(!await composer.flush())throw Error('Hay cambios pendientes de guardar.');
        const current=await workspace.loadEdition(edition.id);
        if(!current)throw Error('El cuaderno ya no existe.');
        downloadBackup(await createNotebookBackup(current.edition,await loadCombinedCorpus()),'copia-cuaderno');
      },'hbtn'));
    if(edition.legacyNotebookId===null)buttons.append(button('Eliminar',()=>deleteNotebook(edition.id),'tbtn'));
    card.append(buttons);grid.append(card);
  }
  home.append(grid);
  const backups=el('details','cuaderno-home-backups');
  backups.append(el('summary','','Copia integral del espacio de trabajo'));
  backups.append(button('Descargar copia integral',async()=>{
    if(!await composer.flush())throw Error('No se han podido guardar los cambios pendientes.');
    downloadBackup(await createWorkspaceBackup(workspace,new Date(),(await repo.load()).corpus),'copia-editorial');
  },'hbtn'));
  home.append(backups);
  const sync=el('details','cuaderno-home-sync');
  sync.append(el('summary','','Sincronización privada con Supabase'));
  sync.append(el('p','small muted','La biblioteca y los cuadernos permanecen locales hasta que confirmes cada transferencia.'));
  sync.append(button('Configurar sincronización',()=>openSupabaseSyncModal({
    workspace,historical:repo,flush:()=>composer.flush(),
    refreshed:async()=>{currentId=null;rememberNotebook();await reload();render();},
    modal:(title,body,actions,options)=>M.modal(title,body,actions,options),
    download:downloadBackup,
  }),'hbtn'));
  home.append(sync);

  const bank=el('section','cuaderno-home-bank');
  bank.setAttribute('aria-label','Banco de textos propios');
  const bankHeading=el('div','cuaderno-home-bank-heading');
  const bankHeadingCopy=el('div','cuaderno-bank-heading-copy');
  bankHeadingCopy.append(el('span','cuaderno-bank-eyebrow','ARCHIVO DE TEXTOS'),
    el('h4','','Banco de textos propios'),
    el('p','small muted','Consulta, ordena y edita tus pasajes sin abrir un cuaderno.'));
  bankHeading.append(bankHeadingCopy,
    el('span','cuaderno-bank-total',corpus.texts.length+
      (corpus.texts.length===1?' texto distinto':' textos distintos')));
  bank.append(bankHeading);
  const bankActions=el('div','cuaderno-home-actions cuaderno-bank-main-actions');
  bankActions.append(button('Pegar en el banco',()=>pasteText('bank'),'hbtn primary'),
    button('Importar Word al banco',()=>importWord('bank'),'hbtn'),
    button('Auditar textos repetidos',openDuplicateAudit,'hbtn'));
  bank.append(bankActions);

  // Ordenar y filtrar solo la vista: nunca reordenar el corpus persistido.
  const bankCollator=new Intl.Collator('es',{numeric:true,sensitivity:'base'});
  const search=el('input');search.type='search';
  search.placeholder='Título, latín, autor, obra o referencia…';
  search.setAttribute('aria-label','Buscar en banco de textos propios');
  const authorSelect=el('select');
  authorSelect.setAttribute('aria-label','Filtrar textos por autor');
  const authorChoices=[...new Set(corpus.texts.map(t=>t.source.author?.trim()??'').filter(Boolean))]
    .sort(bankCollator.compare);
  const allAuthors=el('option','','Todos los autores');
  allAuthors.value='all';authorSelect.append(allAuthors);
  for(const author of authorChoices){
    const option=el('option','',author);option.value=author;authorSelect.append(option);
  }
  if(corpus.texts.some(t=>!t.source.author?.trim())){
    const option=el('option','','Sin autor indicado');option.value='__missing_author__';
    authorSelect.append(option);
  }
  const sortSelect=el('select');
  sortSelect.setAttribute('aria-label','Ordenar textos del banco');
  for(const [value,label] of [
    ['author-asc','Autor: A–Z'],['author-desc','Autor: Z–A'],
    ['work-asc','Obra: A–Z'],['title-asc','Título: A–Z'],
  ] as const){
    const option=el('option','',label);option.value=value;sortSelect.append(option);
  }
  const viewSelect=el('select');
  viewSelect.setAttribute('aria-label','Vista del banco de textos');
  for(const [value,label] of [
    ['all','Lista y etiquetas'],['list','Solo lista general'],
    ['tags','Solo categorías'],
  ] as const){
    const option=el('option','',label);option.value=value;viewSelect.append(option);
  }
  const bankToolbar=el('div','cuaderno-bank-toolbar');
  const bankField=(name:string,control:HTMLInputElement|HTMLSelectElement,style:string):HTMLElement=>{
    const label=el('label','cuaderno-bank-control '+style);
    label.append(el('span','',name),control);return label;
  };
  bankToolbar.append(bankField('Buscar',search,'cuaderno-bank-search'),
    bankField('Autor',authorSelect,''),
    bankField('Ordenar por',sortSelect,''),
    bankField('Ver',viewSelect,''));
  const resetBankFilters=button('Restablecer vista',()=>{
    search.value='';authorSelect.value='all';sortSelect.value='author-asc';
    viewSelect.value='all';populate();
  },'tbtn cuaderno-bank-reset');
  bankToolbar.append(resetBankFilters);bank.append(bankToolbar);
  const bankResultCount=el('p','cuaderno-bank-result-count');
  bankResultCount.setAttribute('role','status');
  bankResultCount.setAttribute('aria-live','polite');
  bank.append(bankResultCount);
  const protectedIds=protectedBankSourceIds();
  const selectedForRemoval=new Set<string>();
  const bulk=el('div','cuaderno-bank-bulk');
  bulk.setAttribute('aria-label','Selección y borrado de varios textos del banco');
  const selectionCount=el('span','small muted','Ningún texto seleccionado');
  const selectedButton=button('Seleccionar resultados',()=>{
    for(const text of currentResults())if(!protectedIds.has(text.id))
      selectedForRemoval.add(text.id);
    updateSelection();
  },'hbtn');
  const deselect=button('Desmarcar todos',()=>{
    selectedForRemoval.clear();updateSelection();
  },'hbtn');
  const removeSelected=button('Quitar seleccionados',()=>removeBankTexts([...selectedForRemoval]),'tbtn');
  function currentResults():LatinText[]{
    const needle=foldLatin(search.value.trim());
    const chosenAuthor=authorSelect.value;
    const compare=(a:string,b:string)=>bankCollator.compare(a,b);
    const compareFilled=(a:string,b:string,reverse=false):number=>
      a?(b?(reverse?-compare(a,b):compare(a,b)):-1):(b?1:0);
    return corpus.texts.filter(t=>{
      const author=t.source.author?.trim()??'';
      if(chosenAuthor==='__missing_author__'&&author)return false;
      if(chosenAuthor!=='all'&&chosenAuthor!=='__missing_author__'&&author!==chosenAuthor)return false;
      return !needle||foldLatin(
        [t.title,t.latin,t.source.author??'',t.source.work??'',t.source.reference??''].join(' ')
      ).includes(needle);
    }).sort((a,b)=>{
      const authorA=a.source.author?.trim()??'',authorB=b.source.author?.trim()??'';
      const workA=a.source.work?.trim()??'',workB=b.source.work?.trim()??'';
      const authorOrder=compareFilled(authorA,authorB,sortSelect.value==='author-desc');
      const workOrder=compareFilled(workA,workB);
      const titleOrder=compare(a.title,b.title);
      if(sortSelect.value==='title-asc')return titleOrder||authorOrder||workOrder||compare(a.id,b.id);
      if(sortSelect.value==='work-asc')return workOrder||authorOrder||titleOrder||compare(a.id,b.id);
      return authorOrder||workOrder||titleOrder||compare(a.id,b.id);
    });
  }
  function updateSelection():void{
    selectionCount.textContent=selectedForRemoval.size+
      (selectedForRemoval.size===1?' texto seleccionado':' textos seleccionados');
    removeSelected.disabled=selectedForRemoval.size===0;
    deselect.disabled=selectedForRemoval.size===0;
    for(const input of Array.from(bank.querySelectorAll<HTMLInputElement>('.cuaderno-bank-select'))){
      input.checked=selectedForRemoval.has(input.value);
    }
  }
  bulk.append(selectedButton,deselect,removeSelected,selectionCount);
  bulk.append(el('p','small muted','Selecciona los resultados de la búsqueda o marca textos individuales. '+
    'Los cuadernos editoriales no se borrarán. Los textos de cuadernos históricos están protegidos.'));
  bank.append(bulk);
  updateSelection();
  const catalogue=allGrammarTags(corpus);
  // Los filtros del banco describen la fuente; las etiquetas de una aparición
  // en otro cuaderno no se propagan silenciosamente a la fuente.
  const sourceTags=new Map(corpus.texts.map(text=>[text.id,text.tagIds]));
  const idsFor=(id:string):string[]=>sourceTags.get(id)??[];
  const listing=el('div','cuaderno-home-bank-list');
  function appendTextRows(target:HTMLElement,texts:typeof corpus.texts):void{
    if(!texts.length){target.append(el('p','small muted','No hay textos con ese filtro.'));return;}
    for(const text of texts){
      const row=el('details','cuaderno-home-text');
      // Selección siempre visible aunque los detalles de la fuente estén cerrados.
      // El título despliega el latín; la casilla solo cambia la selección.
      const rowSummary=el('summary','cuaderno-home-text-heading');
      const source=[text.source.author,text.source.work,text.source.reference]
        .filter(Boolean).join(' · ');
      const titleGroup=el('span','cuaderno-home-text-heading-info');
      titleGroup.append(el('strong','',text.title));
      titleGroup.append(el('span','cuaderno-home-text-source',
        source||'Autor y obra sin indicar'));
      const excerpt=text.latin.replace(/\s+/g,' ').trim();
      if(excerpt)titleGroup.append(el('span','cuaderno-home-text-snippet',
        excerpt.slice(0,115)+(excerpt.length>115?'…':'')));
      rowSummary.append(titleGroup);
      const selection=el('label','cuaderno-home-select'),checkbox=el('input','cuaderno-bank-select');
      checkbox.type='checkbox';checkbox.value=text.id;
      checkbox.setAttribute('aria-label','Seleccionar para quitar: '+text.title);
      checkbox.disabled=protectedIds.has(text.id);
      checkbox.checked=selectedForRemoval.has(text.id);
      checkbox.addEventListener('change',()=>{
        if(checkbox.checked)selectedForRemoval.add(text.id);
        else selectedForRemoval.delete(text.id);
        updateSelection();
      });
      selection.addEventListener('click',event=>event.stopPropagation());
      selection.append(checkbox,el('span','','Seleccionar'));
      if(checkbox.disabled)selection.title='Protegido: se utiliza en un cuaderno histórico';
      rowSummary.append(selection);row.append(rowSummary);
      row.append(el('p','cuaderno-home-latin',text.latin));
      if(text.tagIds.length){
        const chips=el('div','grammar-chips cuaderno-bank-row-tags');
        for(const tagId of text.tagIds.slice(0,6)){
          const tag=catalogue.find(item=>item.id===tagId);
          if(tag)chips.append(el('span','grammar-chip',tag.label));
        }
        if(chips.childElementCount)row.append(chips);
      }
      const actions=el('div','cuaderno-home-text-actions');
      const remove=button('Quitar del banco',()=>removeBankText(text),'tbtn');
      if(protectedIds.has(text.id)){
        remove.disabled=true;
        remove.title='Protegido: se utiliza en un cuaderno histórico';
      }
      actions.append(button('Editar ficha',()=>openBankTextEditor(text),'hbtn'),
        button('Etiquetar',()=>tagBankText(text),'hbtn'),remove);
      row.append(actions);
      target.append(row);
    }
  }
  function populate():void{
    listing.replaceChildren();
    const matching=currentResults();
    const isFiltered=Boolean(search.value.trim())||authorSelect.value!=='all';
    bankResultCount.textContent='Mostrando '+matching.length+' de '+corpus.texts.length+
      (corpus.texts.length===1?' texto':' textos')+' · '+(
        viewSelect.value==='tags'?'clasificados por etiquetas':
        viewSelect.value==='list'?'lista ordenada':'lista y etiquetas');
    selectedButton.textContent=isFiltered?'Seleccionar resultados ('+matching.length+')':
      'Seleccionar todo el banco ('+matching.length+')';
    resetBankFilters.disabled=!isFiltered&&sortSelect.value==='author-asc'&&viewSelect.value==='all';
    updateSelection();
    if(!matching.length){
      listing.append(el('p','cuaderno-bank-empty',
        corpus.texts.length?'No hay textos que coincidan con estos filtros.':'El banco está vacío. Añade o importa un texto para empezar.'));
      return;
    }
    const addLazyRows=(group:HTMLDetailsElement,texts:typeof corpus.texts):void=>{
      const items=el('div','cuaderno-home-category-items');group.append(items);
      let visible=40;
      const update=(force=false):void=>{
        items.replaceChildren();
        if(!group.open&&!force)return;
        appendTextRows(items,texts.slice(0,visible));
        if(visible<texts.length)items.append(button(
          'Mostrar más textos ('+(texts.length-visible)+' restantes)',()=>{
            visible+=40;update();
          },'hbtn cuaderno-bank-show-more'));
      };
      group.addEventListener('toggle',()=>update());
      // Pintar inmediatamente en WebKit al abrir, antes del toggle diferido.
      const summary=group.querySelector(':scope > summary');
      summary?.addEventListener('click',()=>{if(!group.open)update(true);});
      if(group.open)update();
    };
    if(viewSelect.value!=='tags'){
      const all=el('details','cuaderno-home-category cuaderno-bank-all');
      all.open=Boolean(search.value.trim());
      all.append(el('summary','','Todos los textos ('+matching.length+')'));
      addLazyRows(all,matching);listing.append(all);
      if(viewSelect.value==='list')return;
    }
    const makeCategory=(tag:typeof catalogue[number],depth:number):HTMLDetailsElement|null=>{
      const texts=matching.filter(t=>matchesGrammarFilters(idsFor(t.id),[tag.id],catalogue));
      if(!texts.length)return null;
      const group=el('details','cuaderno-home-category');
      if(depth)group.classList.add('cuaderno-home-subcategory');
      group.append(el('summary','',tag.label+' ('+texts.length+')'));
      for(const child of catalogue.filter(t=>t.parentId===tag.id)){
        const nested=makeCategory(child,depth+1);
        if(nested)group.append(nested);
      }
      addLazyRows(group,texts.filter(t=>idsFor(t.id).includes(tag.id)));
      return group;
    };
    for(const root of catalogue.filter(t=>t.parentId===null)){
      const group=makeCategory(root,0);
      if(group)listing.append(group);
    }
    const without=matching.filter(t=>idsFor(t.id).length===0);
    const untagged=el('details','cuaderno-home-category');
    untagged.append(el('summary','','Sin etiquetar ('+without.length+')'));
    addLazyRows(untagged,without);listing.append(untagged);
  }
  search.addEventListener('input',populate);
  authorSelect.addEventListener('change',populate);
  sortSelect.addEventListener('change',populate);
  viewSelect.addEventListener('change',populate);
  populate();bank.append(listing);
  home.append(bank);
  return home;
}
function render():void{
  // Un único botón real «Nuevo»: aparece en Inicio o dentro del grupo
  // Mis cuadernos de la cabecera, conservando su manejador original.
  const originalNew=document.getElementById('btnNew');
  if(originalNew instanceof HTMLButtonElement){
    // Sacarlo de la tarjeta anterior ANTES de replaceChildren(), también al
    // regresar a Inicio; así no se pierde su identidad ni su evento click.
    const nav=document.getElementById('cuadernoHeaderNavigation');
    if(nav&&originalNew.parentElement!==nav)nav.append(originalNew);
    if(active()){
      originalNew.textContent='+';
      originalNew.title='Crear un cuaderno nuevo';
      originalNew.setAttribute('aria-label','Nuevo cuaderno');
      originalNew.className='hbtn cuaderno-header-new';
    }else{
      originalNew.textContent='Nuevo cuaderno';
      originalNew.removeAttribute('aria-label');
      originalNew.className='hbtn primary';
    }
  }
  // La tarjeta anterior se reconstruye por completo. Rescatar también los
  // botones únicos Biblioteca/Banco antes de vaciar #editor; si no, un
  // segundo render los dejaría desconectados y perdería sus manejadores.
  const header=document.querySelector('body > header');
  for(const id of ['btnLib','btnLists']){
    const control=document.getElementById(id);
    if(header&&control instanceof HTMLButtonElement&&control.parentElement!==header)
      header.append(control);
  }
  const left=document.getElementById('editor');
  const page=document.getElementById('sheet');
  if(!left||!page)throw new Error('Falta el documento original de Examinator2.');
  left.replaceChildren();
  document.body.dataset.hasEditor=String(active());
  document.body.dataset.cuadernoHome=String(!active());
  if(!active()){
    page.replaceChildren();
    left.append(renderHome());
    document.title='Mis cuadernos · Cuaderno de textos latinos';
    return;
  }
  const summary=el('section','card cuaderno-editor-overview');
  const choose=el('select');
  choose.setAttribute('aria-label','Elegir cuaderno');
  const placeholder=el('option','',active()?'Cerrar cuaderno':'Elige un cuaderno');
  placeholder.value='';placeholder.disabled=!active();
  choose.append(placeholder);
  for(const entry of notebooks.filter(n=>n.edition.id!==WORKING_EDITION_ID)
    .sort((a,b)=>b.edition.updatedAt.localeCompare(a.edition.updatedAt))){
    const edition=entry.edition;
    const option=el('option','',edition.title+' · '+edition.placements.length+' textos · '+
      new Date(edition.updatedAt).toLocaleDateString('es'));
    option.value=edition.id;choose.append(option);
  }
  choose.value=currentId??'';
  choose.addEventListener('change',async()=>{
    choose.disabled=true;
    try{
      if(choose.value)await openNotebook(choose.value);
      else{
        if(!await composer.flush())throw Error('No se han guardado los cambios pendientes.');
        composer.closeEdition();currentId=null;rememberNotebook();
        await reload();render();
      }
    }
    catch(error){choose.value=currentId??'';M.toast(String(error),5500);}
    finally{choose.disabled=false;}
  });
  // Cabecera contextual: nombre real y contador, sin repetir una línea de estado.
  const count=composer.activeEdition()?.placements.length??0;
  const heading=el('div','cuaderno-context-heading');
  const headingText=el('div','cuaderno-context-heading-text');
  headingText.append(el('h3','','Cuaderno de textos latinos'),
    el('strong','cuaderno-context-current',currentTitle()));
  heading.append(headingText,el('span','cuaderno-context-count',
    count+' '+(count===1?'texto':'textos')));
  // Volver está ahora en la cabecera. No duplicar su botón en esta tarjeta.
  const links=el('div','cuaderno-context-links');
  links.append(button('Gestionar cuadernos',openNotebooks,'hbtn'));
  const top=el('div','cuaderno-context-top');
  top.append(heading,links);summary.append(top);
  const tools=el('div','cuaderno-context-tools');
  const switcher=el('label','cuaderno-context-switch');
  switcher.append(el('span','','Cambiar cuaderno'),choose);
  tools.append(switcher);
  const backups=el('details','cuaderno-context-backups');
  backups.append(el('summary','','Copias de seguridad'));
  const controls=el('div','row cuaderno-context-backup-buttons');
  if(active())controls.append(button('Copia del cuaderno',async()=>{
    if(!await composer.flush())throw Error('No se han guardado los cambios pendientes.');
    const edition=composer.activeEdition();
    if(edition)downloadBackup(await createNotebookBackup(edition,await loadCombinedCorpus()),'copia-cuaderno');
  },'hbtn'));
  controls.append(button('Copia integral',async()=>{
    if(!await composer.flush())throw Error('No se han guardado los cambios pendientes.');
    downloadBackup(await createWorkspaceBackup(workspace,new Date(),(await repo.load()).corpus),'copia-editorial');
  },'hbtn'));
  const restore=el('input');restore.type='file';restore.accept='.json,application/json';restore.hidden=true;
  restore.addEventListener('change',async()=>{
    const file=restore.files?.[0];restore.value='';
    if(!file)return;
    restoreButton.disabled=true;
    try{await restoreNotebooks(file);}
    catch(error){M.toast(String(error),5500);}
    finally{restoreButton.disabled=false;}
  });
  const restoreButton=button('Restaurar copia',()=>restore.click(),'hbtn');
  controls.append(restoreButton,restore);backups.append(controls);
  tools.append(backups);summary.append(tools);
  if(active()){
    const addPanel=el('div','cuaderno-context-add');
    addPanel.append(el('h4','','Añadir textos'));
    const actions=el('div','cuaderno-add-actions');
    const primary=el('div','cuaderno-add-primary');
    const secondary=el('div','cuaderno-add-secondary');
    // Reubicar los botones de Examinator, no crear dobles manejadores.
    const libraryButton=document.getElementById('btnLib');
    const bankButton=document.getElementById('btnLists');
    if(libraryButton instanceof HTMLButtonElement){
      libraryButton.textContent='Biblioteca';
      libraryButton.className='hbtn primary';
      primary.append(libraryButton);
    }else primary.append(button('Biblioteca',openLibrary,'hbtn primary'));
    if(bankButton instanceof HTMLButtonElement){
      bankButton.textContent='Banco propio';
      bankButton.className='hbtn';
      primary.append(bankButton);
    }else primary.append(button('Banco propio',openOwnTexts,'hbtn'));
    secondary.append(button('Pegar texto',pasteText,'hbtn'),
      button('Importar Word',importWord,'hbtn'));
    actions.append(primary,secondary);
    addPanel.append(actions);summary.append(addPanel);
    const placement=composer.activePlacement();
    if(placement){
      const all=allGrammarTags(corpus),ids=placementGrammarTags(placement);
      const tagged=el('div','cuaderno-current-tags');
      tagged.setAttribute('aria-label','Etiquetas del texto en edición');
      tagged.append(el('strong','','Etiquetas de este texto'));
      const chips=el('div','grammar-chips');
      if(!ids.length)chips.append(el('span','small muted','Sin etiquetas gramaticales'));
      for(const id of ids){
        const tag=all.find(t=>t.id===id);
        const chip=el('span','grammar-chip',tag?.label??id);
        chip.dataset.group=GRAMMAR_GROUP_IDS.find(group=>matchesGrammarTag(id,group,all))??'custom';
        chips.append(chip);
      }
      tagged.append(chips,button('Etiquetas gramaticales',openGrammarEditor,'hbtn'));
      summary.append(tagged);
    }
    left.append(summary,composer.element);
    page.textContent='';
  }else{
    left.append(summary);
    page.replaceChildren(el('h2','','Cuaderno de textos latinos'),
      el('p','','Elige «Nuevo» o «Abrir» para empezar. Aquí aparecerá la vista A4 del cuaderno.'));
  }
  document.title=currentTitle()+' · Cuaderno de textos latinos';
}
function wireThemeButton():void{
  const key='cuaderno-ui-theme-v1';
  type Theme='light'|'dark'|'oled';
  let saved:Theme='light';
  try{
    const value=localStorage.getItem(key);
    if(value==='dark'||value==='oled')saved=value;
  }catch{/* navegación privada */}
  const control=el('select','cuaderno-theme-select');
  control.id='btnCuadernoTheme';
  control.setAttribute('aria-label','Apariencia');
  control.title='Seleccionar apariencia';
  for(const [value,label] of [['light','Claro'],['dark','Oscuro'],['oled','OLED']] as const){
    const option=el('option','',label);
    option.value=value;
    control.append(option);
  }
  function setTheme(theme:Theme):void{
    document.documentElement.dataset.cuadernoTheme=theme;
    control.value=theme;
    control.title='Apariencia: '+(theme==='oled'?'OLED':theme==='dark'?'Oscuro':'Claro');
  }
  control.addEventListener('change',()=>{
    const next=control.value as Theme;
    setTheme(next);
    try{localStorage.setItem(key,next);}catch{/* se conserva la sesión */}
  });
  document.querySelector('body > header')?.append(control);
  setTheme(saved);
}
function wireHeaderLayout():void{
  const header=document.querySelector('body > header');
  if(!(header instanceof HTMLElement))throw Error('Falta la cabecera del editor.');
  const get=(id:string):HTMLButtonElement=>{
    const button=document.getElementById(id);
    if(!(button instanceof HTMLButtonElement))throw Error('Falta '+id);
    return button;
  };
  const brand=header.querySelector('.brand');
  if(brand instanceof HTMLElement){
    const mark=document.createElement('img');
    mark.src=new URL('../examinator-cuadernos/icons/icon.svg',import.meta.url).href;
    mark.width=27;mark.height=27;mark.alt='';
    mark.className='cuaderno-pwa-brand-icon';
    brand.prepend(mark);
  }
  const nav=el('div','cuaderno-header-nav');
  nav.id='cuadernoHeaderNavigation';
  const home=get('btnOpen');
  home.textContent='Mis cuadernos';
  home.title='Volver al listado de cuadernos';
  home.setAttribute('aria-label','Mis cuadernos');
  nav.append(home,get('btnNew'));
  if(brand)brand.after(nav);else header.prepend(nav);
  const save=el('div','cuaderno-header-save');
  const saveButton=get('btnSave');
  saveButton.title='Guardar los cambios del cuaderno';
  const status=el('span','cuaderno-header-save-state');
  status.id='cuadernoHeaderSaveState';
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  save.append(saveButton,status);
  const spacer=header.querySelector('.spacer');
  if(spacer)spacer.before(save);else header.append(save);
  // Mostrar siempre el estado en formato breve, incluso en iPad/iPhone:
  // el título accesible conserva el mensaje exacto del motor editorial.
  const updateStatus=()=>{
    const source=composer.element.querySelector<HTMLElement>('.edition-save-state');
    const text=source?.textContent?.trim()??'';
    const state=source?.dataset.saveState??'notice';
    const visible=active();
    const labels:Record<string,string>={
      pending:'Pendiente',saving:'Guardando…',saved:'Guardado',error:'Error',
    };
    status.dataset.state=visible?state:'notice';
    status.textContent=visible?(labels[state]??(text?'Aviso':'')):'';
    status.title=visible?text:'';
    if(visible&&text)status.setAttribute('aria-label',text);
    else status.removeAttribute('aria-label');
  };
  new MutationObserver(updateStatus).observe(composer.element,{
    subtree:true,childList:true,characterData:true,
  });
  updateStatus();
  const exports=el('div','cuaderno-header-exports');
  const word=get('btnDocx'),pdf=get('btnPdf');
  word.textContent='Word';word.setAttribute('aria-label','Exportar Word');
  pdf.textContent='PDF';pdf.setAttribute('aria-label','Exportar PDF');
  exports.append(word,pdf);
  const appearance=document.getElementById('btnCuadernoTheme');
  // Menú flotante fuera del encabezado para que no se recorte al desplazarse
  // horizontalmente en Safari iPad/iPhone.
  const moreTrigger=el('button','hbtn cuaderno-header-more-trigger','Más');
  moreTrigger.type='button';
  moreTrigger.setAttribute('aria-expanded','false');
  moreTrigger.setAttribute('aria-controls','cuadernoMoreTools');
  const more=el('div','cuaderno-header-more');
  more.id='cuadernoMoreTools';
  more.hidden=true;
  const setting=get('btnSettings');
  setting.textContent='Formato y ajustes';
  more.append(setting,createCuadernoPwaControls(()=>composer.flush()));
  moreTrigger.addEventListener('click',()=>{
    more.hidden=!more.hidden;
    moreTrigger.setAttribute('aria-expanded',String(!more.hidden));
  });
  setting.addEventListener('click',()=>{
    more.hidden=true;moreTrigger.setAttribute('aria-expanded','false');
  });
  document.addEventListener('click',event=>{
    const target=event.target;
    if(target instanceof Node&&!more.contains(target)&&!moreTrigger.contains(target)){
      more.hidden=true;moreTrigger.setAttribute('aria-expanded','false');
    }
  });
  header.append(exports);
  if(appearance)header.append(appearance);
  header.append(moreTrigger);
  document.body.append(more);
}
function wireButtons():void{
  wireThemeButton();
  wireHeaderLayout();
  const byId=(id:string):HTMLButtonElement=>{
    const node=document.getElementById(id);
    if(!(node instanceof HTMLButtonElement))throw new Error('Falta '+id);
    return node;
  };
  byId('btnNew').onclick=async()=>{
    const controls=['btnNew','btnOpen','btnSave','btnLib','btnLists','btnSettings','btnDocx','btnPdf']
      .map(id=>byId(id)).filter(control=>!control.disabled);
    controls.forEach(control=>{control.disabled=true;});
    try{await createNotebook();}
    catch(error){M.toast(String(error),5000);}
    finally{controls.forEach(control=>{control.disabled=false;});}
  };
  byId('btnOpen').onclick=()=>{void returnToHome().catch(e=>M.toast(String(e),5000));};
  byId('btnSave').onclick=()=>{void saveNotebook().catch(e=>M.toast(String(e),5000));};
  byId('btnLib').onclick=openLibrary;
  byId('btnLists').textContent='Banco de textos';
  byId('btnLists').onclick=openOwnTexts;
  byId('btnSettings').onclick=selectFormat;
  byId('btnDocx').onclick=()=>exportDoc('word');
  byId('btnPdf').onclick=()=>exportDoc('pdf');
  document.getElementById('lib')?.addEventListener('click',event=>{
    const target=event.target;
    if(!(target instanceof Element))return;
    const row=target.closest<HTMLElement>('.rtext .rl');
    if(!row)return;
    const selected=window.getSelection();
    if(selected&&!selected.isCollapsed)return;
    const text=row.querySelector<HTMLElement>('.rx');
    if(!text)return;
    const range=document.createRange();range.selectNodeContents(text);
    selected?.removeAllRanges();selected?.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  },true);
}
function script(url:string):Promise<void>{
  return new Promise((resolve,reject)=>{
    const s=el('script');s.src=url;s.onload=()=>resolve();
    s.onerror=()=>reject(new Error('No se ha cargado la biblioteca original: '+url));
    document.body.append(s);
  });
}
void (async()=>{
  try{
    const [local,full,downloaded]=await Promise.all([
      fetch(new URL('../library/catalog.json',import.meta.url)),
      fetch(new URL('../library/examinator-catalog.json',import.meta.url)),
      downloads.list(),
    ]);
    if(!local.ok||!full.ok)throw Error('Faltan los catálogos de textos.');
    const localWorks=(await local.json() as {works:LibraryEntry[]}).works;
    if(!Array.isArray(localWorks))throw Error('Catálogo offline inválido.');
    catalogue=parseExaminatorCatalogue(await full.json());
    const entries=new Map<string,Entry>(catalogue.entries.map(x=>[x.urn,{...x}]));
    for(const x of localWorks){
      const original=entries.get(x.urn);
      entries.set(x.urn,original?{...original,local:x}:{
        urn:x.urn,path:'',author:x.author,title:x.title,latin:x.latin,
        genre:x.genre,description:x.editorial,local:x,
      });
    }
    allEntries=[...entries.values()];
    downloaded.forEach(x=>ownCache.add(x));
    // Inicializar el banco ANTES de pintar un cuaderno guardado. Al abrir el
    // editor, menuText() puede resolver etiquetas gramaticales inmediatamente;
    // en Safari eso provocaba TypeError al acceder a corpus.tags sin cargar.
    await reload();
    await composer.open();
    wireButtons();
    await script(new URL('./js/library.js',document.baseURI).href);
    void startCuadernoPwa();
    // Inicio siempre desde Mis cuadernos, sin reabrir automáticamente el último.
    composer.closeEdition();currentId=null;render();
  }catch(e){
    console.error(e);
    const target=document.getElementById('editor');
    if(target)target.textContent='No se ha podido iniciar el cuaderno: '+String(e);
  }
})();