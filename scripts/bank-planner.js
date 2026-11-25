import { localTemplates, templatePrefix, validateTemplate } from '../../../curriculum-templates.js';
import { communities, infinitiveId, isInfinitiveTag, isRetiredTag, periods, planCurriculum, plannerFiniteFamilies, plannerFiniteFamily, plannerTagVisible } from './atl-bank-curriculum.js';
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
  const done = node('input');
  done.type = 'checkbox';
  done.checked = value?.hecho === true;
  const doneLabel = node('label', '');
  doneLabel.className = 'atl-pau-done';
  doneLabel.append(done, node('span', 'Hecho'));
  details.append(field('Año de Selectividad', year), field('Comunidad autónoma', community), doneLabel);
  const update = () => { details.hidden = !enabled.checked; };
  enabled.addEventListener('change', update);
  update();
  container.append(node('legend', 'Procedencia de examen'), field('Selectividad', enabled), details);
  return {
    container,
    read() {
      if (!enabled.checked) return null;
      if (!year.validity.valid) throw Error('Introduce un año entero entre 1900 y 2099.');
      return { ...(year.value ? { year: Number(year.value) } : {}), ...(community.value ? { community: community.value } : {}), ...(done.checked && { hecho: true }) };
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

// Presentation-only groups: stored templates retain the original ordered tag IDs.
export function plannerTagGroup(tag, catalogue) {
  const finiteFamily = plannerFiniteFamily(tag.id);
  if (finiteFamily) return finiteFamily;
  if (tag.id.startsWith('gram.pron.')) return 'Pronombres';
  if (tag.id.startsWith('gram.part.')) return 'Participios';
  if (isInfinitiveTag(tag.id)) return 'Infinitivos';
  return tag.kind === 'custom' ? 'Etiquetas propias' :
    catalogue.find(parent => parent.id === tag.parentId)?.label ?? tag.category ?? 'Otras etiquetas';
}

export function showBankPlanner({ read, match, create, modal, returnFocus }) {
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
  preview.className = 'atl-planner-preview-list';
  const partial = node('input');
  partial.type = 'checkbox';
  const partialField = field('Aceptar advertencias y crear el cuaderno con esta selección', partial);
  const createButton = action('Crear cuaderno', confirm, true);
  const refresh = action('Actualizar previsualización', generate);
  const termControls = [];
  let sourceCatalogue, catalogue = [], families = [], plan, sequence = 0, saving = false, hasWarnings = false;
  const tagLabels = ids => ids.map(id => id === infinitiveId ? 'Cualquier infinitivo' :
    id === 'gram.part.forma' ? 'Cualquier participio' : catalogue.find(tag => tag.id === id)?.label ?? id).join(', ');
  const settings = node('div');
  settings.className = 'atl-planner-counts';
  settings.append(field('Progresión gramatical', progression), field('Selectividad', exam));
  const templates = node('details');
  const templateSelect = options([]);
  const templateName = node('input');
  templateName.maxLength = 150;
  const templateActions = node('div');
  templateActions.className = 'atl-bank-action-group';
  let loadedTemplate = null;
  const templateStatus = node('p');
  templateStatus.setAttribute('aria-live', 'polite');
  function templateAction(label, perform) {
    return action(label, () => {
      try { perform(); templateStatus.textContent = ''; }
      catch (error) { templateStatus.textContent = error.message; }
    });
  }
  function listTemplates(selected = '') {
    templateSelect.replaceChildren(new Option('Elegir plantilla…', ''));
    for (const [key, template] of localTemplates().sort(([, a], [, b]) => a.name.localeCompare(b.name, 'es'))) {
      templateSelect.append(new Option(template.name, key));
    }
    templateSelect.value = selected;
    for (const button of [loadTemplate, updateTemplate, duplicateTemplate, deleteTemplate]) {
      button.disabled = !templateSelect.value;
    }
  }
  function readTemplate() {
    const key = templateSelect.value;
    const raw = localStorage.getItem(key);
    if (!raw) throw Error('La plantilla ya no está disponible.');
    return { key, raw, value: validateTemplate(JSON.parse(raw)) };
  }
  function saveTemplate(key, value) {
    localStorage.setItem(key, JSON.stringify(validateTemplate(value)));
    listTemplates(key);
    loadedTemplate = readTemplate();
    templateName.value = loadedTemplate.value.name;
  }
  const loadTemplate = templateAction('Cargar', () => {
    loadedTemplate = readTemplate();
    const value = loadedTemplate.value;
    const config = value.settings;
    templateName.value = value.name;
    progression.value = config.progression;
    exam.value = config.exam;
    filtered.checked = config.filtered;
    for (const check of exclusions) check.checked = config.excludedCourses.includes(check.value);
    termControls.forEach(({ count, review, tags, render }, index) => {
      const term = config.terms[index];
      count.value = term.count;
      review.value = term.review;
      tags.splice(0, tags.length, ...term.tags);
      render();
    });
    void generate();
  });
  const newTemplate = templateAction('Guardar nueva', () => saveTemplate(templatePrefix + crypto.randomUUID(),
    { name: templateName.value, settings: readSettings() }));
  const updateTemplate = templateAction('Guardar cambios', () => {
    const current = readTemplate();
    if (loadedTemplate?.key !== current.key || loadedTemplate.raw !== current.raw)
      throw Error('Carga la plantilla actual antes de guardar cambios.');
    saveTemplate(current.key, { name: templateName.value, settings: readSettings() });
  });
  const duplicateTemplate = templateAction('Duplicar', () => {
    const { value } = readTemplate();
    saveTemplate(templatePrefix + crypto.randomUUID(), { ...value, name: value.name.slice(0, 143) + ' (copia)' });
  });
  const deleteTemplate = templateAction('Eliminar', () => {
    const { key, raw, value } = readTemplate();
    if (!window.confirm('¿Eliminar la plantilla «' + value.name + '»?')) return;
    if (localStorage.getItem(key) !== raw) throw Error('La plantilla cambió en otra pestaña.');
    localStorage.removeItem(key);
    loadedTemplate = null;
    templateName.value = '';
    listTemplates();
  });
  templateSelect.addEventListener('change', () => listTemplates(templateSelect.value));
  templateActions.append(loadTemplate, newTemplate, updateTemplate, duplicateTemplate, deleteTemplate);
  templates.append(node('summary', 'Plantillas de programación'), field('Plantilla', templateSelect),
    field('Nombre de la plantilla', templateName), templateActions, templateStatus);
  try { listTemplates(); } catch (error) { templateStatus.textContent = error.message; }
  const filters = node('details');
  filters.append(node('summary', 'Filtros de selección'), settings, courses,
    field('Usar los resultados filtrados del Banco', filtered));
  const terms = node('section');
  terms.className = 'atl-planner-terms';
  terms.append(node('h3', 'Distribución por trimestres'));
  panel.append(field('Título del nuevo cuaderno', title), templates, filters, terms);
  periods.slice(0, 3).forEach(([, label], index) => {
    const section = node('details');
    section.className = 'atl-planner-term';
    section.open = index === 0;
    const count = countInput(15);
    const review = countInput(index === 0 ? 2 : index === 1 ? 2 : 1);
    const tags = [];
    const summary = node('summary', label);
    const list = node('ol');
    const select = node('select');
    select.setAttribute('aria-label', 'Etiqueta para ' + label.toLowerCase());
    const picker = node('div');
    picker.className = 'atl-planner-picker';
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', 'Selección de etiquetas para ' + label.toLowerCase());
    const search = node('input');
    search.type = 'search';
    search.placeholder = 'Buscar etiqueta o familia…';
    search.setAttribute('aria-label', 'Buscar etiquetas para ' + label.toLowerCase());
    const groups = node('div');
    groups.className = 'atl-planner-tag-groups';
    const selectedDetails = node('details');
    selectedDetails.className = 'atl-planner-selected';
    const selectedSummary = node('summary', 'Orden de las etiquetas seleccionadas');
    selectedDetails.append(selectedSummary, list);
    // Keep the individual quick-add control and the ordered selection for existing workflows.
    selectedDetails.open = true;
    picker.append(search, groups);
    const setTags = (ids, checked) => {
      if (checked) {
        tags.push(...ids.filter(id => !tags.includes(id)));
      } else {
        tags.splice(0, tags.length, ...tags.filter(id => !ids.includes(id)));
      }
      render();
      void generate();
    };
    const normalize = value => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
    function renderGroups() {
      const expanded = new Set([...groups.querySelectorAll('details[open]')].map(row => row.dataset.family));
      const focused = document.activeElement?.dataset?.pickerKey;
      groups.replaceChildren();
      const query = normalize(search.value.trim());
      for (const [family, members] of families) {
        const visible = members.filter(tag => !query || normalize(family + ' ' + tag.label).includes(query));
        if (!visible.length) continue;
        const ids = members.map(tag => tag.id);
        const total = ids.filter(id => tags.includes(id)).length;
        const row = node('div');
        row.className = 'atl-planner-family';
        const head = node('div');
        head.className = 'atl-planner-family-head';
        const groupCheck = node('input');
        groupCheck.type = 'checkbox';
        groupCheck.checked = total === ids.length;
        groupCheck.indeterminate = total > 0 && total < ids.length;
        groupCheck.dataset.pickerKey = 'group:' + family;
        groupCheck.setAttribute('aria-label', 'Seleccionar familia ' + family + ' para ' + label.toLowerCase());
        groupCheck.addEventListener('change', () => setTags(ids, groupCheck.checked));
        head.append(field(family + ' (' + total + '/' + ids.length + ')', groupCheck));
        const detail = node('details');
        detail.dataset.family = family;
        detail.open = expanded.has(family) || Boolean(query);
        detail.append(node('summary', 'Ver etiquetas'));
        const choices = node('div');
        choices.className = 'atl-planner-family-choices';
        for (const tag of visible) {
          const check = node('input');
          check.type = 'checkbox';
          check.checked = tags.includes(tag.id);
          check.dataset.pickerKey = 'tag:' + tag.id;
          check.setAttribute('aria-label', tag.label + ' para ' + label.toLowerCase());
          check.addEventListener('change', () => setTags([tag.id], check.checked));
          choices.append(field(tag.label, check));
        }
        detail.append(choices);
        row.append(head, detail);
        groups.append(row);
      }
      if (focused) [...groups.querySelectorAll('input')]
        .find(input => input.dataset.pickerKey === focused)?.focus({ preventScroll: true });
      if (!groups.childElementCount) groups.append(node('p', query ? 'No hay etiquetas que coincidan.' : 'Cargando etiquetas…'));
    }
    search.addEventListener('input', renderGroups);
    const counts = node('div');
    counts.className = 'atl-planner-counts';
    counts.append(field('Textos ordinarios', count), field('Textos de refuerzo', review));
    const render = () => {
      const selected = select.value;
      select.replaceChildren(new Option('Añadir etiqueta…', ''));
      for (const [family, members] of families) {
        const available = members.filter(tag => !tags.includes(tag.id));
        if (!available.length) continue;
        const group = node('optgroup');
        group.label = family;
        for (const tag of available) group.append(new Option(tag.label, tag.id));
        select.append(group);
      }
      if ([...select.options].some(option => option.value === selected)) select.value = selected;
      list.replaceChildren();
      tags.forEach((id, position) => {
        const row = node('li');
        row.append(node('span', tagLabels([id])));
        const controls = node('span');
        controls.className = 'atl-bank-action-group';
        for (const [name, direction] of [['Subir', -1], ['Bajar', 1]]) {
          const control = action(name, () => {
            move(tags, position, position + direction);
            render();
            const buttons = list.children[position + direction].querySelectorAll('button');
            const same = buttons[direction < 0 ? 0 : 1];
            (same.disabled ? buttons[direction < 0 ? 1 : 0] : same).focus();
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
      selectedSummary.textContent = 'Orden de las etiquetas seleccionadas (' + tags.length + ')';
      selectedDetails.hidden = !tags.length;
      renderGroups();
      summary.textContent = label + (tags.length ? ' · ' + tags.length + (tags.length === 1 ? ' etiqueta' : ' etiquetas') : '');
    };
    select.addEventListener('change', () => {
      if (!select.value) return;
      tags.push(select.value);
      render();
      void generate();
    });
    for (const input of [count, review]) {
      input.addEventListener('input', () => {
        sequence++;
        plan = undefined;
        updateButton();
      });
      input.addEventListener('change', generate);
    }
    termControls.push({ count, review, tags, render });
    section.append(summary, counts, selectedDetails, field('Añadir una etiqueta', select), picker);
    terms.append(section);
  });
  const results = node('section');
  results.className = 'atl-planner-preview';
  results.append(node('h3', 'Previsualización'), status, preview, partialField);
  panel.append(results);

  function updateButton() {
    partialField.hidden = !hasWarnings;
    createButton.textContent = saving ? 'Creando cuaderno…' : 'Crear cuaderno';
    refresh.disabled = saving;
    partial.disabled = saving;
    createButton.disabled = saving || !title.value.trim() || !plan?.groups.some(group => group.entries.length) ||
      (hasWarnings && !partial.checked);
  }

  function renderPreview(open = new Set()) {
    preview.replaceChildren();
    hasWarnings = false;
    for (const group of plan.groups) {
      if (!group.size) continue;
      const info = plan.coverage(group);
      const details = node('details');
      details.open = open.has(group.period);
      details.dataset.period = group.period;
      const list = node('ol');
      for (const [index, row] of group.entries.entries()) {
        const item = node('li');
        item.append(node('span', [row.text.title, row.text.source.author || 'Autor sin indicar', difficultyText(row.level)].filter(Boolean).join(' · ')));
        if (row.tags.length) item.append(node('p', tagLabels(row.tags)));
        const controls = node('span');
        controls.className = 'atl-bank-action-group';
        const replace = action('Sustituir', () => {
          if (plan.replace(group, index)) redraw(group.period, index);
          else status.textContent = 'No quedan alternativas compatibles para «' + row.text.title + '».';
        });
        replace.setAttribute('aria-label', 'Sustituir «' + row.text.title + '»');
        controls.append(replace);
        for (const [name, direction] of [['Subir', -1], ['Bajar', 1]]) {
          const button = action(name, () => {
            move(group.entries, index, index + direction);
            redraw(group.period, index + direction, direction < 0 ? 1 : 2);
          });
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
        details.classList.add('atl-planner-warning');
        details.open = true;
      }
      details.append(list);
      preview.append(details);
    }
    updateButton();
  }

  function redraw(period, index, control = 0) {
    partial.checked = false;
    renderPreview(new Set([...preview.querySelectorAll('details[open]')].map(section => section.dataset.period)));
    const group = [...preview.children].find(section => section.dataset.period === period);
    const buttons = group?.querySelector('ol')?.children[index]?.querySelectorAll('button');
    const target = buttons?.[control]?.disabled ? buttons[0] : buttons?.[control];
    target?.focus();
  }

  function readSettings() {
    return {
      terms: termControls.map(({ count, review, tags }) => ({ count: count.valueAsNumber, review: review.valueAsNumber, tags: [...tags] })),
      progression: progression.value, exam: exam.value, filtered: filtered.checked,
      excludedCourses: exclusions.filter(check => check.checked).map(check => check.value)
    };
  }

  async function generate() {
    if (saving) return;
    const ticket = ++sequence;
    const open = new Set([...preview.querySelectorAll('details[open]')].map(section => section.dataset.period));
    const settings = readSettings();
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
      const result = await read(settings.filtered);
      if (ticket !== sequence || !panel.isConnected) return;
      if (result.catalogue !== sourceCatalogue) {
        sourceCatalogue = result.catalogue;
        catalogue = sourceCatalogue.filter(tag => !isRetiredTag(tag.id));
        const byFamily = new Map();
        for (const tag of catalogue.filter(({ id }) => plannerTagVisible(id))) {
          const family = plannerTagGroup(tag, catalogue);
          if (!byFamily.has(family)) byFamily.set(family, []);
          byFamily.get(family).push(tag);
        }
        const preferred = [...plannerFiniteFamilies,
          'Pronombres', 'Participios', 'Infinitivos', 'Verbos deponentes'];
        const rank = name => preferred.includes(name) ? preferred.indexOf(name) : preferred.length;
        families = [...byFamily].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, 'es'));
        termControls.forEach(control => control.render());
      }
      const requested = [...new Set(settings.terms.flatMap(term => term.tags))];
      const unavailable = requested.filter(id => !catalogue.some(tag => tag.id === id));
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
      const count = plan.groups.reduce((sum, group) => sum + group.entries.length, 0);
      status.textContent = count + ' de ' + total + ' textos previstos.' +
        (result.pendingAnalyses ? ' Hay fichas pendientes de análisis.' : '') +
        (unavailable.length ? ' Etiquetas que ya no están en el catálogo: ' + unavailable.join(', ') + '.' : '');
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
      saving = false;
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
  const dialog = modal('Crear cuaderno por trimestres', panel, [{ label: 'Cerrar' }], {
    width: 'min(54rem, 96vw)', beforeClose: () => !saving, onClose: returnFocus
  });
  dialog.el.classList.add('atl-planner-modal');
  dialog.el.setAttribute('role', 'dialog');
  dialog.el.setAttribute('aria-labelledby', 'atl-planner-title');
  dialog.el.querySelector('.mh h2').id = 'atl-planner-title';
  dialog.el.querySelector('.mf').append(refresh, createButton);
  void generate();
}
