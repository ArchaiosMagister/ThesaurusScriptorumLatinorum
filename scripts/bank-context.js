export const rulesVersion = 3;

const lemmaOf = candidate => candidate.lemma.split(',')[0].normalize('NFD')
  .replace(/\p{M}/gu, '').toLowerCase();
const describe = ({ candidate, morph }) => candidate.lemma + ' · ' + (morph || candidate.im || candidate.pos);
const nominal = /\b(nominativo|vocativo|acusativo|genitivo|dativo|ablativo) (?:(masculino|femenino|neutro) )?(singular|plural)\b/u;
const genders = { m: 'masculino', f: 'femenino', n: 'neutro' };
const features = ({ candidate, morph }) => {
  const match = nominal.exec(morph);
  if (!match) return;
  const gender = match[2] ?? genders[/, ([mfn])\./u.exec(candidate.im)?.[1]];
  if (gender) return [match[1], gender, match[3]].join(' ');
};
const personal = /^(presente|imperfecto|futuro|perfecto|pluscuamperfecto|futuro anterior) de (indicativo|subjuntivo|imperativo) (activo|pasivo), /u;
const finiteId = ([, tense, mood, voice]) => 'gram.verbo.' + tense.replace(' ', '-') + '.' + mood + '.' + voice;
const deponent = candidate => /\b(?:dep\.(?=\s|$|[,;])|deponente\b)/u.test(candidate.im)
  || (lemmaOf(candidate).endsWith('r') && /\bsum\b/u.test(candidate.im));
const compoundTense = { presente: 'perfecto', imperfecto: 'pluscuamperfecto', futuro: 'futuro anterior' };
const perfectParticiple = /^participio de perfecto (activo|pasivo): nominativo (?:masculino|femenino|neutro) (singular|plural)$/u;
const temporalLabels = ['presente', 'imperfecto', 'futuro', 'perfecto', 'pluscuamperfecto', 'futuro anterior'];
export const contextualTags = [
  { id: 'gram.concordancia.nominal', label: 'Concordancia nominal', parentId: 'gram.formas' },
  { id: 'gram.verbo', label: 'Formas verbales personales', parentId: 'gram.formas' },
  { id: 'gram.pron.posesivo', label: 'Posesivos', parentId: 'gram.pronombres' },
  ...Object.entries({ indicativo: temporalLabels, subjuntivo: ['presente', 'imperfecto', 'perfecto', 'pluscuamperfecto'],
    imperativo: ['presente', 'futuro'] }).flatMap(([mood, tenses]) => tenses.flatMap(tense =>
    ['activo', 'pasivo', 'deponente'].map(voice => ({ id: finiteId([null, tense, mood, voice]),
      label: tense[0].toUpperCase() + tense.slice(1) + ' de ' + mood + ' ' + voice,
      parentId: mood === 'subjuntivo' ? 'gram.subjuntivo' : 'gram.verbo' }))))
].map(tag => ({ ...tag, kind: 'catalogue' }));
const possessive = candidate => ['suus', 'meus', 'tuus', 'noster', 'vester'].includes(lemmaOf(candidate))
  && /[ap]/u.test(candidate.pos);

