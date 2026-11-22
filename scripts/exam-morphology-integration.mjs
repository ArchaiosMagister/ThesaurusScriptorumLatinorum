export function integrateExamMorphology(source) {
  source = source.replace('  let anaSeq = 0;', `  const loadMorphology = import('../atl-exam-morphology.js');
  let morphology;
  loadMorphology.then(module => { morphology = module; renderSubr(); });
  let anaSeq = 0;`);
  const start = source.indexOf('    if (!P.underlineOne ||');
  const end = source.indexOf('    const candidates = P.prevCandidates(S);', start);
  if (start < 0 || end < 0) throw Error('Revisar la morfología de Examinator.');
  source = source.slice(0, start) + `    const used = new Set();
    const saved = previousSubr.flatMap(mark => {
      const toks = mark.toks.map(i => indices.get(i));
      if (!toks.length || toks.some(i => i === undefined || used.has(i))) return [];
      toks.forEach(i => used.add(i));
      return [{ ...mark, toks }];
    }).slice(0, 4);
    S.subr = morphology.chooseMarks(S, saved);

` + source.slice(end);
  source = source.replace("      const toks = text.trim() ?", "      morphology = await loadMorphology;\n      const toks = text.trim() ?")
    .replace('<button class="tbtn" data-act="subrAll">Proponer otras cuatro</button>',
      '<button class="tbtn" data-act="subrFill">Completar hasta cuatro tipos</button> <button class="tbtn" data-act="subrAll">Proponer otras</button>')
    .replace('data-i="${t.i}" title=', 'role="button" tabindex="0" data-i="${t.i}" title=')
    .replace("    box.onclick = (e) => { const w = e.target.closest('.wd'); if (w) wordMenu(S.tokens[+w.dataset.i], w); };",
      `    box.onclick = (e) => { const w = e.target.closest('.wd'); if (w) wordMenu(S.tokens[+w.dataset.i], w); };
    box.onkeydown = (e) => {
      if (e.target.matches('.wd') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.target.click(); }
    };`)
    .replace(/    if \(act === 'subrAll'\)[\s\S]*?(?=    if \(act === 'vadd'\))/, `    if (act === 'subrAll' && morphology && S.texto === S.textAnalyzed) {
      const saved = S.subr.filter(mark => mark.manual);
      const excluded = S.subr.filter(mark => !mark.manual).flatMap(mark => mark.toks);
      const proposed = morphology.chooseMarks(S, saved, excluded);
      S.subr = morphology.chooseMarks(S, proposed);
      renderSubr(); renderWords(); changed();
    }
    if (act === 'subrFill' && morphology && S.texto === S.textAnalyzed) {
      S.subr = morphology.chooseMarks(S, S.subr.filter(mark => mark.toks.length));
      renderSubr(); renderWords(); changed();
    }
    if (act === 'subrRemove' || act === 'subrOther' || act === 'subrReview') {
      const mark = S.subr[+b.dataset.k];
      if (!mark || !morphology) return;
      if (act === 'subrReview') { reviewMark(S, mark); return; }
      if (act === 'subrRemove') S.subr = S.subr.filter(item => item !== mark);
      else {
        let asked = false;
        if (!morphology.replaceMark(S, mark, alternative => {
          asked = true;
          return window.confirm('No queda otra palabra del mismo tipo. ¿Usar «' + alternative.surface +
            '» (' + morphology.label(alternative.category) + ')?');
        })) {
          if (!asked) M.toast('El pasaje no ofrece otra palabra del mismo tipo ni de un tipo disponible.', 5000);
          return;
        }
      }
      renderSubr(); renderWords(); changed();
    }
`)
    .replace(/      <div class="ps"><span class="small muted">Subrayar como<\/span>.*?<\/div>/,
      '      <div class="ps"><button class="tbtn sm" data-u="toggle">Subrayar o quitar esta palabra</button></div>')
    .replace(/      const cat = b\.dataset\.u;[\s\S]*?(?=      closePop\(\); renderSubr)/, `      if (uc) S.subr = S.subr.filter(mark => !mark.toks.includes(t.i));
      else {
        closePop();
        markWord(S, t);
        return;
      }
`);
  const draw = source.indexOf('  function renderSubr()');
  const after = source.indexOf('  /* ---------- filtros de léxico', draw);
  if (draw < 0 || after < 0) throw Error('Revisar el editor de subrayados de Examinator.');
  return source.slice(0, draw) + `  function markWord(S, token) {
    if (!morphology || S.texto !== S.textAnalyzed) return;
    const redraw = () => { renderSubr(); renderWords(); changed(); };
    if (morphology.setMark(S, token, -1)) { redraw(); return; }
    const list = S.subr;
    const select = '<label>Sustituir <select class="morph-replacement">' + list.map((mark, k) =>
      '<option value="' + k + '">' + esc(mark.toks.map(i => S.tokens[i]?.w).join(' ')) + '</option>').join('') +
      '</select></label>';
    M.modal('Subrayar «' + token.w + '»', select, [{ label: 'Cancelar' }, {
      label: 'Subrayar', primary: true, onclick: body => {
        if (S === M.S && S.texto === S.textAnalyzed && S.subr === list && S.tokens[token.i] === token &&
            morphology.setMark(S, token, Number($('.morph-replacement', body).value))) redraw();
      }
    }]);
  }

  function reviewMark(S, mark) {
    const token = S.tokens[mark.toks[0]];
    const rows = morphology.readings(token);
    if (!rows.length) { M.toast('Collatinus no ofrece lecturas clasificables para esta aparición.'); return; }
    const select = '<label>Análisis morfológico <select class="morph-reading">' + rows.map((reading, k) =>
      '<option value="' + k + '"' + (reading.analysis === (mark.analysis ?? token.sel?.morpho) && reading.lemmaId === (mark.lemmaId ?? token.lemma) ? ' selected' : '') +
      '>' + esc(reading.lemmaId + ' · ' + reading.analysis + ' · ' + morphology.label(reading.category)) + '</option>').join('') + '</select></label>';
    M.modal('Revisar análisis de «' + token.w + '»', select, [{ label: 'Cancelar' }, {
      label: 'Confirmar lectura', primary: true, onclick: body => {
        if (S !== M.S || !S.subr.includes(mark) || S.tokens[token.i] !== token) return;
        const reading = rows[Number($('.morph-reading', body).value)];
        Object.assign(mark, { ...reading, cat: reading.category, manual: true });
        renderSubr(); renderWords(); changed();
      }
    }]);
  }

  function renderSubr() {
    const S = M.S, box = $('#editor .subr');
    if (!box || !S || !morphology) return;
    if (!S.tokens?.length || S.texto !== S.textAnalyzed) {
      box.innerHTML = '<div class="muted small">Se proponen al analizar el texto.</div>';
      return;
    }
    const marks = S.subr.filter(mark => mark.toks.length);
    const selected = new Set(marks.map(mark => morphology.categoryOf(mark, S.tokens[mark.toks[0]], S.texto)));
    function badge(type, included = true) {
      return '<span class="lg edition-morph-category" data-category="' + esc(type) + '" data-selected="' +
        included + '">' + esc(morphology.label(type)) + '</span>';
    }
    box.innerHTML = '<p class="small muted">Apariciones (' + marks.length + '/4). Pulsa cualquier palabra del texto para subrayarla.</p>' +
      '<div class="legend small edition-morph-category-legend">' + morphology.categories.map(type => badge(type, selected.has(type))).join('') + '</div>' +
      marks.map(mark => {
        const token = S.tokens[mark.toks[0]];
        const words = mark.toks.map(i => S.tokens[i]?.w).join(' ');
        const k = S.subr.indexOf(mark);
        const type = morphology.categoryOf(mark, token, S.texto);
        return '<div class="srow edition-academic-morph-row">' + badge(type) + '<span class="sw"><u>' +
          esc(words) + '</u> <span class="muted small">' + esc(mark.analysis ?? token?.sel?.morpho ?? 'Pendiente') +
          '</span></span><div class="atl-morph-actions"><button class="tbtn sm" data-act="subrReview" data-k="' + k + '">Revisar análisis</button>' +
          '<button class="tbtn sm" data-act="subrOther" data-k="' + k + '">Otra</button>' +
          '<button class="tbtn sm" data-act="subrRemove" data-k="' + k + '">Quitar</button></div></div>';
      }).join('');
  }

` + source.slice(after);
}
