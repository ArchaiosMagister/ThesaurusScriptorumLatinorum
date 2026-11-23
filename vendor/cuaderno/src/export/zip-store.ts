/** ZIP/OOXML sin dependencias ni CDN. Método STORE (0), CRC-32 estándar.
 * Word/Pages aceptan DOCX con entradas no comprimidas.
 */
const encoder=new TextEncoder();
function crc32(bytes:Uint8Array):number {
  let crc=0xffffffff;
  for(const b of bytes){
    crc^=b;
    for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  return (crc^0xffffffff)>>>0;
}
function u16(view:DataView,pos:number,n:number){view.setUint16(pos,n,true);}
function u32(view:DataView,pos:number,n:number){view.setUint32(pos,n,true);}
export function zipStore(entries:readonly {path:string;content:string|Uint8Array}[]):Uint8Array{
  if(entries.length===0||entries.length>100)throw new Error('Número de ficheros DOCX inválido.');
  const files=entries.map(item=>{
    if(!item.path||item.path.startsWith('/')||item.path.includes('..')||item.path.includes('\\'))
      throw new Error('Ruta ZIP inválida.');
    const path=encoder.encode(item.path),data=typeof item.content==='string'
      ?encoder.encode(item.content):item.content;
    if(path.length>65535||data.length>0xffffffff)throw new Error('Entrada ZIP demasiado grande.');
    return {path,data,crc:crc32(data),offset:0};
  });
  if(new Set(entries.map(x=>x.path)).size!==entries.length)throw new Error('Rutas ZIP duplicadas.');
  const local=files.reduce((sum,f)=>sum+30+f.path.length+f.data.length,0);
  const central=files.reduce((sum,f)=>sum+46+f.path.length,0);
  const total=local+central+22;
  if(total>100_000_000)throw new Error('DOCX demasiado grande.');
  const bytes=new Uint8Array(total),view=new DataView(bytes.buffer);
  let offset=0;
  for(const f of files){
    f.offset=offset;
    u32(view,offset,0x04034b50);u16(view,offset+4,20);u16(view,offset+6,0x0800); // UTF-8
    u16(view,offset+8,0); // STORE
    u32(view,offset+14,f.crc);
    u32(view,offset+18,f.data.length);u32(view,offset+22,f.data.length);
    u16(view,offset+26,f.path.length);
    bytes.set(f.path,offset+30);
    bytes.set(f.data,offset+30+f.path.length);
    offset+=30+f.path.length+f.data.length;
  }
  const centralStart=offset;
  for(const f of files){
    u32(view,offset,0x02014b50);
    u16(view,offset+4,20);u16(view,offset+6,20);u16(view,offset+8,0x0800);
    u16(view,offset+10,0);u32(view,offset+16,f.crc);
    u32(view,offset+20,f.data.length);u32(view,offset+24,f.data.length);
    u16(view,offset+28,f.path.length);u32(view,offset+42,f.offset);
    bytes.set(f.path,offset+46);offset+=46+f.path.length;
  }
  u32(view,offset,0x06054b50);u16(view,offset+8,files.length);u16(view,offset+10,files.length);
  u32(view,offset+12,offset-centralStart);u32(view,offset+16,centralStart);
  return bytes;
}
