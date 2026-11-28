import { readFile } from 'node:fs/promises';
import { nationalSeedText } from './pau-national-seed.js';
import { assessBankDifficulty } from './bank-difficulty.js';

const files = process.argv.slice(2);
const exams = JSON.parse(await readFile(new URL('./pau-national-seed-data.json', import.meta.url), 'utf8'));
const valencia = JSON.parse(await readFile(new URL('./pau-cv-seed-data.json', import.meta.url), 'utf8'));
const included = new Set(exams.map(exam => exam.sha256));
const summaries = new Map();
for (const exam of exams) {
  const row = summaries.get(exam.community) ?? { documents: 0, passages: 0, tags: 0, years: {}, difficulties: {} };
  row.documents++;
  row.passages += exam.passages.length;
  row.years[exam.year] = (row.years[exam.year] ?? 0) + exam.passages.length;
  for (const passage of exam.passages) {
    const text = nationalSeedText(exam, passage);
    row.tags += text.tagIds.length;
    const level = assessBankDifficulty(text).level;
    row.difficulties[level] = (row.difficulties[level] ?? 0) + 1;
  }
  summaries.set(exam.community, row);
}

const documents = new Map();
for (const file of files) {
  const inventory = JSON.parse(await readFile(file, 'utf8'));
  for (const entry of inventory.entries) {
    if (!documents.has(entry.sha256)) documents.set(entry.sha256, {entry, paths:[]});
    documents.get(entry.sha256).paths.push(entry.path);
  }
}

const pending = [...documents.values()].flatMap(({entry,paths}) => {
  // The Valencian catalogue uses a separate reviewed data source and identity.
  if (entry.format !== 'pdf' || entry.region === 'comunidad-valenciana' || included.has(entry.sha256)) return [];
  const {sha256,region,year,session,type,quality,family} = entry;
  return [{sha256,region,year,session,type,quality,family,paths}];
});
console.log(JSON.stringify({communities:Object.fromEntries(summaries),
  valencianPassages:valencia.length, pendingLocalDocuments:pending.length, pending},null,2));
