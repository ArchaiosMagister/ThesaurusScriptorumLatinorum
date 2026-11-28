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
const lexicalItem=/^[\p{L}\p{M}]+(?:[ -][\p{L}\p{M}]+)*$/u;

function lateralLexicalItems(rows, kind) {
  const groups=[];
  for (const {firstCell:cell} of rows) {
    if (!cell) continue;
    const value=cast(cell.text);
    if (!lexicalItem.test(value) || value.split(/\s+/u).length>(kind==='latinism'?5:1)) continue;
    let group=groups.find(entries=>Math.abs(entries[0].x-cell.x)<=2);
    if (!group) { group=[]; groups.push(group); }
    group.push(cell);
  }
  const candidates=groups.filter(entries=>{
    if (entries.length!==4) return false;
    if (entries.some(cell=>cell.separated)) return true;
    const edge=Math.max(...entries.map(cell=>cell.right));
    return rows.filter(row=>row.firstCell?.x>edge+8 && row.text.length>35).length>=2;
  });
  return candidates.length===1 ? candidates[0].map(cell=>cast(cell.text)) : [];
}

function lexicalParts(rows) {
  const start=rows.findIndex(r=>/^PREGUNTA\s+3\s*$/iu.test(r.text));
  if(start<0)throw Error('No se reconoce la pregunta de léxico.');
  const end=rows.findIndex((r,i)=>i>start&&/^PREGUNTA\s+4\s*$/iu.test(r.text));
  const block=rows.slice(start+1,end<0?undefined:end);
  const boundaries=['A','B','C','D'].map(id=>block.findIndex(r=>new RegExp('Cuestión\\s+'+id+'\\s*:','iu').test(r.text)));
  if(boundaries.some((n,i)=>n<0||(i&&n<=boundaries[i-1])))throw Error('No se reconocen los cuatro apartados de léxico.');
  const result=emptyLex();
  let lateral=false;
  ['phonetics','prefix','latinism'].forEach((kind,i)=>{
    const part=block.slice(boundaries[i]+1,boundaries[i+1]);
    const heading=/NORMAS FONÉTICAS|SIGNIFICADO QUE APORTA|SIGNIFICAT QUE APORTA|ORACIÓ\s*\/\s*ORACIÓN|PALABRA LATINA|PALABRA PATRIMONIAL|PREFIX\s*\/\s*PREFIJO|LATINISMO/iu;
    const lastHeader=part.findLastIndex(r=>heading.test(r.text));
    const vertical=lastHeader<0 ? [] : part.slice(lastHeader+1).map(r=>cast(r.text)).filter(s=>lexicalItem.test(s));
    const lateralHeading=[
      /NORMAS FONÉTICAS|NORMES FONÈTIQUES/iu,
      /PREFIX D.ORIGEN LLAT[IÍ]|PREFIJO DE ORIGEN LATINO/iu,
      /(?:EXPRESIONES LATINAS|EXPRESSIONS LLATINES).*(?:ORACI[ÓO]N|ORACIÓ)/iu
    ][i];
    result[kind]=vertical.length===4 ? vertical :
      lateralHeading.test(part.map(r=>r.text).join(' ')) ? lateralLexicalItems(part,kind) : [];
    if(result[kind].length!==4)throw Error('Se esperaban cuatro términos de '+kind+'.');
    lateral ||= vertical.length!==4;
  });
  const preverb=block.slice(boundaries[3]+1).map(r=>r.text).join(' ');
  const es=preverb.match(/Componga por modificación preverbial[\s\S]*/iu)?.[0]??'';
  const bases=[...es.matchAll(/base léxica(?:\s+de)?\s+([\p{L}\p{M}]+)/giu)].map(m=>m[1]);
  if(bases.length!==2)throw Error('No se reconocen las dos bases preverbiales.');
  return {lexical:result,preverbBases:bases,lateral};
}
function translationBounds(rows,lateral) {
  if (lateral) {
    const context=rows[0];
    const first=rows.findIndex(row=>row.face && row.face!==context?.face && row.x<context.x-1 && row.text.length>12);
    if (first<1 || !rows.slice(0,first).some(row=>/\/\s*$/u.test(row.text)))
      throw Error('No se localiza el inicio del pasaje entre los dos contextos.');
    const firstRow=rows[first];
    let last=first+1;
    while (last<rows.length && rows[last].face===firstRow.face && Math.abs(rows[last].x-firstRow.x)<=3) last++;
    if (!/[.!?…\]]$/u.test(rows[last-1].text)) throw Error('No se localiza el final del pasaje.');
    return [first,last];
  }
  const max=Math.max(...rows.filter(row=>row.text.length>12).map(row=>row.size));
  const first=rows.findIndex(row=>row.size>=max-.35&&row.text.length>12);
  if (first<0) throw Error('No se localiza el pasaje latino.');
  let last=first+1;
  while(last<rows.length&&rows[last].size>=max-.35)last++;
  return [first,last];
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
    const [first,last]=translationBounds(tail,shared.lateral);
    const latinRows=tail.slice(first,last);
    const latin=clean(latinRows.map(r=>r.text).join(' ')).replace(/([\p{L}])\d+(?=\s|\[)/gu,'$1');
    if(latin.length<35)throw Error('Pasaje latino incompleto.');
    const before=cast(tail.slice(0,first).map(r=>r.text).join(' ')).replace(/^[. ]+/u,'');
    const after=cast(tail.slice(last).filter(r=>!/^\d+$|fa referència|hace referencia/iu.test(r.text)).map(r=>r.text).join(' '));
    const note=tail.slice(last).find(r=>/hace referencia/iu.test(r.text));
    const forms=old?clean(questions.map(r=>r.text).join(' ')).match(/formas del texto propuesto:\s*([^.]*)\./iu)?.[1]?.split(',').map(clean)??[]:
      latinRows.flatMap(r=>shared.lateral && r.smallUnderlines ? r.smallUnderlines : r.underlines??[]);
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
        group.items.push({text:item.str,x,y,size,width:item.width*2,face:item.fontName});
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
        if(pixels&&size>=9.5){
          for(const t of items){
            const embedded=size<11&&page.commonObjs.has(t.face)?page.commonObjs.get(t.face)?.loadedName:'';
            if (size<11 && !embedded) continue;
            ctx.font=embedded ? (t.size*2)+'px "'+embedded+'"' : 'bold '+(t.size*2)+'px "Times New Roman",serif';
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
        const visible=items.filter(item=>item.text.trim());
        const gap=visible.findIndex((item,i)=>i>0 && item.x-visible[i-1].x-visible[i-1].width>size*2+2);
        const left=gap>0?visible.slice(0,gap):visible;
        const firstCell=left.length ? {
          x:left[0].x, right:left.at(-1).x+left.at(-1).width,
          separated:gap>0, text:left.map(item=>item.text).join(' ')
        } : null;
        return {text:clean(text),size,underlines:size>=11?underlines:[],
          smallUnderlines:size<11?underlines:null,firstCell,x:visible[0]?.x,face:visible[0]?.face};
      }).filter(row=>row.text&&!/^\d+$/u.test(row.text));
      pages.push(rows);
      if(canvas){canvas.width=canvas.height=1;}
      page.cleanup();
    }
    return parsePauCvPages(pages);
  } finally { await task.destroy(); }
}
