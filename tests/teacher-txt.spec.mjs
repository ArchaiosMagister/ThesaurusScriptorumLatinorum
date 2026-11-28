import { readFile } from 'node:fs/promises';
import { expect, test } from './isolated-bank.mjs';

const title='Ficha de práctica TXT';
const latin='Romani legatos ad Caesarem miserunt. Ille copias ad urbem ducere constituit.';
const file={name:'ficha.txt',mimeType:'text/plain',buffer:Buffer.from([
  'Título: '+title,'Autor: Autor de prueba','Obra: Obra de prueba','Texto: '+latin,
  'Morfología: legatos','Modificación preverbial: miserunt (3), ducere (2)',
  'Evolución fonética:','Prefijos: transformar','Latinismos:'
].join('\n'))};

test('descarga e importa TXT por el selector de Word y completa los apartados vacíos',async({page})=>{
  await page.goto('/ThesaurusScriptorumLatinorum/');
  const frame=page.frameLocator('#panel-cuaderno iframe');
  const bank=frame.getByRole('region',{name:'Banco de textos propios'});
  const download=page.waitForEvent('download');
  await bank.getByRole('button',{name:'Descargar plantilla TXT'}).click();
  const template=await download;
  expect(template.suggestedFilename()).toBe('plantilla-importar-latin.txt');
  const content=await readFile(await template.path(), 'utf8');
  expect(content).toContain('Título:\nAutor:\nObra:\nTexto:');

  const chooser=page.waitForEvent('filechooser');
  await bank.getByRole('button',{name:'Importar Word al banco'}).click();
  await (await chooser).setFiles(file);
  const review=frame.locator('.word-review');
  await expect(review.getByRole('textbox',{name:'Título del texto'})).toHaveValue(title);
  await expect(review.getByRole('textbox',{name:'Autor',exact:true})).toHaveValue('Autor de prueba');
  await expect(review.getByRole('textbox',{name:'Obra',exact:true})).toHaveValue('Obra de prueba');
  await frame.getByRole('button',{name:'Guardar en el banco',exact:true}).click();
  await expect(review).toBeHidden();
  await expect(bank.locator('.atl-bank-card')).toHaveCount(1);

  await page.getByRole('tab',{name:'Examinator'}).click();
  const exam=page.frameLocator('#panel-examinator iframe');
  await exam.getByRole('button',{name:'Banco de textos…',exact:true}).click();
  await exam.getByRole('button',{name:new RegExp(title)}).click();
  await expect.poll(()=>exam.locator('html').evaluate(()=>window.M.S.textAnalyzed)).toBe(latin);
  const parts=await exam.locator('html').evaluate(()=>{
    const s=window.M.S;
    return {morph:s.subr.flatMap(mark=>mark.toks.map(index=>s.tokens[index].w)),
      preverb:s.prev.map(base=>[base.txt,base.n]), phonetics:s.evol.length,
      prefix:s.pref, latinisms:s.latin.length};
  });
  expect(parts).toEqual({morph:['legatos'],preverb:[['miserunt',3],['ducere',2]],
    phonetics:4,prefix:['transformar'],latinisms:4});
});

test('Cuadernos conserva las preguntas del TXT y genera los apartados que faltan',async({page})=>{
  await page.goto('/ThesaurusScriptorumLatinorum/');
  await page.getByRole('tab',{name:'Cuadernos'}).click();
  const frame=page.frameLocator('#panel-cuaderno iframe');
  page.once('dialog',dialog=>dialog.accept('Cuaderno TXT'));
  await frame.getByRole('button',{name:'Nuevo cuaderno',exact:true}).click();
  const chooser=page.waitForEvent('filechooser');
  await frame.getByRole('button',{name:'Importar Word',exact:true}).click();
  await (await chooser).setFiles(file);
  await frame.getByRole('button',{name:'Incorporar al cuaderno',exact:true}).click();
  await expect(frame.locator('.word-review')).toBeHidden();
  const placement=await frame.locator('html').evaluate(async()=>{
    const {WorkspaceRepository}=await import('../storage/workspace-repository.js');
    return (await new WorkspaceRepository().listEditions()).find(x=>x.edition.title==='Cuaderno TXT').edition.placements[0];
  });
  expect(placement.text.title).toBe(title);
  expect(placement.text.author).toBe('Autor de prueba');
  expect(placement.text.markup.map(mark=>mark.exact)).toContain('legatos');
  const options=placement.questions.find(q=>q.kind==='choice').options;
  expect(options.find(o=>o.kind==='prefix').slots.map(s=>s.value)).toEqual(['transformar']);
  expect(options.find(o=>o.kind==='preverb').statement.value).toContain('*miserunt* (3)');
  expect(options.find(o=>o.kind==='phonetics').slots).toHaveLength(4);
  expect(options.find(o=>o.kind==='latinism').slots).toHaveLength(4);
});
