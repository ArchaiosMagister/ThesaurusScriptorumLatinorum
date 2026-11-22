const families = /^\.(?:card|vopts|vhint|vlist|vrow|vsaveHint|q4b|q4t|qrow|seg|tbtn|xbtn|row)(?:[\s.:>{]|$)/;

export function sharedExamEditorStyle(css) {
  const rules = [];
  // Copy top-level declarations only. The notebook uses its own width breakpoint.
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let depth = 0;
  let start = 0;
  let selectorEnd = 0;
  for (const { 0: brace, index } of source.matchAll(/[{}]/g)) {
    if (brace === '{') {
      if (depth++ === 0) selectorEnd = index;
      continue;
    }
    if (--depth !== 0) continue;
    const selector = source.slice(start, selectorEnd).trim();
    const body = source.slice(selectorEnd + 1, index);
    start = index + 1;
    if (selector === ':root' || selector.startsWith(':root[data-theme=')) {
      const variables = [...body.matchAll(/--(?:control|accent-button):[^;]+;/g)].map(match => match[0]);
      if (variables.length) rules.push(selector.split(',').map(value =>
        value.trim().replaceAll('data-theme', 'data-cuaderno-theme') + ' #editor .edition-menu-content.edition-menu-questions'
      ).join(', ') + ' {' + variables.join(' ') + '}');
      continue;
    }
    if (selector.startsWith('@')) continue;
    const selectors = selector.split(',').map(value => value.trim()).filter(value => families.test(value));
    if (!selectors.length || selectors.some(value => value.includes('.new-manual'))) continue;
    rules.push(selectors.map(value => '#editor .edition-menu-content.edition-menu-questions ' + value).join(', ') + ' {' + body + '}');
  }
  return rules.join('\n');
}

export function alignNotebookEditorMarkup(source) {
  return source
    .replace("'edition-question-panel');", "'edition-question-panel card');")
    .replace("'edition-option');", "'edition-option q4b');")
    .replace("'edition-option-head');\n                    const checkOption", "'edition-option-head q4t');\n                    const checkOption")
    .replace("'edition-inline-edit edition-qword-row');", "'edition-inline-edit edition-qword-row qrow');")
    .replace("word.append(textField('Palabra', displayedAcademicSlotValue(o.kind, slot), value => {", "const term = textField('Palabra', displayedAcademicSlotValue(o.kind, slot), value => {")
    .replace("editSlotManual(e, p.id, q.id, o.id, slot.id, value, at));\n                        }));", "editSlotManual(e, p.id, q.id, o.id, slot.id, value, at));\n                        });\n                        term.querySelector('input')?.classList.add('it');\n                        word.append(term);")
    .replace("'edition-vocab-section edition-vocab-entries'", "'edition-vocab-section edition-vocab-entries card'")
    .replace("'edition-vocab-toolbar'", "'edition-vocab-toolbar vopts row'")
    .replace("'edition-vocab-modes'", "'edition-vocab-modes seg vmode'")
    .replace("            button.setAttribute('aria-pressed', String(selectionMode === key));",
      "            button.classList.toggle('on', selectionMode === key);\n            button.setAttribute('aria-pressed', String(selectionMode === key));")
    .replace("'edition-vocab-quantity'", "'edition-vocab-quantity inl'")
    .replace("const count = node('p', 'hint');", "const count = node('p', 'small muted vhint');")
    .replace(/            const headers = node\('div', 'edition-vocab-column-heads'\);[\s\S]*?(?=            const list = node\('div', 'edition-vocab-list'\);)/, '')
    .replace("'edition-vocab-list'", "'edition-vocab-list vlist'")
    .replace("'edition-vocab-row' +", "'edition-vocab-row vrow' +")
    .replace("'edition-vocab-headword'", "'edition-vocab-headword vh'")
    .replace("'edition-vocab-meaning'", "'edition-vocab-meaning vt'")
    .replace("'edition-vocab-note'", "'edition-vocab-note vn'")
    .replace("'edition-vocab-include'", "'edition-vocab-include von'")
    .replace("'btn btn-outline edition-vocab-save'", "'tbtn sm vsave edition-vocab-save'")
    .replace("saveButton.classList.toggle('is-saved', state === 'saved');", "saveButton.classList.toggle('saved', state === 'saved');\n                    saveButton.classList.toggle('is-saved', state === 'saved');")
    .replace("'btn btn-outline edition-vocab-remove'", "'xbtn edition-vocab-remove'")
    .replace("'btn btn-outline edition-vocab-reset'", "'xbtn edition-vocab-reset'")
    .replace("'edition-vocab-bulk'", "'edition-vocab-bulk row'")
    .replace('        toolbar.append(scan);', "        scan.className = 'tbtn';")
    .replace("        const row = node('div', 'edition-vocab-add');\n        row.append(headword, meaning, note, add);\n        entriesSection.append(row);",
      `        const row = node('div', 'edition-vocab-add');
        const cancel = action('Cancelar', () => { row.hidden = true; openEntry.focus(); }, 'tbtn');
        const openEntry = action('Añadir una entrada a mano', () => { row.hidden = false; headword.focus(); }, 'tbtn');
        row.hidden = true;
        row.append(headword, meaning, note, add, cancel);
        actions.prepend(openEntry);
        actions.append(scan);
        for (const control of actions.querySelectorAll('button')) control.className = 'tbtn';
        entriesSection.append(row);`);

}
