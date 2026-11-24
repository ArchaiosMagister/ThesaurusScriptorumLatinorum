import {isolateAnalysis} from './isolated-analysis.mjs';
import {expect,test} from '@playwright/test';
test('el banco inicial PAU CV se instala una vez, persiste y respeta las bajas',async({page})=>{
 await page.goto('/ThesaurusScriptorumLatinorum/');
 const frame=page.frameLocator('#panel-cuaderno iframe');
 const bank=frame.getByRole('region',{name:'Banco de textos propios'});
 await expect(bank.getByText('Mostrando 88 de 88 textos', {exact:true})).toBeVisible({timeout:30000});
 const author=bank.getByRole('combobox',{name:'Filtrar textos por autor'});
 await expect(author.locator('option').filter({hasText:/^Julio César$/})).toHaveCount(1);
 await expect(author.locator('option').filter({hasText:/^César$/})).toHaveCount(0);
 await author.selectOption({label:'Julio César'});
 await expect(bank.getByText('Mostrando 43 de 88 textos',{exact:true})).toBeVisible();
 await author.selectOption('all');
 await bank.getByRole('combobox',{name:'Filtrar textos por curso'}).selectOption('2bach');
 await expect(bank.getByText('Mostrando 88 de 88 textos', {exact:true})).toBeVisible();
 await bank.getByRole('searchbox',{name:/Buscar/}).first().fill('CATÓN RECIBE EL GOBIERNO');
 const card=bank.locator('.atl-bank-card').filter({hasText:'CATÓN RECIBE EL GOBIERNO'});
 await expect(card).toHaveCount(1);
 await card.click();
 const modal=frame.locator('.modal').last();
 await expect(modal.getByRole('textbox',{name:'Título didáctico'})).toHaveValue('CATÓN RECIBE EL GOBIERNO DE LA HISPANIA CITERIOR');
 await modal.getByRole('button',{name:'Cancelar',exact:true}).click();
 await bank.getByRole('searchbox',{name:/Buscar/}).first().fill('');
 await page.reload();
 await expect(bank.getByText('Mostrando 88 de 88 textos', {exact:true})).toBeVisible();
 await bank.getByRole('searchbox',{name:/Buscar/}).first().fill('CATÓN RECIBE EL GOBIERNO');
 await card.click();
 page.once('dialog',prompt=>prompt.accept());
 await modal.getByRole('button',{name:'Eliminar del banco',exact:true}).click();
 await expect(modal).toBeHidden();
 await page.reload();
 await expect(bank.getByText('Mostrando 87 de 87 textos',{exact:true})).toBeVisible();
});

test('una ficha PAU guardada con el nombre anterior se normaliza sin perder datos',async({page})=>{
 await page.goto('/ThesaurusScriptorumLatinorum/');
 const frame=page.frameLocator('#panel-cuaderno iframe');
 const bank=frame.getByRole('region',{name:'Banco de textos propios'});
 await expect(bank.getByText('Mostrando 88 de 88 textos',{exact:true})).toBeVisible({timeout:30000});
 const result=await frame.locator('html').evaluate(async()=>{
  const {IndexedDbCorpusRepository}=await import('../storage/indexeddb-corpus-repository.js');
  const {validateCorpus}=await import('../core/validation.js');
  const {corpus}=await new IndexedDbCorpusRepository().load();
  const text=corpus.texts.find(t=>t.source.author==='Julio César');
  const old={...text,source:{...text.source,author:'César'},teacherDocx:{...text.teacherDocx,author:'César'}};
  const next=validateCorpus({...corpus,texts:[old]}).texts[0];
  const own={...old};delete own.selectividad;delete own.teacherDocx;
  const personal=validateCorpus({...corpus,texts:[own]}).texts[0];
  return {author:next.source.author,doc:next.teacherDocx.author,same:JSON.stringify(next)===JSON.stringify(text),personal:personal.source.author};
 });
 expect(result).toEqual({author:'Julio César',doc:'Julio César',same:true,personal:'César'});
});

test('acceso rápido Solo Selectividad se combina con autor y se sincroniza con los demás filtros',async({page})=>{
 await page.goto('/ThesaurusScriptorumLatinorum/');
 const frame=page.frameLocator('#panel-cuaderno iframe');
 const bank=frame.getByRole('region',{name:'Banco de textos propios'});
 await expect(bank.getByText('Mostrando 88 de 88 textos',{exact:true})).toBeVisible({timeout:30000});
 const modal=frame.locator('.modal').last();
 await bank.getByRole('button',{name:'Pegar en el banco'}).click();
 await modal.getByRole('textbox',{name:'Título',exact:true}).fill('Texto ajeno a PAU');
 await modal.getByRole('textbox',{name:'Autor',exact:true}).fill('Julio César');
 await modal.getByRole('textbox',{name:'Texto latino',exact:true}).fill('Gallia est omnis divisa in partes tres.');
 await modal.getByRole('button',{name:'Guardar en el banco'}).click();
 await expect(bank.getByText('Mostrando 89 de 89 textos',{exact:true})).toBeVisible();
 const shortcut=bank.getByRole('button',{name:'Solo Selectividad',exact:true});
 await expect(shortcut).toHaveAttribute('aria-pressed','false');
 await shortcut.click();
 await expect(shortcut).toHaveAttribute('aria-pressed','true');
 await expect(bank.getByText('Mostrando 88 de 89 textos',{exact:true})).toBeVisible();
 await bank.getByRole('combobox',{name:'Filtrar textos por autor'}).selectOption({label:'Julio César'});
 await expect(bank.getByText('Mostrando 43 de 89 textos',{exact:true})).toBeVisible();
 await shortcut.click();
 await expect(bank.getByText('Mostrando 44 de 89 textos',{exact:true})).toBeVisible();
 await bank.getByRole('button',{name:'Más filtros',exact:true}).click();
 await bank.getByRole('checkbox',{name:'Solo Selectividad',exact:true}).check();
 await expect(shortcut).toHaveAttribute('aria-pressed','true');
 await expect(bank.getByText('Mostrando 43 de 89 textos',{exact:true})).toBeVisible();
 await shortcut.click();
 await expect(bank.getByRole('checkbox',{name:'Solo Selectividad',exact:true})).not.toBeChecked();
});

