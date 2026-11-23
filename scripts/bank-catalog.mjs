import { GRAMMAR_GROUP_IDS, matchesGrammarTag } from '../core/grammar-tags.js';
import { sourceVocabulary } from './atl-bank-vocabulary.js';

function element(tag, options = {}) {
  return Object.assign(document.createElement(tag), options);
}

export function createBankFilters(texts, catalogue, state, onChange) {
  const work = element('select');
  work.setAttribute('aria-label', 'Filtrar textos por obra');
  const compare = new Intl.Collator('es', { numeric: true, sensitivity: 'base' }).compare;
  const works = [...new Set(texts.map(text => text.source.work?.trim()).filter(Boolean))].sort(compare);
  work.append(new Option('Todas las obras', ''));
  for (const title of works) work.append(new Option(title, title));
  work.value = works.includes(state.work) ? state.work : '';
  work.addEventListener('change', onChange);
  const reference = element('input', { type: 'text', value: state.reference, placeholder: 'Libro, capítulo o cita' });
  reference.setAttribute('aria-label', 'Filtrar textos por referencia');
  reference.addEventListener('input', onChange);
  const origin = element('select');
  origin.setAttribute('aria-label', 'Filtrar textos por procedencia');
  origin.append(new Option('Todas', ''), new Option('Textos propios', 'own'),
    new Option('Biblioteca latina', 'library'), new Option('Sin procedencia registrada', 'unknown'));
  origin.value = state.origin;
  origin.addEventListener('change', onChange);
  const usage = element('select');
  usage.setAttribute('aria-label', 'Filtrar textos por uso');
  usage.append(new Option('Cualquier uso', ''), new Option('Usados', 'used'), new Option('Sin uso registrado', 'unused'));
  usage.value = state.usage;
  usage.addEventListener('change', onChange);

  const panel = element('details', { className: 'atl-grammar-filters', open: state.grammarOpen });
  const summary = element('summary');
  const mode = element('select', { id: 'atl-grammar-match' });
  mode.append(new Option('Todas las etiquetas', 'all'), new Option('Alguna etiqueta', 'any'));
  mode.value = state.mode;
  mode.addEventListener('change', onChange);
  const modeLabel = element('label', { htmlFor: mode.id, textContent: 'Coincidencia gramatical ' });
  modeLabel.append(mode);
  const pending = element('input', { type: 'checkbox', checked: state.includePending });
  pending.addEventListener('change', onChange);
  const pendingLabel = element('label', { className: 'atl-tag-option' });
  pendingLabel.append(pending, ' Incluir propuestas pendientes de Collatinus');
  const selections = new Map();
  const visited = new Set();

  function groups(parent, container) {
    for (const tag of catalogue.filter(item => item.parentId === parent && !visited.has(item.id))) {
      visited.add(tag.id);
      const check = element('input', { type: 'checkbox', value: tag.id, checked: state.tags.includes(tag.id) });
      selections.set(tag.id, check);
      check.addEventListener('change', onChange);
      const label = element('label', { className: 'grammar-chip atl-tag-option' });
      label.dataset.group = GRAMMAR_GROUP_IDS.find(group => matchesGrammarTag(tag.id, group, catalogue)) ?? 'custom';
      label.append(check, ' ', tag.label);
      if (catalogue.some(item => item.parentId === tag.id)) {
        const group = element('details', { className: 'atl-tag-group' });
        const heading = element('summary', { textContent: tag.label });
        group.append(heading, label);
        groups(tag.id, group);
        group.open = Boolean(group.querySelector(':checked'));
        container.append(group);
      } else {
        container.append(label);
      }
    }
  }

  panel.append(summary, modeLabel, pendingLabel);
  const list = element('div', { className: 'atl-tag-groups' });
  groups(null, list);
  const personal = element('div', { className: 'atl-bank-custom-filters' });
  const customIds = new Set(catalogue.filter(tag => tag.kind === 'custom' && !tag.parentId).map(tag => tag.id));
  for (const label of [...list.children]) {
    if (customIds.has(label.querySelector('input')?.value)) personal.append(label);
  }
  if (personal.children.length) {
    const group = element('details', { className: 'atl-tag-group', open: Boolean(personal.querySelector(':checked')) });
    group.append(element('summary', { textContent: 'Etiquetas propias' }), personal);
    list.append(group);
  }
  panel.append(list);
  panel.addEventListener('toggle', () => { state.grammarOpen = panel.open; });
  function read() {
    const tags = [...selections.values()].filter(check => check.checked).map(check => check.value);
    summary.textContent = tags.length ? 'Filtrar por etiquetas · ' + tags.length + ' seleccionadas' : 'Filtrar por etiquetas';
    return { work: work.value, reference: reference.value, origin: origin.value,
      usage: usage.value, mode: mode.value, tags, includePending: pending.checked };
  }
  function reset() {
    work.value = '';
    reference.value = '';
    origin.value = '';
    usage.value = '';
    mode.value = 'all';
    pending.checked = false;
    for (const selection of selections.values()) selection.checked = false;
  }
  function toggleTag(id) {
    const control = selections.get(id);
    if (!control) return;
    control.checked = !control.checked;
    onChange();
  }
  return { panel, work, reference, origin, usage, read, reset, toggleTag };
}

