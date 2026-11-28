import { communities } from './atl-bank-curriculum.js';
import { extractNationalPdfPages } from './pau-national-pdf.js';
import { recognizeNationalExam } from './pau-national-profiles.js';
import { prepareNationalPassage, recognizeNationalQuestions } from './pau-national-parser.js';

const node = (tag, text) => {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  return element;
};
const lines = value => value.split('\n').map(line=>line.trim()).filter(Boolean);
function button(label, action) {
  const control = node('button',label);
  control.type = 'button';
  control.className = 'hbtn';
  control.addEventListener('click',action);
  return control;
}
function field(parent,label,value,options={}) {
  const wrapper = node('label',label);
  wrapper.className = 'field';
  const control = node(options.choices?'select':options.rows?'textarea':'input');
  if (options.rows) control.rows = options.rows;
  if (options.choices) for (const choice of options.choices) {
    const item = node('option',choice||'Sin confirmar');
    item.value=choice;
    control.append(item);
  }
  control.value=value??'';
  wrapper.append(control);
  parent.append(wrapper);
  return control;
}

// The active validation target starts with the 2026 exams and the published 2027 models.
const firstCurrentYear = 2026;
const lexicalFields = {
  phonetics:'Evolución fonética', prefix:'Prefijos', latinism:'Latinismos'
};

function editCandidate(parent, record, getSelection, digest) {
  const {doc}=record;
  const card=node('article');
  card.className='atl-pau-card';
  parent.append(card);
  const active=node('label','Incluir ficha ');
  const include=node('input');
  include.type='checkbox';
  include.checked=true;
  active.append(include);
  card.append(active);
  const title=field(card,'Título de la ficha',doc.title);
  const option=field(card,'Opción o identificación',record.option);
  const community=field(card,'Comunidad autónoma',record.community,
    {choices:['',...communities.filter(name=>name!=='Comunidad Valenciana')]});
  const year=field(card,'Año',record.year);
  const session=field(card,'Convocatoria',record.session,{choices:['','Ordinaria','Extraordinaria']});
  const model=field(card,'Tipo de examen',record.model,{choices:['','Examen oficial','Modelo orientativo']});
  const author=field(card,'Autor',doc.author);
  const work=field(card,'Obra',doc.work);
  const reference=field(card,'Referencia bibliográfica',doc.reference);
  const notes=field(card,'Contextualización',record.notes,{rows:2});
  const latin=field(card,'Texto latino',doc.latin,{rows:5});
  const message=node('p');
  message.setAttribute('role','status');
  let marks=[...doc.underlines];
  const showMarks=()=> { message.textContent=marks.length
    ? 'Morfología · '+marks.map(mark=>mark.exact+' ('+(mark.startUtf16+1)+')').join(', ')
    : 'Sin palabras marcadas para morfología.'; };
  latin.addEventListener('input',()=> {
    if (!marks.length) return;
    marks=[];
    message.textContent='El pasaje ha cambiado. Vuelve a marcar las palabras de morfología.';
  });
  card.append(button('Usar selección del PDF como pasaje',()=>{
    const selection=getSelection().trim();
    if (!selection) { message.textContent='Selecciona primero el pasaje en el texto extraído.'; return; }
    latin.value=selection;
    marks=[];
    showMarks();
  }),button('Marcar selección latina para morfología',()=>{
    const startUtf16=latin.selectionStart,endUtf16=latin.selectionEnd;
    const exact=latin.value.slice(startUtf16,endUtf16);
    if (!/^[\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+)*$/u.test(exact) ||
        /[\p{L}\p{M}]/u.test(latin.value.slice(startUtf16-1,startUtf16)) ||
        /[\p{L}\p{M}]/u.test(latin.value.slice(endUtf16,endUtf16+1))) {
      message.textContent='Selecciona una palabra completa o un grupo de palabras en el texto latino.';
      return;
    }
    if (marks.some(mark=>mark.startUtf16<endUtf16 && mark.endUtf16>startUtf16)) {
      message.textContent='La selección coincide con una marca existente.';
      return;
    }
    marks.push({startUtf16,endUtf16,exact});
    showMarks();
  }),button('Borrar marcas de morfología',()=>{marks=[];showMarks();}),message);
  showMarks();
  const lexical=Object.fromEntries(Object.entries(lexicalFields).map(([kind,label])=>
    [kind,field(card,label+' · un elemento por línea',doc.lexical[kind].join('\n'),{rows:2})]));
  const bases=field(card,'Bases preverbiales · una por línea',doc.preverbBases?.join('\n'),{rows:2});
  const vocabulary=field(card,'Vocabulario oficial · entrada: significado',
    doc.vocabulary.map(item=>item.meaning?item.headword+': '+item.meaning:item.headword).join('\n'),{rows:3});
  card.append(button('Reconocer pregunta seleccionada en el PDF',()=>{
    const result=recognizeNationalQuestions(latin.value,[getSelection().replace(/\s+/gu,' ')]);
    if (!result.accepted.length) {
      message.textContent=result.warnings[0]||'La pregunta requiere selección o transcripción manual.';
      return;
    }
    for (const [kind,control] of Object.entries(lexical))
      control.value=[...new Set([...lines(control.value),...result.lexical[kind]])].join('\n');
    if (result.preverbBases) bases.value=[...new Set([...lines(bases.value),...result.preverbBases])].join('\n');
    marks.push(...result.underlines.filter(mark=>!marks.some(old=>old.startUtf16<mark.endUtf16&&old.endUtf16>mark.startUtf16)));
    showMarks();
    if (result.warnings.length) message.textContent+=' '+result.warnings.join(' ');
  }));
  for (const warning of doc.warnings) card.append(node('p',warning));
  const confirm=node('input');
  confirm.type='checkbox';
  if (record.requiresTranscriptReview) {
    const label=node('label','He cotejado el pasaje con el PDF original ');
    label.append(confirm);
    card.append(label);
  }
  return {included:()=>include.checked,read:()=>{
    if (record.requiresTranscriptReview&&!confirm.checked) throw Error('Confirma el cotejo del pasaje con el PDF original.');
    const raw=latin.value, text=raw.trim(), offset=raw.length-raw.trimStart().length;
    if (!text) throw Error('Completa el texto latino o excluye la ficha.');
    const date=year.value.trim();
    if (date && !/^(?:19|20)\d{2}$/u.test(date)) throw Error('Introduce un año de cuatro cifras o déjalo vacío.');
    const selection=option.value.trim();
    return {
      digest,source:record.source,option:selection,community:community.value,year:date?Number(date):null,session:session.value,model:model.value,
      notes:notes.value.trim(),
      doc:{title:title.value.trim()||(selection?'Texto '+selection:'Texto de Selectividad'),
        author:author.value.trim()||null,work:work.value.trim()||null,reference:reference.value.trim()||null,
        latin:text,underlines:marks.map(mark=>({...mark,startUtf16:mark.startUtf16-offset,endUtf16:mark.endUtf16-offset}))
          .sort((a,b)=>a.startUtf16-b.startUtf16),
        lexical:{preverb:[],...Object.fromEntries(Object.entries(lexical).map(([kind,control])=>[kind,lines(control.value)]))},
        preverbBases:lines(bases.value).length?lines(bases.value):null,
        vocabulary:lines(vocabulary.value).map(line=>{
          const at=line.indexOf(':');
          return {headword:(at<0?line:line.slice(0,at)).trim(),meaning:at<0?null:line.slice(at+1).trim()||null};
        }),warnings:[]}
    };
  }};
}

