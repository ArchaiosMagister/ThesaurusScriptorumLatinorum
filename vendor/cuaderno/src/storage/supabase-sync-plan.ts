import type {CorpusV1} from '../core/model.js';
import type {NotebookEditionV1, OperationEventV1} from '../core/edition-model.js';
import {validateCorpus} from '../core/validation.js';
import {validateEdition} from '../core/edition-validation.js';
import type {WorkspaceSnapshotV1} from './workspace-repository.js';

export type SyncKind='corpus'|'edition'|'history';
export interface SyncDocument {
  kind:SyncKind;
  id:string;
  /** The entire validated payload, including annotations, vocabulary and cover. */
  payload:CorpusV1|NotebookEditionV1|OperationEventV1[];
}
export interface RemoteSyncDocument extends SyncDocument {
  /** Server-assigned optimistic-lock version; never the local IndexedDB revision. */
  remoteRevision:number;
}
export interface SyncCheckpoint {
  kind:SyncKind;
  id:string;
  /** Payload last explicitly acknowledged by both ends. */
  acknowledgedJson:string;
  remoteRevision:number;
}
export interface SyncAction {
  kind:SyncKind;
  id:string;
  direction:'upload'|'download'|'unchanged'|'conflict';
  reason:string;
  local:SyncDocument|null;
  remote:RemoteSyncDocument|null;
  expectedRemoteRevision:number|null;
}

function key(kind:SyncKind,id:string):string{return kind+'\u0001'+id;}
function fingerprint(payload:SyncDocument['payload']):string{return JSON.stringify(payload);}

/** Produces independent records; never mutates IndexedDB or cloud storage. */
export function workspaceSyncDocuments(snapshot:WorkspaceSnapshotV1):SyncDocument[]{
  const output:SyncDocument[]=[];
  if(snapshot.corpus)output.push({kind:'corpus',id:'primary',
    payload:validateCorpus(snapshot.corpus.corpus)});
  for(const entry of snapshot.editions){
    const edition=validateEdition(entry.edition);
    output.push({kind:'edition',id:edition.id,payload:edition});
  }
  const grouped=new Map<string,OperationEventV1[]>();
  for(const event of snapshot.history){
    const list=grouped.get(event.editionId)??[];
    list.push(event);grouped.set(event.editionId,list);
  }
  for(const [id,history] of grouped){
    if(!snapshot.editions.some(e=>e.edition.id===id))
      throw Error('No se puede sincronizar historial sin cuaderno: '+id);
    output.push({kind:'history',id,payload:history.slice().sort((a,b)=>a.sequence-b.sequence)});
  }
  return output;
}
function unique<T extends {kind:SyncKind;id:string}>(items:readonly T[]):Map<string,T>{
  const map=new Map<string,T>();
  for(const item of items){
    if(!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$/.test(item.id))
      throw Error('ID de sincronización inválido');
    const k=key(item.kind,item.id);
    if(map.has(k))throw Error('Documento de sincronización duplicado: '+item.id);
    map.set(k,item);
  }
  return map;
}

/**
 * A three-way, non-destructive sync planner.
 *
 * Missing checkpoints are NEVER treated as permission to overwrite. A changed
 * document on both devices is always a conflict (no last-write-wins).
 * Missing documents after an earlier checkpoint are also conflicts: deletion
 * must be resolved explicitly by the user. The caller must display and approve
 * each upload/download and preserve a local backup before applying.
 */
export function planWorkspaceSync(
  local:readonly SyncDocument[],
  remote:readonly RemoteSyncDocument[],
  checkpoints:readonly SyncCheckpoint[],
):SyncAction[]{
  const l=unique(local),r=unique(remote),b=unique(checkpoints);
  const keys=new Set([...l.keys(),...r.keys(),...b.keys()]);
  const result:SyncAction[]=[];
  for(const k of [...keys].sort()){
    const left=l.get(k)??null,right=r.get(k)??null,base=b.get(k);
    const record=left??right??base!;
    if(right&&(!Number.isSafeInteger(right.remoteRevision)||right.remoteRevision<1))
      throw Error('Revisión remota inválida');
    if(base&&(!Number.isSafeInteger(base.remoteRevision)||base.remoteRevision<1))
      throw Error('Checkpoint inválido');
    const localJson=left?fingerprint(left.payload):null;
    const remoteJson=right?fingerprint(right.payload):null;
    let direction:SyncAction['direction'];
    let reason:string;
    if(!base){
      if(left&&right){
        direction=localJson===remoteJson?'unchanged':'conflict';
        reason=direction==='unchanged'?'Los datos iniciales coinciden':'Dos documentos iniciales diferentes: revisión manual';
      }else if(left){
        direction='upload';reason='Nuevo documento local: requiere autorización de primera subida';
      }else{
        direction='download';reason='Documento remoto desconocido: requiere autorización de incorporación';
      }
    }else if(!left||!right){
      direction='conflict';reason='Documento ausente en un dispositivo; no se supone que esté borrado';
    }else{
      const localChanged=localJson!==base.acknowledgedJson;
      const remoteChanged=remoteJson!==base.acknowledgedJson;
      if(localChanged&&remoteChanged){
        direction=localJson===remoteJson?'unchanged':'conflict';
        reason=direction==='unchanged'?'Ambos extremos coinciden':'Cambios simultáneos en dos dispositivos';
      }else if(localChanged){
        direction='upload';reason='Solo la copia local cambió';
      }else if(remoteChanged){
        direction='download';reason='Solo la copia remota cambió';
      }else{
        direction='unchanged';reason='Sin modificaciones';
      }
    }
    result.push({
      kind:record.kind,id:record.id,direction,reason,local:left,remote:right,
      expectedRemoteRevision:right?.remoteRevision??null,
    });
  }
  return result;
}
/** Persist checkpoints only AFTER a confirmed cloud CAS and local commit. */
export function acknowledgedCheckpoint(document:RemoteSyncDocument):SyncCheckpoint{
  return {kind:document.kind,id:document.id,
    acknowledgedJson:fingerprint(document.payload),
    remoteRevision:document.remoteRevision};
}
