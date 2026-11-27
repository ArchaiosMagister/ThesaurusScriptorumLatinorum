import { parseExplicitNationalRows, prepareNationalPassage, nationalMorphologyMarks } from './pau-national-parser.js';
import { scanCastillaLeonRows, prepareCastillaLeonPassage } from './pau-national-cyl.js';

const institutions = [
  ['Comunidad Valenciana', /comunidad valenciana|comunitat valenciana|conselleria d.educaci[oó]/iu],
  ['Andalucía', /andaluc[ií]a, ceuta, melilla/iu],
  ['Aragón', /universidad de zaragoza|\bUNIZAR\b|ejercicio de: lat[ií]n ii.*lea con detenimiento el siguiente texto.*An[aá]lisis morfol[oó]gico del siguiente t[eé]rmino/iu],
  ['Asturias', /universidad de oviedo|ejercicio 2 \(morfolog[ií]a\..*sede:.*ejercicio 1 \(traducci[oó]n\./iu],
  ['Canarias', /universidad de la laguna|universidad de las palmas|distrito universitario de canarias|materia: lat[ií]n ii.*traducci[oó]n, comprensi[oó]n y an[aá]lisis de un texto.*1\.2 Morfolog[ií]a/iu],
  ['Cantabria', /universidad de cantabria/iu],
  ['Castilla-La Mancha', /castilla.la mancha|\bUCLM\b|realiza la traducci[oó]n de uno de estos textos:.*Texto A-.*Texto B-.*PREGUNTA 2 .*An[aá]lisis morfosint[aá]ctico/iu],
  ['Castilla y León', /castilla y le[oó]n/iu],
  ['Cataluña', /generalitat de catalunya|llengua i cultura llatines.*s[eè]rie/iu],
  ['Comunidad de Madrid', /universidades p[uú]blicas de la comunidad de madrid/iu],
  ['Extremadura', /universidad de extremadura/iu],
  ['Galicia', /\bCIUG\b|comprensi[oó]n e interpretaci[oó]n de textos.*cuesti[oó]ns/iu],
  ['Islas Baleares', /universitat de les illes balears|llat[ií] ii model \d.*indicau/iu],
  ['La Rioja', /universidad.{0,25}de la rioja/iu],
  ['Navarra', /universidad p[uú]blica de navarra/iu],
  ['País Vasco', /unibertsitatean sartzeko/iu],
  ['Región de Murcia', /universidad de murcia|universidad polit[eé]cnica de cartagena|308 [–-] LAT[IÍ]N II.*PAU20\d{2}.*cuestiones 4 y 5 son comunes/iu]
];

const text = row => row.text;
const join = rows => rows.map(text).join(' ');
const digits = /^\d+(?:\s+\d+)*$/u;
const word = '[\\p{L}\\p{M}]+';
const group = new RegExp('^'+word+'(?: (?:'+word+'))?$', 'u');
const terms = value => value.split(/\s*,\s*|\s+(?:y|e)\s+/iu).map(s=>s.trim()).filter(Boolean);
const quoted = value => [...value.matchAll(/["“‘«]([\p{L}\p{M}]+(?:[ -][\p{L}\p{M}]+)*)["”’»]/gu)].map(m=>m[1]);
const numbered = (rows, pattern) => {
  const blocks = [];
  for (const row of rows) {
    const match = pattern.exec(row.text);
    if (match) blocks.push({match, header:row, rows:[]});
    else blocks.at(-1)?.rows.push(row);
  }
  return blocks;
};

function bounds(rows, start, end, {optional=false}={}) {
  const from = rows.findIndex(row=>start.test(row.text));
  const to = rows.findIndex((row,i)=>i>from && end.test(row.text));
  if ((from<0 || to<0) && optional) return [];
  if (from<0 || to<0) throw Error('Faltan límites reconocibles del apartado de traducción.');
  return rows.slice(from+1,to);
}

// A visible gap often separates context and translation. Prefer a documented
// formatting distinction where the profile supplies one.
function separate(rows, isContext) {
  const dense = rows.filter(row=>!digits.test(row.text));
  if (dense.length<2) throw Error('Falta el contexto o el pasaje.');
  let index = isContext ? dense.findIndex(row=>!isContext(row,dense[0])) : -1;
  if (index<1) {
    const gaps = dense.map((row,i)=>i>0 && i<4 ? row.y-dense[i-1].y : 0);
    const biggest = Math.max(...gaps);
    if (biggest > dense[0].size*1.55) index = gaps.indexOf(biggest);
  }
  if (index<1) throw Error('Confirma dónde termina la contextualización.');
  return {latinRows:dense.slice(index),notes:join(dense.slice(0,index))};
}

function before(rows, pattern) {
  const at = rows.findIndex(row=>pattern.test(row.text));
  if (at<1) throw Error('No se reconoce el final del pasaje.');
  return [rows.slice(0,at),rows.slice(at)];
}

function notesVocabulary(rows) {
  const entries = [];
  for (const row of rows) {
    const match = /^(?:\d+\.\s*)?([^:]{1,100}):\s*(.+)$/u.exec(row.text);
    if (match) entries.push({headword:match[1].trim(),meaning:match[2].trim()});
    else if (entries.length) entries.at(-1).meaning += ' '+row.text;
  }
  return entries;
}

function passage({latinRows, latin, notes, option='', author='', work='', reference='', forms=[], vocabulary=[], lexical={}, warnings=[]}) {
  const original = latin ?? latinRows.filter(row=>!digits.test(row.text)).map(text).join('\n');
  const result = prepareNationalPassage({latin:original,author,work,reference,notes});
  const marks = nationalMorphologyMarks(original, forms);
  result.doc.underlines = marks.underlines;
  result.doc.warnings.push(...marks.warnings,...warnings);
  result.doc.vocabulary = vocabulary;
  Object.assign(result.doc.lexical,lexical);
  return {...result,option};
}

function castillaLeon(pages) {
  const scan = scanCastillaLeonRows(pages);
  return scan.options.map(option=>{
    // A Spanish title is set in a different face in this layout. Footnote
    // callouts are superscript runs and their definitions follow the text.
    const rows = option.candidateRows.map(r=>pages[r.page-1][r.row]);
    const mainRows = rows.findIndex((row,i)=>i>0 && row.runs[0].fontName!==rows[0].runs[0].fontName);
    const noteAt = rows.findIndex((row,i)=>i>mainRows && /^(?:\d+\s*)?[\p{L}]+,\s+-/u.test(row.text));
    if (mainRows<1) throw Error('Confirma los límites del texto de Castilla y León.');
    const item = prepareCastillaLeonPassage(scan,option.option,{start:mainRows,end:noteAt<0?rows.length:noteAt});
    item.doc.latin = rows.slice(mainRows,noteAt<0?undefined:noteAt).filter(row=>!digits.test(row.text)).map(text).join('\n');
    item.doc.vocabulary = noteAt<0?[]:notesVocabulary(rows.slice(noteAt));
    item.notes = item.doc.title;
    item.doc.title = '';
    const lexicalRows = bounds(pages.flat(),/^APARTADO 2:/iu,/^APARTADO 3:/iu,{optional:true});
    const questions = numbered(lexicalRows,/^2\.(\d+)\s/u);
    const context = questions.find(q=>/expresi[oó]n latina/iu.test(q.match.input));
    if (context) {
      const expression = [...join(context.rows).matchAll(/‘([\p{L}\p{M} ]+)’/gu)];
      if (expression.length===1) item.doc.lexical.latinism=[expression[0][1]];
    }
    return item;
  });
}

function andalucia(rows) {
  const part = bounds(rows,/^Pregunta 1 \(Traducci[oó]n de un texto latino\)/iu,/^Pregunta 2 \(An[aá]lisis morfol[oó]gico\)/iu);
  const options = numbered(part,/^OPCI[ÓO]N (\d+)\. Traduzca el siguiente texto de ([^,]+), (.+?)(?: ([IVXLCDM\d][\dIVXLCDM ,.\-]*))?\.$/iu);
  if (options.length!==2) throw Error('Confirma las opciones de traducción de Andalucía.');
  return options.map(({match,rows:lines})=>{
    const [latinRows,glosses] = before(lines.slice(1),/^\S+(?:\s+acus\.)?[^:]*:\s+(?:participio|“)/iu);
    return typedMarks(passage({latinRows,notes:lines[0].text,option:match[1],author:match[2],work:match[3],reference:match[4],
      vocabulary:notesVocabulary(glosses)}),latinRows,'underline');
  });
}

function madrid(rows) {
  const part = bounds(rows,/^BLOQUE I\. TEXTO:/iu,/^BLOQUE II\. ETIMOLOG[IÍ]A/iu);
  const lexicalPart = bounds(rows,/^BLOQUE II\. ETIMOLOG[IÍ]A/iu,/^BLOQUE III\. LITERATURA/iu,{optional:true});
  const options = numbered(part,/^OPCI[ÓO]N ([AB])$/u);
  if (options.length!==2) throw Error('Confirma la asignación de opciones de Madrid.');
  const lexical = numbered(lexicalPart,/^OPCI[ÓO]N ([AB])\.4\b/u);
  const linked=rows.some(row=>/^BLOQUE II:\s*[^.]*\b(?:texto|opci[oó]n) elegid[oa]\b/iu.test(row.text));
  const etyma=new Map(lexical.flatMap(({match,rows})=>{
    const form=join(rows).match(/palabra latina ([\p{L}\p{M}]+) en su evoluci[oó]n al castellano/iu)?.[1];
    return form?[[match[1],form]]:[];
  }));
  const independent=!linked&&etyma.size
    ? 'Léxico independiente del texto elegido. Étimos para revisión: '+[...etyma].map(([option,form])=>option+'.4 '+form).join(', ')+'.'
    : '';
  return options.map(({match,rows:lines})=>{
    const option=match[1];
    const [body,sourceAndQuestions] = before(lines,/^\([^()]+\d[^()]*\)$/u);
    const {latinRows,notes} = separate(body,(row,first)=>row.runs[0].fontName===first.runs[0].fontName);
    const end = join(sourceAndQuestions).match(/Analice morfol[oó]gicamente las palabras (.+?)\s*,?\s+indicando exclusivamente/iu);
    const forms=end ? terms(end[1]) : [];
    const form = linked?etyma.get(option):undefined;
    const noteLines=sourceAndQuestions.slice(1,sourceAndQuestions.findIndex(row=>/^PREGUNTAS:$/u.test(row.text)));
    const vocabulary=notesVocabulary(join(noteLines).replace(/^NOTAS:\s*/u,'').split(/\s*\d+\.\s*/u)
      .filter(line=>line.includes(':')).map(text=>({text:text.replace(/;\s*$/u,'')})));
    return passage({latinRows,notes,option,reference:sourceAndQuestions[0].text.slice(1,-1),forms,vocabulary,
      lexical:{phonetics:form?[form]:[]},warnings:[...(!forms.length?['Revisa la morfología de esta opción.']:[]),
        ...(independent?[independent]:[])]});
  });
}

function cataluna(rows) {
  const part = bounds(rows,/^Feu la versi[oó] del text seg[uü]ent:$/iu,/^2\. Exercici de morfosintaxi/iu);
  const [body,vocabulary] = before(part,/^L[eè]xic subratllat/iu);
  const [first,...lines] = body;
  const source=lines.pop().text.match(/^([^.]*)\. (.*?),\s*(\d+)$/u);
  if (!source || !lines.length) throw Error('Confirma la referencia bibliográfica y el pasaje.');
  const forms = rows.flatMap(row=>{
    const word=row.text.match(/^\w\) Analitzeu morfosint[aà]cticament la forma pronominal ([\p{L}\p{M}]+)\.$/iu)?.[1];
    const group=row.text.match(/^\w\) Analitzeu morfol[oò]gicament el sintagma (.+?) i digueu/iu)?.[1];
    return word?[word]:group?.match(/[\p{L}\p{M}]+/gu)??[];
  });
  return [passage({latinRows:lines,notes:first.text,author:source[1],work:source[2],reference:source[3],
    forms,vocabulary:notesVocabulary(vocabulary.slice(1).filter(row=>!digits.test(row.text)))})];
}