export function appendBankGroups(target, texts, sort, appendRows) {
  if (sort === 'title-asc') { appendRows(target, texts); return; }
  let parent, subgroup, parentTitle, subgroupTitle;
  for (const text of texts) {
    const author = text.source.author?.trim() || 'Autor sin indicar';
    const work = text.source.work?.trim() || 'Obra sin indicar';
    const [first, second] = sort === 'work-asc' ? [work, author] : [author, work];
    if (first !== parentTitle) {
      parentTitle = first;
      subgroupTitle = undefined;
      parent = element('section', { className: 'atl-bank-group' });
      parent.append(element('h5', { textContent: first }));
      target.append(parent);
    }
    if (second !== subgroupTitle) {
      subgroupTitle = second;
      subgroup = element('section', { className: 'atl-bank-work' });
      subgroup.append(element('h6', { textContent: second }));
      parent.append(subgroup);
    }
    appendRows(subgroup, [text]);
  }
}

export function appendDuplicateCards(target, pairs, sources, { kindLabel, sourceReference, referencedIn, passage, edit }) {
  const names = {
    identical: 'Textos idénticos',
    overlap: 'Fragmentos compartidos',
    citation: 'Misma referencia bibliográfica'
  };
  const groups = new Map();
  for (const pair of pairs) {
    const first = sources.get(pair.firstId);
    const second = sources.get(pair.secondId);
    if (!first || !second) continue;
    if (!groups.has(pair.kind)) groups.set(pair.kind, new Map());
    const matches = groups.get(pair.kind);
    for (const [text, other] of [[first, second], [second, first]]) {
      if (!matches.has(text.id)) matches.set(text.id, []);
      matches.get(text.id).push({ other, pair });
    }
  }

  for (const [type, matches] of groups) {
    const section = element('details', { className: 'atl-duplicate-group', open: true });
    const summary = element('summary');
    summary.append(element('h3', { textContent: names[type] }));
    section.append(summary);
    const cards = new Map();
    const grid = element('div', { className: 'atl-duplicate-grid' });
    for (const [id, related] of matches) {
      const text = sources.get(id);
      const card = element('article', { className: 'atl-duplicate-card' });
      const details = element('details');
      const heading = element('summary');
      const excerpt = text.latin.replace(/\s+/gu, ' ').trim();
      heading.append(
        element('strong', { textContent: text.title }),
        element('span', { className: 'muted', textContent: sourceReference(text) }),
        element('i', { className: 'atl-duplicate-excerpt', lang: 'la', textContent: excerpt.length > 145 ? excerpt.slice(0, 145) + '…' : excerpt })
      );
      details.append(heading);
      cards.set(id, details);
      const navigation = element('div', { className: 'atl-duplicate-next' });
      for (const { other } of related) {
        const next = element('button', { type: 'button', className: 'hbtn', textContent: 'Siguiente · ' + other.title });
        next.addEventListener('click', () => {
          const destination = cards.get(other.id);
          details.open = false;
          destination.open = true;
          destination.querySelector('summary').focus();
        });
        navigation.append(next);
      }
      const opened = element('div', { className: 'atl-duplicate-opened' });
      opened.append(element('p', { className: 'cuaderno-duplicate-latin', lang: 'la', textContent: text.latin }), navigation);
      details.append(opened);
      const comparisons = element('div', { className: 'atl-duplicate-comparisons' });
      for (const { other, pair } of related) {
        const comparison = element('details', { className: 'cuaderno-duplicate-result' });
        comparison.append(
          element('summary', { textContent: 'Comparar con «' + other.title + '»' }),
          element('p', { className: 'small muted', textContent: sourceReference(other) }),
          element('p', { className: 'small muted', textContent: pair.kind === 'citation' ? kindLabel[pair.kind] : pair.sharedWords + ' palabras compartidas' }),
          passage(text, pair.excerpt, pair.kind !== 'citation'),
          passage(other, pair.excerpt, pair.kind !== 'citation')
        );
        comparisons.append(comparison);
      }
      opened.append(comparisons);
      const button = element('button', { type: 'button', className: 'hbtn', textContent: 'Editar ficha' });
      button.setAttribute('aria-label', 'Editar «' + text.title + '»');
      button.addEventListener('click', () => edit(text));
      const footer = element('div', { className: 'atl-duplicate-card-footer' });
      footer.append(element('span', { className: 'small muted', textContent: 'Cuadernos · ' + referencedIn(text.id) }), button);
      card.append(details, footer);
      grid.append(card);
    }
    section.append(grid);
    target.append(section);
  }
}

