import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { appendNationalPassages } from '../scripts/pau-national-storage.js';
import { recognizeNationalExam } from '../scripts/pau-national-profiles.js';
import { extractNationalPdfPages } from '../scripts/pau-national-pdf.js';
import { examPdf } from './fixtures/pau-national-pdf.mjs';
import { validateCorpus } from '../dist/modulos/cuaderno-integrado/core/validation.js';
import { emptyCorpus } from '../dist/modulos/cuaderno-integrado/core/model.js';
import { upsertText } from '../dist/modulos/cuaderno-integrado/core/editor-operations.js';
import { createEdition, placementFromCorpus } from '../dist/modulos/cuaderno-integrado/core/edition-factory.js';
import { applyParsedTeacherDocx } from '../dist/modulos/cuaderno-integrado/core/docx-import-apply.js';
import { createNotebookBackup, readNotebookBackup, importNotebookDependencies } from '../dist/modulos/cuaderno-integrado/storage/workspace-backup.js';
import { fingerprintEditorParts, mergeEditorParts } from '../app/dropbox-plan.js';
import { createNotebookDocx } from '../dist/modulos/cuaderno-integrado/export/notebook-documents.js';
import { matchesSelectividad } from '../scripts/bank-curriculum.js';

const time='2026-06-01T08:00:00.000Z';
const deps={upsertText,validateCorpus,now:time};
const assetRoot=new URL('../node_modules/pdfjs-dist/',import.meta.url).pathname;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('PDF, banco, Cuaderno, copia y reconciliación Dropbox conservan solo los ejercicios aportados',async()=>{
  const source=examPdf(['Universidad de Oviedo','Convocatoria ordinaria 2026','LATÍN II',
    'OPCIÓN A','Texto latino: Puer aquam portat.','Preguntas:',
    '1. Analiza morfológicamente las palabras: aquam.','OPCIÓN B','Texto latino: Puella aquam bibit.']);
  const extracted=await extractNationalPdfPages(new Blob([source]),{pdfjs,assetRoot});
  const {records}=recognizeNationalExam(extracted);
  assert.equal(records.length,2);
  const incoming=records.map(item=>({...item,digest:'first-document',doc:{...item.doc,title:'Opción '+item.option}}));
  incoming[0].doc.lexical.phonetics=['aquam','focum','noctem','lignum','aurum'];
  incoming[0].doc.preverbBases=['fero'];
  const empty=emptyCorpus();
  const saved=await appendNationalPassages(empty,empty,incoming,deps);
  assert.equal(saved.saved,2);
  const [first,second]=saved.corpus.texts;
  assert.equal(first.teacherDocx.pauCv,undefined);
  assert.equal(first.teacherDocx.nationalPau,true);
  assert.equal(matchesSelectividad(first,'2026','Asturias',true),true);
  assert.equal(matchesSelectividad(first,'','',false,true),false);
  let count=0;
  const id=()=>`test.${++count}`;
  const places=[first,second].map(text=>applyParsedTeacherDocx(
    placementFromCorpus(text,id(),time,id),text.teacherDocx,id));
  assert.equal(places[0].questions.find(q=>q.kind==='morphology').words.length,1);
  const lexical=places[0].questions.find(q=>q.kind==='choice');
  assert.equal(lexical.options.find(q=>q.kind==='phonetics').slots.length,5);
  assert.equal(lexical.options.find(q=>q.kind==='prefix').enabled,false);
  assert.equal(places[1].questions.filter(q=>q.enabled).map(q=>q.kind).join(','),'translation');
  const edition=createEdition({id:id(),legacyNotebookId:null,title:'PAU',timestamp:time,placements:places});
  const word=new TextDecoder().decode(createNotebookDocx(edition));
  for(const term of incoming[0].doc.lexical.phonetics) assert.ok(word.includes(term),term);
  assert.doesNotMatch(word,/Análisis sintáctico del texto/u);
  const json=await createNotebookBackup(edition,saved.corpus);
  const backup=await readNotebookBackup(json);
  assert.deepEqual(backup.dependencies.texts, saved.corpus.texts);
  const restored=importNotebookDependencies(backup.edition,backup.dependencies,empty,empty);
  assert.deepEqual(restored.corpus.texts,saved.corpus.texts);
  const editor=corpus=>({cv:{corpus:[['corpus',{revision:1,corpus}]]}});
  const changed=validateCorpus({...saved.corpus,texts:saved.corpus.texts.map(text=>text.id===first.id
    ? {...text,title:'Ficha revisada',selectividad:{...text.selectividad,hecho:true}} : text)});
  const retry=await appendNationalPassages(changed,changed,incoming,deps);
  assert.equal(retry.duplicates,2);
  assert.equal(retry.corpus.texts[0].title,'Ficha revisada');
  const distinct=await appendNationalPassages(changed,changed,[{...incoming[0],digest:'other-document',year:2025}],deps);
  assert.equal(distinct.saved,1);
  const variants=await appendNationalPassages(empty,empty,[
    {...incoming[0],source:'selección de la primera opción'},
    {...incoming[0],source:'selección de la segunda opción',option:'B'}
  ],deps);
  assert.equal(variants.saved,2);
  assert.notEqual(variants.corpus.texts[0].id,variants.corpus.texts[1].id);
  const baseline=await fingerprintEditorParts(editor(saved.corpus),hash);
  const merged=await mergeEditorParts(editor(changed),editor(distinct.corpus),baseline,hash);
  const byId=rows=>Object.fromEntries(rows.map(row=>[row.id,row]));
  assert.deepEqual(byId(validateCorpus(merged.cv.corpus[0][1].corpus).texts),byId(distinct.corpus.texts));
});