function galicia(pages) {
  const copies = pages.filter(page=>page.some(row=>/^TEXTO:$/iu.test(row.text))).map(page=>({
    rows:page, latinRows:bounds(page,/^TEXTO:$/iu,/^CUESTI[ÓO]N(?:E)?S:$/iu)
  }));
  if (!copies.length || new Set(copies.map(copy=>join(copy.latinRows))).size!==1)
    throw Error('Las versiones lingüísticas requieren cotejo.');
  const copy = copies.find(copy=>copy.rows.some(row=>/^CUESTIONES:$/iu.test(row.text))) ?? copies[0];
  const noteRows=bounds(copy.rows,/^CONTEXTO:$/iu,/^TEXTO:$/iu);
  const context=join(noteRows).replace(/, que (?:usted|vostede) explica.*$/iu,'.');
  const lexical=bounds(copy.rows,/^PREGUNTA 3\./iu,/^PREGUNTA 4\./iu,{optional:true});
  const exercises=numbered(lexical,/^3\.(\d)\.\s+/u);
  const prefix=exercises.find(q=>/prefijo de origen latino/iu.test(q.match.input));
  const latinism=exercises.find(q=>/significado de las siguientes expresiones latinas/iu.test(q.match.input));
  return [passage({latinRows:copy.latinRows,notes:context,
    author: /f[aá]bula de Fedro/iu.test(context)?'Fedro':'',
    lexical:{prefix:prefix?quoted(prefix.match.input+' '+join(prefix.rows)):[],
      latinism:latinism?quoted(latinism.match.input+' '+join(latinism.rows)):[]}})];
}

