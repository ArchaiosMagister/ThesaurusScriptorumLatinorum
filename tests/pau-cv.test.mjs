import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePauCvPages,morphologyMarks} from '../scripts/pau-cv-parser.js';
const row=(text,size=10,underlines=[])=>({text,size,underlines});
test('PAU CV 2011: dos fichas, sin léxico ni glosario, morfología explícita',()=>{
 const pages=[[row('CONVOCATORIA: JUNIO 2011 LATÍN II'),row('EJERCICIO A'),row('CÉSAR SITÚA TRES LEGIONES JUNTO A SAMAROBRIVA PARA PASAR ALLÍ EL INVIERNO'),row('(César, De bello Gallico V 53, 3)',9),row('Los galos han desistido de atacar el campamento romano.',9),row('Caesar Fabium cum sua legione remittit in hiberna, ipse cum tribus legionibus circum Samarobrivam trinis'),row('hibernis hiemare constituit et, quod tanti motus Galliae exstiterant, totam hiemem ipse ad exercitum manere'),row('decrevit.'),row('Durante todo el invierno llegan noticias sobre los planes de sublevación galos.',9),row('A.- TRADUCCIÓN DEL TEXTO'),row('Realice el análisis morfológico de las siguientes formas del texto propuesto: ipse, tribus, decrevit, motus.'),row('EJERCICIO B'),row('CICERÓN RECUERDA SUS ESTUDIOS DE FILOSOFÍA EN ATENAS'),row('(Cicerón, Brutus 315)'),row('Cicerón es ya un reconocido abogado en Roma.',9),row('Cum ego venissem Athenas, sex menses cum Antiocho veteris Academiae nobilissimo et prudentissimo'),row('philosopho fui studiumque philosophiae numquam intermissum a primaque adulescentia cultum et semper auctum'),row('hoc rursus summo auctore et doctore renovavi.'),row('Cicerón recorre toda Asia.',9),row('A.- TRADUCCIÓN DEL TEXTO'),row('formas del texto propuesto: ego, menses, prudentissimo, renovavi.')],[row('BAREM DE L’EXAMEN')],[row('LÉXICO DEL EJERCICIO A')]];
 const result=parsePauCvPages(pages);
 assert.equal(result.length,2);assert.equal(result[0].doc.author,'Julio César');assert.equal(result[0].doc.reference,'V 53, 3');assert.equal(result[0].doc.underlines.length,4);assert.equal(result[1].doc.underlines.length,4);
 for(const {doc} of result){assert.deepEqual(doc.lexical,{preverb:[],phonetics:[],prefix:[],latinism:[]});assert.equal(doc.preverbBases,null);assert.deepEqual(doc.vocabulary,[]);}
});
test('PAU CV 2026: léxico común, título castellano, subrayados y bases',()=>{
 const pages=[[row('CONVOCATORIA: ORDINARIA 2026 LATÍN II'),row('Opció A / Opción A'),row('Traducció del text següent / Traducción del texto siguiente:'),row('LES TROPES D’AFRANI / LAS TROPAS DE AFRANIO'),row('(Caes. De bello civili I 82, 1-2)'),row('Petreu / Petreyo y Afranio'),row('Illi [...] hora circiter VIIII signo dato legiones educunt aciemque sub castris instruunt. Caesar ab opere',12,['Illi','dato']),row('legiones revocat, equitatum omnem convenire iubet, aciem instruit.',12,['omnem','aciem']),row('Rendició / Rendición de las tropas de Afranio.'),row('Opció B / Opción B'),row('Traducción del texto siguiente:'),row('VIRTUTS / VIRTUDES DE LOS JÓVENES ROMANOS'),row('(Sall. De coniuratione Catilinae VII 4)'),row('Els romans / Los romanos'),row('Iam primum iuventus [...] in castris per laborem usum militiae discebat, magisque in decoris armis et',12,['discebat']),row('militaribus equis quam in scortis atque conviviis libidinem habebant.',12,['militaribus','conviviis','libidinem']),row('Els romans / Los romanos consiguieron grandes éxitos.')],[row('PREGUNTA 2'),row('PREGUNTA 3'),row('Qüestió A / Cuestión A:'),row('PALABRA LATINA PALABRA PATRIMONIAL NORMAS FONÉTICAS'),...['paenitentiam','stipendium','siccare','aetatem'].map(x=>row(x)),row('Qüestió B / Cuestión B:'),row('PARAULA / PALABRA PREFIX / PREFIJO SIGNIFICADO QUE APORTA'),...['pernoctar','preposició / preposición','transformar','circumcisió / circuncisión'].map(x=>row(x)),row('Qüestió C / Cuestión C:'),row('LLATINISME / LATINISMO ORACIÓ / ORACIÓN'),...['in extremis','post mortem','vox populi','etcètera / etcétera'].map(x=>row(x)),row('Qüestió D / Cuestión D:'),row('Componga por modificación preverbial al menos 3 verbos latinos de la base léxica de habebant y 2 verbos latinos a partir de la base léxica de instruit.'),row('PREGUNTA 4')]];
 const [a,b]=parsePauCvPages(pages);
 assert.equal(a.doc.title,'LAS TROPAS DE AFRANIO');assert.equal(a.doc.author,'Julio César');assert.equal(b.doc.author,'Salustio');assert.equal(a.doc.underlines.length,4);assert.equal(b.doc.underlines.length,4);
 assert.deepEqual(a.doc.lexical,b.doc.lexical);assert.deepEqual(a.doc.preverbBases,['habebant','instruit']);assert.deepEqual(a.doc.lexical.prefix,['pernoctar','preposición','transformar','circuncisión']);
 assert.throws(()=>morphologyMarks('Gallia est','fuit'.split(',')),/no localizada/);
});

