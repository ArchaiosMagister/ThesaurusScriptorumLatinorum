/**
 * Iconos PWA PNG sin dependencias binarias: fondo opaco, libro latino abierto y
 * motivo editorial. El contenido importante queda en el área segura maskable.
 */
import {mkdir, writeFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import path from 'node:path';

const palette={
  background:[23,63,74],circle:[39,87,101],gold:[217,173,102],
  left:[243,234,212],right:[255,247,229],ink:[52,97,107],
  lines:[113,148,155],
};
function pointInPolygon(x,y,points){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];
    if((a[1]>y)!==(b[1]>y) &&
      x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
function distanceToSegment(x,y,ax,ay,bx,by){
  const dx=bx-ax,dy=by-ay;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
  return Math.hypot(x-ax-t*dx,y-ay-t*dy);
}
function nearPolyline(x,y,coords,width){
  for(let i=0;i<coords.length-1;i++){
    if(distanceToSegment(x,y,...coords[i],...coords[i+1])<=width/2)return true;
  }
  return false;
}
const left=[[256,174],[213,153],[177,151],[139,161],[139,327],[182,312],[218,315],[256,335]];
const right=[[256,174],[296,153],[336,151],[373,161],[373,327],[331,312],[290,315],[256,335]];
const innerLeft=[[252,181],[211,161],[180,160],[147,169],[147,316],[184,304],[220,307],[252,325]];
const innerRight=[[260,181],[301,161],[334,160],[365,169],[365,316],[328,304],[290,307],[260,325]];
function sample(x,y){
  let color=palette.background;
  const d=Math.hypot(x-256,y-256);
  if(d<=188)color=palette.circle;
  if(d>=178&&d<=185)color=palette.gold;
  if(pointInPolygon(x,y,left)||pointInPolygon(x,y,right))color=palette.gold;
  if(pointInPolygon(x,y,innerLeft))color=palette.left;
  if(pointInPolygon(x,y,innerRight))color=palette.right;
  if(nearPolyline(x,y,[[256,180],[256,331]],7))color=palette.gold;
  if(nearPolyline(x,y,[[185,215],[185,272],[220,272]],12))color=palette.ink;
  for(const points of [
    [[291,217],[310,212],[330,211],[341,216]],
    [[291,247],[314,242],[330,242],[342,248]],
    [[291,278],[313,273],[329,273],[340,279]],
  ])if(nearPolyline(x,y,points,9))color=palette.lines;
  if(nearPolyline(x,y,[[151,347],[203,335],[255,331],[308,335],[361,347]],8))
    color=palette.gold;
  return color;
}
const crcTable=Array.from({length:256},(_,n)=>{
  let c=n;
  for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;
  return c>>>0;
});
function crc32(buffer){
  let crc=0xffffffff;
  for(const b of buffer)crc=crcTable[(crc^b)&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}
function pngChunk(type,bytes){
  const name=Buffer.from(type,'ascii'),size=Buffer.alloc(4),checksum=Buffer.alloc(4);
  size.writeUInt32BE(bytes.length,0);
  checksum.writeUInt32BE(crc32(Buffer.concat([name,bytes])),0);
  return Buffer.concat([size,name,bytes,checksum]);
}
export function iconPng(size){
  if(![180,192,512].includes(size))throw new Error('Tamaño de icono no admitido');
  const raw=Buffer.alloc((size*4+1)*size);
  for(let py=0;py<size;py++){
    const row=py*(size*4+1);raw[row]=0;
    for(let px=0;px<size;px++){
      const sum=[0,0,0];
      for(const oy of [0.25,0.75])for(const ox of [0.25,0.75]){
        const rgb=sample((px+ox)*512/size,(py+oy)*512/size);
        for(let k=0;k<3;k++)sum[k]+=rgb[k];
      }
      const pos=row+1+px*4;
      for(let k=0;k<3;k++)raw[pos+k]=Math.round(sum[k]/4);
      raw[pos+3]=255;
    }
  }
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);
  ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR',ihdr),pngChunk('IDAT',deflateSync(raw,{level:9})),
    pngChunk('IEND',Buffer.alloc(0)),
  ]);
}
export async function renderPwaIcons(destination){
  await mkdir(destination,{recursive:true});
  for(const [name,size] of [
    ['icon-192.png',192],['icon-512.png',512],
    ['icon-maskable-512.png',512],['apple-touch-icon.png',180],
  ]){
    await writeFile(path.join(destination,name),iconPng(size));
  }
}