export function contextualBankAnalysis(latin, tokens, propose) {
  const readings = tokens.map(token => (token.cands ?? []).flatMap(candidate =>
    candidate.morphos.map(morph => ({ candidate, morph }))));
  const selected = tokens.map((token, index) => readings[index].find(({ candidate, morph }) =>
    candidate.lid === token.sel?.lid && morph === token.sel.morpho));
  const contextual = [];
  const auxiliaries = new Set();
  const compoundParticiples = new Set();
  for (let index = 0; index + 1 < tokens.length; index++) {
    const first = tokens[index], second = tokens[index + 1];
    if (first.sent !== second.sent || second.pb || !/^\s+$/u.test(latin.slice(first.e, second.s))
      || latin.slice(first.s, first.e) !== first.w || latin.slice(second.s, second.e) !== second.w) continue;
    const pair = [selected[index], selected[index + 1]];
    const determinant = pair.find(row => row && (possessive(row.candidate) ||
      row.candidate.pos === 'a' || row.morph.startsWith('participio de ')));
    const noun = pair.find(row => row && row.candidate.pos === 'n');
    const participleIndex = pair.findIndex(row => row && perfectParticiple.test(row.morph));
    const participle = pair[participleIndex], auxiliary = pair[1 - participleIndex];
    const participleMatch = participle && perfectParticiple.exec(participle.morph);
    const auxiliaryMatch = auxiliary && personal.exec(auxiliary.morph);
    const tense = auxiliaryMatch && compoundTense[auxiliaryMatch[1]];
    if (participleMatch && tense && lemmaOf(auxiliary.candidate) === 'sum' &&
      auxiliaryMatch[3] === 'activo' && auxiliary.morph.endsWith(participleMatch[2])) {
      const voice = deponent(participle.candidate) ? 'deponente' : participleMatch[1] === 'pasivo' ? 'pasivo' : null;
      if (voice) {
        auxiliaries.add(index + 1 - participleIndex);
        if (voice === 'pasivo') compoundParticiples.add(tokens[index + participleIndex].s);
        const unique = readings[index + participleIndex].every(row => row.candidate.lid === participle.candidate.lid);
        const compatibleAuxiliary = readings[index + 1 - participleIndex].every(row => row.candidate.lid === auxiliary.candidate.lid &&
          row.morph === auxiliary.morph);
        const compound = { start: first.s, end: second.e, tagId: finiteId([null, tense, auxiliaryMatch[2], voice]),
          state: unique && compatibleAuxiliary ? 'automatic' : 'pending',
          evidence: [describe(participle), describe(auxiliary), 'Participio nominativo y auxiliar sum adyacente, en el mismo número'],
          alternatives: [...readings[index], ...readings[index + 1]].filter(row => !pair.includes(row)).map(describe) };
        contextual.push(compound);
        if (voice === 'pasivo') contextual.push({ ...compound, tagId: 'gram.voz.pasiva' });
      }
    }
    const agreement = determinant && features(determinant);
    if (!agreement || !noun || features(noun) !== agreement) continue;
    const evidence = [...pair.map(describe), 'Concordancia de caso, género y número: ' + agreement];
    const alternatives = [...new Set([...readings[index], ...readings[index + 1]]
      .filter(row => !pair.includes(row)).map(describe))];
    const determinerIndex = index + pair.indexOf(determinant);
    const isPossessive = possessive(determinant.candidate);
    const isParticiple = determinant.morph.startsWith('participio de ');
    const automatic = isPossessive || readings[determinerIndex].every(row =>
      row.candidate.lid === determinant.candidate.lid);
    contextual.push({ start: first.s, end: second.e, tagId: isPossessive ? 'gram.pron.posesivo' : 'gram.concordancia.nominal',
      evidence, alternatives, state: automatic ? 'automatic' : 'pending' });
    if (!isParticiple) continue;
    const separated = tokens[index + 2]?.pb === ',' && tokens[index + 2].sent === second.sent;
    if (agreement.startsWith('ablativo ') && !separated) continue;
    contextual.push({ start: first.s, end: second.e,
      tagId: agreement.startsWith('ablativo ') ? 'gram.ablativo.absoluto' : 'gram.participio',
      evidence, alternatives, state: 'pending', syntaxReview: true });
  }
  const narrowed = tokens.map((token, index) => {
    const row = selected[index];
    return { ...token, cands: row ? [{ ...row.candidate, morphos: [row.morph] }] : [] };
  });
  const positions = new Map(tokens.map((token, index) => [token.s, index]));
  const securePassiveEnds = new Set(contextual.filter(row => row.state === 'automatic' &&
    row.tagId.endsWith('.pasivo')).map(row => row.end));
  const proposals = propose(latin, narrowed).filter(proposal =>
    !contextual.some(row => row.tagId === proposal.tagId && row.start === proposal.start && row.end === proposal.end) &&
    !(proposal.tagId === 'gram.part.perfecto.pasivo' && compoundParticiples.has(proposal.start))).map(proposal => {
    const first = positions.get(proposal.start);
    const local = [];
    for (let index = first; index < tokens.length && tokens[index].e <= proposal.end; index++) local.push(index);
    const alternatives = [...new Set(local.flatMap(index =>
      readings[index].filter(row => row !== selected[index]).map(describe)))];
    const unanimous = local.length > 0 && local.every(index => selected[index] && readings[index].every(row =>
      row.morph === selected[index].morph && row.candidate.pos === selected[index].candidate.pos &&
      (proposal.tagId === 'gram.subjuntivo' || describe(row) === describe(selected[index]))));
    if (proposal.tagId === 'gram.voz.pasiva' && securePassiveEnds.has(proposal.end))
      return { ...proposal, alternatives, syntaxReview: false, state: 'automatic' };
    return { ...proposal, alternatives, state: !proposal.syntaxReview && unanimous ? 'automatic' : 'pending' };
  });
  const personalForms = selected.flatMap((row, index) => {
    const match = row && personal.exec(row.morph);
    const token = tokens[index];
    if (!match || latin.slice(token.s, token.e) !== token.w) return [];
    // In compounds, sum carries the inflection of an auxiliary.
    if (auxiliaries.has(index)) return [];
    const tagIdOf = (reading, interpretation) => finiteId(
      deponent(reading.candidate) ? [...interpretation.slice(0, 3), 'deponente'] : interpretation);
    const tagId = tagIdOf(row, match);
    const automatic = readings[index].every(other => {
      const interpretation = personal.exec(other.morph);
      return interpretation && tagIdOf(other, interpretation) === tagId;
    });
    return [{ start: token.s, end: token.e, tagId,
      evidence: [describe(row)], alternatives: readings[index].filter(other => other !== row).map(describe),
      state: automatic ? 'automatic' : 'pending' }];
  });
  for (const [index, token] of tokens.entries()) {
    const chosen = selected[index];
    if (!chosen || lemmaOf(chosen.candidate) !== 'quod' || chosen.candidate.pos !== 'c') continue;
    const relative = readings[index].find(row => /pron\. rel\./u.test(row.candidate.im));
    if (relative && latin.slice(token.s, token.e) === token.w) proposals.push({
      start: token.s, end: token.e, tagId: 'gram.pron.relativo', state: 'pending', syntaxReview: true,
      evidence: [describe(chosen), 'Collatinus prefiere la conjunción. La lectura relativa requiere revisión.'],
      alternatives: readings[index].filter(row => row !== chosen).map(describe)
    });
  }
  return [...proposals, ...contextual, ...personalForms].sort((a, b) =>
    Number(a.state === 'automatic') - Number(b.state === 'automatic') ||
    Number(!a.syntaxReview) - Number(!b.syntaxReview) || a.start - b.start || a.end - b.end
  ).map(row => ({ ...row, provider: 'Collatinus', rulesVersion, fragment: latin.slice(row.start, row.end) }));
}
