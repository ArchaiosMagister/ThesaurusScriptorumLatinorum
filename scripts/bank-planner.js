import { communities, infinitiveId, isInfinitiveTag, isRetiredTag, periods, planCurriculum } from './atl-bank-curriculum.js';
import { findPossibleDuplicates, normalizedLatinKey } from '../core/text-duplicates.js';
import { assessBankDifficulty, difficultyText } from './atl-bank-difficulty.js';

function node(tag, text) {
  const result = document.createElement(tag);
  if (text) result.textContent = text;
  return result;
}

function field(label, input) {
  const wrapper = node('label');
  wrapper.className = 'field';
  wrapper.append(node('span', label), input);
  return wrapper;
}

export function communitySelect(empty) {
  const select = node('select');
  select.append(new Option(empty, ''));
  for (const name of communities) select.append(new Option(name, name));
  return select;
}

export function selectividadEditor(value) {
  const container = node('fieldset');
  container.className = 'atl-selectividad';
  const enabled = node('input');
  enabled.type = 'checkbox';
  enabled.checked = Boolean(value);
  const year = node('input');
  year.type = 'number';
  year.min = '1900';
  year.max = '2099';
  year.step = '1';
  year.value = value?.year ?? '';
  const community = communitySelect('Sin indicar');
  community.value = value?.community ?? '';
  const details = node('div');
  details.className = 'atl-selectividad-fields';
  details.append(field('Año de Selectividad', year), field('Comunidad autónoma', community));
  const update = () => { details.hidden = !enabled.checked; };
  enabled.addEventListener('change', update);
  update();
  container.append(node('legend', 'Procedencia de examen'), field('Selectividad', enabled), details);
  return {
    container,
    read() {
      if (!enabled.checked) return null;
      if (!year.validity.valid) throw Error('Introduce un año entero entre 1900 y 2099.');
      return { ...(year.value ? { year: Number(year.value) } : {}), ...(community.value ? { community: community.value } : {}) };
    }
  };
}

function action(label, run, primary = false) {
  const button = node('button', label);
  button.type = 'button';
  button.className = primary ? 'hbtn primary' : 'hbtn';
  button.addEventListener('click', run);
  return button;
}

function options(choices) {
  const select = node('select');
  for (const [value, label] of choices) select.append(new Option(label, value));
  return select;
}

function countInput(initial) {
  const input = node('input');
  Object.assign(input, { type: 'number', min: '0', max: '100', step: '1', required: true, value: String(initial) });
  return input;
}

function move(items, from, to) {
  [items[from], items[to]] = [items[to], items[from]];
}

