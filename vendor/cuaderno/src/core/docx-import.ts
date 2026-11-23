/**
 * Lectura local de DOCX docentes (OOXML): no solicita servicios y no corrige
 * automáticamente un original. La decisión académica corresponde al banco.
 */
export type LexKind = 'preverb'|'phonetics'|'prefix'|'latinism';
export interface ImportedUnderline {
  startUtf16:number; endUtf16:number; exact:string;
}
export interface ImportedVocabulary {
  headword:string; meaning:string|null;
}
export interface ParsedTeacherDocx {
  title:string; author:string|null; work:string|null; reference:string|null;
  latin:string; underlines:ImportedUnderline[];
  vocabulary:ImportedVocabulary[];
  /** Solo términos reales: A/B/C/D y celdas vacías no son contenido docente. */
  lexical:Record<LexKind,string[]>;
  preverbBases:[string,string]|null;
  warnings:string[];
}
interface Run {text:string;underlined:boolean;italic:boolean}
interface Paragraph {text:string;runs:Run[]}
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const MAX_XML=4_000_000,MAX_FILE=16_000_000;
function children(node:Element,tag:string):Element[] {
  return Array.from(node.getElementsByTagNameNS(W,tag));
}
function first(node:Element,tag:string):Element|null {
  return children(node,tag)[0]??null;
}
function value(node:Element):string {
  return node.getAttributeNS(W,'val')??node.getAttribute('w:val')??'';
}
function paragraphs(xml:string,parse:(xml:string)=>Document):Paragraph[] {
  const doc=parse(xml);
  if(doc.getElementsByTagName('parsererror').length)throw Error('El XML de Word no se puede leer.');
  const body=doc.getElementsByTagNameNS(W,'body')[0];
  if(!body)throw Error('El documento Word no contiene un cuerpo de texto.');
  return children(body,'p').map(p=>{
    const runs:Run[]=children(p,'r').map(r=>{
      const props=first(r,'rPr'),u=props&&first(props,'u');
      const underlined=!!u&&value(u).toLowerCase()!=='none'&&value(u).toLowerCase()!=='false';
      const italic=!!(props&&first(props,'i'));
      let text='';
      for(const item of Array.from(r.childNodes)){
        if(item.nodeType!==1)continue;
        const e=item as Element;
        if(e.namespaceURI!==W)continue;
        if(e.localName==='t')text+=e.textContent??'';
        else if(e.localName==='tab')text+='\t';
        else if(e.localName==='br'||e.localName==='cr')text+=' ';
      }
      return {text,underlined,italic};
    });
    return {text:runs.map(r=>r.text).join(''),runs};
  }).filter(x=>x.text.trim().length>0);
}
function isPlaceholder(s:string):boolean {
  return !s.trim()||/^(?:[ABCD]|\s*[-–_?.…]+\s*)$/iu.test(s.trim());
}
function distinctWords(s:string):string[] {
  return s.replace(/\.$/u,'').split(/\s*,\s*|\s+y\s+/iu)
    .map(x=>x.trim().replace(/[.;:]+$/u,'')).filter(x=>x.length>0&&!isPlaceholder(x));
}
function extractLast(s:string,pattern:RegExp):string|null {
  const match=s.match(pattern);
  return match?.[1]?.trim()??null;
}
// Referencias de libro/capítulo: III, VI 23, VI 23 (bis), 10, LXI 4–5 y 1.2.3.
// Compartir la regla entre la detección de la cita y su descomposición evita
// rechazar documentos perfectamente legibles solo por su numeración.
const SOURCE_REFERENCE=
  /\s+((?:[IVXLCDM]+(?:\s+\d+(?:\s*[-–]\s*\d+)?)?|\d+(?:[.\s]\d+)*(?:\s*[-–]\s*\d+)?)(?:\s*\((?:bis|ter|quater)\))?)\s*$/iu;
