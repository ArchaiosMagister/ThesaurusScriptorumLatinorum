export function simplifyNotebookOrganization(source) {
  function replace(before, after) {
    if (source.split(before).length !== 2) throw Error('Revisar el organizador de cuadernos: ' + before);
    source = source.replace(before, () => after);
  }

  replace("for (const m of labels.filter(item => item.key !== 'text' && item.key !== 'vocabulary')) {\n            const tabLabel = m.key === 'notebook' && options.onAnalyzeVocabulary ? 'Organizar' : m.label;",
    `for (const [key, tabLabel] of [['questions', 'Editar texto'], ['notebook', 'Organizar cuaderno']]) {
            const m = { key };`);
  replace("const tab = action(tabLabel, () => { menu = m.key; paint(); },", `const tab = action(tabLabel, () => {
                if (menu === key) return;
                menu = key;
                paint();
                element.closest('#editor')?.scrollTo(0, 0);
                element.querySelector('.atl-edition-toolbar [aria-current="page"]')?.focus({ preventScroll: true });
            },`);
  replace("            tab.setAttribute('aria-current', String(menu === m.key ? 'page' : 'false'));",
    `            tab.setAttribute('aria-current', menu === m.key ? 'page' : 'false');
            tab.disabled = key === 'questions' && !selection();`);
  replace("        const repetitions = academics.repetitionNotice();\n        if (repetitions)\n            element.insertBefore(repetitions, mobileSwitch);\n", '');
  replace("        if (menu === 'notebook')\n            menuNotebook(panel);\n        else if (menu === 'format')\n            menuFormat(panel);",
    "        if (menu === 'notebook' || !placement)\n            menuNotebook(panel);");
  replace("const b = action(label, () => { mobile = key; paint(); },", `const b = action(label, () => {
                mobile = key;
                paint();
                element.closest('#editor')?.scrollTo(0, 0);
                element.querySelector('.edition-mobile-switch .btn-primary')?.focus({ preventScroll: true });
            },`);
  replace("    let menu = 'questions', mobile = 'config';", "    let menu = 'notebook', mobile = 'config';");
  replace("    function menuNotebook(panel) {", `    const organizationSections = new Set();
    function organizationSection(panel, label, renderSection) {
        const section = node('details', 'card atl-organize-section');
        section.open = organizationSections.has(label);
        const body = node('div', 'atl-organize-section-body');
        let rendered = false;
        function renderOnce() {
            if (rendered) return;
            rendered = true;
            renderSection(body);
        }
        if (section.open) renderOnce();
        section.addEventListener('toggle', () => {
            if (!section.isConnected) return;
            if (section.open) {
                organizationSections.add(label);
                renderOnce();
            } else organizationSections.delete(label);
        });
        section.append(node('summary', '', label), body);
        panel.append(section);
    }
    function menuNotebook(panel) {`);
  const start = source.indexOf('        const e = draft, experimental');
  const end = source.indexOf('        const advanced = experimental', start);
  if (start < 0 || end < 0) throw Error('Revisar la lista de textos del cuaderno.');
  source = source.slice(0, start) + `        const e = draft, experimental = Boolean(options.onAnalyzeVocabulary);
        const principal = node('section', 'card atl-organize-main');
        principal.append(node('h3', '', 'Organizar cuaderno'));
        principal.append(textField('Título del cuaderno', e.title, value => {
            apply((edition, at) => validateEdition({ ...edition, title: value, updatedAt: at }));
        }));
        principal.append(node('h4', '', 'Textos del cuaderno (' + e.placements.length + ')'));
        const list = node('ol', 'edition-notebook-list atl-organize-list');
        function focusRow(id, selector) {
            const rows = element.querySelectorAll('.atl-organize-list > li');
            const row = Array.from(rows).find(item => item.dataset.placement === id);
            (row?.querySelector(selector) ?? row?.querySelector('.atl-organize-open') ??
                element.querySelector('.atl-organize-main input'))?.focus({ preventScroll: true });
        }
        e.placements.forEach((p, index) => {
            const periodName = periods.find(([key]) => key === p.period)?.[1];
            if (periodName && p.period !== e.placements[index - 1]?.period) {
                const heading = node('li', 'atl-curriculum-period');
                heading.append(node('h5', '', periodName));
                list.append(heading);
            }
            const row = node('li', 'edition-notebook-row atl-organize-row');
            row.dataset.placement = p.id;
            const info = node('div', 'atl-organize-info');
            const open = action(p.text.title, async () => {
                if (!await selectPlacement(p.id)) return;
                menu = 'questions';
                paint();
                element.querySelector('.edition-menu-text h3')?.scrollIntoView({ block: 'nearest' });
            }, 'atl-organize-open');
            open.setAttribute('aria-label', 'Editar «' + p.text.title + '»');
            info.append(open);
            const reference = [p.text.author, p.text.work, p.text.reference].filter(Boolean).join(' · ');
            if (reference) info.append(node('span', 'small muted', reference));
            if (p.id === session?.activePlacementId) {
                row.classList.add('is-current');
                open.setAttribute('aria-current', 'true');
            }
            function moveTo(position, selector) {
                apply((ed, at) => movePlacement(ed, p.id, position, at));
                paint();
                focusRow(p.id, selector);
            }
            const controls = node('div', 'atl-organize-controls');
            const position = node('select', 'atl-organize-position');
            position.setAttribute('aria-label', 'Posición de ' + p.text.title);
            for (let i = 0; i < e.placements.length; i++)
                position.append(new Option((i + 1) + ' de ' + e.placements.length, String(i), false, i === index));
            position.disabled = e.placements.length < 2;
            position.addEventListener('change', () => moveTo(Number(position.value), '.atl-organize-position'));
            const earlier = action('↑', () => moveTo(index - 1, '.atl-organize-position'), 'tbtn sm');
            earlier.title = 'Subir una posición';
            earlier.setAttribute('aria-label', 'Subir ' + p.text.title);
            earlier.disabled = index === 0;
            const later = action('↓', () => moveTo(index + 1, '.atl-organize-position'), 'tbtn sm');
            later.title = 'Bajar una posición';
            later.setAttribute('aria-label', 'Bajar ' + p.text.title);
            later.disabled = index === e.placements.length - 1;
            const remove = action('Quitar del cuaderno', () => {
                if (!window.confirm('¿Quitar «' + p.text.title + '» de este cuaderno? La ficha seguirá disponible en el banco.'))
                    return;
                const neighbor = e.placements[index + 1] ?? e.placements[index - 1];
                apply((ed, at) => validateEdition({ ...ed, updatedAt: at, placements: ed.placements.filter(x => x.id !== p.id) }));
                if (session?.activePlacementId === p.id)
                    session = { ...session, activePlacementId: neighbor?.id ?? null };
                paint();
                focusRow(neighbor?.id, '.atl-organize-open');
            }, 'tbtn sm atl-organize-remove');
            const order = node('div', 'atl-organize-order');
            order.append(earlier, position, later);
            controls.append(order, remove);
            row.append(info, controls);
            list.append(row);
        });
        if (e.placements.length) principal.append(list);
        else principal.append(node('p', 'hint', 'Añade textos desde el banco, la biblioteca o un archivo Word.'));
        panel.append(principal);
        organizationSection(panel, 'Formato y portada', body => {
            body.classList.add('edition-menu-format');
            menuFormat(body);
            renderCoverMenu(body);
        });
        organizationSection(panel, 'Revisar repeticiones', body => {
            const notice = academics.repetitionNotice();
            if (notice) body.append(notice);
            body.append(academics.renderNotebookAudit());
        });
` + source.slice(end);
  const review = source.indexOf("            const review = node('section', 'edition-organize-review');");
  const advanced = source.indexOf("            advanced.append(node('summary'", review);
  if (review < 0 || advanced < 0) throw Error('Revisar el panel de repeticiones del cuaderno.');
  source = source.slice(0, review) + source.slice(advanced);

  replace('        const n = draft.placements.length;\n        const idx', `        const n = draft.placements.length;
        const context = element.closest('#editor')?.querySelector('.cuaderno-context-count');
        if (context) context.textContent = n + (n === 1 ? ' texto' : ' textos');
        const titleLabel = element.closest('#editor')?.querySelector('.cuaderno-context-current');
        if (titleLabel) titleLabel.textContent = draft.title;
        const idx`);
  return "import { periods } from './atl-bank-curriculum.js';\n" + source;
}

