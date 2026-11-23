/* Adapter for the browser build of Examinator2's Collatinus engine. */
const cacheName = 'cuaderno-collatinus-analysis-v2';
const engineVersion = '__COLLATINUS_VERSION__';
const capacity = 8;

let ready;
async function engine() {
  if (!ready) {
    self.window = self;
    importScripts('datos.js', 'incluidos.js', 'shim.js', 'motor.js');
    ready = self.api.call('warm').catch(error => {
      ready = undefined;
      throw error;
    });
  }
  await ready;
  return self.api;
}

const sentenceAnalyses = new Map();
function sentenceRanges(text) {
  // These boundaries mirror the pinned engine. Keep the parity test in sync
  // when updating the engine, including omission brackets and UTF-16 offsets.
  const masked = text.replace(/\[[^\]]*\]/g, match => ' '.repeat(match.length));
  const ranges = [];
  let start, last;
  for (const match of masked.matchAll(/[A-Za-zÀ-ÖØ-öø-ÿĀ-ſ]+/gu)) {
    if (start === undefined) start = match.index;
    else if (/[.;:?!]/.test(masked.slice(last, match.index))) {
      ranges.push([start, last]);
      start = match.index;
    }
    last = match.index + match[0].length;
  }
  if (start !== undefined) ranges.push([start, last]);
  return ranges;
}

async function analyzeSentences(text) {
  const ranges = sentenceRanges(text);
  if (!ranges.length) return [];
  const output = [];
  for (const [sentence, [start, end]] of ranges.entries()) {
    const fragment = text.slice(start, end);
    let tokens = sentenceAnalyses.get(fragment);
    if (!tokens) {
      tokens = await (await engine()).call('analyze', { text: fragment });
      if (fragment.length <= 4000) {
        sentenceAnalyses.set(fragment, tokens);
        if (sentenceAnalyses.size > 48) sentenceAnalyses.delete(sentenceAnalyses.keys().next().value);
      }
    }
    const first = output.length;
    for (const token of tokens) {
      const shifted = { ...token, i: first + token.i, s: start + token.s, e: start + token.e, sent: sentence };
      if (token.group) shifted.group = token.group.map(index => first + index);
      output.push(shifted);
    }
  }
  return output;
}

async function analyze(args) {
  let cache, key;
  try {
    const data = new TextEncoder().encode(JSON.stringify(args.text));
    const digest = await crypto.subtle.digest('SHA-256', data);
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    key = new URL('./analysis-' + engineVersion + '-' + hash, self.location.href).href;
    cache = await caches.open(cacheName);
    const hit = await cache.match(key);
    if (hit) {
      const result = await hit.json();
      if (Array.isArray(result)) return result;
    }
  } catch {
    // Sin almacenamiento disponible se usa el motor directamente.
  }
  const result = await analyzeSentences(args.text);
  if (cache && key && Array.isArray(result)) {
    try {
      const json = JSON.stringify(result);
      if (json.length > 2_000_000) return result;
      await cache.put(key, new Response(json, {
        headers: { 'Content-Type': 'application/json' },
      }));
      const keys = await cache.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - capacity)).map(entry => cache.delete(entry)));
    } catch {
      // El resultado sigue disponible para esta sesión.
    }
  }
  return result;
}

// Los lemas de vocabulario se solicitan reiteradamente al revisar un texto,
// volver al cuaderno o cambiar entre modos de cantidades vocálicas. Evitar
// repetir el cálculo para una petición idéntica, sin modificar su orden ni
// sus valores y sin conservar respuestas de versiones anteriores del worker.
const vocabularyCapacity = 12;
const vocabularyAnalyses = new Map();
async function vocabularyEntries(args) {
  // Las llamadas ajenas al contrato conservan el comportamiento del motor.
  if (!args || !Array.isArray(args.lids) || !args.lids.every(Number.isSafeInteger)) {
    return (await engine()).call('vocabEntries', args);
  }
  const key = JSON.stringify(args);
  if (key.length > 16000) return (await engine()).call('vocabEntries', args);
  if (vocabularyAnalyses.has(key)) {
    const hit = vocabularyAnalyses.get(key);
    vocabularyAnalyses.delete(key);
    vocabularyAnalyses.set(key, hit);
    return hit;
  }
  // Guardar también la promesa: dos solicitudes concurrentes usan el mismo
  // resultado, y un error elimina la entrada para permitir reintentar.
  const pending = (async () => (await engine()).call('vocabEntries', args))();
  vocabularyAnalyses.set(key, pending);
  if (vocabularyAnalyses.size > vocabularyCapacity) {
    vocabularyAnalyses.delete(vocabularyAnalyses.keys().next().value);
  }
  try {
    return await pending;
  } catch (error) {
    if (vocabularyAnalyses.get(key) === pending) vocabularyAnalyses.delete(key);
    throw error;
  }
}

self.addEventListener('message', async ({ data: { id, method, args } }) => {
  try {
    const result = method === 'analyze'
      ? await analyze(args)
      : method === 'vocabEntries'
        ? await vocabularyEntries(args)
        : await (await engine()).call(method, args);
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
});
