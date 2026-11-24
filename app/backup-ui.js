export function setupBackup(prepare, status) {
  const dialog = document.getElementById('backup-dialog');
  const select = document.getElementById('backup-file');
  const preview = document.getElementById('backup-preview');
  const apply = document.getElementById('backup-restore');
  const download = document.getElementById('backup-export');
  let payload;
  let plan;

  function summary(message) {
    preview.textContent = message;
  }

  document.getElementById('app-backup').addEventListener('click', () => dialog.showModal());
  download.addEventListener('click', async () => {
    download.disabled = true;
    try {
      await prepare();
      const { captureBackup, maxBackupSize } = await import('./backup-store.js');
      const data = await captureBackup();
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      if (blob.size > maxBackupSize) throw new Error('La copia supera el tamaño máximo de 128 MiB.');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'AdministratorTextorumLatinorum-' + data.exportedAt.slice(0, 10) + '.json';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      summary('Copia integral preparada.');
    } catch (error) {
      summary(error.message);
    } finally {
      download.disabled = false;
    }
  });

  select.addEventListener('change', async () => {
    const file = select.files[0];
    select.value = '';
    apply.disabled = true;
    payload = plan = null;
    if (!file) return;
    select.disabled = true;
    summary('Verificando la copia…');
    try {
      const { readBackupFile, planRestore, maxBackupSize } = await import('./backup-store.js');
      if (file.size > maxBackupSize) throw new Error('La copia supera el tamaño máximo de 128 MiB.');
      payload = await readBackupFile(await file.text());
      await prepare();
      plan = await planRestore(payload);
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
      summary(error.message);
    } finally {
      select.disabled = false;
    }
  });

  apply.addEventListener('click', async () => {
    if (!plan || !payload || !window.confirm(plan.comparison === 'newer'
      ? '¿Actualizar este dispositivo con la copia más nueva? También se aplicarán las eliminaciones.'
      : '¿Recuperar los datos de la copia? La aplicación se recargará después de verificarlos.')) return;
    apply.disabled = true;
    select.disabled = true;
    download.disabled = true;
    try {
      await prepare();
      const { restoreBackup } = await import('./backup-store.js');
      await restoreBackup(payload, plan);
      sessionStorage.setItem('atl-v1:restore-result', 'Copia recuperada y verificada.');
      location.reload();
    } catch (error) {
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
