import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptStorage, embeddedHtml } from '../scripts/adapt.mjs';

test('Cuaderno comparte el banco entre vistas bajo nombres propios y conserva el formato exportado', () => {
  const source = [
    "const database = 'cuaderno-textos-latinos-workspace';",
    "const prefix = 'cuaderno-banco-review-v1:';",
    'const worker = "cuaderno-examinator:" + self.registration.scope;',
    "const cache = 'cuaderno-textos-0123abcdef';"
  ].join('\n');
  const adapted = adaptStorage(source, 'cuaderno');
  assert.match(adapted, /'atl-v1:cuaderno-textos-latinos-workspace'/);
  assert.match(adapted, /'atl-v1:cuaderno-banco-review-v1:'/);
  assert.match(adapted, /"atl-v1:cuaderno-examinator:"/);
  assert.match(adapted, /'atl-v1:cuaderno-textos-0123abcdef'/);
  assert.equal(adaptStorage(adapted, 'cuaderno'), adapted);
});

test('Examinator conserva el programa y aísla el autoguardado y la caché', () => {
  const source = "indexedDB.open('examinator', 1); localStorage.getItem('examinator.' + key); const cache = 'examinator2-v1.1.7'; const url = 'https://github.com/ArchaiosMagister/examinator2';";
  const adapted = adaptStorage(source, 'examinator');
  assert.match(adapted, /indexedDB.open\('atl-v1:examinator', 1\)/);
  assert.match(adapted, /'atl-v1:examinator\.'/);
  assert.match(adapted, /'atl-v1:examinator2-v1\.1\.7'/);
  assert.match(adapted, /https:\/\/github\.com\/ArchaiosMagister\/examinator2/);
});

test('el HTML conserva sus scripts y omite el manifiesto propio dentro del editor', () => {
  const html = embeddedHtml('<html><head><link rel="manifest" href="manifest.webmanifest"><script src="js/start.js"></script></head><body></body></html>');
  assert.doesNotMatch(html, /manifest\.webmanifest/);
  assert.match(html, /src="js\/start.js"/);
  assert.match(html, /href="\.\/integracion\.css"/);
});


import { integrateLatinReadingCard, integrateReadingCardPreview } from '../scripts/reading-card-integration.mjs';
import { varyPreverbSelection, varyPreverbControls } from '../scripts/preverb-regeneration.mjs';
import { assertVendoredSources, sealVendoredSources } from '../scripts/vendor-upstreams.mjs';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

test('los parches de Collatinus añaden una acción individual sin tocar la importación del lector', () => {
  const card = [
    'export function attachLatinReadingCards(root, analyze) {',
    '    head(card,hit.word,hit.rect);',
    '}'
  ].join('\n');
  const output = integrateLatinReadingCard(card);
  assert.match(output, /root, analyze, underline = null/);
  assert.match(output, /Ya hay cuatro palabras subrayadas/);
  assert.match(output, /marks\.filter\(item => !item\.locked\)/);
  assert.match(output, /underline\.apply\(\{ placementId, start: hit\.start, end: hit\.end, latin \}/);
  const preview = integrateReadingCardPreview('      disposeLatinReader=attachLatinReadingCards(target,options.onAnalyzeMorphology);');
  assert.match(preview, /state: placementId =>/);
  assert.match(preview, /academics\.markSelectedWord\(target, replaceId\)/);
  assert.throws(() => integrateReadingCardPreview('no hay lector'), /Revisar el punto/);
});

test('la regeneración preverbial varía las bases y falla si cambia el motor original', () => {
  const selection = varyPreverbSelection(
    'function choosePreverbBases(snapshot, latin, random, usedBaseKeys = []) {' +
    ' const freshPassage=passage.find(x=>!alreadyUsed.has(x.base.key)); }');
  assert.match(selection, /varyPassage = false/);
  assert.match(selection, /eligiblePassage\.length > 1/);
  assert.throws(() => varyPreverbSelection('se ha cambiado el motor'), /modificado o ambiguo/);
  const controls = [
    'function preverbBasesFor(o, p) {',
    'if(!selected||(!manuallySelectedBases.has(o.id)&&baseUsageSignatures.get(o.id)!==signature)){',
    'selected=choosePreverbBases(personalPreverbSnapshot(academicTeacherSnapshotV1),p.text.latin,Math.random,used);}',
    'function requestGroup(p,q,o) {const f=fieldsFor(o,p);}',
    'function requestQuestion(p,q) {for(const o of q.options){const f=fieldsFor(o,p);}}',
    'function requestToken(target) {}',
  ].join('\n');
  const output = varyPreverbControls(controls);
  assert.equal((output.match(/preverbBasesFor\(o, p, true\)/g) || []).length, 2);
  assert.match(output, /regenerate \? \[\.\.\.used, \.\.\.preverbKeys\(o\)\]/);
});

test('la compilación autónoma detecta una modificación de sus motores incorporados y omite sus salidas', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tsl-test-vendor-'));
  const pins = {
    cuaderno: { repository: 'example/cuaderno', commit: 'a'.repeat(40) },
    examinator: { repository: 'example/examinator', commit: 'b'.repeat(40) }
  };
  try {
    const manifest = { format: 1 };
    for (const name of Object.keys(pins)) {
      const folder = join(root, 'vendor', name);
      await mkdir(folder, { recursive: true });
      const content = 'documento local ' + name;
      await writeFile(join(folder, 'source.js'), content);
      manifest[name] = { ...pins[name], files: [
        { path: 'source.js', sha256: createHash('sha256').update(content).digest('hex') }
      ] };
    }
    await writeFile(join(root, 'upstream.json'), JSON.stringify(pins));
    await writeFile(join(root, 'vendor', 'manifest.json'), JSON.stringify(manifest));
    assert.equal((await assertVendoredSources(root)).length, 2);
    await mkdir(join(root, 'vendor', 'cuaderno', 'dist'));
    await writeFile(join(root, 'vendor', 'cuaderno', 'dist', 'out.js'), 'generated');
    assert.equal((await assertVendoredSources(root)).length, 2);
    await writeFile(join(root, 'vendor', 'examinator', 'source.js'), 'alterado');
    await assert.rejects(() => assertVendoredSources(root), /incompleta o modificada/);
    await sealVendoredSources(root);
    assert.equal((await assertVendoredSources(root)).length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
