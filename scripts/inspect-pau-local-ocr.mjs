import { access } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [entry, models, profile, ...images] = process.argv.slice(2);
if (!entry || !models || !profile || !images.length)
  throw Error('Uso: ruta/a/tesseract.js/src/index.js modelos lat[+spa] imágenes...');
const languages = profile.split('+');
if (!languages.every(language => /^[a-z]{3}$/u.test(language)))
  throw Error('Indica un perfil como lat+spa.');
const langPath = resolve(models);
await Promise.all(languages.map(language => access(join(langPath, language+'.traineddata'))));
const {default: engine} = await import(pathToFileURL(resolve(entry)));
const start = performance.now();
const worker = await engine.createWorker(languages, engine.OEM.LSTM_ONLY,
  {langPath, cacheMethod: 'none', gzip: false});
const startupMs = Math.round(performance.now()-start);
try {
  await worker.setParameters({tessedit_pageseg_mode: engine.PSM.AUTO});
  for (const name of images) {
    const started = performance.now();
    const {data} = await worker.recognize(resolve(name), {}, {text:true, blocks:true});
    const lines = (data.blocks ?? []).flatMap(block => block.paragraphs.flatMap(paragraph =>
      paragraph.lines.map(line => ({text: line.text.trim(), confidence: line.confidence, box: line.bbox}))));
    console.log(JSON.stringify({file: name, languages, startupMs, milliseconds: Math.round(performance.now()-started),
      confidence: data.confidence, text: data.text, lines}));
  }
} finally {
  await worker.terminate();
}
