import { allGrammarTags, GRAMMAR_CATALOGUE } from '../core/grammar-tags.js';
import { emptyCorpus, type CorpusV1, type GrammarTag } from '../core/model.js';
import { validateCorpus } from '../core/validation.js';
import { validateEdition } from '../core/edition-validation.js';
import type { NotebookEditionV1 } from '../core/edition-model.js';
import { validateWorkspaceSnapshot, WorkspaceConflictError, WorkspaceRepository,
  type WorkspaceSnapshotV1 } from './workspace-repository.js';

export const WORKSPACE_BACKUP_FORMAT = 'cuaderno-textos-latinos-workspace';
export const WORKSPACE_BACKUP_VERSION = 2 as const;
export const WORKSPACE_BACKUP_MAX_CHARACTERS = 64 * 1024 * 1024;

export class WorkspaceBackupError extends Error {
  constructor(message: string) { super(message); this.name = 'WorkspaceBackupError'; }
}
export interface WorkspaceBackupPreviewV2 {
  exportedAt: string;
  workspaceRevision: number;
  notebookCount: number;
  placementCount: number;
  historyCount: number;
  corpusTextCount: number;
}
export interface WorkspaceBackupVerifiedV2 {
  snapshot: WorkspaceSnapshotV1;
  preview: WorkspaceBackupPreviewV2;
}
export interface WorkspaceRestorePreviewV2 {
  target: WorkspaceBackupPreviewV2;
  current: WorkspaceBackupPreviewV2;
  /** La interfaz debe permitir guardar este fichero antes de habilitar Restaurar. */
  currentSafetyBackupJson: string;
  expectedWorkspaceRevision: number;
}
export interface WorkspaceRestoreApprovalV2 {
  confirmReplace: boolean;
  safetyBackupExported: boolean;
  currentSafetyBackupJson: string;
  expectedWorkspaceRevision: number;
}

function utc(text: unknown): text is string {
  return typeof text === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(text)
    && !Number.isNaN(Date.parse(text)) && new Date(text).toISOString() === text;
}
function canonical(snapshot: WorkspaceSnapshotV1): string {
  return JSON.stringify(validateWorkspaceSnapshot(snapshot));
}
async function hash(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const sha = await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(sha),b => b.toString(16).padStart(2,'0')).join('');
}
function preview(snapshot: WorkspaceSnapshotV1, exportedAt: string): WorkspaceBackupPreviewV2 {
  return {
    exportedAt, workspaceRevision: snapshot.workspaceRevision,
    notebookCount: snapshot.editions.length,
    placementCount: snapshot.editions.reduce((n,entry)=>n+entry.edition.placements.length,0),
    historyCount: snapshot.history.length,
    corpusTextCount: snapshot.corpus?.corpus.texts.length ?? 0,
  };
}

/** El workspace se lee en una sola transacción y el banco histórico se incorpora a la copia portátil. */
export async function createWorkspaceBackup(workspace: WorkspaceRepository, at = new Date(),
  historical?:CorpusV1): Promise<string> {
  const current=await workspace.snapshot();
  const snapshot=validateWorkspaceSnapshot(historical?{
    ...current,workspaceRevision:Math.max(current.workspaceRevision,1),
    corpus:{revision:current.corpus?.revision??1,corpus:combineNotebookCorpora(current.corpus?.corpus??emptyCorpus(),historical)},
  }:current);
  const exportedAt = at.toISOString();
  const sha256 = await hash(canonical(snapshot));
  const json = JSON.stringify({
    format:WORKSPACE_BACKUP_FORMAT,backupVersion:WORKSPACE_BACKUP_VERSION,
    exportedAt,sha256,snapshot,
  },null,2);
  if (new Blob([json]).size > WORKSPACE_BACKUP_MAX_CHARACTERS) {
    throw new WorkspaceBackupError('La copia editorial supera 64 MiB. No se ha creado una copia parcial.');
  }
  return json;
}