const ADAPTED_AUTHOR_PREFIX=/^(?:adaptad[oa]\s+de(?:l)?|adaptaci[oó]n\s+de(?:l)?)\s+/iu;
function parseSource(p:Paragraph):{author:string|null;work:string|null;reference:string|null} {
  const comma=p.text.indexOf(',');
  if(comma<0)return {author:p.text.trim()||null,work:null,reference:null};
  // «Adaptado de» califica el pasaje, no forma parte del nombre del autor.
  const author=p.text.slice(0,comma).trim().replace(ADAPTED_AUTHOR_PREFIX,'').trim()||null;
  const remainder=p.text.slice(comma+1).trim();
  const match=remainder.match(SOURCE_REFERENCE);
  const work=(match?remainder.slice(0,match.index).trim():remainder)||null;
  const reference=match?.[1]?.replace(/\s+/gu,' ').replace(/\s*([–-])\s*/gu,'$1')??null;
  return {author,work,reference};
}
function normalizeGreekQuotes(s:string):string{return s.trim();}
function parseWordValues(p:Paragraph):ImportedVocabulary|null {
  const raw=p.text.trim();
  if(isPlaceholder(raw))return null;
  const colon=raw.indexOf(':');
  if(colon<1)return null;
  const headword=raw.slice(0,colon).trim();
  const meaning=normalizeGreekQuotes(raw.slice(colon+1));
  if(!headword||isPlaceholder(headword))return null;
  return {headword,meaning:meaning||null};
}
function importLatin(ps:Paragraph[]):{latin:string;underlines:ImportedUnderline[]} {
  let latin='',underlines:ImportedUnderline[]=[];
  for(const paragraph of ps){
    // Las separaciones de párrafo se mantienen; se normalizan tabuladores
    // de maquetación para que los offsets UTF-16 coincidan con lo guardado.
    const text=paragraph.text.replace(/\t/gu,' ');
    const leading=text.length-text.trimStart().length;
    const clean=text.trim();
    if(!clean)continue;
    if(latin)latin+='\n';
    const offset=latin.length;
    let pos=0,activeStart:number|null=null;
    for(const run of paragraph.runs){
      const str=run.text.replace(/\t/gu,' ');
      const start=pos,end=start+str.length;
      if(run.underlined&&str.trim()){
        if(activeStart===null)activeStart=start;
      }else if(activeStart!==null){
        const a=Math.max(0,activeStart-leading),b=Math.min(clean.length,start-leading);
        if(b>a){
          const segment=clean.slice(a,b),left=segment.length-segment.trimStart().length;
          const right=segment.length-segment.trimEnd().length;
          if(b-right>a+left)underlines.push({startUtf16:offset+a+left,
            endUtf16:offset+b-right,exact:segment.trim()});
        }
        activeStart=null;
      }
      pos=end;
    }
    if(activeStart!==null){
      const a=Math.max(0,activeStart-leading),b=clean.length;
      if(b>a){
        const segment=clean.slice(a,b),left=segment.length-segment.trimStart().length;
        if(b>a+left)underlines.push({startUtf16:offset+a+left,endUtf16:offset+b,
          exact:segment.trim()});
      }
    }
    latin+=clean;
  }
  underlines=underlines.filter(m=>m.exact.trim().length>0);
  return {latin,underlines};
}
function parseLexical(ps:Paragraph[]):{
  lexical:Record<LexKind,string[]>;preverbBases:[string,string]|null;warnings:string[];
}{
  const lexical:Record<LexKind,string[]>={preverb:[],phonetics:[],prefix:[],latinism:[]};
  let preverbBases:[string,string]|null=null;
  const warnings:string[]=[];
  for(const p of ps){
    const s=p.text.trim();
    if(/modificaci[oó]n preverbial/iu.test(s)){
      const match=s.match(/a partir de\s+(.+?)\s*\(3\)\s+y\s+de\s+(.+?)\s*\(2\)/iu);
      if(match&&match[1]&&match[2]&&!isPlaceholder(match[1])&&!isPlaceholder(match[2]))
        preverbBases=[match[1].trim(),match[2].trim()];
    }else if(/evoluci[oó]n fon[eé]tica/iu.test(s)){
      const words=extractLast(s,/evoluci[oó]n fon[eé]tica\s+de\s+(.+)$/iu);
      lexical.phonetics=words?distinctWords(words):[];
    }else if(/(?:se[nñ]ala|indica)\s+el\s+prefijo|(?:^|\W)prefijos\s*:/iu.test(s)){
      const at=s.indexOf(':');
      lexical.prefix=at<0?[]:distinctWords(s.slice(at+1));
    }else if(/latinismos/iu.test(s)){
      const at=s.indexOf(':');
      lexical.latinism=at<0?[]:distinctWords(s.slice(at+1));
    }
  }
  if(!ps.some(p=>/latinismos/iu.test(p.text)))warnings.push('No había latinismos: se añadirá el apartado de nuestra plantilla.');
  if(!preverbBases)warnings.push('No hay dos bases preverbiales reales: se propondrán desde el banco.');
  for(const kind of ['phonetics','prefix','latinism'] as const){
    if(lexical[kind].length<4)warnings.push(kind+': se completarán los huecos con candidaturas verificadas, si las hay.');
  }
  return {lexical,preverbBases,warnings};
}
export function parseTeacherDocumentXml(xml:string,parse:(xml:string)=>Document =
  text=>new DOMParser().parseFromString(text,'application/xml')):ParsedTeacherDocx {
  if(xml.length>MAX_XML)throw Error('El XML del documento supera el tamaño permitido.');
  const ps=paragraphs(xml,parse);
  const vocabIdx=ps.findIndex(p=>/^vocabulario$/iu.test(p.text.trim()));
  const questionIdx=ps.findIndex(p=>/^traducci[oó]n del texto/iu.test(p.text.trim()));
  if(vocabIdx<3||questionIdx<=vocabIdx)throw Error('El DOCX no sigue la estructura de texto latino, vocabulario y preguntas.');
  // La referencia precede al latín; puede haber más de un párrafo latino.
  const sourceIdx=ps.findIndex((p,i)=>i>=2&&i<vocabIdx-1&&
    p.text.length<250&&p.text.includes(',')&&SOURCE_REFERENCE.test(p.text));
  if(sourceIdx<2)throw Error('No se reconoce la referencia bibliográfica. Se admiten, por ejemplo, «Milcíades III», «De bello Gallico V 22» y «Breviarium VI 23 (bis)».');
  const source=ps[sourceIdx]!,title=ps[sourceIdx-1]!;
  const body=importLatin(ps.slice(sourceIdx+1,vocabIdx));
  if(/^texto(?:\s+latino)?[\s.:…]*$/iu.test(body.latin))
    throw Error('El documento contiene el marcador «Texto», pero no un pasaje latino. Completa el Word antes de importarlo.');
  if(!body.latin||body.latin.length>200_000)throw Error('El pasaje latino está vacío o excede el límite.');
  const vocab=ps.slice(vocabIdx+1,questionIdx);
  const vocabulary=vocab.map(parseWordValues).filter((x):x is ImportedVocabulary=>x!==null);
  const lexical=parseLexical(ps.slice(questionIdx+1));
  const review=[...lexical.warnings];
  if(ADAPTED_AUTHOR_PREFIX.test(source.text.split(',')[0]??''))
    review.push('El Word indica que es un pasaje adaptado. Se ha separado esta indicación del nombre del autor.');
  if(vocab.some(p=>isPlaceholder(p.text)))review.push('El vocabulario contiene letras o huecos: no se importarán como lemas.');
  if(!vocabulary.length)review.push('No hay entradas reales de vocabulario: el editor permitirá completarlas sin inventar significados.');
  if(!body.underlines.length)review.push('No se detectaron subrayados; revisar la morfología.');
  const citation=parseSource(source);
  return {title:title.text.trim(),...citation,latin:body.latin,underlines:body.underlines,
    vocabulary,lexical:lexical.lexical,preverbBases:lexical.preverbBases,warnings:review};
}
function u16(b:DataView,i:number):number{return b.getUint16(i,true);}
function u32(b:DataView,i:number):number{return b.getUint32(i,true);}
async function unzipDocumentXml(buffer:ArrayBuffer):Promise<string>{
  if(buffer.byteLength>MAX_FILE)throw Error('El DOCX supera los 16 MB.');
  const v=new DataView(buffer),bytes=new Uint8Array(buffer);
  let eocd=-1;
  for(let i=v.byteLength-22;i>=Math.max(0,v.byteLength-65557);i--){
    if(u32(v,i)===0x06054b50){eocd=i;break;}
  }
  if(eocd<0)throw Error('El archivo no es un ZIP/DOCX válido.');
  const entries=u16(v,eocd+10),central=u32(v,eocd+16);
  let off=central,location=-1,method=0,length=0,expected=0;
  for(let j=0;j<entries;j++){
    if(off+46>v.byteLength||u32(v,off)!==0x02014b50)throw Error('Directorio ZIP dañado.');
    const cm=u16(v,off+10),size=u32(v,off+20),real=u32(v,off+24);
    const nameLen=u16(v,off+28),extra=u16(v,off+30),comment=u16(v,off+32);
    const name=new TextDecoder().decode(bytes.subarray(off+46,off+46+nameLen));
    if(name==='word/document.xml'){
      location=u32(v,off+42);length=size;expected=real;method=cm;break;
    }
    off+=46+nameLen+extra+comment;
  }
  if(location<0||expected>MAX_XML)throw Error('El DOCX no contiene un documento principal válido.');
  if(u32(v,location)!==0x04034b50)throw Error('Cabecera ZIP dañada.');
  const start=location+30+u16(v,location+26)+u16(v,location+28);
  if(start+length>v.byteLength)throw Error('Datos ZIP incompletos.');
  const payload=bytes.subarray(start,start+length);
  let output:ArrayBuffer;
  if(method===0)output=new Uint8Array(payload).buffer;
  else if(method===8){
    if(typeof DecompressionStream==='undefined')throw Error('Este navegador no permite descomprimir DOCX localmente.');
    const stream=new Blob([new Uint8Array(payload)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    output=await new Response(stream).arrayBuffer();
  }else throw Error('El DOCX usa un método de compresión no compatible.');
  if(output.byteLength!==expected||output.byteLength>MAX_XML)throw Error('La longitud del XML descomprimido no es válida.');
  return new TextDecoder('utf-8',{fatal:true}).decode(output);
}
export async function readTeacherDocx(file:File):Promise<ParsedTeacherDocx>{
  if(!/\.docx$/iu.test(file.name))throw Error('Selecciona un archivo Word .docx.');
  return parseTeacherDocumentXml(await unzipDocumentXml(await file.arrayBuffer()));
}
