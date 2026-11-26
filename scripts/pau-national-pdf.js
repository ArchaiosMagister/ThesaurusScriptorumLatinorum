// Independent national PDF extraction. The CV parser remains unchanged.
// No rendering, OCR, network upload, or interpretation of underlines here.
const MAX_BYTES=24*1024*1024;
const MAX_PAGES=16;
const MAX_ITEMS=50000;

export function nationalTextRows(items, viewport, transform) {
  if(items.length>MAX_ITEMS) throw Error('Página demasiado compleja.');
  const positioned=[];
  for(const item of items) {
    if(typeof item.str!=='string'||!item.str.trim())continue;
    const matrix=transform(viewport.transform,item.transform);
    const x=matrix[4],y=matrix[5],size=Math.hypot(matrix[2],matrix[3]);
    const width=Math.abs(item.width*viewport.scale);
    if(![x,y,size,width].every(Number.isFinite)||size<=0) continue;
    // Horizontal left-to-right text only. Flag other layouts rather than silently
    // incorporating rotated marginal text into the exam.
    if(Math.abs(matrix[1])>Math.abs(matrix[0])*.1) continue;
    positioned.push({text:item.str,x,y,size,width,fontName:item.fontName??''});
  }
  positioned.sort((a,b)=>a.y-b.y||a.x-b.x);
  const groups=[];
  for(const item of positioned) {
    const last=groups.at(-1);
    const tolerance=Math.max(.75,Math.min(2.5,item.size*.18));
    if(last&&Math.abs(item.y-last.y)<=tolerance)last.items.push(item);
    else groups.push({y:item.y,items:[item]});
  }
  return groups.map(group=>{
    const parts=group.items.sort((a,b)=>a.x-b.x);
    let text='',prev=null;
    for(const part of parts){
      // PDF text runs sometimes split one word (e.g. diacritics or font runs).
      // Add a space only for a physical gap, unless the source has one already.
      if(prev&&part.x-(prev.x+prev.width)>Math.min(prev.size,part.size)*.17&&
         !/\s$/u.test(text)&&!/^\s/u.test(part.text))text+=' ';
      text+=part.text;
      prev=part;
    }
    return {text:text.trim(),y:group.y,x:parts[0].x,
      size:Math.max(...parts.map(p=>p.size)),runs:parts};
  }).filter(row=>row.text);
}

export async function extractNationalPdfPages(file,{pdfjs,workerSrc,assetRoot}={}) {
  if(!file||typeof file.arrayBuffer!=='function')throw Error('Selecciona un PDF.');
  if(!Number.isFinite(file.size)||file.size<=0||file.size>MAX_BYTES)throw Error('PDF vacío o demasiado grande (máximo 24 MiB).');
  if(!pdfjs||typeof pdfjs.getDocument!=='function')throw Error('PDF.js no está disponible.');
  if(workerSrc&&pdfjs.GlobalWorkerOptions)pdfjs.GlobalWorkerOptions.workerSrc=workerSrc;
  const options={data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useSystemFonts:true};
  if(options.data.length>MAX_BYTES)throw Error('PDF demasiado grande.');
  if(assetRoot){
    const base=assetRoot.endsWith('/')?assetRoot:assetRoot+'/';
    Object.assign(options,{standardFontDataUrl:base+'standard_fonts/',wasmUrl:base+'wasm/',
      cMapUrl:base+'cmaps/',cMapPacked:true});
  }
  const task=pdfjs.getDocument(options);
  try{
    const pdf=await task.promise;
    if(!Number.isInteger(pdf.numPages)||pdf.numPages<1||pdf.numPages>MAX_PAGES)throw Error('Se esperaba un examen de hasta 16 páginas.');
    const pages=[],warnings=[];
    for(let n=1;n<=pdf.numPages;n++){
      const page=await pdf.getPage(n);
      try{
        const viewport=page.getViewport({scale:1});
        const content=await page.getTextContent();
        const rows=nationalTextRows(content.items,viewport,pdfjs.Util.transform);
        if(!rows.length)warnings.push('Página '+n+' sin texto extraíble: requiere revisión u OCR.');
        pages.push(rows);
      }finally{page.cleanup();}
    }
    if(!pages.some(rows=>rows.length))throw Error('El PDF no contiene texto extraíble; requiere OCR o selección manual.');
    return {pages,warnings};
  }finally{await task.destroy();}
}