/** Importar nunca escribe por sí solo: primero se valida forma, versión y SHA-256. */
export async function readWorkspaceBackup(json: string): Promise<WorkspaceBackupVerifiedV2> {
  if (json.length > WORKSPACE_BACKUP_MAX_CHARACTERS
    || new Blob([json]).size > WORKSPACE_BACKUP_MAX_CHARACTERS) {
    throw new WorkspaceBackupError('Archivo demasiado grande para la versión editorial 2.');
  }
  let raw: unknown;
  try{raw=JSON.parse(json) as unknown;}catch{throw new WorkspaceBackupError('JSON editorial ilegible.');}
  if(!raw || typeof raw!=='object' || Array.isArray(raw)){
    throw new WorkspaceBackupError('La copia debe ser un objeto JSON.');
  }
  const r=raw as Record<string,unknown>;
  if(r.format!==WORKSPACE_BACKUP_FORMAT || r.backupVersion!==WORKSPACE_BACKUP_VERSION){
    throw new WorkspaceBackupError('No es una copia workspace v2 compatible. Las v1 se importan como legado.');
  }
  if(Object.keys(r).sort().join('|')!==['format','backupVersion','exportedAt','sha256','snapshot'].sort().join('|')){
    throw new WorkspaceBackupError('Formato de archivo editorial incompleto o desconocido.');
  }
  if(!utc(r.exportedAt) || typeof r.sha256!=='string'|| !/^[0-9a-f]{64}$/.test(r.sha256)){
    throw new WorkspaceBackupError('Fecha o huella de copia editorial inválida.');
  }
  const snapshot=validateWorkspaceSnapshot(r.snapshot);
  if(await hash(canonical(snapshot))!==r.sha256){
    throw new WorkspaceBackupError('La copia ha cambiado o está corrupta (SHA-256 diferente).');
  }
  return {snapshot,preview:preview(snapshot,r.exportedAt)};
}

/** Vista previa de la restauración y copia de seguridad del estado que se sustituiría. */
export async function prepareWorkspaceRestore(workspace: WorkspaceRepository, json: string,
  at = new Date()): Promise<WorkspaceRestorePreviewV2> {
  const target=await readWorkspaceBackup(json);
  const safe=await createWorkspaceBackup(workspace,at);
  // La lectura de seguridad puede diferir de la primera si otra pestaña guardó entretanto.
  const verifiedSafety=await readWorkspaceBackup(safe);
  return {
    target:target.preview, current:verifiedSafety.preview,
    currentSafetyBackupJson:safe,
    expectedWorkspaceRevision:verifiedSafety.snapshot.workspaceRevision,
  };
}

/**
 * Restauración atómica con doble confirmación. El caller DEBE ofrecer y guardar
 * primero la copia de seguridad actual. No se toca jamás IndexedDB histórica.
 */
export async function restoreWorkspaceBackup(workspace:WorkspaceRepository,json:string,
  approval:WorkspaceRestoreApprovalV2):Promise<WorkspaceSnapshotV1> {
  if(!approval.confirmReplace||!approval.safetyBackupExported){
    throw new WorkspaceBackupError('Falta confirmar la sustitución y la copia de seguridad del estado actual.');
  }
  const target=await readWorkspaceBackup(json);
  const safety=await readWorkspaceBackup(approval.currentSafetyBackupJson);
  const current=await workspace.snapshot();
  if(current.workspaceRevision!==approval.expectedWorkspaceRevision){
    throw new WorkspaceConflictError(approval.expectedWorkspaceRevision,current.workspaceRevision);
  }
  if(canonical(safety.snapshot)!==canonical(current)){
    throw new WorkspaceBackupError('La copia de seguridad previa no coincide con el workspace actual.');
  }
  await workspace.replaceFromVerifiedSnapshot(target.snapshot,approval.expectedWorkspaceRevision,true);
  const restored=await workspace.snapshot();
  const expected=validateWorkspaceSnapshot({...target.snapshot,
    workspaceRevision:Math.max(approval.expectedWorkspaceRevision,target.snapshot.workspaceRevision)+1});
  if(canonical(restored)!==canonical(expected)){
    throw new WorkspaceBackupError('La restauración se escribió pero no coincide tras la verificación. Conserva la copia previa.');
  }
  return restored;
}


const NOTEBOOK_BACKUP_FORMAT = 'cuaderno-textos-latinos-notebook';

