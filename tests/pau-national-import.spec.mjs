import { expect,test } from './isolated-bank.mjs';
import { examPdf } from './fixtures/pau-national-pdf.mjs';

const explicit=examPdf(['Universidad de Oviedo','Convocatoria ordinaria 2026','LATÍN II',
  'OPCIÓN A','Texto latino: Puer aquam portat.','Preguntas:',
  '1. Analiza morfológicamente las palabras: aquam.',
  '2. Evolución fonética al castellano: aquam, noctem, focum, aurum, lignum.',
  'OPCIÓN B','Texto latino: Puella aquam bibit.']);
const manual=examPdf(['Universidad de Zaragoza','Convocatoria extraordinaria 2025','LATÍN II',
  'Traduzca el texto que se propone.','Nauta aduenit.']);

test('lote de Selectividad, revisión manual, exclusión y duplicados',async({page},testInfo)=>{
  test.setTimeout(120000);
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
  const document=await root.evaluate(async(_,exportPdf)=>{
    const {M}=window;
    const html=M.Exam.printDoc(M.S);
    const encoded=await M.Exam.docx(M.S);
    const word=await window.JSZip.loadAsync(encoded,{base64:true});
    let pdf=null;
    if (exportPdf) {
      await window.atlLoadPdfExporter();
      pdf=await (await window.EXPdf.generate(html)).slice(0,5).text();
    }
    return {html,pdf,xml:await word.file('word/document.xml').async('string'),
      marks:M.S.subr.map(mark=>mark.toks.map(index=>M.S.tokens[index].w)).flat()};
  },testInfo.project.name==='iPad');
  if (testInfo.project.name==='iPad') expect(document.pdf).toBe('%PDF-');
  expect(document.marks).toEqual(['aquam']);
  expect(document.html).toContain('lignum');
  expect(document.xml).toContain('lignum');
  expect(document.xml).not.toContain('Análisis sintáctico del texto');
  expect(document.xml).not.toContain('Latinismos:');

});

test('lote rechaza un HTML renombrado y avisa de copias idénticas',async({page})=>{
  await page.goto('/ThesaurusScriptorumLatinorum/');
  const frame=page.frameLocator('#panel-cuaderno iframe');
  const chooser=page.waitForEvent('filechooser');
  await frame.getByRole('button',{name:'Importar PDF · Selectividad',exact:true}).click();
  await (await chooser).setFiles([
    {name:'examen.pdf',mimeType:'application/pdf',buffer:explicit},
    {name:'copia.pdf',mimeType:'application/pdf',buffer:explicit},
    {name:'descarga.pdf',mimeType:'text/html',buffer:Buffer.from('<!doctype html><title>Cuota diaria superada</title>')}
  ]);
  const modal=frame.locator('.modal').last();
  await expect(modal.getByText('3 archivos · 2 fichas propuestas · 1 archivo con incidencias · 1 duplicado en el lote.')).toBeVisible();
  await expect(modal.getByText('Archivo idéntico a «examen.pdf» en este lote.')).toBeVisible();
  const invalid=modal.locator('section.atl-pau-pair').filter({hasText:'descarga.pdf'});
  await expect(invalid.getByText(/El archivo contiene una página HTML/)).toBeVisible();
  await expect(invalid.getByRole('link',{name:'Abrir PDF original'})).toHaveCount(0);
  await expect(modal.getByRole('checkbox',{name:'Incluir ficha'})).toHaveCount(2);
});

test('el importador nacional lee el primer PDF después de preparar la PWA sin red',async({page},testInfo)=>{
  test.setTimeout(120000);
  const {createServer}=await import('node:http');
  const {once}=await import('node:events');
  let offline=false;
  const server=createServer(async(request,response)=>{
    if (offline) {response.writeHead(503).end();return;}
    try {
      const result=await fetch(new URL(request.url,testInfo.project.use.baseURL));
      response.writeHead(result.status,{'Content-Type':result.headers.get('Content-Type')||'text/plain'});
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch {response.writeHead(502).end();}
  });
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  try {
    await page.goto('http://127.0.0.1:'+server.address().port+'/ThesaurusScriptorumLatinorum/');
    await page.getByRole('button',{name:'Preparar sin conexión'}).click();
    await expect(page.locator('#app-status')).toHaveText(/tres pestañas están preparadas/,{timeout:60000});
    await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
    offline=true;
    await page.reload();
    const frame=page.frameLocator('#panel-cuaderno iframe');
    const chooser=page.waitForEvent('filechooser');
    await frame.getByRole('button',{name:'Importar PDF · Selectividad',exact:true}).click();
    await (await chooser).setFiles({name:'sin-red.pdf',mimeType:'application/pdf',buffer:explicit});
    const modal=frame.locator('.modal').last();
    await expect(modal.getByRole('textbox',{name:'Texto latino',exact:true}).first()).toHaveValue('Puer aquam portat.');
    await expect(modal.getByRole('checkbox',{name:'Incluir ficha'})).toHaveCount(2);
  } finally {server.close();}
});

test('un PDF histórico abre la revisión manual y ofrece propuestas a petición',async({page})=>{
  await page.goto('/ThesaurusScriptorumLatinorum/');
  const frame=page.frameLocator('#panel-cuaderno iframe');
  const chooser=page.waitForEvent('filechooser');
  await frame.getByRole('button',{name:'Importar PDF · Selectividad',exact:true}).click();
  await (await chooser).setFiles({name:'historico.pdf',mimeType:'application/pdf',buffer:examPdf([
    'Universidad de Oviedo','Convocatoria ordinaria 2024','LATÍN II',
    'OPCIÓN A','Texto latino: Puer aquam portat.','Preguntas:','1. Analiza morfológicamente las palabras: aquam.'
  ])});
  const modal=frame.locator('.modal').last();
  await expect(modal.getByText('Examen histórico. La importación se prepara manualmente.')).toBeVisible();
  await expect(modal.getByRole('textbox',{name:'Texto extraído del PDF'})).toBeVisible();
  await expect(modal.getByRole('checkbox',{name:'Incluir ficha'})).toHaveCount(0);
  await modal.getByRole('button',{name:'Mostrar propuestas para cotejo'}).click();
  await expect(modal.getByRole('textbox',{name:'Texto latino',exact:true})).toHaveValue('Puer aquam portat.');
  await expect(modal.getByText(/1 ficha propuesta/)).toBeVisible();
});
