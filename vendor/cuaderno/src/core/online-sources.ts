/** Conector de lectura pública a Wikisource en latín.
 * No envía información del cuaderno: solo la búsqueda indicada por el docente.
 * Las páginas externas se validan antes de mostrar una vista PREVIA editable.
 */
const endpoint='https://la.wikisource.org/w/api.php';
export interface OnlineSearchResult {id:number;title:string}
export interface OnlinePage {title:string;html:string;url:string}

function searchTerm(input:string):string{
  const term=input.trim();
  if(term.length<2||term.length>150)throw new Error('Introduce de 2 a 150 caracteres.');
  return term;
}
export function onlineSearchUrl(term:string):string{
  const url=new URL(endpoint);
  for(const [k,v] of Object.entries({action:'query',list:'search',srsearch:searchTerm(term),
    srnamespace:'0',srlimit:'15',format:'json',formatversion:'2',origin:'*'}))
    url.searchParams.set(k,v);
  return url.toString();
}
export function parseOnlineSearch(raw:unknown):OnlineSearchResult[]{
  const value=raw as {query?:{search?:unknown}};
  if(!raw||typeof raw!=='object'||!Array.isArray(value.query?.search))
    throw new Error('Respuesta de búsqueda inválida.');
  return value.query.search.flatMap((item:unknown)=>{
    const x=item as {pageid?:unknown;title?:unknown};
    return Number.isSafeInteger(x?.pageid)&&typeof x.title==='string'
      &&x.title.length>0&&x.title.length<=300
      ?[{id:x.pageid as number,title:x.title}]:[];
  });
}
export function onlinePageUrl(title:string):string{
  if(!title.trim()||title.length>300)throw new Error('Título online inválido.');
  const url=new URL(endpoint);
  for(const [k,v] of Object.entries({action:'parse',page:title,prop:'text',
    format:'json',formatversion:'2',origin:'*'}))
    url.searchParams.set(k,v);
  return url.toString();
}
export function parseOnlinePage(raw:unknown):OnlinePage{
  const data=raw as {parse?:{title?:unknown;text?:unknown}};
  if(!raw||typeof raw!=='object'||typeof data.parse?.title!=='string'
    ||typeof data.parse.text!=='string'||data.parse.title.length>300
    ||data.parse.text.length>3_000_000)
    throw new Error('Página online incompleta o demasiado extensa.');
  return {title:data.parse.title,html:data.parse.text,
    url:'https://la.wikisource.org/wiki/'+encodeURIComponent(data.parse.title.replaceAll(' ','_'))};
}