/** La copia restaurada amplía el banco del dispositivo respetando sus entradas históricas. */
export function combineNotebookCorpora(editorial:CorpusV1,historical:CorpusV1):CorpusV1{
  // Las versiones retenidas son necesarias para los cuadernos históricos.
  // No basta con combinar texts: retainedTexts apunta a textRevisions.
  const revisions=new Map<string,NonNullable<CorpusV1['textRevisions']>[number]>();
  for(const revision of [...(editorial.textRevisions??[]),...(historical.textRevisions??[])]){
    const existing=revisions.get(revision.id);
    if(existing&&JSON.stringify(existing.text)!==JSON.stringify(revision.text))
      throw new WorkspaceBackupError('Colisión de versiones conservadas: '+revision.id);
    revisions.set(revision.id,revision);
  }
  return {
    schemaVersion:historical.schemaVersion,
    texts:[...new Map([...editorial.texts,...historical.texts].map(text=>[text.id,text])).values()],
    tags:[...new Map([...editorial.tags,...historical.tags].map(tag=>[tag.id,tag])).values()],
    notebooks:[...new Map([...editorial.notebooks,...historical.notebooks].map(book=>[book.id,book])).values()],
    ...(revisions.size?{textRevisions:[...revisions.values()]}:{}),
  };
}

function dependencySubset(edition:NotebookEditionV1, corpus:CorpusV1):CorpusV1 {
  const sourceIds=new Set(edition.placements.flatMap(p=>p.source.kind==='corpus'&&p.source.sourceId
    ?[p.source.sourceId]:[]));
  const texts=corpus.texts.filter(text=>sourceIds.has(text.id));
  const catalogue=new Map(allGrammarTags(corpus).map(tag=>[tag.id,tag]));
  const tags=new Map<string,GrammarTag>();
  function include(id:string):void {
    if(tags.has(id))return;
    const tag=catalogue.get(id);
    if(!tag)throw new WorkspaceBackupError('Falta la definición de la etiqueta '+id+'.');
    tags.set(id,tag);
    if(tag.parentId)include(tag.parentId);
  }
  for(const text of texts)for(const id of text.tagIds)include(id);
  for(const placement of edition.placements){
    for(const id of placement.grammaticalTagIds)include(id);
    for(const span of placement.grammaticalSpans??[]){
      for(const id of span.tagIds)include(id);
      for(const evidence of span.evidence??[])include(evidence.tagId);
    }
    for(const decision of placement.grammarReview??[])
      if(decision.kind==='rejected')include(decision.tagId);
  }
  return validateCorpus({...emptyCorpus(),texts,tags:[...tags.values()]});
}

export async function createNotebookBackup(edition: NotebookEditionV1, corpus?:CorpusV1): Promise<string> {
  const valid = validateEdition(edition);
  const payload = corpus ? {edition:valid, dependencies:dependencySubset(valid,corpus)} : valid;
  const json = JSON.stringify({
    format: NOTEBOOK_BACKUP_FORMAT, backupVersion: corpus ? 2 : 1,
    sha256: await hash(JSON.stringify(payload)), payload,
  });
  if (new Blob([json]).size > WORKSPACE_BACKUP_MAX_CHARACTERS) {
    throw new WorkspaceBackupError('La copia del cuaderno supera 64 MiB.');
  }
  return json;
}

type NotebookBackup = {edition:NotebookEditionV1; fingerprint:string; dependencies?:CorpusV1};

export async function readNotebookBackup(json: string): Promise<NotebookBackup | null> {
  if (new Blob([json]).size > WORKSPACE_BACKUP_MAX_CHARACTERS) {
    throw new WorkspaceBackupError('La copia supera 64 MiB.');
  }
  const envelope = JSON.parse(json);
  if (envelope?.format !== NOTEBOOK_BACKUP_FORMAT) return null;
  if (envelope.backupVersion !== 1 && envelope.backupVersion !== 2) {
    throw new WorkspaceBackupError('Versión de la copia del cuaderno incompatible.');
  }
  const version2=envelope.backupVersion===2;
  const edition=validateEdition(version2?envelope.payload?.edition:envelope.payload);
  const dependencies=version2?validateCorpus(envelope.payload?.dependencies):undefined;
  const payload=dependencies?{edition,dependencies}:edition;
  const fingerprint=await hash(JSON.stringify(payload));
  if(fingerprint!==envelope.sha256)throw new WorkspaceBackupError('Versión o huella de la copia del cuaderno inválida.');
  if(dependencies&&JSON.stringify(dependencySubset(edition,dependencies))!==JSON.stringify(dependencies))
    throw new WorkspaceBackupError('La copia contiene dependencias ajenas al cuaderno.');
  return {edition,fingerprint,...(dependencies?{dependencies}:{})};
}

