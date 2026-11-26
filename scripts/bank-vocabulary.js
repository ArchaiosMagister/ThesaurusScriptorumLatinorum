import { findVocabulary } from './atl-notebook-context-academic.js';
function element(tag, value = '') {
  const node = document.createElement(tag);
  node.textContent = value;
  return node;
}

export function sourceVocabulary(text) {
  return text.teacherDocx?.vocabulary ?? text.vocabulary ?? [];
}

export function vocabularyEditor(source) {
  const section = element('details');
  section.className = 'atl-source-vocabulary';
  section.append(element('summary', 'Vocabulario de la ficha'));
  const list = element('div');
  const rows = new Map();
  const original = sourceVocabulary(source);
  const imported = Boolean(source.teacherDocx);
  const add = element('button', 'Añadir entrada de vocabulario');
  add.type = 'button';
  add.className = 'hbtn';
  section.append(list, add);
  let modified = false;

  function row(entry, values) {
    const wrapper = element('div');
    wrapper.className = 'atl-source-vocabulary-row';
    const headword = document.createElement('input');
    headword.setAttribute('aria-label', 'Enunciado latino de vocabulario');
    headword.value = values?.headword ?? entry?.headword ?? '';
    headword.maxLength = 500;
    const meaning = document.createElement('input');
    meaning.setAttribute('aria-label', 'Traducción de vocabulario');
    meaning.value = values?.meaning ?? entry?.meaning ?? '';
    meaning.maxLength = 1000;
    for (const field of [headword, meaning]) {
      const label = element('label', field.getAttribute('aria-label'));
      label.append(field);
      wrapper.append(label);
      field.addEventListener('input', () => { modified = true; });
    }
    const remove = element('button', 'Quitar entrada');
    remove.type = 'button';
    remove.className = 'tbtn';
    remove.addEventListener('click', () => {
      modified = true;
      rows.delete(wrapper);
      wrapper.remove();
    });
    wrapper.append(remove);
    list.append(wrapper);
    rows.set(wrapper, { entry, headword, meaning });
    return headword;
  }

  for (const entry of original) row(entry);
  add.addEventListener('click', () => { modified = true; row().focus(); });

  function read({ asOwn = false } = {}) {
    if (!modified && !asOwn) return undefined;
    return [...rows.values()].flatMap(({ entry, headword, meaning }, order) => {
      const head = headword.value.trim();
      const translation = meaning.value.trim() || null;
      if (!head && !translation) return [];
      if (!head) throw new Error('Completa el enunciado latino de la entrada de vocabulario.');
      if (imported && !asOwn) return [{ headword: head, meaning: translation }];
      if (entry?.id && head === entry.headword && translation === entry.meaning) return [{ ...entry, order }];
      return [{ ...entry, id: entry?.id ?? 'vocab.' + crypto.randomUUID(),
        lemma: head === entry?.headword && entry.lemma ? entry.lemma : head.split(/[,;(]/u)[0].trim().slice(0, 250) || head.slice(0, 250),
        headword: head, meaning: translation, note: entry?.note ?? null, included: entry?.included ?? true,
        order, provenance: null, reviewState: 'manual', origin: 'manual', locked: true }];
    });
  }
  return { section, read,
    snapshot() {
      return { modified, entries: [...rows.values()].map(({ entry, headword, meaning }) =>
        ({ entry, headword: headword.value, meaning: meaning.value })) };
    },
    restore(snapshot) {
      if (JSON.stringify(snapshot) === JSON.stringify(this.snapshot())) return;
      rows.clear();
      list.replaceChildren();
      snapshot.entries.forEach(values => row(values.entry, values));
      modified = snapshot.modified;
    },
    addContext(proposal) {
      const values = read() ?? original;
      if (findVocabulary(values, proposal)) return false;
      row({ headword: proposal.headword, meaning: proposal.meaning });
      modified = true;
      section.open = true;
      section.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  };
}