export function showBankPlanner({ read, match, create, modal }) {
  const panel = node('div');
  panel.className = 'atl-bank-planner';
  const title = node('input');
  title.value = 'Lecturas por trimestres';
  title.maxLength = 250;
  const progression = options([['cumulative', 'Acumulativa'], ['specific', 'Específica']]);
  const exam = options([['exclude', 'Excluir textos de Selectividad'], ['all', 'Todos los textos'], ['only', 'Solo textos de Selectividad']]);
  const filtered = node('input');
  filtered.type = 'checkbox';
  const courses = node('fieldset');
  courses.append(node('legend', 'Excluir cursos'));
  const exclusions = [['1bach', '1.º de Bachillerato'], ['2bach', '2.º de Bachillerato'], ['unassigned', 'Sin curso asignado']].map(([id, label]) => {
    const check = node('input');
    check.type = 'checkbox';
    check.value = id;
    courses.append(field(label, check));
    return check;
  });
  courses.append(node('small', 'Basta con que uno de los cursos asignados esté excluido para descartar el texto.'));
  const status = node('p');
  status.setAttribute('role', 'status');
  const preview = node('div');
  const partial = node('input');
  partial.type = 'checkbox';
  const partialField = field('Aceptar advertencias y crear el cuaderno con esta selección', partial);
  const createButton = action('Crear cuaderno', confirm, true);
  const refresh = action('Actualizar previsualización', generate);
  const actions = node('div');
  actions.className = 'atl-bank-action-group';
  actions.append(refresh, createButton);
  const termControls = [];
  let catalogue = [], plan, sequence = 0, saving = false, hasWarnings = false;
  const tagLabels = ids => ids.map(id => catalogue.find(tag => tag.id === id)?.label ?? id).join(', ');
  const settings = node('div');
  settings.className = 'atl-planner-counts';
  settings.append(field('Progresión gramatical', progression), field('Selectividad', exam));
  panel.append(field('Título del nuevo cuaderno', title), settings, courses,
    field('Usar los resultados filtrados del Banco', filtered));
  periods.slice(0, 3).forEach(([, label], index) => {
    const section = node('details');
    section.open = index === 0;
    const count = countInput(15);
    const review = countInput(index === 0 ? 2 : index === 1 ? 2 : 1);
    const tags = [];
    const summary = node('summary', label);
    const list = node('ol');
    const select = node('select');
    select.setAttribute('aria-label', 'Etiqueta para ' + label.toLowerCase());
    const counts = node('div');
    counts.className = 'atl-planner-counts';
    counts.append(field('Textos ordinarios', count), field('Textos de refuerzo', review));
    const render = () => {
      const selected = select.value;
      select.replaceChildren(new Option('Añadir etiqueta…', ''));
      const categories = new Map();
      for (const tag of catalogue) {
        if (tags.includes(tag.id)) continue;
        const name = tag.kind === 'custom' ? 'Etiquetas propias' :
          catalogue.find(parent => parent.id === tag.parentId)?.label ?? tag.category ?? 'Gramática';
        if (!categories.has(name)) {
          const group = node('optgroup');
          group.label = name;
          categories.set(name, group);
          select.append(group);
        }
        categories.get(name).append(new Option(tag.label, tag.id));
      }
      if ([...select.options].some(option => option.value === selected)) select.value = selected;
      list.replaceChildren();
      tags.forEach((id, position) => {
        const row = node('li', tagLabels([id]));
        const controls = node('span');
        controls.className = 'atl-bank-action-group';
        for (const [name, direction] of [['Subir', -1], ['Bajar', 1]]) {
          const control = action(name, () => {
            move(tags, position, position + direction);
            render();
            list.children[position + direction].querySelector('button').focus();
            void generate();
          });
          control.setAttribute('aria-label', name + ' ' + tagLabels([id]));
          control.disabled = !tags[position + direction];
          controls.append(control);
        }
        const remove = action('Quitar', () => {
          tags.splice(position, 1);
          render();
          select.focus();
          void generate();
        });
        remove.setAttribute('aria-label', 'Quitar ' + tagLabels([id]));
        controls.append(remove);
        row.append(controls);
        list.append(row);
      });
      summary.textContent = label + (tags.length ? ' · ' + tags.length + (tags.length === 1 ? ' etiqueta' : ' etiquetas') : '');
    };
    select.addEventListener('change', () => {
      if (!select.value) return;
      tags.push(select.value);
      render();
      void generate();
    });
    count.addEventListener('change', generate);
    review.addEventListener('change', generate);
    termControls.push({ count, review, tags, render });
    section.append(summary, counts, select, list);
    panel.append(section);
  });
  panel.append(status, preview, partialField, actions);

  function updateButton() {
    partialField.hidden = !hasWarnings;
    createButton.disabled = saving || !title.value.trim() || !plan?.groups.some(group => group.entries.length) ||
      (hasWarnings && !partial.checked);
  }

  function renderPreview(open = new Set()) {
    preview.replaceChildren();
    hasWarnings = false;
    for (const group of plan.groups) {
      if (!group.size && group.review) continue;
      const info = plan.coverage(group);
      const details = node('details');
      details.open = open.has(group.period);
      details.dataset.period = group.period;
      const list = node('ol');
      for (const [index, row] of group.entries.entries()) {
        const item = node('li');
        item.append(node('span', [row.text.title, row.text.source.author, difficultyText(row.level)].filter(Boolean).join(' · ')));
        if (row.tags.length) item.append(node('p', tagLabels(row.tags)));
        const controls = node('span');
        controls.className = 'atl-bank-action-group';
        const replace = action('Sustituir', () => {
          if (plan.replace(group, index)) redraw();
          else status.textContent = 'No quedan alternativas compatibles para «' + row.text.title + '».';
        });
        replace.setAttribute('aria-label', 'Sustituir «' + row.text.title + '»');
        controls.append(replace);
        for (const [name, direction] of [['Subir', -1], ['Bajar', 1]]) {
          const button = action(name, () => { move(group.entries, index, index + direction); redraw(); });
          button.setAttribute('aria-label', name + ' «' + row.text.title + '»');
          button.disabled = !group.entries[index + direction];
          controls.append(button);
        }
        item.append(controls);
        list.append(item);
      }
      details.append(node('summary', group.label + ' · ' + group.entries.length + '/' + group.size +
        ' · ' + info.candidates + ' candidatos'));
      if (info.covered.length) details.append(node('p', 'Cubiertas: ' + tagLabels(info.covered)));
      if (info.uncovered.length) details.append(node('p', 'Cobertura insuficiente: ' + tagLabels(info.uncovered)));
      if (info.later.length) details.append(node('p', 'Etiquetas de trimestres posteriores: ' + tagLabels(info.later)));
      if (group.entries.length < group.size) details.append(node('p', 'Faltan textos compatibles.'));
      if (info.uncovered.length || info.later.length || group.entries.length < group.size) {
        hasWarnings = true;
        details.open = true;
      }
      details.append(list);
      preview.append(details);
    }
    updateButton();
  }

  function redraw() {
    partial.checked = false;
    renderPreview(new Set([...preview.querySelectorAll('details[open]')].map(section => section.dataset.period)));
  }

  async function generate() {
    const ticket = ++sequence;
    const open = new Set([...preview.querySelectorAll('details[open]')].map(section => section.dataset.period));
    const settings = {
      terms: termControls.map(({ count, review, tags }) => ({ count: count.valueAsNumber, review: review.valueAsNumber, tags: [...tags] })),
      progression: progression.value, exam: exam.value, excludedCourses: exclusions.filter(check => check.checked).map(check => check.value)
    };
    plan = undefined;
    partial.checked = false;
    hasWarnings = false;
    preview.replaceChildren();
    updateButton();
    const total = settings.terms.reduce((sum, term) => sum + term.count + term.review, 0);
    if (termControls.some(({ count, review }) => !count.validity.valid || !review.validity.valid) || total < 1 || total > 100) {
      status.textContent = 'Indica un total entre 1 y 100 textos.';
      return;
    }
    status.textContent = 'Comprobando disponibilidad…';
    try {
      const result = await read(filtered.checked);
      if (ticket !== sequence || !panel.isConnected) return;
      catalogue = result.catalogue.filter(tag => !isRetiredTag(tag.id));
      termControls.forEach(control => control.render());
      const requested = [...new Set(settings.terms.flatMap(term => term.tags))];
      const aliases = new Map();
      const rows = result.texts.map(text => {
        const ids = [...new Set([...text.tagIds, ...(result.automatic.get(text.id) ?? [])])].filter(id => !isRetiredTag(id));
        const tags = new Set(ids);
        for (const id of ids) {
          if (!aliases.has(id)) aliases.set(id, requested.filter(tag => tag === infinitiveId ? isInfinitiveTag(id) : match(id, tag, catalogue)));
          for (const tag of aliases.get(id)) tags.add(tag);
        }
        return { text, tags: [...tags], placementTags: ids, level: assessBankDifficulty(text, result.automatic.get(text.id)).level };
      });
      const latinKeys = new Map(rows.map(({ text }) => [text.id, normalizedLatinKey(text.latin)]));
      const windows = new Map([...latinKeys].map(([id, key]) => {
        const words = key.split(' ');
        return [id, new Set(words.slice(7).map((_, index) => words.slice(index, index + 8).join(' ')))];
      }));
      const comparisons = new Map();
      plan = planCurriculum(rows, settings, (a, b) => {
        const keys = comparisons.get(a.id) ?? new Map();
        if (!keys.has(b.id)) {
          const exact = latinKeys.get(a.id) === latinKeys.get(b.id);
          const shared = !exact && [...windows.get(a.id)].some(key => windows.get(b.id).has(key));
          const duplicate = exact || shared && findPossibleDuplicates([a], { latin: b.latin, ...b.source }, undefined, 1)
            .some(item => item.kind === 'identical' || item.kind === 'overlap');
          keys.set(b.id, duplicate);
          comparisons.set(a.id, keys);
        }
        return keys.get(b.id);
      });
      status.textContent = 'La ausencia de una etiqueta no descarta la construcción.' +
        (result.pendingAnalyses ? ' Hay fichas pendientes de análisis.' : '');
      renderPreview(open);
    } catch (error) {
      status.textContent = error.message || String(error);
    }
  }

  async function confirm() {
    if (createButton.disabled) return;
    const entries = plan.groups.flatMap(({ entries, period }) => entries.map(row => ({ ...row, period })));
    saving = true;
    updateButton();
    try {
      const id = await create(title.value.trim(), entries);
      dialog.close();
      await window.parent.atlOpenRelated({ type: 'edición', id });
    } catch (error) {
      status.textContent = error.message || String(error);
    } finally {
      saving = false;
      updateButton();
    }
  }
  for (const input of [progression, exam, filtered, ...exclusions]) input.addEventListener('change', generate);
  partial.addEventListener('change', updateButton);
  title.addEventListener('input', updateButton);
  const dialog = modal('Crear cuaderno por trimestres', panel, [{ label: 'Cerrar' }]);
  void generate();
}
