export function setupBackup(prepare, status, pauseAutosave) {
  const dialog = document.getElementById('backup-dialog');
  const select = document.getElementById('backup-file');
  const preview = document.getElementById('backup-preview');
  const apply = document.getElementById('backup-restore');
  const download = document.getElementById('backup-export');
  let payload;
  let plan;
  let exactBaseline, dropboxData, dropboxPreview;
  let regularPreview;
  let regularDisabled;
  const exact = document.getElementById('backup-exact');
  const exactLabel = document.getElementById('backup-exact-label');
  const history = document.getElementById('backup-history');
  const historyList = document.getElementById('backup-history-list');

  function summary(message) {
    preview.textContent = message;
  }

  const kind = document.getElementById('backup-kind');
  const scope = document.getElementById('backup-scope');
  const scopeLabel = document.getElementById('backup-scope-label');
  const exportItems = document.getElementById('backup-export-items');
  const exportSummary = document.getElementById('backup-export-summary');
  const importItems = document.getElementById('backup-import-items');
  let partial, partialPlan, partialOptions, bankSelection, exportState, revision = 0, importRevision = 0;
  const bankScope = () => document.querySelector('#panel-cuaderno iframe')?.contentWindow.atlBankExportScope?.();
  const labels = { bank: 'Incorporar textos al banco', notebooks: 'Incorporar o actualizar cuadernos',
    templates: 'Importar plantillas', 'tag-exchange': 'Actualizar etiquetas de textos existentes' };

  function element(tag, value) {
    const node = document.createElement(tag);
    node.textContent = value ?? '';
    return node;
  }
  function checkbox(title, value, checked = true) {
    const label = element('label');
    const input = element('input');
    input.type = 'checkbox';
    input.value = value;
    input.checked = checked;
    label.append(input, ' ' + title);
    return { label, input };
  }
  function updateScopes(selected = 'all') {
    const list = ['bank', 'tag-exchange'].includes(kind.value) ?
      [['all', 'Todos los textos'], ['filtered', 'Resultados de los filtros activos'], ['selected', 'Textos seleccionados']] :
      [['all', 'Todos'], ['selected', 'Elegir elementos']];
    scope.replaceChildren(...list.map(([id, label]) => new Option(label, id)));
    scope.value = selected;
    scope.hidden = scopeLabel.hidden = kind.value === 'full';
  }
  async function describeExport(renderItems = false) {
    const ticket = ++revision;
    download.disabled = true;
    exportState = null;
    exportSummary.textContent = 'Comprobando el contenido…';
    const type = kind.value;
    const selection = scope.value;
    try {
      const { describeBackup } = await import('./backup-store.js');
      const description = await describeBackup();
      if (ticket !== revision) return;
      const selector = selection === 'selected' && ['notebooks', 'templates'].includes(type);
      exportItems.hidden = !selector;
      if (renderItems) {
        exportItems.replaceChildren(element('legend', 'Elementos de la copia'));
        if (selector) {
          const rows = type === 'notebooks' ? description.editions : description.templates;
          for (const [id, title] of rows) {
            const { label, input } = checkbox(title, id, false);
            input.addEventListener('change', () => describeExport());
            exportItems.append(label);
          }
        }
      }
      let ids = null;
      let count;
      let message;
      if (type === 'full') {
        count = 1;
        message = description.texts + ' textos, ' + description.editions.length + ' cuadernos, ' +
          description.templates.length + ' plantillas, ' + description.exams + ' exámenes archivados y ' +
          description.preferences + ' configuraciones o decisiones de revisión, además de los otros datos locales incluidos.';
      } else if (type === 'bank' || type === 'tag-exchange') {
        if (selection !== 'all') {
          ids = (selection === 'selected' ? bankSelection ?? bankScope()?.selected : bankScope()?.filtered) ?? [];
          if (!bankSelection && !bankScope()) throw Error('Abre el Banco de textos para consultar los filtros y la selección.');
        }
        count = ids?.length ?? description.texts;
        message = count + ' textos con procedencia, metadatos y etiquetas.' +
          (type === 'tag-exchange' ? ' Edita solo la lista «proposals» para devolver las etiquetas revisadas.' : '');
      } else {
        const rows = type === 'notebooks' ? description.editions : description.templates;
        if (selector) ids = [...exportItems.querySelectorAll('input:checked')].map(input => input.value);
        count = ids?.length ?? rows.length;
        message = count + (type === 'notebooks' ? ' cuadernos con su historial y dependencias.' : ' plantillas de programación.');
      }
      exportSummary.textContent = message;
      exportState = { type, selection, ids };
      download.textContent = type === 'full' ? 'Descargar copia integral' : 'Descargar JSON';
      download.disabled = !count;
    } catch (error) {
      if (ticket === revision) exportSummary.textContent = error.message;
    }
  }

  function openExport(ids = null) {
    bankSelection = ids;
    kind.value = ids ? 'bank' : 'full';
    updateScopes(ids ? 'selected' : 'all');
    if (!dialog.open) dialog.showModal();
    void describeExport(true);
  }
  window.atlExportSelectedTexts = ids => openExport([...ids]);
  document.getElementById('app-backup').addEventListener('click', () => openExport());
  kind.addEventListener('change', () => { updateScopes(); void describeExport(true); });
  scope.addEventListener('change', () => { bankSelection = null; void describeExport(true); });
  download.addEventListener('click', async () => {
    if (!exportState) return;
    const { type, selection, ids } = exportState;
    const ticket = revision;
    download.disabled = true;
    try {
      await prepare();
      const { captureBackup, capturePartial, maxBackupSize } = await import('./backup-store.js');
      const data = type === 'full' ? await captureBackup() : await capturePartial(type, selection, ids);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      if (blob.size > maxBackupSize) throw new Error('La copia supera el tamaño máximo de 128 MiB.');
      const url = URL.createObjectURL(blob);
      const link = element('a');
      link.href = url;
      link.download = 'Thesaurus-' + type + '-' + data.exportedAt.slice(0, 10) + '.json';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      summary(type === 'full' ? 'Copia integral preparada.' : 'Archivo preparado.');
    } catch (error) {
      summary(error.message);
    } finally {
      if (ticket === revision) download.disabled = false;
    }
  });

  async function comparePartial({ selected, removeCustom } = {}, render = true) {
    apply.disabled = true;
    const ticket = ++importRevision;
    const { planPartial } = await import('./backup-store.js');
    const options = { selected: selected ?? null, removeCustom: Boolean(removeCustom) };
    const result = await planPartial(partial, options);
    if (ticket !== importRevision) return;
    partialPlan = result;
    partialOptions = options;
    apply.textContent = labels[result.type];
    apply.disabled = !result.changes || Boolean(result.conflicts.length);
    if (result.type !== 'tag-exchange') {
      summary(result.conflicts.length ? labels[result.type] + ' · Conflictos que requieren revisión.\n' + result.conflicts.join('\n')
        : 'Vista previa · ' + result.changes + ' elementos por incorporar o actualizar.');
      return;
    }
    summary('Vista previa · ' + result.changes + ' fichas seleccionadas para actualizar. ' +
      result.items.filter(item => item.issue).length + ' con incidencias y ' +
      result.items.filter(item => !item.issue && !item.added.length && !item.removed.length).length + ' sin cambios.');
    if (!render) return;
    importItems.replaceChildren();
    const { label, input } = checkbox('Permitir quitar etiquetas propias', 'remove-custom', options.removeCustom);
    input.addEventListener('change', () => comparePartial({ removeCustom: input.checked, selected: null }).catch(error => summary(error.message)));
    importItems.append(label);
    const rows = element('fieldset');
    rows.append(element('legend', 'Diferencias de etiquetas'));
    const choices = [];
    for (const item of result.items) {
      const canApply = !item.issue && Boolean(item.added.length || item.removed.length);
      const { label: choice, input: check } = checkbox(item.title, item.id, canApply && (!options.selected || options.selected.includes(item.id)));
      check.disabled = !canApply;
      const detail = [item.issue || (!canApply ? 'Sin cambios' : ''), item.added.length ? 'Nuevas: ' + item.added.join(', ') : '',
        item.removed.length ? 'Eliminadas: ' + item.removed.join(', ') : '',
        item.kept.length ? 'Conservadas: ' + item.kept.join(', ') : ''].filter(Boolean).join(' · ');
      const row = element('div');
      row.append(choice, element('small', detail));
      rows.append(row);
      if (canApply) {
        choices.push(check);
        check.addEventListener('change', () => comparePartial({ removeCustom: input.checked,
          selected: choices.filter(choice => choice.checked).map(choice => choice.value) }, false).catch(error => summary(error.message)));
      }
    }
    importItems.append(rows);
  }

  function downloadHistory(copy) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(copy)], { type: 'application/json' }));
    const link = element('a');
    link.download = 'Thesaurus-recuperacion-' + copy.exportedAt.slice(0, 10) + '.json';
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  history.addEventListener('toggle', async () => {
    if (!history.open) return;
    try {
      const { listRecoveryCopies, readRecoveryCopy } = await import('./recovery-history.js');
      const entries = await listRecoveryCopies();
      historyList.replaceChildren(...entries.map(({ id, date, reason }) => {
        const row = element('li', new Date(date).toLocaleString() + ' · ' + reason + ' ');
        for (const label of ['Revisar copia', 'Descargar JSON']) {
          const button = element('button', label);
          button.type = 'button';
          button.addEventListener('click', async () => {
            if (select.disabled) return;
            try {
              const { copy } = await readRecoveryCopy(id);
              if (label === 'Revisar copia') await inspectFile(new Blob([JSON.stringify(copy)]));
              else downloadHistory(copy);
            } catch (error) { summary(error.message); }
          });
          row.append(button);
        }
        return row;
      }));
      if (!entries.length) historyList.append(element('li', 'Todavía no hay copias de recuperación.'));
    } catch (error) { historyList.replaceChildren(element('li', error.message)); }
  });

  exact.addEventListener('change', () => {
    apply.disabled = exact.checked ? false : regularDisabled;
    apply.textContent = exact.checked ? 'Sustituir espacio local' : 'Recuperar copia';
    summary(exact.checked
      ? 'Se guardará una copia de recuperación y después se sustituirán el banco, los cuadernos, los exámenes y las preferencias incluidos en la copia integral.'
      : regularPreview);
  });

  select.addEventListener('change', () => {
    const file = select.files[0];
    select.value = '';
    void inspectFile(file);
  });

  async function inspectFile(file) {
    exact.checked = false;
    exactLabel.hidden = true;
    exactBaseline = dropboxData = dropboxPreview = undefined;
    apply.disabled = true;
    payload = plan = partial = partialPlan = null;
    importRevision++;
    importItems.replaceChildren();
    apply.textContent = 'Recuperar copia';
    if (!file) return;
    select.disabled = true;
    summary('Verificando la copia…');
    try {
      const { readBackupFile, readPartial, planRestore, previewExactRestore, readDropboxBackup, previewDropboxRestore, maxBackupSize } = await import('./backup-store.js');
      if (file.size > maxBackupSize) throw new Error('La copia supera el tamaño máximo de 128 MiB.');
      const content = await file.text();
      partial = await readPartial(content);
      if (partial) {
        await prepare();
        await comparePartial();
        return;
      }
      dropboxData = await readDropboxBackup(content);
      if (dropboxData) {
        await prepare();
        dropboxPreview = await previewDropboxRestore(dropboxData);
        summary(dropboxPreview.same ? 'La copia de Dropbox coincide con los datos locales.'
          : 'Copia de Dropbox verificada. Se sustituirán los datos sincronizados de este dispositivo y se guardará una copia de recuperación.');
        apply.textContent = 'Recuperar copia de Dropbox';
        apply.disabled = dropboxPreview.same;
        return;
      }
      payload = await readBackupFile(content);
      await prepare();
      plan = await planRestore(payload);
      if (!['same', 'legacy'].includes(plan.comparison))
        exactBaseline = await previewExactRestore(payload).catch(() => undefined);
      if (plan.comparison === 'same') {
        summary('Versión idéntica a la de este dispositivo. Ya está sincronizado.');
        return;
      }
      if (plan.comparison === 'older') {
        summary('La copia es más antigua que la versión de este dispositivo. Se conservarán los datos locales.');
        return;
      }
      if (plan.comparison === 'newer') {
        summary('La copia es más nueva que la versión de este dispositivo. Puedes aplicar todos sus cambios, incluidas las eliminaciones.');
        apply.disabled = false;
        return;
      }
      const rows = Object.values(plan.databases).flatMap(stores => Object.values(stores)).reduce((total, values) => total + values.length, 0);
      const preferences = Object.keys(plan.preferences).length;
      if (plan.conflicts.length) {
        summary('No se ha podido establecer cuál es más reciente. Hay ' + plan.conflicts.length + ' conflictos con datos locales. ' +
          'Puede haber cambios independientes en los dos dispositivos.\n' + plan.conflicts.slice(0, 8).join('\n'));
        return;
      }
      const order = plan.comparison === 'unknown' ? ' La relación con la versión local no se ha podido verificar.' : '';
      const replacement = plan.pristineReplacement ? ' Se sustituirá únicamente el banco PAU de fábrica, que no tiene cambios docentes.' : '';
      summary(rows || preferences || replacement ? 'Vista previa · ' + rows + ' registros y ' + preferences + ' preferencias por recuperar.' + replacement + order
        : 'Los datos de esta copia ya están presentes.' + order);
      apply.disabled = !rows && !preferences && !replacement;
    } catch (error) {
      summary(error instanceof SyntaxError ? 'El archivo contiene JSON inválido o incompleto.' : error.message);
    } finally {
      regularPreview = preview.textContent;
      regularDisabled = apply.disabled;
      exactLabel.hidden = !exactBaseline;
      select.disabled = false;
    }
  }

  apply.addEventListener('click', async () => {
    if (dropboxData && dropboxPreview) {
      if (apply.disabled || !window.confirm('¿Recuperar en este dispositivo los datos de la copia de Dropbox?')) return;
      apply.disabled = select.disabled = download.disabled = true;
      try {
        await prepare();
        pauseAutosave(true);
        const { restoreDropboxBackup } = await import('./backup-store.js');
        await restoreDropboxBackup(dropboxData, dropboxPreview.baseline);
        sessionStorage.setItem('atl-v1:restore-result', 'Copia de Dropbox recuperada en este dispositivo.');
        location.reload();
      } catch (error) {
        pauseAutosave(false);
        summary(error.message);
        select.disabled = download.disabled = false;
      }
      return;
    }
    if (partial && partialPlan) {
      if (apply.disabled || !window.confirm('¿' + labels[partial.type] + '?')) return;
      apply.disabled = select.disabled = download.disabled = true;
      try {
        await prepare();
        pauseAutosave(true);
        const { restorePartial } = await import('./backup-store.js');
        await restorePartial(partial, partialPlan, partialOptions);
        sessionStorage.setItem('atl-v1:restore-result', 'Importación parcial aplicada y verificada.');
        location.reload();
      } catch (error) {
        pauseAutosave(false);
        summary(error.message);
        select.disabled = download.disabled = false;
      }
      return;
    }
    if (apply.disabled || !plan || !payload || !window.confirm(exact.checked
      ? '¿Sustituir el espacio local por esta copia integral? Se guardará primero una copia de recuperación.'
      : plan.comparison === 'newer'
      ? '¿Actualizar este dispositivo con la copia más nueva? También se aplicarán las eliminaciones.'
      : '¿Recuperar los datos de la copia? La aplicación se recargará después de verificarlos.')) return;
    apply.disabled = true;
    select.disabled = true;
    download.disabled = true;
    try {
      await prepare();
      pauseAutosave(true);
      const { restoreBackup, restoreExact } = await import('./backup-store.js');
      if (exact.checked) await restoreExact(payload, exactBaseline);
      else await restoreBackup(payload, plan);
      sessionStorage.setItem('atl-v1:restore-result', 'Copia recuperada y verificada.');
      location.reload();
    } catch (error) {
      pauseAutosave(false);
      summary(error.message);
      select.disabled = false;
      download.disabled = false;
    }
  });

  const result = sessionStorage.getItem('atl-v1:restore-result');
  if (result) {
    sessionStorage.removeItem('atl-v1:restore-result');
    status(result);
  }
}
