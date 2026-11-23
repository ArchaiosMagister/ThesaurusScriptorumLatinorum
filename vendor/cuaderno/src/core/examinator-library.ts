/**
 * Bibliografía de Examinator2: mismo orden de datos y mismo filtrado
 * (autor, título, título latino y género). Obras adicionales de Perseus.
 * El navegador solo descarga obras a petición del docente.
 */
import type {LibraryWork} from './library.js';
import {foldLatin} from './library.js';

export interface ExaminatorEntry{
  urn:string;path:string;author:string;title:string;genre:string;latin:string;description:string;
}
export interface ExaminatorCatalogue{
  version:number;source:string;baseUrl:string;entries:ExaminatorEntry[];
}
export function parseExaminatorCatalogue(input:unknown):ExaminatorCatalogue{
  const x=input as Partial<ExaminatorCatalogue>|null;
  if(!x||x.version!==1||!Array.isArray(x.entries)||typeof x.baseUrl!=='string')
    throw new Error('Catálogo original de Examinator2 no disponible.');
  const base=new URL(x.baseUrl);
  if(base.protocol!=='https:'||base.hostname!=='raw.githubusercontent.com'
    ||!base.pathname.startsWith('/PerseusDL/canonical-latinLit/'))
    throw new Error('Fuente Perseus no reconocida.');
  const entries=x.entries.map((entry,i)=>{
    if(!entry||typeof entry!=='object'||!Object.values(entry).every(v=>typeof v==='string')
      ||!entry.urn||!entry.path||!entry.author||!entry.title||!entry.genre||!entry.latin
      ||!/^[-a-zA-Z0-9._]+$/.test(entry.urn)||entry.path.includes('..')
      ||entry.path.startsWith('/')||entry.path.includes('?')||entry.path.includes('#'))
      throw new Error('Obra inválida de Examinator2: '+i);
    return {...entry};
  });
  if(!entries.length||new Set(entries.map(e=>e.urn)).size!==entries.length)
    throw new Error('Catálogo original vacío o con URN duplicadas.');
  return {version:1,source:String(x.source??''),baseUrl:base.href,entries};
}
export function originalWorkUrl(catalogue:ExaminatorCatalogue,entry:ExaminatorEntry):string{
  if(!catalogue.entries.some(x=>x.urn===entry.urn&&x.path===entry.path))
    throw new Error('Obra ajena al catálogo verificado.');
  return catalogue.baseUrl+entry.path;
}
export function searchExaminatorWorks<T extends Pick<ExaminatorEntry,'author'|'title'|'genre'|'latin'|'urn'>
  & {local?:{author:string;title:string;latin:string}}>(
  items:readonly T[],query:string,genre:string,onlyDownloaded:boolean,downloaded:ReadonlySet<string>,
):T[]{
  const term=foldLatin(query),collator=new Intl.Collator('es',{sensitivity:'base'});
  return items.filter(x=>(!onlyDownloaded||downloaded.has(x.urn))
    &&(!genre||x.genre===genre)
    &&(!term||foldLatin([x.author,x.title,x.latin,...(x.local?
      [x.local.author,x.local.title,x.local.latin]:[])].join(' ')).includes(term)))
    .sort((a,b)=>collator.compare(a.author,b.author)||collator.compare(a.title,b.title));
}
const excluded=new Set(['note','teiHeader','bibl','figure','figDesc','fw','app','rdg',
  'listBibl','castList','trailer','argument','interp','interpGrp','gapDesc']);
