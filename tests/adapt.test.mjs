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