function extremadura(rows) {
  const part=bounds(rows,/^1\.1\. TRADUCCI[ÓO]N CON DICCIONARIO DEL SIGUIENTE TEXTO/iu,/^1\.2\. AN[ÁA]LISIS MORFOL[ÓO]GICO/iu);
  const source=part[0].text.match(/^([^,]+),\s*(.+?)\s+([\d,.]+)\.$/u);
  const contextEnd=part.findIndex(row=>/\]$/u.test(row.text));
  const start=part.findIndex((row,i)=>i>contextEnd&&!digits.test(row.text));
  const end=part.findIndex((row,i)=>i>=start&&/[.!?]$/u.test(row.text)&&digits.test(part[i+1]?.text??'')&&/^\d$/u.test(part[i+1].text)&&/\bDel verbo\b/iu.test(part[i+2]?.text??''));
  if (!source || contextEnd<1 || start<=contextEnd || end<start) throw Error('Confirma los límites del texto y sus notas.');
  const morph=bounds(rows,/^1\.2\. AN[ÁA]LISIS MORFOL[ÓO]GICO/iu,/^1\.3\. AN[ÁA]LISIS SINT[ÁA]CTICO/iu);
  const forms=[...join(morph).matchAll(/(?:nominativo y genitivo\)|identificando la conjugaci[oó]n):\s*([^()]+)\(/giu)].flatMap(match=>terms(match[1])).filter(form=>group.test(form));
  const phonetics=join(bounds(rows,/^2\.2\. EVOLUCI[ÓO]N FON[ÉE]TICA/iu,/^APARTADO 3 \(2 puntos\)\. LITERATURA LATINA,/iu));
  const etyma=[...phonetics.matchAll(/(?:vocablo latino|remite al lat[ií]n) ([\p{L}\p{M}]+)\. Explica la evoluci[oó]n fon[eé]tica/giu)].map(match=>match[1]);
  const vocabulary=part.slice(end+1).flatMap(row=>{
    const gloss=row.text.match(/^([\p{L}\p{M}]+(?: [\p{L}\p{M}]+)?)\. ((?:Del verbo|Acusativo) .+)$/iu);
    return gloss?[{headword:gloss[1],meaning:gloss[2]}]:[];
  });
  return [passage({latinRows:part.slice(start,end+1),notes:join(part.slice(1,contextEnd+1)),
    author:source[1],work:source[2],reference:source[3],forms,vocabulary,lexical:{phonetics:etyma},
    warnings:['Coteja las notas numeradas y los espacios contiguos a las llamadas.']})];
}

