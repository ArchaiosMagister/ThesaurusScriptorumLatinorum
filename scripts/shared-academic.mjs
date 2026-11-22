import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

function readScriptData(script, name) {
  const assignment = 'window.' + name + ' = ';
  const line = script.split('\n').find(item => item.startsWith(assignment));
  if (!line?.endsWith(';')) throw new Error('No se encontró la instantánea ' + name);
  return JSON.parse(line.slice(assignment.length, -1));
}

export async function prepareSharedAcademic(notebook, exam, shared) {
  const snapshotPath = join(notebook, 'data', 'teacher-academic-snapshot.js');
  const { TEACHER_ACADEMIC_SOURCE_SNAPSHOT_V1: snapshot } = await import(pathToFileURL(snapshotPath).href);
  const academic = readScriptData(await readFile(join(exam, 'js', 'bancos-datos.js'), 'utf8'), 'EXACADEMIC_SOURCE');
  const lexical = readScriptData(await readFile(join(exam, 'js', 'lexico-bancos-datos.js'), 'utf8'), 'EXACADEMIC_LEXICO_SOURCE');
  const { origen } = academic;
  assert.deepEqual(snapshot.sources.preverb, lexical.origen.preverbios);
  assert.deepEqual(snapshot.sources.prefix, lexical.origen.prefijos);
  assert.deepEqual(snapshot.sources.latinism, { path: origen.latinisms_path, sha: origen.latinisms_blob_sha });
  assert.deepEqual(snapshot.sources.phonetics, { path: origen.phonetic_path, sha: origen.phonetic_blob_sha });

  const { items: basePhonetics, ...phoneticsMetadata } = academic.fonetica;
  const { items: latinisms, ...latinismMetadata } = academic.latinismos;
  const { items: preverbs, ...preverbMetadata } = lexical.preverbios;
  const { items: prefixes, ...prefixMetadata } = lexical.prefijos;
  const { importTeacherAcademicSources } = await import(pathToFileURL(join(notebook, 'core', 'academic-teacher-adapter.js')).href);
  const eligibility = importTeacherAcademicSources(snapshot).audit;
  const excludedPhonetics = snapshot.phonetics
    .filter(row => eligibility.get('ge.phonetics.' + row.id)?.status === 'rejected')
    .map(row => row.latin);
  const data = {
    schemaVersion: snapshot.schemaVersion,
    repo: snapshot.repo,
    sources: snapshot.sources,
    morphology: snapshot.morphology,
    preverbs, prefixes, latinisms, phonetics: basePhonetics, excludedPhonetics,
    exam: { origen, phoneticsMetadata, latinismMetadata, preverbMetadata, prefixMetadata, lexicalOrigin: lexical.origen }
  };
  await mkdir(shared, { recursive: true });
  await writeFile(join(shared, 'teacher-bank.js'), 'globalThis.ATLTeacherBank = ' + JSON.stringify(data) + ';\n');

  const source = `import '../../academic/teacher-bank.js';
const { schemaVersion, repo, sources, morphology, preverbs, prefixes, latinisms, phonetics } = globalThis.ATLTeacherBank;
const fields = (row, keys) => Object.fromEntries(keys.map(key => [key, row[key]]));
export const TEACHER_ACADEMIC_SOURCE_SNAPSHOT_V1 = {
  schemaVersion, repo, sources, morphology,
  preverbs: preverbs.map(row => fields(row, ['id', 'prompt', 'enunciado', 'derivatives', 'ambiguousPrompt'])),
  prefixes: prefixes.map(row => fields(row, ['prompt', 'prefix', 'meaningHint', 'meaningStatus'])),
  latinisms: latinisms.map(row => ({ number: row.number, prompt: row.number === 7 ? 'ad kalendas graecas'
    : row.number === 29 ? 'ex aequo' : row.prompt, answer: row.answer })),
  phonetics: [...phonetics].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true })).map(row => ({
    ...fields(row, ['id', 'latin', 'castellano', 'normas', 'estado', 'fuente']),
    tipoTransmision: row.tipoTransmision ?? null
  }))
};
`;
  // Verify the projected Cuadernos rows, including the two established spellings.
  const { TEACHER_ACADEMIC_SOURCE_SNAPSHOT_V1: projected } = await import('data:text/javascript,' +
    encodeURIComponent('const bank = ' + JSON.stringify(data) + ';\n' +
      source.replace("import '../../academic/teacher-bank.js';\n", '').replace('globalThis.ATLTeacherBank', 'bank')));
  assert.deepEqual({ ...projected, phonetics: [...projected.phonetics].sort(byId) },
    { ...snapshot, phonetics: [...snapshot.phonetics].sort(byId) });
  await writeFile(snapshotPath, source);

  const examAdapter = `(() => {
  const data = globalThis.ATLTeacherBank;
  const options = data.exam;
  window.EXACADEMIC_SOURCE = {
    origen: options.origen,
    fonetica: { ...options.phoneticsMetadata, items: data.phonetics },
    latinismos: { ...options.latinismMetadata, items: data.latinisms }
  };
  window.EXACADEMIC_LEXICO_SOURCE = {
    origen: options.lexicalOrigin,
    preverbios: { ...options.preverbMetadata, items: data.preverbs },
    prefijos: { ...options.prefixMetadata, items: data.prefixes }
  };
})();\n`;
  await writeFile(join(exam, 'js', 'bancos-datos.js'), examAdapter);
  await writeFile(join(exam, 'js', 'lexico-bancos-datos.js'), '// Repertorios preparados por bancos-datos.js.\n');
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 12);
}

function byId(a, b) { return a.id.localeCompare(b.id, 'en'); }
