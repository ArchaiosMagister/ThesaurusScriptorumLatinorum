import { expect,test } from './isolated-bank.mjs';
import { examPdf } from './fixtures/pau-national-pdf.mjs';

const explicit=examPdf(['Universidad de Oviedo','Convocatoria ordinaria 2026','LATÍN II',
  'OPCIÓN A','Texto latino: Puer aquam portat.','Preguntas:',
  '1. Analiza morfológicamente las palabras: aquam.',
  '2. Evolución fonética al castellano: aquam, noctem, focum, aurum, lignum.',
  'OPCIÓN B','Texto latino: Puella aquam bibit.']);
const manual=examPdf(['Universidad de Zaragoza','Convocatoria extraordinaria 2025','LATÍN II',
  'Traduzca el texto que se propone.','Nauta aduenit.']);

test('lote de Selectividad, revisión manual, exclusión y duplicados',async({page})=>{
  await page.goto('/ThesaurusScriptorumLatinorum/');
  const frame=page.frameLocator('#panel-cuaderno iframe');
  const bank=frame.getByRole('region',{name:'Banco de textos propios'});
  const picker=bank.getByRole('button',{name:'Importar PDF · Selectividad',exact:true});
  async function upload(){
    const chooser=page.waitForEvent('filechooser');
    await picker.click();
    await (await chooser).setFiles([
      {name:'automatico.pdf',mimeType:'application/pdf',buffer:explicit},
      {name:'manual.pdf',mimeType:'application/pdf',buffer:manual}
    ]);
    const modal=frame.locator('.modal').last();
    await expect(modal.getByText('Revisa cada ficha con el PDF original antes de guardar.')).toBeVisible({timeout:20000});
    return modal;
  }
  async function save(modal){
    await modal.getByRole('button',{name:'Guardar fichas seleccionadas'}).click();
    await expect(modal).toBeHidden();
  }
  const modal=await upload();
  const automatic=modal.locator('section.atl-pau-pair').filter({hasText:'automatico.pdf'});
  await expect(automatic.getByText(/Morfología · aquam/)).toBeVisible();
  await automatic.getByRole('checkbox',{name:'Incluir ficha'}).nth(1).uncheck();
  const manualSection=modal.locator('section.atl-pau-pair').filter({hasText:'manual.pdf'});
  const source=manualSection.getByRole('textbox',{name:'Texto extraído del PDF'});
  await source.evaluate(control=>control.setSelectionRange(control.value.indexOf('Nauta'),control.value.length));
  await manualSection.getByRole('button',{name:'Añadir pasaje manualmente'}).click();
  await expect(manualSection.getByRole('textbox',{name:'Texto latino',exact:true})).toHaveValue('Nauta aduenit.');
  await expect(manualSection.getByRole('combobox',{name:'Comunidad autónoma'})).toHaveValue('Aragón');
  await save(modal);
  await expect(bank.locator('.atl-bank-card')).toHaveCount(2);
  const repeat=await upload();
  await repeat.getByRole('checkbox',{name:'Incluir ficha'}).nth(1).uncheck();
  await save(repeat);
  await expect(bank.locator('.atl-bank-card')).toHaveCount(2);
  await page.reload();
  await expect(bank.locator('.atl-bank-card')).toHaveCount(2);
  const card=bank.locator('.atl-bank-card').filter({hasText:'Puer aquam portat'});
  await expect(card).toContainText('Asturias');
  await card.click();
  const edit=frame.locator('.modal').last();
  await edit.getByRole('textbox',{name:'Título didáctico',exact:true}).fill('Ficha nacional revisada');
  await edit.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  await expect(edit).toBeHidden();
  await bank.getByRole('button',{name:'Excluir Selectividad',exact:true}).click();
  await expect(bank.locator('.atl-bank-card')).toHaveCount(0);

  await page.getByRole('tab',{name:'Examinator'}).click();
  const exam=page.frameLocator('#panel-examinator iframe');
  await exam.getByRole('button',{name:'Banco de textos…',exact:true}).click();
  await exam.getByRole('button',{name:/Ficha nacional revisada/}).click();
  const root=exam.locator('html');
  await expect.poll(()=>root.evaluate(()=>window.M.S.textAnalyzed),{timeout:45000}).toBe('Puer aquam portat.');
  const document=await root.evaluate(async()=>{
    const {M,JSZip}=window;
    const html=M.Exam.printDoc(M.S);
    const encoded=await M.Exam.docx(M.S);
    const word=await JSZip.loadAsync(encoded,{base64:true});
    return {html,xml:await word.file('word/document.xml').async('string'),
      marks:M.S.subr.map(mark=>mark.toks.map(index=>M.S.tokens[index].w)).flat()};
  });
  expect(document.marks).toEqual(['aquam']);
  expect(document.html).toContain('lignum');
  expect(document.xml).toContain('lignum');
  expect(document.xml).not.toContain('Análisis sintáctico del texto');
  expect(document.xml).not.toContain('Latinismos:');

});
