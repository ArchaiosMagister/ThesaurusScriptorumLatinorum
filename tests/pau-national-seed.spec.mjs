import { expect, test } from '@playwright/test';
import { isolateAnalysis } from './isolated-analysis.mjs';

test.beforeEach(async ({context}) => isolateAnalysis(context));

test('el banco inicial reúne las 17 comunidades y conserva metadatos, etiquetas y bajas', async ({page}) => {
  await page.goto('/ThesaurusScriptorumLatinorum/');
  const frame = page.frameLocator('#panel-cuaderno iframe');
  const bank = frame.getByRole('region', {name:'Banco de textos propios'});
  const search = bank.getByRole('searchbox', {name:/Buscar/}).first();
  await search.fill('Escaramuzas entre César y Ariovisto');
  const card = bank.locator('.atl-bank-card').filter({hasText:'Escaramuzas entre César y Ariovisto'});
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('2026 · Ordinaria · Examen oficial · Opción B · Navarra');
  await expect(card).toContainText(/\/[5]/u);
  await card.click();
  await expect(frame.locator('.modal').last().getByRole('link', {name:'Consultar el examen original'})).toBeVisible();
  await frame.locator('.modal').last().getByRole('button', {name:'Cancelar',exact:true}).click();

  const report = await frame.locator('html').evaluate(async () => {
    const {IndexedDbCorpusRepository} = await import('../storage/indexeddb-corpus-repository.js');
    const {allGrammarTags} = await import('../core/grammar-tags.js');
    const {isPristineSeed} = await import('../ui/atl-pau-cv-seed.js');
    const {isPristinePauFactory} = await import('../ui/pau-national-seed.js');
    const {default:signatures} = await import('../ui/atl-pau-national-signatures.js');
    const repo = new IndexedDbCorpusRepository();
    const {corpus,revision} = await repo.load();
    const factory = isPristinePauFactory(corpus, signatures, isPristineSeed, allGrammarTags(corpus));
    const removed = corpus.texts.find(text => text.id === 'pau.national.seed.navarra-2026-ordinaria.b');
    const texts = corpus.texts.filter(text => text.id !== removed.id);
    const edited = {...corpus,texts};
    const modified = isPristinePauFactory(edited, signatures, isPristineSeed, allGrammarTags(edited));
    await repo.save(edited,revision);
    return {factory,modified,finalUt:removed.tagIds.includes('gram.ut.final'),regions:new Set(corpus.texts.map(text => text.selectividad?.community)).size};
  });
  expect(report).toEqual({factory:true,modified:false,finalUt:true,regions:17});
  await page.reload();
  await search.fill('Escaramuzas entre César y Ariovisto');
  await expect(card).toHaveCount(0);
});

test('Examinator encuentra el catálogo al abrirse directamente', async ({page}) => {
  await page.goto('/ThesaurusScriptorumLatinorum/#examinator');
  const frame = page.frameLocator('#panel-examinator iframe');
  await frame.getByRole('button', {name:'Banco de textos…',exact:true}).click();
  await frame.getByRole('searchbox', {name:'Buscar en el banco de textos'}).fill('La caída de Troya');
  const passage = frame.getByRole('button', {name:/La caída de Troya.*La Rioja/u});
  await expect(passage).toHaveCount(1);
  await passage.click();
  await expect.poll(() => frame.locator('html').evaluate(() => window.M.S.texto)).toMatch(/Troia seu Ilium/u);
});