function typedMarks(item, rows, style, fontName) {
  let position=0;
  const marks=[];
  for (const row of rows.filter(row=>!digits.test(row.text))) {
    for (const match of row.text.matchAll(/[\p{L}\p{M}]+/gu)) {
      const end=match.index+match[0].length;
      const runs=row.runs.filter(run=>run.end>match.index && run.start<end &&
        row.text.slice(Math.max(run.start,match.index),Math.min(run.end,end)).trim());
      if (runs.length && runs.every(run=>run[style] || (fontName && run.fontName===fontName))) {
        marks.push({startUtf16:position+match.index,endUtf16:position+end,exact:match[0]});
      }
    }
    position+=row.text.length+1;
  }
  if (marks.length) item.doc.underlines=marks;
  else item.doc.warnings.push('Revisa en el PDF las palabras marcadas para morfología.');
  return item;
}

function baleares(pages) {
  const options=pages.flatMap(page=>numbered(page,/^Text ([AB])$/u));
  if (options.length!==2) throw Error('Confirma las dos opciones de traducción.');
  return options.map(({match,rows})=>{
    const [body,glossary]=before(rows,/^Notes:$/u);
    const {latinRows,notes}=separate(body);
    const source=latinRows.pop().text.match(/^([^,]+),\s*(.*?)\s+(\d.+)$/u);
    if (!source || !latinRows.length) throw Error('Confirma la referencia del texto.');
    const vocabulary=notesVocabulary(bounds(glossary,/^Notes:$/u,/^Q[uü]estions:$/iu));
    return typedMarks(passage({latinRows,notes,option:match[1],author:source[1],work:source[2],reference:source[3],vocabulary}),latinRows,'underline');
  });
}

function paisVasco(pages) {
  const options=pages.filter(page=>page.some(row=>/^A\.[12]$/u.test(row.text)));
  if (options.length!==2) throw Error('Confirma las dos opciones de traducción.');
  const shared=pages.find(page=>page.some(row=>/^BLOQUE B: Identificaci[oó]n/iu.test(row.text)));
  const lexicalRows=shared?.map(text)??[];
  const latinismStart=lexicalRows.findIndex(line=>/^Escribe un texto breve /iu.test(line));
  const latinismEnd=lexicalRows.findIndex((line,i)=>i>latinismStart&&/^3\.ª pregunta/iu.test(line));
  const latinism=latinismStart>=0&&(latinismEnd===-1 || latinismEnd>latinismStart)
    ? lexicalRows.slice(latinismStart+3,latinismEnd===-1?undefined:latinismEnd).flatMap(line=>line.match(/^[a-d]\)\s*([\p{L}\p{M} ]+)\.?$/u)?.slice(1)??[])
    : [];
  return options.map(page=>{
    const option=page.find(row=>/^A\.[12]$/u.test(row.text)).text;
    const body=bounds(page,/^1\.ª pregunta: Traduce/iu,/^Notas$/iu).filter(row=>!digits.test(row.text)&&!/^5 puntos$/iu.test(row.text));
    const lastFace=body.at(-1).runs[0].fontName;
    const boundary=body.findLastIndex(row=>row.runs[0].fontName!==lastFace)+1;
    if (boundary<1) throw Error('Confirma el inicio de la traducción.');
    const source=body.at(-1).text.match(/\s+\(([^()]+)\)\.?$/u);
    if (!source) throw Error('Confirma el final de la traducción.');
    const latinRows=body.slice(boundary);
    latinRows[latinRows.length-1]={...latinRows.at(-1),text:latinRows.at(-1).text.slice(0,source.index)};
    const morph=page.find(row=>/^3\.ª pregunta: Analiza morfol[oó]gicamente las palabras /iu.test(row.text));
    const forms=morph?terms(morph.text.replace(/^.* las palabras /u,'').replace(/\.$/u,'')):[];
    return passage({latinRows,notes:join(body.slice(0,boundary)),option,reference:source[1],forms,lexical:{latinism}});
  });
}

