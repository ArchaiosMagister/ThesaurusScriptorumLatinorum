import { expect,test } from './isolated-bank.mjs';

// Small selectable-text PDF in the old format. No third-party fixture or network.
function pdfFixture() {
  const lines=[
    [10,'CONVOCATORIA: JUNIO 2011 LATÍN II'],[10,'EJERCICIO A'],[10,'TÍTULO DE PRUEBA A'],
    [9,'(César, De bello Gallico V 53, 3)'],[9,'Contexto anterior.'],
    [10,'Caesar legiones in hiberna ducit et exercitum ad castra mittit.'],[9,'Contexto posterior.'],
    [10,'A.- TRADUCCIÓN DEL TEXTO'],[10,'Realice el análisis morfológico de las siguientes formas del texto propuesto:'],
    [10,'Caesar, legiones, ducit, mittit.'],[10,'EJERCICIO B'],[10,'TÍTULO DE PRUEBA B'],
    [9,'(Cicerón, Brutus 315)'],[9,'Contexto anterior.'],
    [10,'Cum ego venissem Athenas, sex menses cum Antiocho fui et studium renovavi.'],[9,'Contexto posterior.'],
    [10,'A.- TRADUCCIÓN DEL TEXTO'],[10,'Realice el análisis morfológico de las siguientes formas del texto propuesto:'],
    [10,'ego, menses, venissem, renovavi.']
  ];
  const escape=s=>s.replace(/[\\()]/g,'\\$&');
  const stream=lines.map(([size,s],i)=>'BT /F1 '+size+' Tf 35 '+(780-i*19)+' Td ('+escape(s)+') Tj ET').join('\n');
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>',
    '<< /Length '+Buffer.byteLength(stream,'latin1')+' >>\nstream\n'+stream+'\nendstream'];
  let result='%PDF-1.4\n',offsets=[0];
  objects.forEach((object,i)=>{offsets.push(Buffer.byteLength(result,'latin1'));result+=(i+1)+' 0 obj\n'+object+'\nendobj\n';});
  const xref=Buffer.byteLength(result,'latin1');
  result+='xref\n0 '+offsets.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
  return Buffer.from(result,'latin1');
}
test('importar PDF PAU CV crea las dos fichas con metadatos y evita repetir la misma importación',async({page})=>{
  await page.goto('/ThesaurusScriptorumLatinorum/');
  const frame=page.frameLocator('#panel-cuaderno iframe');
  const bank=frame.getByRole('region',{name:'Banco de textos propios'});
  const importButton=bank.getByRole('button',{name:'Importar PDF · PAU CV',exact:true});
  async function upload(){
    const chooser=page.waitForEvent('filechooser');
    await importButton.click();
    await (await chooser).setFiles({name:'pau-prueba.pdf',mimeType:'application/pdf',buffer:pdfFixture()});
    const modal=frame.locator('.modal').last();
    await expect(modal.getByRole('status')).toContainText('2 fichas detectadas', { timeout: 20000 });
    await expect(modal.getByRole('textbox',{name:'Título A',exact:true})).toHaveValue('TÍTULO DE PRUEBA A');
    await expect(modal.getByRole('textbox',{name:'Formas morfológicas B',exact:true})).toHaveValue('ego, venissem, menses, renovavi');
    await modal.getByRole('button',{name:'Importar fichas al banco'}).click();
    await expect(modal).toBeHidden();
  }
  await upload();
  await expect(bank.locator('.atl-bank-card')).toHaveCount(2);
  await expect(bank.locator('.atl-bank-card').first()).toContainText('Selectividad');
  await upload();
  await expect(bank.locator('.atl-bank-card')).toHaveCount(2);
  await page.reload();
  await expect(bank.locator('.atl-bank-card')).toHaveCount(2);
});
