/** Caché independiente de Perseus: nunca toca cuadernos, corpus ni historial. */
import type {LibraryWork} from '../core/library.js';

export const EXAMINATOR_LIBRARY_DB='cuaderno-textos-latinos-biblioteca-examinator2';
const STORE='works';
export class DownloadedWorksRepository {
  constructor(private readonly name=EXAMINATOR_LIBRARY_DB,
    private readonly factory:IDBFactory|undefined=globalThis.indexedDB){}
  private async open():Promise<IDBDatabase>{
    if(!this.factory)throw new Error('El navegador no admite almacenamiento offline.');
    return new Promise((resolve,reject)=>{
      const q=this.factory!.open(this.name,1);
      q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))
        q.result.createObjectStore(STORE,{keyPath:'urn'});};
      q.onerror=()=>reject(q.error??new Error('No se puede abrir el catálogo descargado.'));
      q.onblocked=()=>reject(new Error('Otra pestaña bloquea el catálogo.'));
      q.onsuccess=()=>{const db=q.result;db.onversionchange=()=>db.close();resolve(db);};
    });
  }
  private async action<T>(mode:IDBTransactionMode,
    run:(store:IDBObjectStore,resolve:(value:T)=>void,reject:(e:unknown)=>void)=>void):Promise<T>{
    const db=await this.open();
    return new Promise<T>((resolve,reject)=>{
      let value:T,ready=false;
      const tx=db.transaction(STORE,mode);
      tx.oncomplete=()=>{db.close();ready?resolve(value):reject(new Error('Operación sin resultado.'));};
      tx.onabort=()=>{db.close();reject(tx.error??new Error('Operación abortada.'));};
      tx.onerror=()=>{};
      try{run(tx.objectStore(STORE),v=>{value=v;ready=true;},
        e=>{try{tx.abort();}catch{ /* transacción terminada */ } reject(e);});}
      catch(e){try{tx.abort();}catch{}reject(e);}
    });
  }
  async get(urn:string):Promise<LibraryWork|null>{
    return this.action('readonly',(store,done,fail)=>{
      const q=store.get(urn);
      q.onsuccess=()=>{const w=q.result as LibraryWork|undefined;
        if(w&&(!Array.isArray(w.lines)||w.urn!==urn)){fail(new Error('Obra descargada inválida.'));return;}
        done(w??null);};
    });
  }
  async list():Promise<string[]>{
    return this.action('readonly',(store,done)=>{
      const q=store.getAllKeys();
      q.onsuccess=()=>done((q.result as IDBValidKey[]).filter(x=>typeof x==='string') as string[]);
    });
  }
  async save(work:LibraryWork):Promise<void>{
    if(!work.urn||!work.lines.length)throw new Error('No se puede guardar una obra vacía.');
    return this.action('readwrite',(store,done)=>{
      store.put(structuredClone(work));done(undefined);
    });
  }
  async remove(urn:string):Promise<void>{
    return this.action('readwrite',(store,done)=>{store.delete(urn);done(undefined);});
  }
}
