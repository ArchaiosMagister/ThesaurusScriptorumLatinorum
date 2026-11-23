import { mountLibraryApp } from './ui/library-app.js';
import { mountSimpleApp } from './ui/simple-app.js';
import { mountNotebookApp } from './ui/notebook-app.js';
import { createBackup, MAX_BACKUP_CHARACTERS, readBackup } from './core/backup.js';
import { retainNotebookText } from './core/editor-operations.js';
import { serializeCorpus } from './core/archive.js';
import type { LatinText } from './core/model.js';
import type { CorpusSnapshot } from './ports/corpus-repository.js';
import { IndexedDbCorpusRepository, RevisionConflictError } from './storage/indexeddb-corpus-repository.js';
import { getStoredVerificationText, syncVerificationEditor, VERIFICATION_TEXT_ID } from './ui/verification-editor.js';

const repo = new IndexedDbCorpusRepository();
const TEST_ID = VERIFICATION_TEXT_ID;
const RELEASE = '0.2.2';

function required<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error('Falta el control ' + id);
  return node as T;
}

const controls = {
  sample: required<HTMLTextAreaElement>('latin-test'),
  save: required<HTMLButtonElement>('save-test'),
  reload: required<HTMLButtonElement>('reload'),
  export: required<HTMLButtonElement>('export-backup'),
  file: required<HTMLInputElement>('backup-file'),
  confirm: required<HTMLInputElement>('confirm-replace'),
  restore: required<HTMLButtonElement>('restore-backup'),
  status: required<HTMLElement>('status'),
  countTexts: required<HTMLElement>('count-texts'),
  countTags: required<HTMLElement>('count-tags'),
  countNotebooks: required<HTMLElement>('count-notebooks'),
  revision: required<HTMLElement>('revision'),
  lastText: required<HTMLElement>('last-text'),
  preview: required<HTMLElement>('backup-preview'),
  summary: required<HTMLElement>('backup-summary'),
  warning: required<HTMLElement>('backup-warning'),
  backupLatin: required<HTMLElement>('backup-latin'),
};

type VerifiedFile = { file: File; result: Awaited<ReturnType<typeof readBackup>> };
let snapshot: CorpusSnapshot | null = null;
let selected: VerifiedFile | null = null;
let busy = false;
let fileSelectionSequence = 0;

function setStatus(message: string, error = false): void {
  controls.status.textContent = message;
  controls.status.dataset.error = String(error);
}

function refresh(): void {
  const corpus = snapshot?.corpus;
  controls.countTexts.textContent = corpus ? String(corpus.texts.length) : '—';
  controls.countTags.textContent = corpus ? String(corpus.tags.length) : '—';
  controls.countNotebooks.textContent = corpus ? String(corpus.notebooks.length) : '—';
  controls.revision.textContent = snapshot ? String(snapshot.revision) : '—';
  controls.lastText.textContent = corpus
    ? (getStoredVerificationText(corpus) ?? 'Ninguno todavía.')
    : '—';
}

function lock(isBusy: boolean): void {
  busy = isBusy;
  const ready = snapshot !== null;
  controls.save.disabled = isBusy || !ready;
  controls.reload.disabled = isBusy || !ready;
  controls.export.disabled = isBusy || !ready;
  controls.restore.disabled = isBusy || !ready || selected === null || !controls.confirm.checked;
}

function clearPreview(): void {
  selected = null;
  controls.preview.hidden = true;
  controls.summary.textContent = '';
  controls.warning.textContent = '';
  controls.backupLatin.textContent = '';
  controls.confirm.checked = false;
  lock(busy);
}

async function execute(action: () => Promise<void>): Promise<void> {
  if (busy) return;
  lock(true);
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(
      (error instanceof RevisionConflictError ? 'Otra pestaña ha actualizado los datos. ' : '') + message,
      true,
    );
  } finally {
    lock(false);
    refresh();
  }
}

