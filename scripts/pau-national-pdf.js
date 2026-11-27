// Local PDF.js extraction for the national workflow.
const MAX_BYTES=24*1024*1024;
const MAX_PAGES=16;
const MAX_ITEMS=50000;

export function nationalTextRows(items, viewport, transform, {columnBreak}={}) {
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
  return groups.flatMap(group=>{
    if (!Number.isFinite(columnBreak)) return [group];
    return [group.items.filter(item=>item.x<columnBreak),group.items.filter(item=>item.x>=columnBreak)]
      .filter(parts=>parts.length).map(items=>({y:group.y,items}));
  }).map(group=>{
    const parts=group.items.sort((a,b)=>a.x-b.x);
    let text='',prev=null;
    const spans=[];
    for(const part of parts){
      // PDF text runs sometimes split one word (e.g. diacritics or font runs).
      // Add a space only for a physical gap, unless the source has one already.
      if(prev&&part.x-(prev.x+prev.width)>Math.min(prev.size,part.size)*.17&&
         !/\s$/u.test(text)&&!/^\s/u.test(part.text))text+=' ';
      spans.push({...part,start:text.length,end:text.length+part.text.length});
      text+=part.text;
      prev=part;
    }
    return {text:text.trim(),y:group.y,x:parts[0].x,
      size:Math.max(...parts.map(p=>p.size)),runs:spans.map(part=>({...part,
        start:part.start-(text.length-text.trimStart().length),end:part.end-(text.length-text.trimStart().length)}))};
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
    const pages=[],columns=[],warnings=[];
    const info = await pdf.getMetadata?.().then(value=>value.info,()=>({})) ?? {};
    for(let n=1;n<=pdf.numPages;n++){
      const page=await pdf.getPage(n);
      try{
        const viewport=page.getViewport({scale:1});
        const content=await page.getTextContent();
        const rows=nationalTextRows(content.items,viewport,pdfjs.Util.transform);
        if(!rows.length)warnings.push('Página '+n+' sin texto extraíble: requiere revisión u OCR.');
        if (typeof page.getOperatorList === 'function') {
          try {
            const operators=await page.getOperatorList();
            const lines=horizontalRules(operators,viewport,pdfjs);
            for (const row of rows) for (const run of row.runs) {
              const name=page.commonObjs.has(run.fontName)?page.commonObjs.get(run.fontName)?.name??'':'';
              run.bold=/bold|semibold|demi|negrita/iu.test(name);
              run.italic=/italic|oblique/iu.test(name);
              const baseline=Math.floor(run.y);
              for (let y=baseline;y<=Math.ceil(run.y+run.size*.28);y++) {
                if (lines.get(y)?.some(line=>line.y>run.y && line.y-run.y<run.size*.28 &&
                    line.left<=run.x+run.size*.12 && line.right>=run.x+run.width-run.size*.12)) {
                  run.underline=true;
                  break;
                }
              }
            }
          } catch {
            warnings.push('Página '+n+': revisa el formato tipográfico en el original.');
          }
        }
        pages.push(rows);
        const pairedHeading=rows.find(row=>row.text==='TEXTO A TEXTO B');
        const columnBreak=pairedHeading?.runs.find(run=>run.text==='TEXTO B')?.x??viewport.width/2;
        const split=nationalTextRows(content.items,viewport,pdfjs.Util.transform,{columnBreak});
        columns.push([split.filter(row=>row.x<columnBreak),split.filter(row=>row.x>=columnBreak)]);
      }finally{page.cleanup();}
    }
    if(!pages.some(rows=>rows.length))throw Error('El PDF no contiene texto extraíble; requiere OCR o selección manual.');
    return {pages,columns,info,warnings};
  }finally{await task.destroy();}
}

// PDF.js exposes the bounding box of painted vector paths. Track graphics
// transforms and admit only horizontal strokes or narrowly filled rules.
function horizontalRules({fnArray,argsArray},viewport,{OPS,Util}) {
  let matrix=viewport.transform;
  const stack=[],lines=new Map();
  for (let i=0;i<fnArray.length;i++) {
    const op=fnArray[i], args=argsArray[i];
    if (op===OPS.save) stack.push(matrix);
    else if (op===OPS.restore) matrix=stack.pop()??viewport.transform;
    else if (op===OPS.transform) matrix=Util.transform(matrix,args);
    else if (op===OPS.constructPath && args?.[2]?.length===4 &&
      [OPS.stroke,OPS.fill,OPS.eoFill].includes(args[0])) {
      const [x,y,r,b]=args[2];
      const start=[x,y], end=[r,b];
      Util.applyTransform(start,matrix);
      Util.applyTransform(end,matrix);
      if (Math.abs(end[1]-start[1])>1.5 || Math.abs(end[0]-start[0])<2) continue;
      const lineY=(start[1]+end[1])/2, bucket=Math.floor(lineY);
      if (!lines.has(bucket)) lines.set(bucket,[]);
      lines.get(bucket).push({y:lineY,left:Math.min(start[0],end[0]),right:Math.max(start[0],end[0])});
    }
  }
  return lines;
}