/** Integra las dependencias en el corpus editorial y conserva el banco histórico. */
export function importNotebookDependencies(edition:NotebookEditionV1, dependencies:CorpusV1,
  local:CorpusV1, historical:CorpusV1):{edition:NotebookEditionV1;corpus:CorpusV1}{
  const corpus=structuredClone(local);
  const localTags=new Map(local.tags.map(t=>[t.id,t]));
  const historicalTags=new Map(historical.tags.map(t=>[t.id,t]));
  const catalogueTags=new Map(GRAMMAR_CATALOGUE.map(t=>[t.id,t]));
  const knownTags=new Map([...local.tags,...historical.tags,...GRAMMAR_CATALOGUE].map(t=>[t.id,t]));
  const localTexts=new Map(local.texts.map(t=>[t.id,t]));
  const historicalTexts=new Map(historical.texts.map(t=>[t.id,t]));
  const incomingTags=new Map(dependencies.tags.map(tag=>[tag.id,tag]));
  const tagIds=new Map<string,string>();
  function resolveTag(id:string):string{
    const mapped=tagIds.get(id);
    if(mapped)return mapped;
    const tag=incomingTags.get(id);
    if(!tag)return id;
    const item={...tag,parentId:tag.parentId?resolveTag(tag.parentId):null};
    // No dejar que la precedencia del banco histórico o del catálogo oculte
    // un ID ocupado por una definición distinta en el corpus editorial.
    const conflicts=[localTags.get(id),historicalTags.get(id),catalogueTags.get(id)]
      .some(existing=>existing&&JSON.stringify(existing)!==JSON.stringify(item));
    if(conflicts){
      if(item.kind==='catalogue')throw new WorkspaceBackupError('Definición de catálogo incompatible: '+id);
      do{item.id='custom.'+crypto.randomUUID();}while(knownTags.has(item.id));
    }
    if(!knownTags.has(item.id)){
      corpus.tags.push(item);
      knownTags.set(item.id,item);
    }else if(!corpus.tags.some(t=>t.id===item.id)){
      // Los textos editoriales necesitan sus definiciones dentro de su propio corpus.
      corpus.tags.push(item);
    }
    tagIds.set(id,item.id);
    return item.id;
  }
  for(const {id} of dependencies.tags)resolveTag(id);
  const sourceIds=new Map<string,string>();
  for(const text of dependencies.texts){
    const item={...text,tagIds:text.tagIds.map(resolveTag)};
    // Un texto con el mismo ID puede ser diferente en cualquiera de las
    // dos bibliotecas. Comparar solo el último Map ocultaba colisiones locales.
    const conflicts=[localTexts.get(text.id),historicalTexts.get(text.id)]
      .some(existing=>existing&&JSON.stringify(existing)!==JSON.stringify(item));
    if(conflicts){
      do{item.id='doc.'+crypto.randomUUID();}
      while(localTexts.has(item.id)||historicalTexts.has(item.id)||corpus.texts.some(t=>t.id===item.id));
    }
    if(!corpus.texts.some(t=>t.id===item.id))corpus.texts.push(item);
    sourceIds.set(text.id,item.id);
  }
  return {corpus,edition:{...edition,placements:edition.placements.map(p=>({
    ...p,
    source:{...p.source,sourceId:p.source.kind==='corpus'&&p.source.sourceId
      ?sourceIds.get(p.source.sourceId)??p.source.sourceId:p.source.sourceId},
    grammaticalTagIds:p.grammaticalTagIds.map(resolveTag),
    ...(p.grammarReview?{grammarReview:p.grammarReview.map(decision=>decision.kind==='rejected'
      ?{...decision,tagId:resolveTag(decision.tagId)}:decision)}:{}),
    ...(p.grammaticalSpans?{grammaticalSpans:p.grammaticalSpans.map(span=>({
      ...span,tagIds:span.tagIds.map(resolveTag),
      ...(span.evidence?{evidence:span.evidence.map(item=>({...item,tagId:resolveTag(item.tagId)}))}:{}),
    }))}:{}),
  }))}};
}
