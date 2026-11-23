import {validateWorkspaceSnapshot,type WorkspaceSnapshotV1} from './workspace-repository.js';

/** The publishable key is public by design. Never supply a service-role or secret key. */
export interface SyncConnection {
  url:string;
  publishableKey:string;
}
export interface SyncLogin {
  accessToken:string;
  userId:string;
}
export interface CloudWorkspace {
  revision:number;
  snapshot:WorkspaceSnapshotV1;
}
export class SyncCloudError extends Error {
  constructor(message:string,readonly status:number=0){super(message);this.name='SyncCloudError';}
}

function safeBaseUrl(value:string):string{
  const url=new URL(value.trim());
  if(url.protocol!=='https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)
    || url.username || url.password || url.pathname!=='/' || url.search || url.hash)
    throw new SyncCloudError('Utiliza la URL HTTPS de un proyecto Supabase, sin rutas adicionales.');
  return url.origin;
}
function goodKey(value:string):string{
  const key=value.trim();
  if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))
    throw new SyncCloudError('Utiliza una clave publicable sb_publishable_, nunca una clave secreta.');
  return key;
}
function requestHeaders(key:string,token?:string):Record<string,string>{
  return {'apikey':key,'Content-Type':'application/json',
    ...(token?{'Authorization':'Bearer '+token}:{})};
}
async function checkedResponse(response:Response):Promise<unknown>{
  let data:unknown;
  try {data=await response.json();}
  catch{throw new SyncCloudError('Supabase devolvió una respuesta no válida.',response.status);}
  if(!response.ok){
    const detail=data&&typeof data==='object'&&'message' in data
      ?String((data as {message:unknown}).message):'Error de comunicación';
    throw new SyncCloudError('Supabase: '+detail.slice(0,250),response.status);
  }
  return data;
}
function row(value:unknown):CloudWorkspace{
  if(!value||typeof value!=='object'||Array.isArray(value))
    throw new SyncCloudError('Registro remoto no válido.');
  const r=value as Record<string,unknown>;
  if(!Number.isSafeInteger(r.revision)||typeof r.revision!=='number'||r.revision<1)
    throw new SyncCloudError('Revisión remota incorrecta.');
  return {revision:r.revision,snapshot:validateWorkspaceSnapshot(r.payload)};
}
export function validateConnection(input:SyncConnection):SyncConnection{
  return {url:safeBaseUrl(input.url),publishableKey:goodKey(input.publishableKey)};
}

