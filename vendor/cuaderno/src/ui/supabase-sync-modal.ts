import {WorkspaceRepository} from '../storage/workspace-repository.js';
import {IndexedDbCorpusRepository} from '../storage/indexeddb-corpus-repository.js';
import {createWorkspaceBackup,readWorkspaceBackup} from '../storage/workspace-backup.js';
import {SupabaseWorkspaceTransport,compareWorkspaceHashes,workspaceHash,validateConnection,
  type SyncConnection,type SyncLogin,type CloudWorkspace} from '../storage/supabase-workspace-client.js';
import type {WorkspaceSnapshotV1} from '../storage/workspace-repository.js';

interface Dependencies {
  workspace:WorkspaceRepository;
  historical:IndexedDbCorpusRepository;
  flush:()=>Promise<boolean>;
  refreshed:()=>Promise<void>;
  modal:(title:string,body:HTMLElement,actions:{label:string}[],
    options?:{width?:string;noFocus?:boolean})=>unknown;
  download:(json:string,name:string)=>void;
}
const SETTINGS='cuaderno-supabase-connection-v1';
function connectionStored():SyncConnection|null{
  try{
    const data=localStorage.getItem(SETTINGS);
    return data?validateConnection(JSON.parse(data) as SyncConnection):null;
  }catch{return null;}
}
function checkpointKey(config:SyncConnection,userId:string):string{
  return 'cuaderno-sync-ack-v1:'+new URL(config.url).host+':'+userId;
}
function checkpoint(key:string):{hash:string;revision:number}|null{
  try{
    const x=JSON.parse(localStorage.getItem(key)??'null') as {hash?:unknown;revision?:unknown}|null;
    if(x&&typeof x.hash==='string'&&/^[0-9a-f]{64}$/.test(x.hash)&&
      typeof x.revision==='number'&&Number.isSafeInteger(x.revision)&&x.revision>0)
      return {hash:x.hash,revision:x.revision};
  }catch{/* First connection */}
  return null;
}
function element<K extends keyof HTMLElementTagNameMap>(tag:K,text=''):HTMLElementTagNameMap[K]{
  const x=document.createElement(tag);x.textContent=text;return x;
}
async function snapshot(deps:Dependencies):Promise<{value:WorkspaceSnapshotV1;hash:string|null}>{
  const json=await createWorkspaceBackup(deps.workspace,new Date(),(await deps.historical.load()).corpus);
  const verified=await readWorkspaceBackup(json);
  const value=verified.snapshot;
  const nonempty=value.editions.length>0||value.history.length>0||
    Boolean(value.corpus&&(
      value.corpus.corpus.texts.length||value.corpus.corpus.notebooks.length||
      value.corpus.corpus.tags.some(t=>t.kind==='custom')));
  return {value,hash:nonempty?await workspaceHash(value):null};
}
function toKey(config:SyncConnection,session:SyncLogin):string{
  return checkpointKey(config,session.userId);
}

/**
 * Never starts synchronization on page load. Credentials are ephemeral;
 * the only persisted config is the public project URL and publishable key.
 */