export function simplifyNotebookHeader(source) {
  const start = source.indexOf('        const placement = composer.activePlacement();\n        if (placement) {\n            const all = allGrammarTags(corpus), ids = placementGrammarTags(placement);');
  const end = source.indexOf('        left.append(summary, composer.element);', start);
  if (start < 0 || end < 0) throw Error('Revisar la cabecera de Cuadernos.');
  // The text editor already shows the selected passage's tags and the edit action.
  return source.slice(0, start) + source.slice(end);
}

export function stableNotebookOverview(source) {
  const replace = (before, after) => {
    if (source.split(before).length !== 2) throw Error('Revisar el cuadro de Cuadernos: ' + before);
    source = source.replace(before, () => after);
  };
  replace("headingText.append(el('h3', '', 'Cuaderno de textos latinos'), el('strong', 'cuaderno-context-current', currentTitle()));",
    "headingText.append(el('h3', 'cuaderno-context-current', currentTitle()));");
  replace("    const backups = el('details', 'cuaderno-context-backups');\n    backups.append(el('summary', '', 'Copias de seguridad'));",
    "    const backups = button('Copias de seguridad', () => openBackups(), 'hbtn atl-notebook-backups');");
  replace("    backups.append(controls);\n    tools.append(backups);", `    function openBackups() {
        M.modal('Copias de Cuadernos', controls, [{ label: 'Cerrar' }], {
            width: 'min(440px, 96vw)', onClose: () => backups.focus({ preventScroll: true })
        });
    }
    tools.append(backups);`);
  replace("        addPanel.append(el('h4', '', 'Añadir textos'));",
    "        addPanel.setAttribute('aria-label', 'Añadir textos al cuaderno');");
  return source;
}