export function openBankReader({ texts, selected, catalogue, modal, edit, tag, remove, usage, pendingTags, automaticFor = () => [], isProtected, onClose, onError }) {
  let index = texts.findIndex(text => text.id === selected.id);
  if (index < 0) return;
  const content = element('div', { className: 'atl-bank-reader' });
  const tools = element('nav', { className: 'atl-reader-nav' });
  tools.setAttribute('aria-label', 'Navegar por los resultados del banco');
  const position = element('span');
  position.setAttribute('role', 'status');
  const makeButton = (label, action) => {
    const button = element('button', { type: 'button', className: 'hbtn', textContent: label });
    button.addEventListener('click', action);
    return button;
  };
  const move = offset => {
    if (texts[index + offset]) {
      index += offset;
      render();
    }
  };
  const previous = makeButton('Anterior', () => move(-1));
  const next = makeButton('Siguiente', () => move(1));
  tools.append(previous, position, next);
  const title = element('h3');
  const reference = element('p', { className: 'muted' });
  const latin = element('p', { className: 'atl-reader-latin', lang: 'la' });
  const tags = element('div', { className: 'grammar-chips atl-reader-tags' });
  const pending = element('p', { className: 'muted' });
  const notes = element('p', { className: 'muted' });
  const glossary = element('details', { className: 'atl-source-vocabulary' });
  const dictionary = element('dl');
  glossary.append(element('summary', { textContent: 'Vocabulario de la ficha' }), dictionary);
  const actions = element('div', { className: 'atl-reader-actions' });
  const editCurrent = action => async () => {
    reader.close();
    try {
      await action(texts[index]);
    } catch (error) {
      onError(error);
    }
  };
  const removeButton = makeButton('Quitar del banco', editCurrent(remove));
  actions.append(makeButton('Editar ficha', editCurrent(edit)), makeButton('Etiquetar', editCurrent(tag)),
    makeButton('Ver usos anteriores', editCurrent(usage)), removeButton);
  content.append(tools, title, reference, latin, tags, pending, notes, glossary, actions);
  const reader = modal('Lectura del texto', content, [{ label: 'Volver al listado' }],
    { width: 'min(760px, 96vw)', onClose });
  const labels = new Map(catalogue.map(tag => [tag.id, tag.label]));
  function render() {
    const text = texts[index];
    position.textContent = (index + 1) + ' de ' + texts.length;
    const focused = document.activeElement;
    previous.disabled = index === 0;
    next.disabled = index === texts.length - 1;
    if (focused === previous && previous.disabled) next.focus();
    if (focused === next && next.disabled) previous.focus();
    title.textContent = text.title;
    reference.textContent = [text.source.author, text.source.work, text.source.reference].filter(Boolean).join(' · ');
    latin.textContent = text.latin;
    tags.replaceChildren();
    for (const id of text.tagIds) {
      if (!labels.has(id)) continue;
      const chip = element('span', { className: 'grammar-chip', textContent: labels.get(id) });
      chip.dataset.group = GRAMMAR_GROUP_IDS.find(group => matchesGrammarTag(id, group, catalogue)) ?? 'custom';
      tags.append(chip);
    }
    for (const id of automaticFor(text.id)) {
      if (labels.has(id)) tags.append(element('span', { className: 'grammar-chip', textContent: labels.get(id) + ' · Automática' }));
    }
    const proposals = (pendingTags?.get(text.id) ?? []).map(id => labels.get(id)).filter(Boolean);
    pending.textContent = proposals.length ? 'Propuestas pendientes: ' + proposals.join(' · ') : '';
    pending.hidden = !proposals.length;
    notes.textContent = text.notes ?? '';
    notes.hidden = !text.notes;
    const entries = sourceVocabulary(text);
    glossary.hidden = !entries.length;
    dictionary.replaceChildren(...entries.flatMap(entry => [
      element('dt', { textContent: entry.headword, lang: 'la' }),
      element('dd', { textContent: [entry.meaning, entry.note].filter(Boolean).join(' · ') })
    ]));
    removeButton.disabled = isProtected(text);
    reader.body.scrollTop = 0;
  }
  reader.el.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  });
  render();
  (next.disabled ? (previous.disabled ? reader.el.querySelector('.xbtn') : previous) : next)?.focus();
}