async function reload(): Promise<void> {
  if (!snapshot) throw new Error('El almacenamiento no se ha inicializado.');
  const lastSaved = getStoredVerificationText(snapshot.corpus);
  if (controls.sample.value !== (lastSaved ?? '') && lastSaved !== null) {
    setStatus('Hay cambios sin guardar. Guárdalos antes de releer, o recarga la página para descartarlos.', true);
    return;
  }
  const latest = await repo.load();
  snapshot = latest;
  const found = syncVerificationEditor(latest.corpus, controls.sample);
  setStatus(found
    ? 'Los datos guardados se han vuelto a cargar y el campo editable está sincronizado.'
    : 'No existe todavía ningún texto de prueba guardado.');
}

async function saveVerificationText(): Promise<void> {
  await execute(async () => {
    if (!snapshot) throw new Error('El almacenamiento no se ha inicializado.');
    const latin = controls.sample.value.trim();
    if (!latin) throw new Error('Escribe un texto latino antes de guardarlo.');
    const original = snapshot.corpus;
    const existing = original.texts.find((entry) => entry.id === TEST_ID);
    const now = new Date().toISOString();
    const nextText: LatinText = existing
      ? { ...existing, latin, updatedAt: now < existing.createdAt ? existing.createdAt : now }
      : {
        id: TEST_ID,
        title: 'Texto de comprobación de la fase 1',
        latin,
        source: { author: null, work: null, reference: null },
        tagIds: [],
        createdAt: now,
        updatedAt: now,
      };
    const updated = {
      ...(existing && existing.latin !== latin ? retainNotebookText(original,existing) : original),
      texts: existing
        ? original.texts.map((entry) => entry.id === TEST_ID ? nextText : entry)
        : [...original.texts, nextText],
    };
    snapshot = await repo.save(updated, snapshot.revision);
    window.dispatchEvent(new CustomEvent('corpus-updated'));
    controls.sample.value = nextText.latin;
    setStatus('Guardado confirmado en IndexedDB (revisión ' + snapshot.revision + '). Puedes descargar una copia de esta versión.');
  });
}

