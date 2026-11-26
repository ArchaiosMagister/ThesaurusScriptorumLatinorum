// Isolated profile for Castilla y León, based on its 2025 exam layout.
// Input is page-ordered PDF rows; output is review candidates, never a saved entry.
import { prepareNationalPassage } from './pau-national-parser.js';

const rowText = row => String(typeof row === 'string' ? row : row?.text ?? '').trim();
const fold = text => text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const optionHeader = /^TEXTO\s+([AB])\s*:\s*([^,]+),\s*(.+)$/iu;
const section = /^APARTADO\s+([123])\s*:/iu;
const footer = /^LAT[IÍ]N\s+II\s*[-–—]\s*Ejercicio\s*[-–—]\s*(?:Propuesta\s+\d+|Modelo\s*[“"«]?0[”"»]?)\s*\/\s*((?:19|20)\d{2})$/iu;
const pageFooter = /^P[aá]gina\s+\d+\s+de\s+\d+$|^\d+$/iu;
const authorName = name => /^c[eé]sar$/iu.test(name) ? 'Julio César' : name;
const bulletWord = /^[§▪•■]\s*([\p{L}\p{M}]+)\s*[.]?$/u;

export function scanCastillaLeonRows(pages) {
  const rows = pages.flatMap((page,index)=>page.map((row,i)=>({
    text:rowText(row),page:index+1,row:i
  }))).filter(r=>r.text);
  const text = rows.map(r=>r.text).join(' ');
  if (!/\bCastilla y Le[oó]n\b/iu.test(text) || !/\bLat[ií]n\s+II\b/iu.test(text)) {
    throw Error('No se identifica un examen de Latín II de Castilla y León.');
  }
  const years = [...new Set(rows.map(r=>footer.exec(r.text)?.[1]).filter(Boolean))];
  if(years.length>1) throw Error('Años contradictorios en el documento.');
  const year = years.length ? Number(years[0]) : null;
  const isModel = rows.some(r=>/^MODELO\s+0$/iu.test(r.text)||/Ejercicio.*Modelo/iu.test(r.text));
  let current = null, activeSection=0, shared=[], question=null;
  const options=[];
  const warnings=[];
  for (const row of rows) {
    if(footer.test(row.text)||pageFooter.test(row.text)) continue;
    const part=section.exec(row.text);
    if(part) { activeSection=Number(part[1]); current=null; question=null; continue; }
    const header=optionHeader.exec(row.text);
    if(header&&activeSection===1) {
      current={option:header[1].toUpperCase(),author:authorName(header[2].trim()),
        work:header[3].trim(),candidateRows:[],questions:[],closed:false};
      options.push(current); continue;
    }
    if(current&&activeSection===1) {
      if(/^Cuestiones\s*:\s*$/iu.test(row.text)) { current.closed=true; continue; }
      if(!current.closed) current.candidateRows.push(row);
      else current.questions.push(row.text);
    } else if(activeSection===2) {
      if(/^2\.\d+\s+/u.test(row.text)) { question=[row.text];shared.push(question); }
      else if(question) question.push(row.text);
    }
  }
  if(options.length!==2 || options[0].option!=='A' || options[1].option!=='B' ||
     options.some(option=>!option.closed||!option.candidateRows.length)) {
    throw Error('No se han delimitado con seguridad ambos textos de Castilla y León.');
  }
  const phonetics=[];
  for(const question of shared) {
    const heading=fold(question.filter(line=>!bulletWord.test(line)).join(' '));
    // Only a single isolated marked etymon in a demonstrably phonetic exercise.
    // Do not collect example sentences, answer options or words from instructions.
    if(!/\bevolucion\b/u.test(heading)||!/\bfonetic\w*\b/u.test(heading)) continue;
    if(/\b(?:catalan|valenciano|gallego|portugues|euskera|vasco)\b/u.test(heading)) continue;
    const terms=question.map(line=>bulletWord.exec(line)?.[1]).filter(Boolean);
    if(terms.length===1) phonetics.push(terms[0]);
    else warnings.push('Revisar los étimos de evolución fonética del apartado común.');
  }
  for(const option of options) {
    if(/morfolog\w*.*subrayad/iu.test(option.questions.join(' '))) {
      warnings.push('Opción '+option.option+': verificar visualmente las marcas morfológicas; pueden coincidir con el fragmento sintáctico.');
    }
  }
  if(shared.some(q=>/\b(?:expresi[oó]n latina|[eé]timo latino)\b/iu.test(q.join(' ')))) {
    warnings.push('Revisar latinismos en contexto y descartar derivación léxica sin equivalencia directa.');
  }
  return {community:'Castilla y León',year,session:null,isModel,options,
    sharedLexical:{phonetics},warnings};
}

// Explicit teacher-confirmed row range, not an automatic guess of where the
// Spanish introduction ends. No inference of session from "Propuesta 1".
export function prepareCastillaLeonPassage(scan,optionId,{start,end,session,sourceName}={}) {
  const option=scan.options.find(o=>o.option===optionId);
  if(!option||!Number.isInteger(start)||!Number.isInteger(end)||start<0||
     end<=start||end>option.candidateRows.length) throw Error('Confirma los límites del pasaje latino.');
  const latin=option.candidateRows.slice(start,end).map(r=>r.text).join('\n');
  const title=option.candidateRows.slice(0,start).map(r=>r.text).join(' ');
  const result=prepareNationalPassage({latin,title,author:option.author,work:option.work,
    questions:[],notes:sourceName?String(sourceName):''});
  result.doc.lexical.phonetics=[...scan.sharedLexical.phonetics];
  result.doc.warnings=[...scan.warnings];
  return {...result,option:optionId,community:scan.community,year:scan.year,
    session:session??null,isModel:scan.isModel};
}
