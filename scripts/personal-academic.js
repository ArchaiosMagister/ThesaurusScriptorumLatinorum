const keys = { preverb: 'preverbios', prefix: 'prefijos', latinism: 'latinismos', phonetics: 'evolucion' };
const normal = value => typeof value === 'string' ? value.trim().normalize('NFC').toLocaleLowerCase('es') : '';
const phoneticKey = value => normal(value).replaceAll('æ', 'ae').replaceAll('œ', 'oe')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const ruleId = /^N(?:0[1-9]|1[0-9]|20)$/;
const typed = (values, pick = value => value) => Array.isArray(values) ? values.map(pick).filter(normal) : [];

function lists() {
  const result = {};
  for (const [kind, name] of Object.entries(keys)) {
    try {
      const raw = JSON.parse(localStorage.getItem('atl-v1:examinator.fs:/datos/listas/' + name + '.json'));
      if (Array.isArray(raw)) result[kind] = raw;
    } catch { /* An unreadable list falls back to the canonical repertoire. */ }
  }
  return result;
}

function personalBases(snapshot, rows) {
  const byHead = new Map(snapshot.preverbs.map(row => [normal(row.enunciado), row]));
  const unique = new Set();
  return rows.flatMap(row => {
    const head = typeof row?.base === 'string' ? row.base.trim() : '';
    const canonical = byHead.get(normal(head));
    const lemma = head.split(',')[0].trim();
    if (!canonical && snapshot.preverbs.some(candidate => candidate.ambiguousPrompt &&
      normal(candidate.prompt) === normal(lemma))) return [];
    const identity = normal(canonical?.ambiguousPrompt ? canonical.enunciado : canonical?.prompt ?? head);
    if (!identity || unique.has(identity)) return [];
    unique.add(identity);
    return [{
      ...canonical,
      prompt: canonical?.prompt ?? lemma,
      enunciado: canonical?.enunciado ?? head,
      ambiguousPrompt: canonical?.ambiguousPrompt ?? head !== lemma,
      derivatives: [...new Map(typed(row.compuestos).map(term => [normal(term), term.trim()])).values()]
    }];
  });
}

export function personalPreverbSnapshot(snapshot) {
  const rows = lists().preverb;
  return rows ? { ...snapshot, preverbs: personalBases(snapshot, rows) } : snapshot;
}

function identifier(value) {
  let a = 2166136261, b = 5381;
  for (const point of value) {
    const n = point.codePointAt(0);
    a = Math.imul(a ^ n, 16777619);
    b = (Math.imul(b, 33) ^ n) | 0;
  }
  return (a >>> 0).toString(16) + '.' + (b >>> 0).toString(16);
}

export function withPersonalLists(report, snapshot) {
  const base = report.bank;
  const rules = globalThis.ATLTeacherBank.exam.phoneticsMetadata.normas;
  const ruleByName = new Map(rules.map(rule => [normal(rule.nombre), rule.id]));
  const knownEtyma = new Set(snapshot.phonetics.map(row => phoneticKey(row.latin)));
  const eligiblePhonetics = new Map();
  for (const record of base.verified('phonetics')) {
    const key = phoneticKey(record.value);
    const group = eligiblePhonetics.get(key) ?? [];
    group.push(record);
    eligiblePhonetics.set(key, group);
  }
  function personalRecord(kind, value, sourceForm = null, phoneticRules) {
    const identity = identifier(JSON.stringify([kind, sourceForm, normal(value), phoneticRules]));
    const id = 'atl.personal.' + kind + '.' + identity;
    return { id, kind, value, sourceForm, lemmaId: null, analysis: null, surface: null,
      courses: ['latin-ii'], status: 'verified', ...(phoneticRules && { phoneticRules }),
      evidence: { provider: 'atl:lista-personal-docente', recordId: id, bankRevision: base.manifest.revision,
        decisionId: 'entrada-docente-sin-verificacion-externa' } };
  }
  function records(kind, sourceForm, filter) {
    const rows = lists()[kind];
    if (!rows) return base.verified(kind, sourceForm, filter);
    const established = base.verified(kind, sourceForm, filter);
    const byValue = new Map(established.map(item => [normal(item.value), item]));
    let values;
    if (kind === 'preverb') {
      const selection = personalBases(snapshot, rows).find(row =>
        (row.ambiguousPrompt ? row.enunciado : row.prompt) === sourceForm);
      values = typed(selection?.derivatives);
    } else if (kind === 'latinism') {
      values = typed(rows, row => row?.termino);
    } else if (kind === 'phonetics') {
      const selected = filter && new Set(filter);
      const result = new Map();
      for (const group of rows) {
        const rule = ruleId.test(group?.id) ? group.id : ruleByName.get(normal(group?.nombre));
        if (!rule || (selected && !selected.has(rule))) continue;
        for (const term of typed(group?.palabras)) {
          const key = phoneticKey(term);
          const canonical = eligiblePhonetics.get(key) ?? [];
          for (const item of canonical) {
            if (item.phoneticRules.includes(rule) && (!selected || item.phoneticRules.every(n => selected.has(n)))) {
              result.set(item.id, item);
            }
          }
          if (!knownEtyma.has(key)) {
            const item = personalRecord(kind, term, null, [rule]);
            result.set(item.id, item);
          }
        }
      }
      return [...result.values()];
    } else {
      values = typed(rows);
    }
    return [...new Map(values.map(value => [normal(value), byValue.get(normal(value)) ??
      personalRecord(kind, value, sourceForm)])).values()];
  }

  return { ...report, bank: {
    manifest: base.manifest,
    verified: records,
    statusCounts: kind => base.statusCounts(kind),
    findVerified(id) {
      const canonical = base.findVerified(id);
      if (canonical || !id.startsWith('atl.personal.')) return canonical;
      for (const kind of Object.keys(keys)) {
        const forms = kind === 'preverb'
          ? personalPreverbSnapshot(snapshot).preverbs.map(row => row.ambiguousPrompt ? row.enunciado : row.prompt)
          : [null];
        for (const form of forms) {
          const candidate = records(kind, form).find(item => item.id === id);
          if (candidate) return candidate;
        }
      }
      return null;
    }
  } };
}
