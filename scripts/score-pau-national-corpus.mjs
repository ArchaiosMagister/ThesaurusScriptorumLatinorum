import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const [resultsPath, referencePath] = process.argv.slice(2);
if (!resultsPath || !referencePath) throw Error('Uso: resultados.json referencia-cotejada.json');
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const [results, reference] = await Promise.all([read(resultsPath), read(referencePath)]);
const sha = text => createHash('sha256').update(text.normalize('NFC').trim().replace(/\s+/gu, ' ')).digest('hex');
const empty = {exams: 0, expected: 0, detected: 0, fidelityExpected: 0, exact: 0, differing: 0, unmatchedOptions: 0,
  morphologyExpected: 0, morphologyAnchored: 0, morphologyWrong: 0};
const totals = {...empty};
const observed = new Map(results.results.map(row => [row.path, row]));
const referencePaths = new Set();
const rows = reference.map(exam => {
  if (referencePaths.has(exam.path)) throw Error('Referencia repetida: ' + exam.path);
  referencePaths.add(exam.path);
  const item = observed.get(exam.path);
  if (item?.sha256 !== exam.sha256) throw Error('Falta el PDF de referencia o ha cambiado: ' + exam.path);
  const stats = {...empty, exams: 1, expected: exam.passages.length};
  const findings = [];
  const options = new Map(exam.passages.map(passage => [passage.option, passage]));
  if (options.size !== exam.passages.length) throw Error('Opciones repetidas en la referencia: ' + exam.path);
  for (const passage of exam.passages) {
    stats.morphologyExpected += passage.morphology?.length ?? 0;
    if (passage.latinSha256) stats.fidelityExpected++;
    const record = item.records.find(candidate => candidate.option === passage.option);
    if (!record) {
      findings.push({option: passage.option, severity: 'high', issue: 'missing-passage'});
      continue;
    }
    stats.detected++;
    if (passage.latinSha256) {
      if (sha(record.doc.latin) === passage.latinSha256) stats.exact++;
      else {
        stats.differing++;
        findings.push({option: passage.option, severity: 'high', issue: 'transcription-difference'});
      }
    }
    if (passage.morphology) {
      const expected = [...passage.morphology];
      for (const mark of record.doc.underlines) {
        const unique = [...record.doc.latin.matchAll(/[\p{L}\p{M}]+/gu)].filter(word => word[0] === mark.exact);
        const index = expected.indexOf(mark.exact);
        if (index >= 0 && unique.length === 1 && unique[0].index === mark.startUtf16
          && mark.endUtf16 === mark.startUtf16 + mark.exact.length) {
          stats.morphologyAnchored++;
          expected.splice(index, 1);
        } else stats.morphologyWrong++;
      }
      if (expected.length) findings.push({option: passage.option, severity: 'medium',
        issue: 'missing-morphology', elements: expected.length});
    }
  }
  for (const record of item.records.filter(record => !options.has(record.option))) {
    stats.unmatchedOptions++;
    findings.push({option: record.option, severity: 'high', issue: 'unexpected-option'});
  }
  for (const key of Object.keys(totals)) totals[key] += stats[key];
  return {path: exam.path, region: item.region, year: item.year, session: item.session, quality: item.quality,
    evidence: stats.fidelityExpected ? 'visual' : 'document-structure', stats, findings};
});
console.log(JSON.stringify({revision: results.revision, split: results.split, totals, rows}, null, 2));
