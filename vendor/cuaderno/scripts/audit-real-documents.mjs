/**
 * Auditoría reproducible de archivos reales, sin alterar cuadernos del usuario.
 * Construye tres agregados independientes a partir del pasaje proporcionado
 * en «texto ejemplo formato.pdf». El texto largo repite el pasaje SOLO como
 * ensayo de paginación; no representa una edición filológica de César.
 */
import {mkdir,writeFile} from 'node:fs/promises';
import {createEdition,createPlacement} from '../dist/core/edition-factory.js';
import {fingerprintForMark,validateEdition} from '../dist/core/edition-validation.js';
import {createNotebookDocx} from '../dist/export/notebook-documents.js';

const at='2026-11-15T18:00:00.000Z';
const original='Helvetii cum omnibus suis carris secuti impedimenta in unum locum contulerunt; ipsi confertissima acie, reiecto nostro equitatu, phalange facta sub primam nostram aciem successerunt.';
const title='Los helvecios acumulan su equipaje en un solo lugar y atacan a los romanos';
const dir='audit-output';
await mkdir(dir,{recursive:true});
let counter=0;
const id=(prefix='id')=>prefix+'.'+String(++counter);
function vocab(headword,meaning,order,note=null){
  return {id:id('voc'),lemma:headword.split(',')[0],headword,meaning,note,
    included:true,order,provenance:null,reviewState:'manual',origin:'manual',locked:true};
}
function addMarkup(p,needle,index=0){
  const start=p.text.latin.indexOf(needle,index);
  if(start<0)throw new Error('Forma que no aparece en texto: '+needle);
  const markId=id('mark'),end=start+needle.length;
  p.text.markup.push({id:markId,kind:'morph-underline',startUtf16:start,
    endUtf16:end,exact:needle,textFingerprint:fingerprintForMark(p.text.latin,start,end),
    reviewRequired:false});
  const question=p.questions.find(q=>q.kind==='morphology');
  question.words.push({id:id('morph'),markId,surface:needle,lemmaId:null,analysis:null,
    provenance:null,reviewState:'manual',locked:true});
}
function samplePlacement(kind='short'){
  const text=kind==='long'?Array.from({length:22},()=>original).join('\n\n'):original;
  const p=createPlacement({
    id:id('place'),title:kind==='long'?'Texto extenso · repetición para prueba de paginación':title,
    latin:text,author:'Julio César',work:'De bello Gallico',reference:'I 24',
    source:{kind:'manual',sourceId:null,urn:null,importedAt:at},
  },()=>id('question'));
  addMarkup(p,'secuti');addMarkup(p,'contulerunt');addMarkup(p,'nostro');addMarkup(p,'aciem',90);
  p.vocabulary.push(vocab('ăcĭes, –ēī','línea de batalla',0));
  p.vocabulary.push(vocab('Helvētĭi, –ōrum','los helvecios',1,'pueblo galo'));
  p.vocabulary.push(vocab('phălanx, phălangis','falange',2,'formación militar'));
  const q=p.questions.find(q=>q.kind==='choice');
  q.options[0].statement.value='Modificación preverbial a partir de *instruxit* (3) y de *successerunt* (2). Cinco derivados en total en lengua propia.';
  q.options[1].statement.value='Evolución fonética de';
  q.options[2].statement.value='Señala el prefijo y el significado que aporta a estas palabras:';
  q.options[3].statement.value='Latinismos:';
  for(const [j,words] of [
    [],
    ['fabam','sermonem','stelam','transgressionem'],
    ['difundir','extraer','interdependencia','progenitor'],
    ['addenda','alma mater','ex professo','peccata minuta'],
  ].entries()){
    for(const word of words){
      q.options[j].slots.push({id:id('slot'),value:word,proposedLemmaId:null,
        origin:'manual',locked:true,provenance:null});
    }
  }
  return p;
}
const samples={
  breve:createEdition({id:'edition.breve',legacyNotebookId:null,
    title:'Cuaderno de un texto (referencia)',timestamp:at,placements:[samplePlacement()]}),
  largo:createEdition({id:'edition.largo',legacyNotebookId:null,
    title:'Prueba de texto largo (repetición)',timestamp:at,placements:[samplePlacement('long')]}),
  varios:createEdition({id:'edition.varios',legacyNotebookId:null,
    title:'Cuaderno de tres apariciones',timestamp:at,
    placements:[samplePlacement(),samplePlacement(),samplePlacement()]}),
};
for(const [name,raw] of Object.entries(samples)){
  const sample=validateEdition(raw);
  await writeFile(dir+'/'+name+'.json',JSON.stringify(sample,null,2));
  await writeFile(dir+'/'+name+'.docx',createNotebookDocx(sample));
  console.log(name+' DOCX bytes: '+(await import('node:fs')).statSync(dir+'/'+name+'.docx').size+
    ', textos: '+sample.placements.length+', longitud latina: '+
    sample.placements.reduce((sum,p)=>sum+p.text.latin.length,0));
}