export function importNationalPau({modal,save,toast}) {
  const input=node('input');
  input.type='file';
  input.accept='.pdf,application/pdf';
  input.multiple=true;
  input.addEventListener('change',async()=>{
    const files=[...input.files];
    if (!files.length) return;
    const root=node('div');
    root.className='atl-pau-import';
    const status=node('p','Leyendo los PDF…');
    status.setAttribute('role','status');
    root.append(status);
    let saving=false;
    const records=[],urls=[],seen=new Map();
    let duplicates=0, manual=0;
    const summary=node('p');
    const updateSummary=()=>{
      summary.textContent=[
        files.length+(files.length===1?' archivo':' archivos'),
        records.length+(records.length===1?' ficha propuesta':' fichas propuestas'),
        manual+(manual===1?' archivo con incidencias':' archivos con incidencias'),
        duplicates+(duplicates===1?' duplicado en el lote.':' duplicados en el lote.')
      ].join(' · ');
    };
    const popup=modal('Importar PDF · Selectividad',root,[{label:'Cancelar'}],
      {width:'min(1000px,96vw)',noFocus:true,beforeClose:()=>{
        if (saving) return false;
        urls.forEach(url=>URL.revokeObjectURL(url));
        return true;
      }});
    const assets=new URL('../pdfjs/',import.meta.url);
    for (const [index,file] of files.entries()) {
      if (!root.isConnected) return;
      status.textContent='Leyendo PDF '+(index+1)+' de '+files.length+'…';
      const section=node('section');
      section.className='atl-pau-pair';
      section.append(node('h3',file.name));
      root.append(section);
      let extraction,result,digest='';
      try {
        const header=new TextDecoder().decode(await file.slice(0,1024).arrayBuffer());
        const html=/^\s*<(?:!doctype html|html)\b/iu.test(header);
        if (html || !header.includes('%PDF-')) {
          manual++;
          section.append(node('p',html
            ? 'El archivo contiene una página HTML. Vuelve a descargar el PDF del examen.'
            : 'El archivo carece de una cabecera PDF válida.'));
          continue;
        }
        if (file.size<=24*1024*1024) {
          const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
          digest=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
          if (seen.has(digest)) {
            duplicates++;
            section.append(node('p','Archivo idéntico a «'+seen.get(digest)+'» en este lote.'));
            continue;
          }
          seen.set(digest,file.name);
        }
        if (!root.isConnected) return;
        const original=node('a','Abrir PDF original');
        original.href=URL.createObjectURL(file.slice(0,file.size,'application/pdf'));
        urls.push(original.href);
        original.target='_blank';
        original.rel='noopener noreferrer';
        section.append(original);
        const pdfjs=await import(new URL('pdf.mjs',assets).href);
        extraction=await extractNationalPdfPages(file,{pdfjs,
          workerSrc:new URL('pdf.worker.mjs',assets).href,assetRoot:assets.href});
        result=recognizeNationalExam(extraction);
      } catch(error) {
        result={metadata:{},records:[],warnings:[error.message||String(error)]};
      }
      if (!root.isConnected) return;
      if (result.valencian) {
        section.append(node('p','Examen valenciano. Utiliza «Importar PDF · PAU CV».'));
        continue;
      }
      for (const warning of result.warnings) section.append(node('p',warning));
      const details=node('details');
      details.append(node('summary','Seleccionar pasajes y preguntas del PDF'));
      const source=field(details,'Texto extraído del PDF','',{rows:12});
      source.readOnly=true;
      const flat=extraction?.pages.map(page=>page.map(row=>row.text).join('\n')).join('\n\n')??'';
      source.value=flat;
      const view=field(details,'Orden de lectura','Por filas',{choices:['Por filas','Por columnas']});
      view.addEventListener('change',()=>{
        source.value=view.value==='Por filas'?flat:
          (extraction?.columns??[]).flat().map(rows=>rows.map(row=>row.text).join('\n')).join('\n\n');
      });
      section.append(details);
      const selection=()=>source.value.slice(source.selectionStart,source.selectionEnd);
      const cards=node('div');
      const add=record=>{records.push(editCandidate(cards,record,selection,digest));updateSummary();};
      section.append(button('Añadir pasaje manualmente',()=>{
        details.open=true;
        const selected=selection().trim();
        const record=prepareNationalPassage({latin:selected||'…'});
        if (!selected) record.doc.latin='';
        const sourceKey=JSON.stringify(['selection',view.value,source.selectionStart,source.selectionEnd,selected]);
        add({...result.metadata,...record,...(selected&&{source:sourceKey})});
      }),cards);
      const {community,year}=result.metadata;
      const isCurrent=Boolean(community&&(Number.isInteger(year)?year>=firstCurrentYear:
        result.records.length && result.records.every(record=>record.currentLayout)));
      const addProposals=()=> {
        for (const record of result.records) add({...record,source:'profile:'+(record.option||'único')});
      };
      if (isCurrent && result.records.length) {
        addProposals();
        if (result.warnings.length || result.records.some(record=>
          record.requiresTranscriptReview || record.doc.warnings.length)) manual++;
      } else {
        details.open=true;
        manual++;
        if (result.records.length) {
          const expired=result.metadata.year && result.metadata.year<firstCurrentYear;
          section.append(node('p',expired?'Examen histórico. La importación se prepara manualmente.'
            :'Modelo vigente sin confirmar. La importación se prepara manualmente.'));
          const suggest=button('Mostrar propuestas para cotejo',()=>{
            suggest.remove();
            addProposals();
          });
          section.append(suggest);
        }
      }
    }
    const submit=button('Guardar fichas seleccionadas',async()=>{
      if (saving) return;
      saving=true;
      submit.disabled=true;
      root.inert=true;
      try {
        const selected=records.filter(record=>record.included()).map(record=>record.read());
        if (!selected.length) throw Error('Selecciona al menos una ficha.');
        const result=await save(selected);
        saving=false;
        popup.close();
        toast(result.saved+' fichas nuevas. '+result.duplicates+' ya estaban en el banco.');
      } catch(error) {
        status.textContent=error.message||String(error);
        status.scrollIntoView({block:'nearest'});
      } finally {
        saving=false;
        submit.disabled=false;
        root.inert=false;
      }
    });
    status.textContent='Revisa cada ficha con el PDF original antes de guardar.';
    updateSummary();
    root.append(summary,submit);
  });
  input.click();
}