function cantabria(rows) {
  const part=bounds(rows,/^APARTADO 1 \[6 puntos\]/iu,/^Pregunta obligatoria 1:/iu);
  const options=numbered(part,/^Texto ([12]): (.+)$/u);
  if (options.length!==2) throw Error('Confirma los dos pasajes de traducción.');
  const lexical=bounds(rows,/^Pregunta obligatoria 4\b/iu,/^Pregunta obligatoria 5\b/iu,{optional:true});
  const list=lexical.at(-1)?.text;
  const phonetics=list&&group.test(list)?list.split(' '):[];
  const excerpts=bounds(rows,/^Pregunta obligatoria 5\b/iu,/^Universidad de Cantabria\. \d{4}, PAU/u,{optional:true});
  const latinism=excerpts.flatMap(row=>row.runs.filter(run=>run.italic)
    .map(run=>run.text.trim()).filter(value=>group.test(value)&&value.includes(' ')));
  return options.map(({match,rows:body})=>{
    const [beforeSource,sourceRows]=before(body,/^(?:[^,]+,\s*[^,]+,\s*libro\b|[\p{L}]+ \d+, \d+-\d+$)/iu);
    const rightmostTitle=beforeSource.filter(row=>!digits.test(row.text))[0];
    const continuation=!/[.!?]$/u.test(match[2]) && rightmostTitle && /^\S+$/u.test(rightmostTitle.text);
    const notes=[match[2],continuation&&rightmostTitle.text].filter(Boolean).join(' ');
    const latinRows=beforeSource.filter(row=>!digits.test(row.text) && !/^\d+\s+\d+\./u.test(row.text) &&
      !(continuation&&row===rightmostTitle));
    const reference=sourceRows[0].text;
    const glossary=[...beforeSource.filter(row=>/^\d+\s+\d+\./u.test(row.text)),...sourceRows.slice(1)]
      .map(row=>({text:row.text.replace(/^\d+\s+(?=\d+\.)/u,'')}));
    const vocabulary=glossary.flatMap(({text})=>{
      const entry=text.match(/^\d+\.\s*([^:=]+?)\s*([:=])\s*(.+)$/u);
      return entry?[{headword:entry[1],meaning:entry[3]}]:[];
    });
    return typedMarks(passage({latinRows,notes,option:match[1],reference,vocabulary,
      author:reference.split(/,| (?=\d)/u)[0],work:reference.split(',')[1]?.includes('Breviario')?reference.split(',')[1].trim():'',
      lexical:{phonetics,latinism},
      warnings:latinism.length?['Coteja las notas marginales del pasaje.']:
        ['Coteja las notas marginales y los latinismos en los dos textos periodísticos.']}),latinRows,'bold');
  });
}