export class SupabaseWorkspaceTransport {
  readonly config:SyncConnection;
  constructor(input:SyncConnection,readonly http:typeof fetch=fetch){
    this.config=validateConnection(input);
  }
  async login(email:string,password:string):Promise<SyncLogin>{
    if(!email.trim()||!password)throw new SyncCloudError('Introduce tu correo y contraseña.');
    const response=await this.http(this.config.url+'/auth/v1/token?grant_type=password',{
      method:'POST',headers:requestHeaders(this.config.publishableKey),
      body:JSON.stringify({email:email.trim(),password}),
    });
    const result=await checkedResponse(response);
    if(!result||typeof result!=='object')throw new SyncCloudError('Inicio de sesión inesperado.');
    const value=result as Record<string,unknown>;
    const user=value.user as Record<string,unknown>|undefined;
    if(typeof value.access_token!=='string'||typeof user?.id!=='string'||
      !/^[0-9a-f-]{36}$/i.test(user.id))
      throw new SyncCloudError('Supabase no confirmó la sesión docente.');
    return {accessToken:value.access_token,userId:user.id};
  }
  private url(login:SyncLogin,expected?:number):string{
    const ref=new URL(this.config.url+'/rest/v1/cuaderno_sync_workspaces');
    ref.searchParams.set('owner_id','eq.'+login.userId);
    if(expected!==undefined)ref.searchParams.set('revision','eq.'+expected);
    ref.searchParams.set('select','revision,payload');
    return ref.toString();
  }
  async read(login:SyncLogin):Promise<CloudWorkspace|null>{
    const response=await this.http(this.url(login),{
      method:'GET',headers:requestHeaders(this.config.publishableKey,login.accessToken),
    });
    const result=await checkedResponse(response);
    if(!Array.isArray(result)||result.length>1)
      throw new SyncCloudError('Se esperaba una única copia privada de tu espacio de trabajo.');
    return result.length?row(result[0]):null;
  }
  /**
   * Optimistic concurrency: PostgreSQL UPDATE matches owner + old revision;
   * no updated rows means another device has written. Initial INSERT is
   * guarded by the unique PK, so concurrent first uploads cannot replace data.
   */
  async write(login:SyncLogin,snapshot:WorkspaceSnapshotV1,expectedRevision:number):Promise<CloudWorkspace>{
    if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)
      throw new SyncCloudError('Revisión esperada inválida.');
    const safe=validateWorkspaceSnapshot(snapshot);
    const raw=JSON.stringify(safe);
    if(new TextEncoder().encode(raw).byteLength>12_000_000)
      throw new SyncCloudError('La copia supera los 12 MB de la fase inicial de sincronización.');
    const initial=expectedRevision===0;
    const request=initial?this.config.url+'/rest/v1/cuaderno_sync_workspaces?select=revision,payload'
      :this.url(login,expectedRevision);
    let result:unknown;
    try {
      const response=await this.http(request,{
        method:initial?'POST':'PATCH',
        headers:{...requestHeaders(this.config.publishableKey,login.accessToken),
          Prefer:'return=representation'},
        body:JSON.stringify({
          ...(initial?{owner_id:login.userId}:{}),
          revision:expectedRevision+1,payload:safe,
        }),
      });
      result=await checkedResponse(response);
    }catch(error){
      if(error instanceof SyncCloudError&&(error.status===409||error.status===412))
        throw new SyncCloudError('Otro dispositivo ha cambiado la copia. Actualiza antes de sincronizar.',409);
      throw error;
    }
    if(!Array.isArray(result)||result.length!==1)
      throw new SyncCloudError('Conflicto: otra revisión cambió mientras se guardaba. No se reemplazó.',409);
    const written=row(result[0]);
    if(written.revision!==expectedRevision+1)
      throw new SyncCloudError('Supabase no confirmó la nueva revisión.');
    return written;
  }
}

/** JSONB may reorder object keys; sync hashes must be independent of key insertion order. */
function stableJson(value:unknown):string{
  if(value===null||typeof value!=='object')return JSON.stringify(value)??'null';
  if(Array.isArray(value))return '['+value.map(stableJson).join(',')+']';
  const record=value as Record<string,unknown>;
  return '{'+Object.keys(record).sort().filter(k=>record[k]!==undefined)
    .map(k=>JSON.stringify(k)+':'+stableJson(record[k])).join(',')+'}';
}

/** Excludes the local-only workspace epoch, which changes on a safe restore. */
export async function workspaceHash(snapshot:WorkspaceSnapshotV1):Promise<string>{
  const valid=validateWorkspaceSnapshot(snapshot);
  const canonical=stableJson({...valid,workspaceRevision:0});
  const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical));
  return [...new Uint8Array(data)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export type SyncDecision='upload'|'download'|'equal'|'conflict'|'empty';
/** Never resolve an ambiguous first connection by overwriting either device. */
export function compareWorkspaceHashes(localHash:string|null,remoteHash:string|null,
  acknowledgedHash:string|null):SyncDecision{
  if(localHash===null&&remoteHash===null)return 'empty';
  if(localHash===remoteHash)return 'equal';
  if(acknowledgedHash===null){
    if(localHash===null)return 'download';
    if(remoteHash===null)return 'upload';
    return 'conflict';
  }
  if(localHash===acknowledgedHash)return remoteHash===null?'conflict':'download';
  if(remoteHash===acknowledgedHash)return localHash===null?'conflict':'upload';
  return 'conflict';
}