test('PAU CV conserva las cuatro entradas de cada tabla lateral bilingüe',()=>{
 const latin='Puella amicas uidit et ad uillam cum parentibus properat.';
 const placed=(text,x,face)=>({...row(text),x,face});
 const passage=label=>[
   row('Opció '+label+' / Opción '+label),row('Un pasaje para traducir'),
   row('(Autor, Obra I 2)'),
   placed('Una nota de context en valencià /',125,'italics'),
   placed('Una nota de contexto en castellano.',110,'italics'),
   {...placed(latin,57,'latin'),smallUnderlines:['amicas','uidit','parentibus','properat']},
   placed('Se ha de tener en cuenta esta nota.',105,'normal')
 ];
 const side=(text,prose='')=>({...row([text,prose].filter(Boolean).join(' ')),
   firstCell:{x:67,text,separated:Boolean(prose)}});
 const options=[row('CONVOCATORIA: JUNIO 2025 LATÍN II'),...passage('A'),...passage('B')];
 const questions=[row('PREGUNTA 2'),row('PREGUNTA 3'),row('Qüestió A / Cuestión A:'),
   side('sŏmnum','Aplique las NORMAS FONÉTICAS de evolución al castellano.'),
   side('pŏpŭlum'),side('flammam','Explique las que intervienen.'),side('aurum'),
   row('Qüestió B / Cuestión B:'),
   side('interlineat / interlineado','Indique el PREFIJO DE ORIGEN LATINO.'),
   side('preposició / preposición'),side('transformar'),side('circular'),
   row('Qüestió C / Cuestión C:'),
   side('plàcet / plácet','Explique el significado de las cuatro EXPRESIONES LATINAS y escriba una ORACIÓN.'),
   side('in situ'),side('ex aequo'),side('post mortem'),
   row('Qüestió D / Cuestión D:'),
   row('Componga por modificación preverbial a partir de la base léxica de mittit y de la base léxica de ferunt.'),
   row('PREGUNTA 4')];
 const [a,b]=parsePauCvPages([options,questions]);
 const rightCell=text=>({...row(text),firstCell:{x:215,right:500,text}});
 const staggered=questions.flatMap(question=>{
   if (!question.firstCell) return [question];
   const cell=question.firstCell;
   const term={...side(cell.text),firstCell:{x:67,right:140,text:cell.text}};
   return cell.separated?[term,rightCell(question.text.slice(cell.text.length).trim()),
     rightCell('Explique el significado o la evolución de las formas impresas.')]:[term];
 });
 const [offset]=parsePauCvPages([options,staggered]);
 assert.deepEqual(offset.doc.lexical,a.doc.lexical);
 assert.equal(a.doc.latin,latin);
 assert.equal(b.doc.latin,latin);
 assert.deepEqual(a.doc.underlines.map(mark=>mark.exact),['amicas','uidit','parentibus','properat']);
 assert.deepEqual(a.doc.lexical.phonetics,['sŏmnum','pŏpŭlum','flammam','aurum']);
 assert.deepEqual(a.doc.lexical.prefix,['interlineado','preposición','transformar','circular']);
 assert.deepEqual(a.doc.lexical.latinism,['plácet','in situ','ex aequo','post mortem']);
 assert.deepEqual(a.doc.preverbBases,['mittit','ferunt']);
 assert.deepEqual(a.doc.lexical,b.doc.lexical);
 assert.throws(()=>parsePauCvPages([options,questions.filter(r=>r.text!=='aurum')]),/cuatro términos de phonetics/);
});
