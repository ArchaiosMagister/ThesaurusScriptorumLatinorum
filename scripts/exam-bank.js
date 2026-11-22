import { IndexedDbCorpusRepository } from '../cuaderno-integrado/storage/indexeddb-corpus-repository.js';
import { foldLatin } from '../cuaderno-integrado/core/library.js';
import { WorkspaceRepository } from '../cuaderno-integrado/storage/workspace-repository.js';
import { combineNotebookCorpora } from '../cuaderno-integrado/storage/workspace-backup.js';
import { findTextUses, loadUsageIndex, recordExam, savedExam, usageList } from '../shared/text-usage.js';

const exam = window.M;
exam.atlRecordExam = recordExam;
window.atlOpenRelated = async id => {
  const snapshot = await savedExam(id);
  if (!snapshot) throw new Error('Este examen ya no está en el historial local.');
  if (exam.S?.texto && !window.confirm('¿Abrir el examen guardado? Sustituirá el examen que estás editando.')) return;
  exam.atlRestoreExam(snapshot);
};

async function loadBank() {
  const [historical, editorial] = await Promise.all([
    new IndexedDbCorpusRepository().load(),
    new WorkspaceRepository().loadCorpus()
  ]);
  return combineNotebookCorpora(editorial.corpus, historical.corpus);
}

function sourceData(text) {
  return {
    urn: '', text: text.latin, author: text.source.author ?? '',
    obra: text.source.work ?? '', cita: text.source.reference ?? '',
    bank: { id: text.id, updatedAt: text.updatedAt, title: text.title }
  };
}

async function refreshFromBank() {
  const current = exam.S;
  const link = current.atlBankSource;
  if (typeof link?.id !== 'string' || !link.id) return;
  const original = [current.texto, current.refAutor, current.refObra, current.refCita];
  const corpus = await loadBank();
  if (exam.S !== current || current.atlBankSource !== link ||
      [current.texto, current.refAutor, current.refObra, current.refCita].some((value, index) => value !== original[index])) {
    throw new Error('El examen cambió mientras se consultaba la ficha. Vuelve a intentarlo.');
  }
  const text = corpus.texts.find(item => item.id === link.id);
  if (!text) throw new Error('La ficha ya no está en el banco. El examen conserva su copia.');
  const data = sourceData(text);
  const changes = [data.text, data.author, data.obra, data.cita].some((value, index) => value !== original[index]);
  if (!changes) {
    exam.toast('El latín y la referencia del examen coinciden con el banco.');
    return;
  }
  const question = data.text === current.texto
    ? '¿Copiar la referencia actual del banco?'
    : '¿Copiar el latín y la referencia del banco? El latín se volverá a analizar. Revisa el vocabulario y los subrayados después del cambio.';
  if (!window.confirm(question)) return;
  exam.refreshFromBank(data);
  exam.toast('Copia actualizada desde el banco.');
}

async function reviewUses(text, current, useText, stillOpen, closePicker = () => {}) {
  let matches = [];
  try { matches = findTextUses(await loadUsageIndex(), text, current.atlArchiveId); }
  catch { exam.toast('No se pudo consultar el historial de usos.', 4500); }
  if (!stillOpen() || exam.S !== current) return;
  if (!matches.length) { useText(); return; }
  let review;
  const list = usageList(matches, (document, placement) => {
    review.close();
    closePicker();
    window.parent.atlOpenRelated(document, placement).catch(error => exam.toast(error.message, 6500));
  });
  review = exam.modal('Usos anteriores del pasaje', list, [
    { label: 'Volver' }, { label: 'Usar de todos modos', primary: true, onclick: useText }
  ]);
}

exam.atlReviewLibraryUse = (passage, useText) => reviewUses(
  { latin: passage.text }, exam.S, useText,
  () => !document.getElementById('lib').classList.contains('hidden'),
  () => document.querySelector('#lib [data-act="close"]')?.click()
);

document.addEventListener('click', async event => {
  const trigger = event.target.closest('[data-act="atlBank"], [data-act="atlBankRefresh"]');
  if (!trigger || trigger.disabled) return;
  trigger.disabled = true;
  try {
    if (trigger.dataset.act === 'atlBankRefresh') {
      await refreshFromBank();
      return;
    }
    const corpus = await loadBank();
    const panel = document.createElement('div');
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Título, autor, obra, referencia o latín';
    search.setAttribute('aria-label', 'Buscar en el banco de textos');
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const list = document.createElement('div');
    list.className = 'atl-exam-bank-list';
    panel.append(search, status, list);
    const picker = exam.modal('Banco de textos', panel, [{ label: 'Cerrar' }]);
    const compare = new Intl.Collator('es', { numeric: true, sensitivity: 'base' }).compare;
    const entries = corpus.texts.map(text => ({
      text,
      key: foldLatin([text.title, text.latin, text.source.author, text.source.work, text.source.reference].join(' '))
    })).sort((a, b) => compare(a.text.source.author, b.text.source.author) || compare(a.text.title, b.text.title));
    let limit = 50;

    function showResults() {
      const query = foldLatin(search.value.trim());
      const matching = entries.filter(entry => entry.key.includes(query));
      status.textContent = matching.length ? matching.length + ' textos' : 'No hay textos que coincidan.';
      list.replaceChildren();
      for (const { text } of matching.slice(0, limit)) {
        const row = document.createElement('button');
        row.className = 'hbtn atl-exam-bank-text';
        row.type = 'button';
        const title = document.createElement('strong');
        title.textContent = text.title;
        const reference = document.createElement('span');
        reference.textContent = [text.source.author, text.source.work, text.source.reference].filter(Boolean).join(' · ');
        const excerpt = document.createElement('i');
        excerpt.textContent = text.latin.length > 160 ? text.latin.slice(0, 160) + '…' : text.latin;
        row.append(title, reference, excerpt);
        row.addEventListener('click', async () => {
          const current = exam.S;
          const useText = () => {
            if (exam.S !== current) throw new Error('El examen activo cambió. Abre de nuevo el banco.');
            if (exam.S.texto && !window.confirm('¿Usar este texto en lugar del pasaje actual del examen?')) return;
            exam.setTextFromLibrary(sourceData(text));
            picker.close();
          };
          row.disabled = true;
          try {
            await reviewUses(text, current, useText, () => row.isConnected, picker.close);
          } catch (error) {
            exam.toast(error.message, 6500);
          } finally {
            row.disabled = false;
          }
        });
        list.append(row);
      }
      if (matching.length > limit) {
        const more = document.createElement('button');
        more.className = 'hbtn';
        more.type = 'button';
        more.textContent = 'Mostrar más textos';
        more.addEventListener('click', () => { limit += 50; showResults(); });
        list.append(more);
      }
    }
    search.addEventListener('input', () => { limit = 50; showResults(); });
    showResults();
  } catch (error) {
    exam.toast(error.message || String(error), 7000);
  } finally {
    trigger.disabled = false;
  }
});