test('PDF rasterizado, defectuoso y examen incompleto dejan una salida explícita de revisión',async()=>{
  await assert.rejects(extractNationalPdfPages(new Blob([examPdf([],{raster:true})]),{pdfjs,assetRoot}),/requiere OCR/iu);
  await assert.rejects(extractNationalPdfPages(new Blob(['%PDF-1.4\nArchivo incompleto']),{pdfjs,assetRoot}));
  const incomplete=await extractNationalPdfPages(new Blob([examPdf([
    'Universidad de Oviedo','Convocatoria ordinaria 2026','LATÍN II','OPCIÓN A','Texto latino:'
  ])]),{pdfjs,assetRoot});
  const scan=recognizeNationalExam(incomplete);
  assert.equal(scan.metadata.community,'Asturias');
  assert.deepEqual(scan.records,[]);
  assert.match(scan.warnings.join(' '),/sin pasaje latino/iu);
});

const archive=process.env.PAU_NATIONAL_CORPUS;
const counts={
  '2l75QL':1,'3H8NiP':2,'88vFZV':2,Andalucia:2,BLidlk:2,DtKJMF:2,P605nL:2,UFbV67:2,
  V8aiok:1,XwSzYz:1,YhkR24:1,ao7JZi:0,hFdPzU:1,jfLasT:2,sNTqTx:2,vR9EhV:2
};
test('PDF originales del corpus local, incluidos los fragmentos bilingües y a dos columnas',{skip:!archive},async()=>{
  for (const [name,expected] of Object.entries(counts)) {
    const bytes=await readFile(join(archive,name+'.pdf'));
    const extraction=await extractNationalPdfPages(new Blob([bytes]),{pdfjs,assetRoot});
    const result=recognizeNationalExam(extraction);
    assert.equal(result.records.length,expected,name);
    assert.ok(result.metadata.community,name);
    for (const passage of result.records) {
      assert.doesNotMatch(passage.doc.latin,/\b(?:traduzca|traducció|puntos|an[aá]lisis|cuestiones)\b/iu,name);
      for (const mark of passage.doc.underlines)
        assert.equal(passage.doc.latin.slice(mark.startUtf16,mark.endUtf16),mark.exact,name);
    }
    if (name==='V8aiok') {
      assert.deepEqual(result.records[0].doc.lexical.phonetics,['laboráre','pĕ́dem','foedum']);
      assert.equal(result.records[0].doc.vocabulary.length,6);
    }
    if (name==='DtKJMF') {
      assert.deepEqual(result.records.map(item=>item.doc.lexical.phonetics),[[],[]]);
      assert.match(result.records[0].doc.warnings.join(' '),/A\.4 noctem, B\.4 portum/u);
    }
    if (name==='3H8NiP') {
      assert.match(result.records[0].doc.latin,/\[= Caesar\]/u);
      assert.deepEqual(result.records.map(item=>item.doc.lexical.phonetics),[['plĭcāre'],['plĭcāre']]);
    }
    if (name==='jfLasT') {
      assert.deepEqual(result.records[0].doc.lexical.latinism,['opera prima','alma mater']);
      assert.deepEqual(result.records.map(passage=>passage.doc.vocabulary.length),[1,4]);
    }
    if (name==='XwSzYz') assert.deepEqual(result.records[0].doc.vocabulary.map(entry=>entry.headword),
      ['Profectus est','Indictum est','Pyrenaeum','Transiit']);
    if (name==='P605nL') assert.deepEqual(result.records[0].doc.underlines.map(mark=>mark.exact),['die','imperaverat','iussit','naves']);
    if (name==='vR9EhV') {
      assert.doesNotMatch(result.records[0].doc.latin,/Hecateidos/u);
      assert.doesNotMatch(result.records[1].doc.latin,/Ptolomaeum/u);
    }
  }
});