test('orden por año PAU y convocatoria visible en las tarjetas y la ficha',async({page})=>{
 await page.goto('/ThesaurusScriptorumLatinorum/');
 const frame=page.frameLocator('#panel-cuaderno iframe');
 const bank=frame.getByRole('region',{name:'Banco de textos propios'});
 await expect(bank.getByText('Mostrando 88 de 88 textos',{exact:true})).toBeVisible({timeout:30000});
 await bank.getByRole('button',{name:'Solo Selectividad',exact:true}).click();
 const sort=bank.getByRole('combobox',{name:/Ordenar/});
 await sort.selectOption('exam-year-asc');
 const first=bank.locator('.atl-bank-card').first();
 await expect(first).toContainText('Selectividad · 2006 · Ordinaria (junio) · Opción A');
 await sort.selectOption('exam-year-desc');
 await expect(first).toContainText('Selectividad · 2026 · Ordinaria · Opción A');
 await first.click();
 await expect(frame.locator('.modal').last().getByText('Convocatoria: Ordinaria · Opción A',{exact:true})).toBeVisible();
});

test('una copia integral con bajas PAU sustituye el banco de fábrica sin resucitar fichas',async({page,browser})=>{
 await isolateAnalysis(page.context());
 await page.goto('/ThesaurusScriptorumLatinorum/');
 const frame=page.frameLocator('#panel-cuaderno iframe');
 const bank=frame.getByRole('region',{name:'Banco de textos propios'});
 await expect(bank.getByText('Mostrando 88 de 88 textos',{exact:true})).toBeVisible({timeout:30000});
 await frame.locator('html').evaluate(async()=>{
  const {IndexedDbCorpusRepository}=await import('../storage/indexeddb-corpus-repository.js');
  const repo=new IndexedDbCorpusRepository();
  const {corpus,revision}=await repo.load();
  await repo.save({...corpus,texts:corpus.texts.slice(1)},revision);
 });
 const backup=await page.evaluate(async()=> (await import('./backup-store.js')).captureBackup());
 const context=await browser.newContext();
 await isolateAnalysis(context);
 try {
  const target=await context.newPage();
  await target.goto(page.url());
  const targetBank=target.frameLocator('#panel-cuaderno iframe').getByRole('region',{name:'Banco de textos propios'});
  await expect(targetBank.getByText('Mostrando 88 de 88 textos',{exact:true})).toBeVisible({timeout:30000});
  const result=await target.evaluate(async backup=>{
   const {readBackupFile,planRestore,restoreBackup}=await import('./backup-store.js');
   const payload=await readBackupFile(JSON.stringify(backup));
   const plan=await planRestore(payload);
   if(plan.conflicts.length) return {conflicts:plan.conflicts};
   if(!plan.pristineReplacement) return {replacement:false};
   await restoreBackup(payload,plan);
   return {replacement:true,conflicts:[]};
  },backup);
  expect(result).toEqual({replacement:true,conflicts:[]});
  await target.reload();
  await expect(targetBank.getByText('Mostrando 87 de 87 textos',{exact:true})).toBeVisible();
 } finally {await context.close();}
});

test('los filtros mantienen posición y estado inequívoco al activarlos y restablecerlos',async({page})=>{
 await isolateAnalysis(page.context());
 await page.goto('/ThesaurusScriptorumLatinorum/');
 const frame=page.frameLocator('#panel-cuaderno iframe');
 const bank=frame.getByRole('region',{name:'Banco de textos propios'});
 await expect(bank.getByText('Mostrando 88 de 88 textos',{exact:true})).toBeVisible({timeout:30000});
 const tools=bank.locator('.atl-filter-tools');
 const pau=tools.getByRole('button',{name:'Solo Selectividad',exact:true});
 const more=tools.getByRole('button',{name:'Más filtros',exact:true});
 const reset=tools.getByRole('button',{name:'Restablecer vista',exact:true});
 const positions=async()=>tools.locator('button').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}));
 const original=await positions();
 const color=await pau.evaluate(el=>getComputedStyle(el).backgroundColor);
 await expect(reset).toBeDisabled();
 await pau.click();
 await expect(pau).toHaveAttribute('aria-pressed','true');
 expect(await positions()).toEqual(original);
 expect(await pau.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe(color);
 await more.click();
 await expect(more).toHaveAttribute('aria-expanded','true');
 expect(await positions()).toEqual(original);
 await bank.getByRole('combobox',{name:'Filtrar por año de Selectividad'}).selectOption('2026');
 await expect(more).toHaveAttribute('data-has-filters','true');
 await expect(more.locator('.atl-filter-count')).toHaveText('1');
 await more.click();
 await expect(more).toHaveAttribute('aria-expanded','false');
 await expect(more).toHaveAttribute('data-has-filters','true');
 expect(await positions()).toEqual(original);
 await reset.click();
 await expect(pau).toHaveAttribute('aria-pressed','false');
 await expect(more).toHaveAttribute('data-has-filters','false');
 await expect(reset).toBeDisabled();
 expect(await positions()).toEqual(original);
 expect(await pau.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe(color);
});
