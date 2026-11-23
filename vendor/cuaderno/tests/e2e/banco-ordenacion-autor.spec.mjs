import {test,expect} from '@playwright/test';

test('Banco de textos: ordenar por autor, filtrar y conservar los datos originales',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  const bank=page.locator('.cuaderno-home-bank');
  async function add(title,author,work,latin){
    await bank.getByRole('button',{name:'Pegar en el banco'}).click();
    const modal=page.locator('.modal').last();
    await modal.getByRole('textbox',{name:'Título'}).fill(title);
    await modal.getByRole('textbox',{name:'Autor'}).fill(author);
    await modal.getByRole('textbox',{name:'Obra'}).fill(work);
    await modal.getByRole('textbox',{name:'Texto latino'}).fill(latin);
    await modal.getByRole('button',{name:'Guardar en el banco'}).click();
  }
  await add('Texto de Cicerón','Marco Tulio Cicerón','De officiis','Virtus homines iuvat.');
  await add('Texto de César','Julio César','De bello Gallico','Gallia est omnis divisa.');
  await add('Texto de Nepote','Cornelio Nepote','Vita Attici','Atticus bonus amicus erat.');

  const stored=async()=>page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    return (await new IndexedDbCorpusRepository().load()).corpus.texts
      .map(text=>({id:text.id,title:text.title,author:text.source.author}));
  });
  // El modal inicia una escritura asíncrona. Esperar a que las tres
  // fuentes estén persistidas antes de tomar la fotografía de referencia.
  await expect(bank.locator('.cuaderno-bank-result-count')).toContainText('3 textos');
  await expect.poll(async()=>(await stored()).length,{
    timeout:15000,message:'Los tres textos deben estar confirmados en IndexedDB',
  }).toBe(3);
  const initial=await stored();
  const sort=bank.getByRole('combobox',{name:'Ordenar textos del banco'});
  const author=bank.getByRole('combobox',{name:'Filtrar textos por autor'});
  const view=bank.getByRole('combobox',{name:'Vista del banco de textos'});
  const all=bank.locator('.cuaderno-bank-all');
  async function shownTitles(){
    if(!(await all.evaluate(element=>element.open)))await all.locator(':scope > summary').click();
    return all.locator('.cuaderno-home-text-heading-info strong').allTextContents();
  }

  await expect(sort).toHaveValue('author-asc');
  expect(await shownTitles()).toEqual(['Texto de Nepote','Texto de César','Texto de Cicerón']);
  await sort.selectOption('author-desc');
  expect(await shownTitles()).toEqual(['Texto de Cicerón','Texto de César','Texto de Nepote']);
  await sort.selectOption('work-asc');
  expect(await shownTitles()).toEqual(['Texto de César','Texto de Cicerón','Texto de Nepote']);

  await author.selectOption('Julio César');
  await expect(bank.locator('.cuaderno-bank-result-count')).toContainText('Mostrando 1 de 3 textos');
  expect(await shownTitles()).toEqual(['Texto de César']);
  await bank.getByRole('searchbox',{name:'Buscar en banco de textos propios'}).fill('virtus');
  await expect(bank.locator('.cuaderno-bank-result-count')).toContainText('Mostrando 0 de 3 textos');
  await bank.getByRole('button',{name:'Restablecer vista'}).click();
  await expect(sort).toHaveValue('author-asc');
  await expect(author).toHaveValue('all');

  await view.selectOption('tags');
  await expect(bank.locator('.cuaderno-bank-all')).toHaveCount(0);
  await expect(bank.locator('.cuaderno-home-category')).toContainText(['Sin etiquetar (3)']);
  await view.selectOption('all');
  await expect(bank.locator('.cuaderno-bank-all')).toHaveCount(1);
  expect(await stored()).toEqual(initial);
});
