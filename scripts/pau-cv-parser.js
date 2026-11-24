// PAU CV: reconocimiento por estructura de la convocatoria, no por fecha.
const clean = s => String(s ?? '').replace(/\s+/gu,' ').trim();
const emptyLex = () => ({preverb:[],phonetics:[],prefix:[],latinism:[]});
const cast = s => clean(s.split(/\s*\/\s*/u).at(-1));
const plain = s => s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const letter = /[\p{L}\p{M}]+/gu;

export function morphologyMarks(latin, forms) {
  const words = [...latin.matchAll(letter)];
  const used = new Set();
  return forms.map(form => {
    const found = words.find(w => !used.has(w.index) && plain(w[0]) === plain(form));
    if (!found) throw Error('Forma morfológica no localizada: '+form);
    used.add(found.index);
    return {startUtf16:found.index,endUtf16:found.index+found[0].length,exact:found[0]};
  }).sort((a,b)=>a.startUtf16-b.startUtf16);
}
function citation(s) {
  const inner = clean(s).replace(/^\(/u,'').replace(/\)\s*$/u,'');
  const match = /^(.+?)(?:,\s*|\.\s+)(.+?)\s+((?:[IVXLCDM]+\s+)?\d[\d,\s.–-]*)$/u.exec(inner);
  if (!match) throw Error('Referencia bibliográfica no reconocida: '+s);
  const authors = {Caes:'Julio César',Sall:'Salustio',Cic:'Cicerón',Verg:'Virgilio',Liv:'Tito Livio',Nep:'Cornelio Nepote'};
  const author=authors[match[1]]??match[1];
  return {author:/^c[eé]sar$/iu.test(author.trim())?'Julio César':author,work:match[2].trim(),reference:match[3].trim()};
}
function lexicalParts(rows) {
  const start=rows.findIndex(r=>/^PREGUNTA\s+3\s*$/iu.test(r.text));
  if(start<0)throw Error('No se reconoce la pregunta de léxico.');
  const end=rows.findIndex((r,i)=>i>start&&/^PREGUNTA\s+4\s*$/iu.test(r.text));
  const block=rows.slice(start+1,end<0?undefined:end);
  const boundaries=['A','B','C','D'].map(id=>block.findIndex(r=>new RegExp('Cuestión\\s+'+id+'\\s*:','iu').test(r.text)));
  if(boundaries.some((n,i)=>n<0||(i&&n<=boundaries[i-1])))throw Error('No se reconocen los cuatro apartados de léxico.');
  const result=emptyLex();
  ['phonetics','prefix','latinism'].forEach((kind,i)=>{
    const part=block.slice(boundaries[i]+1,boundaries[i+1]);
    const lastHeader=part.findLastIndex(r=>/NORMAS FONÉTICAS|SIGNIFICADO QUE APORTA|SIGNIFICAT QUE APORTA|ORACIÓ\s*\/\s*ORACIÓN|PALABRA LATINA|PALABRA PATRIMONIAL|PREFIX\s*\/\s*PREFIJO|LATINISMO/iu.test(r.text));
    if(lastHeader<0)throw Error('Tabla de '+kind+' no reconocida.');
    result[kind]=part.slice(lastHeader+1).map(r=>cast(r.text)).filter(s=>/^[\p{L}\p{M}]+(?:[ -][\p{L}\p{M}]+)*$/u.test(s));
    if(result[kind].length!==4)throw Error('Se esperaban cuatro términos de '+kind+'.');
  });
  const preverb=block.slice(boundaries[3]+1).map(r=>r.text).join(' ');
  const es=preverb.match(/Componga por modificación preverbial[\s\S]*/iu)?.[0]??'';
  const bases=[...es.matchAll(/base léxica(?:\s+de)?\s+([\p{L}\p{M}]+)/giu)].map(m=>m[1]);
  if(bases.length!==2)throw Error('No se reconocen las dos bases preverbiales.');
  return {lexical:result,preverbBases:bases};
}
export function parsePauCvPages(pages) {
  const all=pages.flat();
  const header=all.map(r=>r.text).join(' ');
  const call=/CONVOCATORIA\s*:\s*([\p{L} ]+?)\s+((?:19|20)\d{2})/iu.exec(header);
  if(!call||!/(?:LAT[IÍ]N\s+II)/iu.test(header))throw Error('No se reconoce una convocatoria de Latín II.');
  const year=Number(call[2]), session=clean(call[1]);
  const old=all.some(r=>/^EJERCICIO\s+A$/iu.test(r.text));
  const modern=all.some(r=>/Opción\s+A\s*$/iu.test(r.text));
  if(old===modern)throw Error('Modelo PAU CV no reconocido. No se importará parcialmente.');
  const marker = id => old?new RegExp('^EJERCICIO\\s+'+id+'$','iu'):new RegExp('Opción\\s+'+id+'$','iu');
  const exercises=['A','B'].map(id=>all.findIndex(r=>marker(id).test(r.text)));
  if(exercises.some(n=>n<0)||exercises[1]<=exercises[0])throw Error('No se encuentran ambas opciones.');
  const endB=all.findIndex((r,i)=>i>exercises[1]&&(old?/^(?:BAREM DE|EXERCICI A|LÉXICO DEL|LÈXIC DE)/iu.test(r.text):/^PREGUNTA\s+2$/iu.test(r.text)));
  const shared=modern?lexicalParts(all):{lexical:emptyLex(),preverbBases:null};
  return exercises.map((start,i)=>{
    let part=all.slice(start+1,i===0?exercises[1]:endB<0?undefined:endB);
    if(old){const q=part.findIndex(r=>/^A[.\s-]+TRADUCCI[ÓO]N/iu.test(r.text));if(q<0)throw Error('No se encuentra el final del texto.');var questions=part.slice(q);part=part.slice(0,q);}
    const cite=part.findIndex(r=>/^\(.+\d[^)]*\)\s*$/u.test(r.text));
    if(cite<1)throw Error('No se encuentra título y referencia.');
    const titleLines=part.slice(0,cite).filter(r=>!/(?:Traducción del texto|Traducció del text)/iu.test(r.text));
    const title=cast(titleLines.map(r=>r.text).join(' '));
    const meta=citation(part[cite].text);
    const tail=part.slice(cite+1);
    const max=Math.max(...tail.filter(r=>r.text.length>12).map(r=>r.size));
    const first=tail.findIndex(r=>r.size>=max-.35&&r.text.length>12);
    if(first<0)throw Error('No se localiza el pasaje latino.');
    let last=first+1;
    while(last<tail.length&&tail[last].size>=max-.35)last++;
    const latinRows=tail.slice(first,last);
    const latin=clean(latinRows.map(r=>r.text).join(' ')).replace(/([\p{L}])\d+(?=\s|\[)/gu,'$1');
    if(latin.length<35)throw Error('Pasaje latino incompleto.');
    const before=cast(tail.slice(0,first).map(r=>r.text).join(' ')).replace(/^[. ]+/u,'');
    const after=cast(tail.slice(last).filter(r=>!/^\d+$|fa referència|hace referencia/iu.test(r.text)).map(r=>r.text).join(' '));
    const note=tail.slice(last).find(r=>/hace referencia/iu.test(r.text));
    const forms=old?clean(questions.map(r=>r.text).join(' ')).match(/formas del texto propuesto:\s*([^.]*)\./iu)?.[1]?.split(',').map(clean)??[]:latinRows.flatMap(r=>r.underlines??[]);
    let underlines=[];
    try {if(forms.length===4)underlines=morphologyMarks(latin,forms);}catch{}
    const warnings=underlines.length===4?[]:['Revisa las cuatro formas morfológicas: no se han localizado con seguridad.'];
    return {year,session,option:['A','B'][i],model:old?'antiguo':'actual',notes:[before,note?cast(note.text):'',after].filter(Boolean).join('\n'),
      doc:{title,...meta,latin,underlines,vocabulary:[],lexical:structuredClone(shared.lexical),preverbBases:shared.preverbBases? [...shared.preverbBases]:null,warnings,
        pauCv:year+' '+session+' / '+['A','B'][i]}};
  });
}