function canarias(rows) {
  const part=bounds(rows,/^1\. TRADUCCI[ÓO]N, COMPRENSI[ÓO]N Y AN[ÁA]LISIS/iu,/^2\. (?:EL )?L[ÉE]XICO\b/iu);
  const options=numbered(part,/^OPCI[ÓO]N ([AB])$/u);
  if (options.length!==2) throw Error('Confirma los dos pasajes de traducción.');
  const etymon=rows.find(row=>/^2\.3 Explica la evoluci[oó]n fon[eé]tica al espa[nñ]ol de /iu.test(row.text))
    ?.text.match(/ de ([\p{L}\p{M}]+) \(/u)?.[1];
  return options.map(({match,rows:body})=>{
    const start=body.findIndex(row=>/^1\.1 Traducci[oó]n/iu.test(row.text));
    const [contextAndLatin,glossary]=before(body.slice(start+1),/^NOTAS$/iu);
    const {latinRows,notes}=separate(contextAndLatin,(row,first)=>Math.abs(row.size-first.size)<1);
    const morphology=bounds(body,/^1\.2 Morfolog[ií]a/iu,/^1\.3 Analiza/iu);
    const forms=morphology.map(text).filter(form=>new RegExp('^'+word+'$','u').test(form) &&
      latinRows.some(row=>row.text.toLowerCase().includes(form.toLowerCase())));
    return passage({latinRows,notes,option:match[1],forms,lexical:{phonetics:etymon?[etymon]:[]},
      vocabulary:notesVocabulary(glossary.slice(1,glossary.findIndex(row=>/^1\.2 Morfolog[ií]a/iu.test(row.text)))),
      warnings:['Revisa las formas de la tabla y el apartado léxico compartido.']});
  });
}

function stripScoring(row) {
  const strip=value=>value.replace(/\s*\(\d+\)/gu,'');
  return {...row,text:strip(row.text),runs:row.runs.map(run=>({...run,
    start:strip(row.text.slice(0,Math.max(0,run.start))).length,
    end:strip(row.text.slice(0,run.end)).length
  }))};
}

function castillaLaMancha(rows) {
  const options=numbered(bounds(rows,/^Realiza la traducci[oó]n de uno de estos textos:/iu,/^PREGUNTA 2\b/iu),/^Texto ([AB])-\s*(.+)$/u);
  const questions=numbered(bounds(rows,/^PREGUNTA 2\b/iu,/^BLOQUE B$/iu),/^([AB])\) Texto de /u);
  if (options.length!==2) throw Error('Confirma los dos textos de traducción.');
  const shared=rows.find(row=>/^(?:[\p{L}\p{M}]+\s*>\s*\([\d,]+\)\s*){2,}$/u.test(row.text));
  const phonetics=shared?[...shared.text.matchAll(/([\p{L}\p{M}]+)\s*>/gu)].map(m=>m[1]):[];
  return options.map(({match,header,rows:body})=>{
    const dense=body.filter(row=>!digits.test(row.text));
    const continuation=dense[0]?.text.match(/^y \d+ punto cada verso siguiente\):$/iu);
    const start=continuation?1:0;
    const end=dense.findIndex(row=>/\((?:[^,()]+), [^()]+\)$/u.test(row.text));
    if (end<start) throw Error('Confirma el final del pasaje.');
    const source=dense[end].text.match(/\s*\(([^,()]+), ([^()]+)\)$/u);
    const latinRows=dense.slice(start,end+1).map((row,i)=>stripScoring(i===end-start
      ? {...row,text:row.text.slice(0,source.index)} : row));
    const bodyQuestions=questions.find(q=>q.match[1]===match[1])?.rows??[];
    const bold=bodyQuestions.some(row=>/Analiza las \d+ palabras en negrita/iu.test(row.text));
    const notes=match[2].replace(/\s*\(\d+ punto.*$/u,'');
    const glossary=join(dense.slice(end+1)).split(/(?:^|\s+)\d+[-–]\s*/u).filter(Boolean);
    const vocabulary=glossary.flatMap(line=>{
      const gloss=line.match(/^([^:]+):\s*(.+)$/u)??line.match(/^([\p{L}\p{M}]+) (por .+)$/u);
      return gloss?[{headword:gloss[1],meaning:gloss[2]}]:[];
    });
    const item=passage({latinRows,notes,option:match[1],author:source[1],work:source[2],lexical:{phonetics},vocabulary});
    // Some exports anonymise font names. The option heading shares the
    // bold face in this format, while the body also has a regular face.
    const headingFace=header.runs[0]?.fontName;
    const bodyHasAnotherFace=latinRows.some(row=>row.runs.some(run=>run.fontName!==headingFace));
    return bold?typedMarks(item,latinRows,'bold',bodyHasAnotherFace?headingFace:undefined):item;
  });
}