function downloadJson(content: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const instant = new Date().toISOString().replace(/[:.]/g, '-');
  link.download = 'cuaderno-textos-latinos-' + instant + '.json';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

async function exportBackup(): Promise<void> {
  await execute(async () => {
    if (!snapshot) throw new Error('El almacenamiento no se ha inicializado.');
    const latest = await repo.load();
    const saved = getStoredVerificationText(latest.corpus);
    if (!saved && controls.sample.value.trim()) {
      throw new Error('Este texto aún es un ejemplo sin guardar. Pulsa «Guardar texto de prueba» antes de exportarlo.');
    }
    if (saved && controls.sample.value.trim() !== saved) {
      throw new Error('Hay modificaciones sin guardar en el campo. Guárdalas antes de exportar el JSON.');
    }
    const backup = await createBackup(latest.corpus);
    downloadJson(backup);
    setStatus('Copia de ' + latest.corpus.texts.length + ' texto(s) preparada, versión ' + RELEASE
      + '. Comprueba el archivo descargado y consérvalo fuera de Safari.');
  });
}

async function inspectBackup(): Promise<void> {
  const sequence = ++fileSelectionSequence;
  clearPreview();
  const file = controls.file.files?.item(0);
  if (!file) {
    setStatus('Selecciona un archivo JSON para examinarlo antes de recuperarlo.');
    return;
  }
  await execute(async () => {
    if (file.size > MAX_BACKUP_CHARACTERS) {
      throw new Error('El archivo seleccionado supera el límite de 32 MiB.');
    }
    const text = await file.text();
    const result = await readBackup(text);
    // Si durante la lectura se eligió otro archivo, ignorar esta operación.
    if (sequence !== fileSelectionSequence || controls.file.files?.item(0) !== file) {
      setStatus('Se ha cambiado la selección; se examinará el archivo más reciente.');
      return;
    }
    selected = { file, result };
    const { metadata, corpus } = result;
    const recoveredLatin = getStoredVerificationText(corpus);
    controls.preview.hidden = false;
    controls.summary.textContent = 'Archivo: ' + file.name + ' · Fecha de copia: '
      + metadata.exportedAt + ' · Textos: ' + metadata.textCount
      + ' · Etiquetas: ' + metadata.tagCount + ' · Cuadernos: ' + metadata.notebookCount + '.';
    if (recoveredLatin === null) {
      controls.backupLatin.textContent = '(ESTA COPIA NO CONTIENE EL TEXTO DE PRUEBA)';
      controls.warning.textContent = metadata.textCount === 0
        ? 'Atención: el JSON contiene CERO textos. No puede recuperar un texto original que no se guardó antes de exportar.'
        : 'El JSON contiene otros textos, pero no incluye el registro de prueba. Restaurarlo no recuperará el campo que buscas.';
    } else {
      controls.backupLatin.textContent = recoveredLatin;
      controls.warning.textContent = 'Este es el texto que reaparecerá en el campo editable tras restaurar.';
    }
    setStatus('JSON verificado. Examina el texto y la fecha de la copia antes de autorizar la sustitución.');
  });
}

async function restoreBackup(): Promise<void> {
  await execute(async () => {
    if (!snapshot) throw new Error('El almacenamiento local no está disponible.');
    if (!selected || controls.file.files?.item(0) !== selected.file) {
      throw new Error('Selecciona y verifica primero una copia JSON.');
    }
    if (!controls.confirm.checked) {
      throw new Error('Debes marcar la confirmación de sustitución.');
    }
    // La selección se verificó y se muestra su contenido exacto. Sin diálogos
    // de confirmación diferidos, que pueden quedar bloqueados por Safari.
    const current = await repo.load();
    if (current.revision !== snapshot.revision) {
      throw new RevisionConflictError(snapshot.revision, current.revision);
    }
    const saved = await repo.save(selected.result.corpus, snapshot.revision);
    // Verificación de ida y vuelta contra IndexedDB después del commit.
    const readBack = await repo.load();
    snapshot = readBack;
    if (readBack.revision !== saved.revision
      || serializeCorpus(readBack.corpus) !== serializeCorpus(saved.corpus)) {
      throw new Error('No se ha podido verificar el contenido restaurado en IndexedDB. No sobrescribas ningún dato hasta revisarlo.');
    }
    const hasTest = syncVerificationEditor(readBack.corpus, controls.sample);
    controls.file.value = '';
    clearPreview();
    setStatus(hasTest
      ? 'RESTAURACIÓN CONFIRMADA: el texto anterior ya aparece en el editor y en «Texto de prueba realmente guardado». Revisión ' + readBack.revision + '.'
      : 'Restauración verificada en IndexedDB, pero el archivo NO contenía ningún texto de prueba. El editor está vacío.');
  });
}

controls.reload.addEventListener('click', () => { void execute(reload); });
controls.save.addEventListener('click', () => { void saveVerificationText(); });
controls.export.addEventListener('click', () => { void exportBackup(); });
controls.file.addEventListener('change', () => { void inspectBackup(); });
controls.confirm.addEventListener('change', () => lock(busy));
controls.restore.addEventListener('click', () => { void restoreBackup(); });

lock(true);
void (async () => {
  try {
    snapshot = await repo.load();
    const found = syncVerificationEditor(snapshot.corpus, controls.sample, { keepExampleIfMissing: true });
    setStatus(found
      ? 'Datos locales cargados: el editor muestra la última versión guardada.'
      : 'El texto que aparece es un EJEMPLO sin guardar. Pulsa «Guardar texto de prueba» antes de exportarlo.');
  } catch (error) {
    setStatus('No se pudo abrir IndexedDB: ' + (error instanceof Error ? error.message : String(error)), true);
  } finally {
    lock(false);
    refresh();
  }
})();

/** El banco y el editor comparten la misma persistencia de la fase 1. */
const route=new URLSearchParams(window.location.search);
if(route.get('biblioteca')==='1'){
  mountLibraryApp(required<HTMLElement>('phase2'), { independent: true });
}else if(route.get('classic')==='1'){
  mountLibraryApp(required<HTMLElement>('phase2'));
}else if(route.get('nuevo')==='1'){
  mountNotebookApp(required<HTMLElement>('phase2'));
}else{
  mountSimpleApp(required<HTMLElement>('phase2'));
}
window.addEventListener('corpus-updated', () => {
  if (busy) return;
  void (async () => {
    try { snapshot = await repo.load(); refresh(); }
    catch { /* el mensaje de error se mostrará en el módulo correspondiente */ }
  })();
});
