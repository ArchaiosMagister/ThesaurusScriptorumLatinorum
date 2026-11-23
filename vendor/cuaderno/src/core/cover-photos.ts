/** Fotografías CC0 verificadas en Wikimedia Commons; no se usan CDNs en exportación. */
export interface CoverPhoto {
  id: 'pantheon' | 'colosseum' | 'spqr';
  name: string;
  imageUrl: string;
  filePage: string;
  author: string;
  license: 'CC0 1.0';
}
export const COVER_PHOTOS: readonly CoverPhoto[] = [
  {
    id:'pantheon',name:'Panteón de Roma',
    imageUrl:'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Ext%C3%A9rieur_du_Panth%C3%A9on_%C3%A0_Rome.jpg/1280px-Ext%C3%A9rieur_du_Panth%C3%A9on_%C3%A0_Rome.jpg',
    filePage:'https://commons.wikimedia.org/wiki/File:Ext%C3%A9rieur_du_Panth%C3%A9on_%C3%A0_Rome.jpg',
    author:'Van Der Meulen Christofle',license:'CC0 1.0',
  },
  {
    id:'colosseum',name:'Coliseo',
    imageUrl:'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Colosseum_of_Rome%2C_Italy.jpg/1024px-Colosseum_of_Rome%2C_Italy.jpg',
    filePage:'https://commons.wikimedia.org/wiki/File:Colosseum_of_Rome,_Italy.jpg',
    author:'Wilfredor',license:'CC0 1.0',
  },
  {
    id:'spqr',name:'SPQR',
    imageUrl:'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/SPQR_Rome.jpg/768px-SPQR_Rome.jpg',
    filePage:'https://commons.wikimedia.org/wiki/File:SPQR_Rome.jpg',
    author:'DeveshT',license:'CC0 1.0',
  },
];

/**
 * Convert to a compact, browser-local JPEG. The image is embedded into the
 * saved notebook so PDF/Word/JSON exports never need a remote image server.
 */
async function jpegFromBlob(blob:Blob):Promise<string>{
  if(blob.size>12_000_000)throw Error('La imagen supera 12 MB.');
  if(!/^image\/(jpeg|png|webp)$/.test(blob.type))
    throw Error('Utiliza una imagen JPG, PNG o WebP.');
  const url=URL.createObjectURL(blob);
  const photo=new Image();
  try{
    await new Promise<void>((resolve,reject)=>{
      photo.onload=()=>resolve();
      photo.onerror=()=>reject(Error('No se pudo leer la imagen.'));
      photo.src=url;
    });
    const width=photo.naturalWidth,height=photo.naturalHeight;
    if(!width||!height||width>12_000||height>12_000)
      throw Error('Resolución de imagen no admitida.');
    const canvas=document.createElement('canvas');
    // Fotografía apaisada 1.65:1 como en el modelo del Panteón.
    canvas.width=1200;canvas.height=730;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('Canvas no está disponible.');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,1200,730);
    const ratio=Math.max(1200/width,730/height);
    const targetW=width*ratio,targetH=height*ratio;
    ctx.drawImage(photo,(1200-targetW)/2,(730-targetH)/2,targetW,targetH);
    let output=canvas.toDataURL('image/jpeg',0.78);
    if(output.length>820_000)output=canvas.toDataURL('image/jpeg',0.6);
    if(output.length>820_000)throw Error('La imagen comprimida es demasiado grande.');
    return output;
  }finally{URL.revokeObjectURL(url);}
}
export async function loadCoverPhoto(photo:CoverPhoto):Promise<string>{
  const response=await fetch(photo.imageUrl,{mode:'cors'});
  if(!response.ok)throw Error('No se pudo descargar la imagen de Wikimedia Commons.');
  return jpegFromBlob(await response.blob());
}
export async function loadOwnCoverPhoto(file:File):Promise<string>{
  return jpegFromBlob(file);
}

import type {NotebookCoverV1} from './edition-model.js';

/** Generate the same decorative photo treatment for portable Word export. */
export async function prepareWordCoverImage(cover:NotebookCoverV1):Promise<string>{
  const photo=new Image();
  await new Promise<void>((resolve,reject)=>{
    photo.onload=()=>resolve();
    photo.onerror=()=>reject(Error('No se pudo preparar la imagen de portada.'));
    photo.src=cover.imageDataUrl;
  });
  const W=1200,H=730;
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const context=canvas.getContext('2d');
  if(!context)throw Error('No se puede procesar la portada.');
  context.fillStyle='#fff';context.fillRect(0,0,W,H);
  // Reproduce la composición clásica de la fotografía reflejada.
  const imageHeight=cover.reflection?555:H;
  const source=document.createElement('canvas');source.width=W;source.height=imageHeight;
  const ctx=source.getContext('2d');
  if(!ctx)throw Error('Canvas no disponible.');
  const ratio=Math.max(W/photo.naturalWidth,imageHeight/photo.naturalHeight);
  const width=photo.naturalWidth*ratio,height=photo.naturalHeight*ratio;
  ctx.drawImage(photo,(W-width)/2,(imageHeight-height)/2,width,height);
  if(cover.colorMode!=='color'){
    const pixels=ctx.getImageData(0,0,W,imageHeight);
    for(let i=0;i<pixels.data.length;i+=4){
      const v=Math.round(.299*pixels.data[i]!+.587*pixels.data[i+1]!+.114*pixels.data[i+2]!);
      const value=cover.colorMode==='mono'?(v>148?248:32):v;
      pixels.data[i]=value;pixels.data[i+1]=value;pixels.data[i+2]=value;
    }
    ctx.putImageData(pixels,0,0);
  }
  context.drawImage(source,0,0);
  if(cover.reflection){
    const reflection=document.createElement('canvas');
    reflection.width=W;reflection.height=H-imageHeight;
    const reflected=reflection.getContext('2d');
    if(!reflected)throw Error('Canvas no disponible.');
    reflected.translate(0,reflection.height);
    reflected.scale(1,-1);
    reflected.drawImage(source,0,0,W,imageHeight,0,0,W,imageHeight);
    reflected.setTransform(1,0,0,1,0,0);
    reflected.globalCompositeOperation='destination-in';
    const fade=reflected.createLinearGradient(0,0,0,reflection.height);
    fade.addColorStop(0,'rgba(0,0,0,.35)');
    fade.addColorStop(1,'rgba(0,0,0,0)');
    reflected.fillStyle=fade;reflected.fillRect(0,0,W,reflection.height);
    context.drawImage(reflection,0,imageHeight);
  }
  const data=canvas.toDataURL('image/jpeg',0.75);
  if(data.length>820_000)throw Error('La portada es demasiado grande para el cuaderno.');
  return data;
}