export function openSupabaseSyncModal(deps:Dependencies):void{
  const body=element('div');body.className='cuaderno-sync-panel';
  body.append(element('p','Solo se sincroniza después de revisar los cambios. '+
    'Puedes trabajar sin conexión; la contraseña no se guarda.'));
  const saved=connectionStored();
  const input=(label:string,value:string,type='text'):HTMLInputElement=>{
    const wrap=element('label');wrap.className='field';
    wrap.append(element('span',label));
    const field=element('input');field.type=type;field.value=value;field.setAttribute('aria-label',label);
    wrap.append(field);body.append(wrap);return field;
  };
  const url=input('URL Supabase',saved?.url??'','url');
  const key=input('Clave publicable',saved?.publishableKey??'');
  const email=input('Correo docente','','email');
  const password=input('Contraseña','','password');
  password.autocomplete='current-password';
  const status=element('p','Sin conectar');status.className='small muted';
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const actions=element('div');actions.className='cuaderno-home-actions';
  const controls=element('div');controls.className='cuaderno-home-actions';
  body.append(actions,status,controls);
  let client:SupabaseWorkspaceTransport|null=null;
  let user:SyncLogin|null=null;
  let examined:{local:WorkspaceSnapshotV1;localHash:string|null;
    remote:CloudWorkspace|null;remoteHash:string|null}|null=null;
  const fail=(error:unknown):void=>{
    status.textContent=error instanceof Error?error.message:String(error);
    status.classList.add('sync-error');
  };
  const note=(message:string):void=>{status.textContent=message;status.classList.remove('sync-error');};
  const invoke=(fn:()=>Promise<void>)=>{void fn().catch(fail);};
  const action=(label:string,fn:()=>Promise<void>):HTMLButtonElement=>{
    const button=element('button',label);
    button.type='button';button.className='hbtn';
    button.addEventListener('click',()=>invoke(fn));
    return button;
  };
  const ensure=():{client:SupabaseWorkspaceTransport;user:SyncLogin}=>{
    if(!client||!user)throw Error('Inicia sesión primero.');
    return {client,user};
  };
  const ack=async(remote:CloudWorkspace,hash:string):Promise<void>=>{
    const {client,user}=ensure();
    localStorage.setItem(toKey(client.config,user),
      JSON.stringify({hash,revision:remote.revision}));
  };
  const render=():void=>{
    controls.replaceChildren();
    if(!user)return;
    controls.append(action('Comprobar cambios',async()=>{
      const {client,user}=ensure();
      if(!await deps.flush())throw Error('Guarda los cambios del editor antes de sincronizar.');
      const local=await snapshot(deps),remote=await client.read(user);
      const remoteHash=remote?await workspaceHash(remote.snapshot):null;
      examined={local:local.value,localHash:local.hash,remote,remoteHash};
      render();
    }));
    if(!examined)return;
    const {client,user:cloudUser}=ensure();
    const last=checkpoint(toKey(client.config,cloudUser));
    const decision=compareWorkspaceHashes(examined.localHash,examined.remoteHash,last?.hash??null);
    const counts=(data:WorkspaceSnapshotV1)=>data.editions.length+' cuadernos y '+
      (data.corpus?.corpus.texts.length??0)+' textos';
    note('Local: '+counts(examined.local)+' · Nube: '+
      (examined.remote?counts(examined.remote.snapshot):'vacía')+' · '+
      ({empty:'No hay cambios',equal:'Copias coincidentes',upload:'Subida disponible',
        download:'Descarga disponible',conflict:'Conflicto: hay dos versiones distintas'}[decision]));
    if(decision==='conflict'){
      controls.append(element('p','No se sobrescribirá ninguna versión. '+
        'Conserva ambas copias JSON antes de resolver la diferencia.'));
      return;
    }
    if(decision==='equal'&&examined.remote&&examined.localHash){
      controls.append(action('Confirmar coincidencia',async()=>{
        const l=await snapshot(deps),r=await client.read(cloudUser);
        const h=r?await workspaceHash(r.snapshot):null;
        if(!r||!h||l.hash!==h||h!==examined?.localHash)
          throw Error('Los datos han cambiado. Comprueba nuevamente.');
        await ack(r,h);note('Copias coincidentes y verificadas.');examined=null;render();
      }));
    }
    if(decision==='upload'){
      controls.append(action('Guardar copia y subir',async()=>{
        if(!examined)throw Error('Comprueba los datos nuevamente.');
        const current=examined,l=await snapshot(deps),r=await client.read(cloudUser);
        if(l.hash!==current.localHash||(r?.revision??0)!==(current.remote?.revision??0))
          throw Error('Un dispositivo cambió los datos. Comprueba nuevamente.');
        if(!confirm('Se descargará una copia JSON de seguridad y se enviarán '+
          'los cuadernos actuales a Supabase. ¿Confirmas?'))return;
        deps.download(await createWorkspaceBackup(deps.workspace,new Date(),
          (await deps.historical.load()).corpus),'seguridad-previa-supabase');
        const saved=await client.write(cloudUser,l.value,r?.revision??0);
        const hash=await workspaceHash(saved.snapshot);
        if(hash!==l.hash)throw Error('La copia remota no coincide con la enviada.');
        await ack(saved,hash);note('Subida confirmada. Revisión '+saved.revision+'.');
        examined=null;render();
      }));
    }
    if(decision==='download'){
      controls.append(action('Guardar copia y descargar',async()=>{
        if(!examined)throw Error('Comprueba los datos nuevamente.');
        const current=examined,l=await snapshot(deps),r=await client.read(cloudUser);
        const h=r?await workspaceHash(r.snapshot):null;
        if(l.hash!==current.localHash||!r||h!==current.remoteHash||
          r.revision!==current.remote?.revision)
          throw Error('Los datos han cambiado. Comprueba nuevamente.');
        deps.download(await createWorkspaceBackup(deps.workspace,new Date(),
          (await deps.historical.load()).corpus),'seguridad-antes-de-descarga');
        if(!confirm('Se ha generado una copia JSON de seguridad. '+
          '¿Confirmas reemplazar los datos de este dispositivo por la copia verificada de Supabase?'))return;
        if(!await deps.flush())throw Error('No se han guardado los cambios pendientes.');
        const revision=(await deps.workspace.snapshot()).workspaceRevision;
        await deps.workspace.replaceFromVerifiedSnapshot(r.snapshot,revision,true);
        const restored=await snapshot(deps);
        if(restored.hash!==h)throw Error('La restauración no coincide con la copia de Supabase.');
        await ack(r,h!);
        await deps.refreshed();
        note('Descarga confirmada. Revisión '+r.revision+'.');
        examined=null;render();
      }));
    }
  };
  actions.append(action('Iniciar sesión',async()=>{
    client=new SupabaseWorkspaceTransport({url:url.value,publishableKey:key.value});
    user=await client.login(email.value,password.value);
    password.value='';
    localStorage.setItem(SETTINGS,JSON.stringify(client.config));
    examined=null;note('Conectado. Comprueba los cambios antes de sincronizar.');
    render();
  }));
  actions.append(action('Cerrar sesión',async()=>{
    client=null;user=null;examined=null;password.value='';
    note('Sesión cerrada. Los datos locales permanecen intactos.');render();
  }));
  render();
  deps.modal('Sincronización privada · Supabase',body,[{label:'Cerrar'}],
    {width:'min(760px,96vw)',noFocus:true});
}