// PDF.js se carga únicamente al importar, desde los recursos de la propia PWA.
export async function readPauCvPdf(file) {
  if(file.size>24*1024*1024)throw Error('PDF demasiado grande (máximo 24 MiB).');
  const pdfjs=await import('../pdfjs/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc=new URL('../pdfjs/pdf.worker.mjs',import.meta.url).href;
  const assets=folder=>new URL('../pdfjs/'+folder+'/',import.meta.url).href;
  const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useSystemFonts:true,
    standardFontDataUrl:assets('standard_fonts'),wasmUrl:assets('wasm'),cMapUrl:assets('cmaps'),cMapPacked:true});
  try {
    const pdf=await task.promise;
    if(pdf.numPages>16)throw Error('Se esperaba un examen, no un cuaderno de más de 16 páginas.');
    const pages=[];
    for(let n=1;n<=pdf.numPages;n++){
      const page=await pdf.getPage(n),viewport=page.getViewport({scale:2});
      const content=await page.getTextContent();
      const groups=[];
      for(const item of content.items){
        if(typeof item.str !== 'string' || !item.str.length)continue;
        const [,, , ,x,y]=pdfjs.Util.transform(viewport.transform,item.transform);
        const size=Math.hypot(item.transform[2],item.transform[3]);
        let group=groups.find(g=>Math.abs(g.y-y)<5);
        if(!group){group={y,items:[]};groups.push(group);}
        group.items.push({text:item.str,x,y,size,width:item.width*2});
      }
      groups.sort((a,b)=>a.y-b.y);
      // Solo la página de opciones modernas necesita imagen para recuperar los subrayados.
      const modern=groups.some(g=>/Opción\s+[AB]/iu.test(g.items.map(t=>t.text).join(' ')));
      let canvas,ctx,pixels;
      if(modern){
        canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
        ctx=canvas.getContext('2d',{willReadFrequently:true});
        await page.render({canvas,canvasContext:ctx,viewport}).promise;
        pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      }
      const rows=groups.map(g=>{
        g.items.sort((a,b)=>a.x-b.x);
        const size=Math.max(...g.items.filter(t=>t.text.trim()).map(t=>t.size),0);
        const items=g.items.filter(t=>t.size>=size*.79 || /^\s+$/u.test(t.text));
        let text='';
        for(const t of items){const prev=items[items.indexOf(t)-1];if(prev&&t.x-prev.x-prev.width>2&&!/\s$/u.test(text))text+=' ';text+=t.text;}
        const underlines=[];
        if(pixels&&size>=11){
          for(const t of items){
            ctx.font='bold '+(t.size*2)+'px "Times New Roman",serif';
            const total=ctx.measureText(t.text).width||1;
            for(const m of t.text.matchAll(letter)){
              const left=t.x+t.width*ctx.measureText(t.text.slice(0,m.index)).width/total;
              const right=t.x+t.width*ctx.measureText(t.text.slice(0,m.index+m[0].length)).width/total;
              const a=Math.max(0,Math.round(left+(right-left)*.12)),b=Math.min(canvas.width-1,Math.round(right-(right-left)*.12));
              let hit=false;
              for(let y=Math.max(0,Math.floor(t.y));y<=Math.min(canvas.height-1,Math.ceil(t.y+size*.55));y++){
                let black=0;
                for(let x=a;x<b;x++){const off=(y*canvas.width+x)*4;if(pixels[off]<90&&pixels[off+1]<90&&pixels[off+2]<90&&pixels[off+3]>120)black++;}
                if(b-a>=5&&black/(b-a)>.84){hit=true;break;}
              }
              if(hit)underlines.push(m[0]);
            }
          }
        }
        return {text:clean(text),size,underlines};
      }).filter(row=>row.text&&!/^\d+$/u.test(row.text));
      pages.push(rows);
      if(canvas){canvas.width=canvas.height=1;}
      page.cleanup();
    }
    return parsePauCvPages(pages);
  } finally { await task.destroy(); }
}
