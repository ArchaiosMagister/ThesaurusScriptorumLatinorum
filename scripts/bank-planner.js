import { buildCurriculum, communities, curriculumTags, infinitiveId, isInfinitiveTag, isRetiredTag, periods } from './atl-bank-curriculum.js';
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

export function showBankPlanner({ read, match, create, modal }) {
  const panel = node('div');
  panel.className = 'atl-bank-planner';
  const title = node('input');
  title.value = 'Lecturas por trimestres';
  title.maxLength = 250;
  const eligible = node('input');
  eligible.type = 'checkbox';
  const presentOnly = node('input');
  presentOnly.type = 'checkbox';
  const custom = node('input');
  custom.type = 'checkbox';
  const partial = node('input');
  partial.type = 'checkbox';
  const counts = periods.map(([key]) => {
    const input = node('input');
    input.type = 'number';
    input.min = '0';
    input.max = '100';
    input.step = '1';
    input.value = key === 'repaso' ? '5' : '15';
    return input;
  });
  const sizes = node('div');
  sizes.className = 'atl-planner-counts';
  sizes.append(...counts.map((input, index) => field(periods[index][1], input)));
  const status = node('p');
  status.setAttribute('role', 'status');
  const preview = node('div');
  const createButton = node('button', 'Crear cuaderno');
  createButton.type = 'button';
  createButton.className = 'hbtn primary';
  const refresh = node('button', 'Actualizar cobertura');
  refresh.type = 'button';
  refresh.className = 'hbtn';
  const actions = node('div');
  actions.className = 'atl-bank-action-group';
  actions.append(refresh, createButton);
  panel.append(field('Título del nuevo cuaderno', title), sizes, field('Usar los resultados filtrados del Banco', eligible),
    field('Limitar a etiquetas presentes en la selección', presentOnly), field('Incluir etiquetas propias', custom),
    status, preview, field('Aceptar menos textos o cobertura parcial', partial), actions);
  let plan, loading = false, saving = false;
  function updateButton() {
    createButton.disabled = loading || saving || !title.value.trim() || !plan?.count ||
      (!partial.checked && (plan.count < plan.capacity || plan.missing.length > 0 || plan.uncovered.length > 0));
  }
  async function generate() {
    const ticket = Symbol();
    generate.ticket = ticket;
    const desired = counts.map(input => input.valueAsNumber);
    preview.replaceChildren();
    plan = undefined;
    if (!desired.every(count => Number.isInteger(count) && count >= 0) ||
        desired.reduce((sum, count) => sum + count, 0) > 100 || !desired.some(Boolean)) {
      status.textContent = 'Indica un total entre 1 y 100 textos.';
      loading = false;
      updateButton();
      return;
    }
    loading = true;
    status.textContent = 'Comprobando cobertura…';
    updateButton();
    try {
      const { texts, catalogue, automatic, pendingAnalyses } = await read(eligible.checked);
      if (generate.ticket !== ticket || !panel.isConnected) return;
      const choices = [...curriculumTags(catalogue), ...catalogue.filter(tag => custom.checked && tag.kind === 'custom')];
      const aliases = new Map();
      const rows = texts.map(text => {
        const ids = [...new Set([...text.tagIds, ...(automatic.get(text.id) ?? [])])];
        const tags = new Set();
        for (const id of ids) {
          if (!aliases.has(id)) aliases.set(id, choices.filter(tag => tag.id === infinitiveId ? isInfinitiveTag(id) : match(id, tag.id, catalogue)).map(tag => tag.id));
          for (const tag of aliases.get(id)) tags.add(tag);
        }
        return { text, tags: [...tags], placementTags: ids.filter(id => !isRetiredTag(id)), level: assessBankDifficulty(text, automatic.get(text.id)).level };
      });
      const represented = new Set(rows.flatMap(row => row.tags));
      const requested = choices.filter(tag => !presentOnly.checked || represented.has(tag.id));
      plan = buildCurriculum(rows, requested.map(tag => tag.id), desired);
      status.textContent = plan.count + ' de ' + plan.capacity + ' textos · ' +
        (requested.length - plan.missing.length - plan.uncovered.length) + ' de ' + requested.length + ' etiquetas cubiertas' +
        (pendingAnalyses ? ' · Hay fichas todavía en análisis.' : '');
      const labels = new Map(requested.map(tag => [tag.id, tag.label]));
      if (plan.missing.length) preview.append(node('p', 'Sin ejemplos en la selección: ' + plan.missing.map(id => labels.get(id)).join(', ') + '.'));
      if (plan.uncovered.length) preview.append(node('p', 'Fuera del lote propuesto: ' + plan.uncovered.map(id => labels.get(id)).join(', ') + '.'));
      for (const { label, entries } of plan.groups) {
        if (!entries.length) continue;
        const details = node('details');
        const list = node('ol');
        for (const row of entries) list.append(node('li', row.text.title + ' · ' + difficultyText(row.level)));
        details.append(node('summary', label + ' · ' + entries.length + ' textos'), list);
        preview.append(details);
      }
    } catch (error) {
      if (generate.ticket === ticket) status.textContent = error.message || String(error);
    } finally {
      if (generate.ticket === ticket) { loading = false; updateButton(); }
    }
  }
  for (const input of [...counts, eligible, presentOnly, custom]) input.addEventListener('change', generate);
  partial.addEventListener('change', updateButton);
  title.addEventListener('input', updateButton);
  refresh.addEventListener('click', generate);
  createButton.addEventListener('click', async () => {
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
  });
  const dialog = modal('Crear cuaderno por trimestres', panel, [{ label: 'Cerrar' }]);
  void generate();
}