function asturias(pages,columns) {
  const left=columns[0][0];
  const rows=bounds(left,/^Ejercicio 1 \(Traducci[oó]n\./iu,/^Traducci[oó]n:$/iu);
  const glossStart=rows.findIndex(row=>/^[\p{L}\p{M}]+,\s*-[^:]+:/u.test(row.text));
  const [context,...latinRows]=glossStart<0?rows:rows.slice(0,glossStart);
  const glosses=glossStart<0?[]:rows.slice(glossStart);
  const right=columns[0][1];
  const morphology=bounds(right,/^Ejercicio 2 \(Morfolog[ií]a\./iu,/^Ejercicio 3 \(An[aá]lisis/iu,{optional:true});
  const forms=morphology.flatMap(row=>[...row.text.matchAll(/([\p{L}\p{M}]+):/gu)].map(m=>m[1]));
  const phonetic=pages[0].map(text).join(' ').match(/evoluci[oó]n fon[eé]tica del lat[ií]n al castellano de ([\p{L}\p{M}]+) e indique/iu);
  return [passage({latinRows,notes:context.text,forms,vocabulary:notesVocabulary(glosses),
    lexical:{phonetics:phonetic?[phonetic[1]]:[]}})];
}

function aragon(rows) {
  const part=bounds(rows,/^TEXTO$/u,/^Notas:$/iu);
  const contextEnd=part.findIndex(row=>/\d[\d.\-]*\)$/u.test(row.text));
  const context=join(part.slice(0,contextEnd+1));
  const source=context.match(/\s+\(([^,]+), (.+?) (\d[\d.\-]*)\)$/u);
  if (contextEnd<0 || !source) throw Error('Confirma la contextualización y la referencia.');
  const latinRows=part.slice(contextEnd+1).filter(row=>!/^[;," ]+$/u.test(row.text));
  const morphology=bounds(rows,/^2\. An[aá]lisis morfol[oó]gico\./iu,/^3\. An[aá]lisis sint[aá]ctico/iu,{optional:true});
  const forms=morphology.flatMap(row=>row.text.match(/^[-–]([\p{L}\p{M} ]+)\s+\(/u)?.slice(1)??[]);
  const phonetics=bounds(rows,/^4\.2\. Explique la evoluci[oó]n del lat[ií]n al castellano/iu,/^CONTIN[ÚU]A AL DORSO/iu,{optional:true})
    .flatMap(row=>[...row.text.matchAll(/[a-c]\) ([\p{L}\p{M}]+)\./gu)].map(m=>m[1]));
  const glossary=rows.slice(rows.findIndex(row=>/^Notas:$/iu.test(row.text))+1)
    .filter(row=>/^\d[-.][- .]?\s/u.test(row.text));
  const vocabulary=glossary.flatMap(row=>{
    const entry=row.text.match(/^\d[-.]([- .]?)[\s]*([\p{L}\p{M}]+)\s*(?:[:,=]\s*|(?=forma resultante))(.+)$/u);
    return entry?[{headword:entry[2],meaning:entry[3]}]:[];
  });
  return [passage({latinRows,notes:context.slice(0,source.index),author:source[1],work:source[2],reference:source[3],
    forms,vocabulary,lexical:{phonetics},warnings:['Coteja la puntuación junto a las llamadas de nota. Revisa el auxiliar suplido en obortae sunt.']})];
}

function navarra(rows) {
  const part=bounds(rows,/^1\. TRADUCCI[ÓO]N$/iu,/^2\. AN[ÁA]LISIS MORFOL[ÓO]GICO/iu);
  const options=numbered(part,/^([AB])\) ([\p{Lu} ]+)$/u);
  if (options.length!==2) throw Error('Confirma los dos pasajes de traducción.');
  const phoneticsStart=rows.findIndex(row=>/^3\.2\. Evoluci[oó]n fon[eé]tica/iu.test(row.text));
  const pronunciation=phoneticsStart<0?[]:rows.slice(phoneticsStart+1,phoneticsStart+14);
  const phonetics=pronunciation.flatMap(row=>row.text.match(/^\d+\. ([\p{L}\p{M}]+) [a-z]\. [A-Z]\./u)?.slice(1)??[]).filter(form=>!/[^a-z]/iu.test(form));
  return options.map(({match,rows:body})=>{
    const [contextAndLatin,sourceRows]=before(body,/^[\p{Lu}]+, .+\d/u);
    const {latinRows,notes}=separate(contextAndLatin);
    const source=sourceRows[0].text.match(/^([^,]+),\s*(.*?)\s+([IVX\d][IVX\d, ]+)$/u);
    return passage({latinRows,notes,option:match[1],author:source?.[1],work:source?.[2],reference:source?.[3],lexical:{phonetics},
      vocabulary:notesVocabulary(sourceRows.slice(1).filter(row=>!digits.test(row.text)&&!/^(?:upna|Prueba de Acceso|Universidad P[uú]blica|CURSO|Nafarroako|ASIGNATURA)/iu.test(row.text))),
      warnings:['La capa textual de este formato puede contener errores de OCR. Coteja el pasaje, la referencia y el vocabulario. Revisa el fragmento morfosintáctico antes de elegir qué palabras trasladar.']});
  });
}


function murcia(pages) {
  const page=pages[0];
  const start=page.findIndex(row=>row.text==='TEXTO A TEXTO B');
  const finish=page.findIndex(row=>/^Cuesti[oó]n 4\. Explica la evoluci[oó]n fon[eé]tica del lat[ií]n al castellano/iu.test(row.text));
  const division=page[start]?.runs.find(run=>run.text.trim()==='TEXTO B')?.x;
  if (start<0 || finish<=start || !Number.isFinite(division)) throw Error('Confirma las dos columnas de traducción.');
  const etyma=page.slice(finish+1).find(row=>/^(?:[\p{L}\p{M}]+,\s*)+[\p{L}\p{M}]+$/u.test(row.text));
  return ['A','B'].map((option,i)=>{
    const column=page.slice(start+1,finish).flatMap(row=>{
      const runs=row.runs.filter(run=>i===0?run.x<division-1:run.x>=division-1);
      if (!runs.length) return [];
      const offset=Math.max(0,runs[0].start);
      const text=row.text.slice(offset,runs.at(-1).end).trim();
      return [{...row,text,runs:runs.map(run=>({...run,start:run.start-offset,end:run.end-offset}))}];
    });
    const body=column.slice(column.findIndex(row=>/mismo\)$/iu.test(row.text))+1);
    const [passageRows,glossary]=before(body,/^[\p{L}]+,\s*-/u);
    const stop=glossary.findIndex(row=>/^Cuesti[oó]n 1\./iu.test(row.text));
    if (stop<1 || passageRows.length<2) throw Error('Comprueba el texto latino y el vocabulario de cada columna.');
    const glosses=join(glossary.slice(0,stop)).split(/;\s*/u).map(text=>({text}));
    const latinRows=passageRows.slice(1);
    return typedMarks(passage({latinRows,notes:passageRows[0].text,option,vocabulary:notesVocabulary(glosses),
      lexical:{phonetics:etyma?terms(etyma.text):[]}}),latinRows,'underline');
  });
}

export function recognizeNationalExam({pages,columns=[],info={},warnings=[]}) {
  const rows=pages.flat();
  const header=join(rows.slice(0,48))+' '+(info.Title??'')+' '+(info.Author??'');
  const institutionsFound=institutions.filter(([,pattern])=>pattern.test(header) ||
    (pattern.source==='universidad de cantabria' && rows.some(row=>/^Universidad de Cantabria\. \d{4}, PAU/u.test(row.text))));
  const community=institutionsFound.length===1?institutionsFound[0][0]:'';
  const period=header.match(/\b(20\d{2})\s*[–/-]\s*(20\d{2}|\d{2})\b/u);
  const explicitYear=header.match(/(?:convocatoria (?:ordinaria|extraordinaria)(?: de)?|(?:junio|julio|septiembre)|ordin[aà]ria|propuesta \d+\/|convocat[oò]ria)\s*(20\d{2})\b/iu);
  const footerYear=rows.map(row=>row.text.match(/^LAT[IÍ]N II [–-] Ejercicio [–-].+\/(20\d{2})\b/iu)?.[1]).find(Boolean);
  const repeatedYear=header.match(/\bPAU(20\d{2})\s*-/iu)?.[1];
  const year=repeatedYear?Number(repeatedYear):explicitYear?Number(explicitYear[1]):period?Number(period[2].padStart(4,period[1].slice(0,2))):footerYear?Number(footerYear):null;
  const session = /\b(?:convocatoria extraordinaria|prueba extraordinaria)\b/iu.test(header)?'Extraordinaria':
    /\b(?:convocatoria ordinaria|prueba ordinaria|PAU ordin[àa]ria|ohikoa)\b/iu.test(header)||/\bPAU20\d{2}\s*-\s*JUNIO\b/iu.test(header)?'Ordinaria':'';
  const model=/\bmodelo\s*(?:0|orientativo)|\bmodelo de muestra\b/iu.test(header)?'Modelo orientativo':session?'Examen oficial':'';
  const metadata={community,year,session,model};
  const valencianLexical=/\bComponga por modificaci[oó]n preverbial\b/iu.test(join(rows)) &&
    ['A','B','C','D'].every(option=>rows.some(row=>new RegExp('Cuesti[oó]n '+option+'\\s*:','iu').test(row.text)));
  if (community==='Comunidad Valenciana' || valencianLexical || /\bCONVOCATORIA:\s*(?:JUNIO|JULIO|SEPTIEMBRE).*LAT[IÍ]N II.*EJERCICIO A.*EJERCICIO B/iu.test(join(rows))) return {metadata,records:[],valencian:true,warnings};
  try {
    const profiles={
      'Castilla y León':()=>castillaLeon(pages), 'Andalucía':()=>andalucia(rows),
      'Comunidad de Madrid':()=>madrid(rows), 'Cataluña':()=>cataluna(rows),
      'Galicia':()=>galicia(pages), 'Extremadura':()=>extremadura(rows),
      'Islas Baleares':()=>baleares(pages), 'País Vasco':()=>paisVasco(pages),
      'Cantabria':()=>cantabria(rows), 'Canarias':()=>canarias(rows),
      'Castilla-La Mancha':()=>castillaLaMancha(rows), 'Asturias':()=>asturias(pages,columns),
      'Navarra':()=>navarra(rows), 'Región de Murcia':()=>murcia(pages), 'Aragón':()=>aragon(rows)
    };
    const profile=profiles[community];
    const explicit=rows.some(row=>/^texto latino\s*:/iu.test(row.text));
    const records=(profile&&!explicit?profile():parseExplicitNationalRows(pages)).map(item=>({
      ...metadata,...item,requiresTranscriptReview:['Navarra','Aragón'].includes(community),year:item.year??year,session:item.session||session,model:item.isModel?'Modelo orientativo':model
    }));
    if (new Set(records.map(record=>record.option||'')).size!==records.length)
      throw Error('Hay opciones repetidas o sin identificar. Confirma los pasajes en el PDF.');
    return {metadata,records,warnings};
  } catch(error) {
    return {metadata,records:[],warnings:[...warnings,error.message]};
  }
}
