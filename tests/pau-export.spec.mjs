import { isolateBank } from './isolated-bank.mjs';
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const path='/ThesaurusScriptorumLatinorum/';
const data=JSON.parse(await readFile(new URL('../scripts/pau-cv-seed-data.json',import.meta.url),'utf8'));
const recent=data.find(row=>row.doc.pauCv==='2026 EXTRAORDINARIA / B').doc;
const old=data.find(row=>row.doc.pauCv==='2006 JUNIO / B').doc;

test.beforeEach(async ({context}) => isolateBank(context, ['national']));

test('Examinator exporta PAU real con marcas compuestas y léxico original a Word y PDF',async({page})=>{
 test.setTimeout(120000);
 await page.goto(path+'#examinator');
 const exam=page.frameLocator('#panel-examinator iframe');
 const root=exam.locator('html');
 await expect.poll(()=>root.evaluate(()=>typeof window.M?.setTextFromLibrary)).toBe('function');
 for(const doc of [recent,old]){
   await root.evaluate((_,doc)=>window.M.setTextFromLibrary({urn:'',text:doc.latin,author:doc.author,obra:doc.work,cita:doc.reference,bank:{id:'pau.audit.'+doc.pauCv,title:doc.title,updatedAt:'2026-11-24T00:00:00.000Z',pau:doc}}),doc);
   await expect.poll(()=>root.evaluate(()=>window.M.S.textAnalyzed),{timeout:45000}).toBe(doc.latin);
   const result=await root.evaluate(async(_,doc)=>{
     const {M}=window,S=M.S,E=M.Exam;
     const actual=S.subr.map(m=>m.toks.map(i=>S.tokens[i].w).join(' '));
     const encoded=await E.docx(S);
     const zip=await window.JSZip.loadAsync(encoded,{base64:true});
     const xml=await zip.file('word/document.xml').async('string');
     const parser=new DOMParser();
     const word=parser.parseFromString(xml,'application/xml');
     const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
     const underlined=[...word.getElementsByTagNameNS(ns,'r')].filter(r=>r.getElementsByTagNameNS(ns,'u').length).map(r=>r.textContent).join('');
     const html=E.printDoc(S),print=parser.parseFromString(html,'text/html');
     const visible=print.querySelector('.page').textContent;
     const lex=S.atlPauLexical===true;
     const lexical=lex?doc.preverbBases.concat(doc.lexical.phonetics,doc.lexical.prefix,doc.lexical.latinism).every(v=>visible.toLowerCase().includes(v.toLowerCase())&&word.documentElement.textContent.toLowerCase().includes(v.toLowerCase())):true;
     await window.atlLoadPdfExporter();
     const blob=await window.EXPdf.generate(html);
     return {actual,underlined,lex,lexical,pdf:await blob.slice(0,5).text(),bytes:blob.size,footer:Boolean(zip.file('word/footer1.xml')),parseError:Boolean(word.querySelector('parsererror'))};
   },doc);
   expect(result.actual).toEqual(doc.underlines.map(m=>m.exact));
   for(const mark of doc.underlines)expect(result.underlined.replace(/æ/g,'ae').replace(/œ/g,'oe')).toContain(mark.exact.replace(/æ/g,'ae').replace(/œ/g,'oe'));
   expect(result.lex).toBe(Boolean(doc.preverbBases));
   expect(result.lexical).toBe(true);
   expect(result.pdf).toBe('%PDF-');
   expect(result.bytes).toBeGreaterThan(1000);
   expect(result.footer).toBe(true);
   expect(result.parseError).toBe(false);
 }
});

test('Cuadernos incorpora un PAU reciente y mantiene las marcas y el léxico en la impresión',async({page})=>{
 test.setTimeout(120000);
 await page.goto(path);
 const frame=page.frameLocator('#panel-cuaderno iframe');
 const bank=frame.getByRole('region',{name:'Banco de textos propios'});
 await expect(bank.getByText('Mostrando 88 de 88 textos',{exact:true})).toBeVisible({timeout:30000});
 await page.getByRole('tab',{name:'Cuadernos'}).click();
 page.once('dialog',d=>d.accept('Auditoría PAU exportación'));
 await frame.getByRole('button',{name:'Nuevo cuaderno',exact:true}).click();
 await frame.getByRole('button',{name:'Banco propio',exact:true}).click();
 const picker=frame.locator('.original-bank-picker');
 await picker.getByRole('searchbox',{name:'Buscar textos guardados'}).fill(recent.title);
 await picker.getByRole('checkbox',{name:'Seleccionar «'+recent.title+'»',exact:true}).check();
 await picker.getByRole('button',{name:'Añadir seleccionados (1)'}).click();
 await expect(picker).toBeHidden();
 await frame.locator('html').evaluate(()=>{window.print=()=>{document.body.dataset.printOpened='true';};});
 await frame.locator('#btnPdf').click();
 const draft=frame.getByRole('button',{name:'Imprimir borrador / Guardar PDF'});
 await expect(draft.or(frame.locator('body[data-print-opened]'))).toBeVisible();
 if(await draft.isVisible())await draft.click();
 const print=frame.locator('.edition-print-root');
 await expect(print).toContainText(recent.title);
 for(const value of [...recent.preverbBases,...recent.lexical.phonetics,...recent.lexical.prefix,...recent.lexical.latinism])await expect(print).toContainText(value);
 await expect(print).toContainText('missi sunt');
});