const independent=process.env.PAU_INDEPENDENT_CORPUS;
test('documentos aragoneses de 2024 y 2025 del corpus externo',{skip:!independent},async()=>{
  const recognize=async name=>{
    const bytes=await readFile(join(independent,name+'.pdf'));
    return recognizeNationalExam(await extractNationalPdfPages(new Blob([bytes]),{pdfjs,assetRoot}));
  };
  const official=await recognize('aragon-extra-2024');
  assert.deepEqual(official.metadata,{community:'Aragón',year:2024,session:'Extraordinaria',model:'Examen oficial'});
  assert.deepEqual(official.records.map(item=>item.option),['A','B','C','D']);
  assert.deepEqual(official.records.map(item=>item.doc.vocabulary.length),[2,3,3,2]);
  assert.deepEqual(official.records.map(item=>item.doc.underlines.map(mark=>mark.exact)),[
    ['belli','patiens','discebat','conviviis'],['crudelitate','omnium','mortuus est'],
    ['latus sum','fuere','artium','ambitione'],['Fabulle','aranearum']
  ]);
  for (const {doc} of official.records) {
    assert.deepEqual(doc.lexical.phonetics,['mĕtŭm','delicátŭm','quaero','regīnam']);
    assert.deepEqual(doc.lexical.latinism,['alias','agenda','factótum','placebo']);
    assert.doesNotMatch(doc.latin,/\b(?:Traducción del texto|Análisis|Notas:)/iu);
  }
  assert.match(official.records[1].doc.warnings.join(' '),/ambigua: gessit/u);
  assert.match(official.records[3].doc.warnings.join(' '),/ambigua: cenabis.*ambigua: attuleris/u);
  assert.match(official.records[3].doc.latin,/^Cenabis bene,[\s\S]+aranearum\.$/u);
  const model=await recognize('aragon-modelo-2025');
  assert.deepEqual(model.metadata,{community:'Aragón',year:2025,session:'',model:'Modelo orientativo'});
  assert.equal(model.records.length,1);
  const {doc}=model.records[0];
  assert.match(doc.latin,/^Urbem Romam,[\s\S]+facta erat\.$/u);
  assert.deepEqual(doc.underlines.map(mark=>mark.exact),['vagabantur','hominum']);
  assert.deepEqual(doc.lexical.phonetics,['cálidŭm','capŭt','rugītum']);
  assert.deepEqual(doc.lexical.latinism,['in albis','ex libris','corpore insepulto']);
  const ordinary=await recognize('aragon-ordinaria-2025');
  assert.deepEqual(ordinary.metadata,{community:'Aragón',year:2025,session:'Ordinaria',model:'Examen oficial'});
  assert.equal(ordinary.records.length,1);
  const specimen=ordinary.records[0].doc;
  assert.deepEqual([specimen.author,specimen.work,specimen.reference],['Floro','Epítome','I 1']);
  assert.match(specimen.latin,/^Succedit Romulo[\s\S]+gubernaret\.$/u);
  assert.deepEqual(specimen.underlines.map(mark=>mark.exact),['eius','gubernaret']);
  assert.equal(specimen.vocabulary.length,5);
  assert.deepEqual(specimen.lexical.phonetics,['cálidum','pŏntem','causam']);
  assert.deepEqual(specimen.lexical.latinism,['In medias res','ex libris','alias']);
});