const clean=(s:string)=>s.replace(/\s+/gu,' ').trim();
/** Conversor TEI latino para navegador; no depende de fs, Node ni servicios de pago. */
export function convertPerseusXml(xml:string,entry:ExaminatorEntry,url:string):LibraryWork{
  if(xml.length>12_000_000)throw new Error('La obra supera el límite de tamaño permitido.');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.getElementsByTagName('parsererror').length)throw new Error('El XML TEI está mal formado.');
  const all=(name:string,root:ParentNode=doc):Element[]=>Array.from(root.querySelectorAll('*'))
    .filter(e=>e.localName===name);
  const body=all('body')[0];
  if(!body)throw new Error('La obra no tiene cuerpo de texto TEI.');
  const edition=all('div',body).find(e=>e.getAttribute('type')==='edition')??body;
  const ref=all('refsDecl')[0];
  const citationLevels=ref?all('cRefPattern',ref).map(e=>e.getAttribute('n')??'').filter(Boolean).reverse():[];
  const levelSet=new Set(citationLevels.map(x=>x.toLowerCase()));
  const lines:LibraryWork['lines']=[];
  let active:{c:string;t:string;k:string;s?:string}|null=null;
  let speaker='',section:string|null=null,verse=0;
  function flush(){
    if(active){const value=clean(active.t);
      if(value)lines.push({...active,t:value.normalize('NFC')});}
    active=null;
  }
  function open(k:string,path:string[],suffix=''){
    flush();
    const c=[...path,suffix].filter(Boolean).join('.')||String(lines.length+1);
    active={c,t:'',k,...(speaker?{s:speaker}:{})};
    speaker='';
  }
  function put(s:string,path:string[],kind='p'){
    if(!active)open(kind,path,section??'');
    if(active)active.t+=s;
  }
  function walk(node:Node,path:string[],inVerse:boolean){
    if(node.nodeType===Node.TEXT_NODE){
      if(node.textContent?.trim()||active)put(node.textContent??'',path,inVerse?'l':'p');
      return;
    }
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    const element=node as Element;
    const tag=element.localName;
    if(excluded.has(tag))return;
    const children=()=>Array.from(element.childNodes).forEach(child=>walk(child,path,inVerse));
    if(/^div\d*$/.test(tag)&&element!==edition){
      const n=element.getAttribute('n');
      const subtype=(element.getAttribute('subtype')??'').toLowerCase();
      if(n!==null||element.getAttribute('type')==='textpart'){
        flush();section=null;
        const next=n!==null&&(!subtype||!levelSet.size||levelSet.has(subtype))?[...path,n]:path;
        Array.from(element.childNodes).forEach(child=>walk(child,next,inVerse));
        flush();section=null;return;
      }
    }
    if(tag==='milestone'){
      if(element.getAttribute('unit')==='section'&&element.hasAttribute('n')){
        flush();section=element.getAttribute('n');
      }
      return;
    }
    if(tag==='speaker'){speaker=clean(element.textContent??'');return;}
    if(tag==='head'){open('h',path,'t');children();flush();return;}
    if(tag==='p'||tag==='ab'){flush();children();flush();return;}
    if(tag==='l'){
      const n=element.getAttribute('n')??String(++verse);
      open('l',path,n);
      Array.from(element.childNodes).forEach(child=>walk(child,path,true));
      flush();return;
    }
    if(tag==='lb'){put(' ',path);return;}
    if(tag==='pb'||tag==='cb')return;
    if(tag==='gap'){put(' … ',path);return;}
    if(tag==='choice'){
      for(const wanted of ['corr','reg','expan','lem']){
        const preferred=Array.from(element.children).find(x=>x.localName===wanted);
        if(preferred){walk(preferred,path,inVerse);return;}
      }
      const first=element.firstElementChild;
      if(first)walk(first,path,inVerse);return;
    }
    children();
  }
  Array.from(edition.childNodes).forEach(node=>walk(node,[],false));flush();
  if(!lines.length||lines.length>300_000)throw new Error('No se han obtenido pasajes del texto latino.');
  const levels=citationLevels.length?citationLevels:['parte','pasaje'];
  return {urn:entry.urn,author:entry.author,title:entry.title,latin:entry.latin,genre:entry.genre,
    levels,lines,source:url,license:'Consulta la licencia declarada en la edición de Perseus.',
    editorial:entry.description,provenance:'Perseus / Examinator2'};
}
