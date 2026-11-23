import { setupDropbox } from './dropbox-sync.js';
import { setupBackup } from './backup-ui.js';
import { installApplication, prepareOffline, startApplicationWorker, updateApplication } from './pwa.js';

const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
const update = document.getElementById('app-update');
const status = document.getElementById('app-status');
const themeControl = document.getElementById('app-theme');
const themeKey = 'atl-v1:examinator.theme';
const themes = new Set(['light', 'dark', 'oled']);

function initialTheme() {
  try {
    const examTheme = JSON.parse(localStorage.getItem(themeKey));
    if (themes.has(examTheme)) return examTheme;
    const notebookTheme = localStorage.getItem('atl-v1:cuaderno-ui-theme-v1');
    if (themes.has(notebookTheme)) return notebookTheme;
  } catch { /* El tema del sistema sigue disponible. */ }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function syncTheme(frame) {
  const child = frame.contentWindow;
  const theme = themeControl.value;
  child?.atlSetTheme?.(theme);
  if (child?.EXTheme && child.EXTheme.current() !== theme) child.EXTheme.set(theme);
}

function applyTheme(theme) {
  themeControl.value = theme;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content =
    theme === 'oled' ? '#000000' : theme === 'dark' ? '#121619' : '#1d5466';
  for (const frame of document.querySelectorAll('iframe')) syncTheme(frame);
}

applyTheme(initialTheme());
themeControl.addEventListener('change', () => {
  const theme = themeControl.value;
  try { localStorage.setItem(themeKey, JSON.stringify(theme)); }
  catch { /* Conserva la elección durante la sesión. */ }
  applyTheme(theme);
});
addEventListener('storage', event => {
  if (event.key === themeKey) applyTheme(initialTheme());
});

function activePanel() {
  return panels[tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true')];
}

function setStatus(message) {
  status.textContent = message;
  status.hidden = !message;
}

function openSection(section) {
  const match = tabs.findIndex(tab => tab.dataset.section === section);
  const active = match === -1 ? 0 : match;
  const tab = tabs[active];
  const panel = panels[active];
  for (const candidate of new Set(panels)) candidate.hidden = candidate !== panel;
  tabs.forEach((tab, index) => {
    const selected = index === active;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  panel.setAttribute('aria-labelledby', tab.id);
  panel.dataset.view = tab.dataset.section;
  setStatus('');
  let frame = panel.querySelector('iframe');
  if (!frame) {
    frame = document.createElement('iframe');
    frame.addEventListener('load', () => {
      syncTheme(frame);
      syncView(panel, frame);
    });
    frame.src = panel.id === 'panel-cuaderno'
      ? panel.dataset.src + '#' + panel.dataset.view
      : panel.dataset.src;
    panel.append(frame);
  }
  frame.title = tab.textContent;
  syncView(panel, frame);
}

async function prepareReload() {
  for (const frame of document.querySelectorAll('iframe')) {
    const runtime = frame.contentWindow;
    if (runtime.document.querySelector('.modal-bg')) throw new Error('Cierra los formularios de los editores antes de continuar.');
    if (runtime.atlNotebookFlush && !await runtime.atlNotebookFlush()) throw new Error('El cuaderno tiene cambios pendientes.');
    if (runtime.M?.S && !runtime.M.persistNow()) throw new Error('El examen tiene cambios pendientes.');
  }
}

function headerAction(button, pending, run) {
  button.addEventListener('click', async () => {
    button.disabled = true;
    setStatus(pending);
    try { setStatus(await run()); }
    catch (error) { setStatus(error.message); }
    finally { button.disabled = false; }
  });
}

headerAction(update, 'Comprobando actualizaciones…', () => updateApplication(prepareReload));
headerAction(document.getElementById('app-install'), '', installApplication);
headerAction(document.getElementById('app-offline'), 'Descargando recursos de las tres pestañas…', async () => {
  const summary = await prepareOffline();
  const detail = Number.isInteger(summary?.downloaded)
    ? ' (' + summary.downloaded + ' recursos descargados; ' + summary.reused + ' reutilizados).'
    : '.';
  return 'Las tres pestañas están preparadas para funcionar sin conexión' + detail;
});

function syncView(panel, frame) {
  if (panel.id !== 'panel-cuaderno') return;
  const root = frame.contentDocument?.documentElement;
  if (!root) return;
  root.dataset.atlView = panel.dataset.view;
  frame.contentWindow.dispatchEvent(new Event('atl-view'));
}

function navigate(tab) {
  const hash = '#' + tab.dataset.section;
  if (location.hash !== hash) history.pushState(null, '', hash);
  openSection(tab.dataset.section);
}

async function openRuntime(section, ready) {
  const tab = tabs.find(item => item.dataset.section === section);
  navigate(tab);
  const frame = activePanel().querySelector('iframe');
  for (let attempt = 0; attempt < 120; attempt++) {
    const runtime = frame.contentWindow;
    if (ready(runtime)) return runtime;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('El editor relacionado todavía se está cargando.');
};

for (const tab of tabs) {
  tab.addEventListener('click', () => navigate(tab));
  tab.addEventListener('keydown', event => {
    const focused = tabs.indexOf(tab);
    const choices = {
      ArrowLeft: (focused + tabs.length - 1) % tabs.length,
      ArrowRight: (focused + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1
    };
    if (!Object.hasOwn(choices, event.key)) return;
    event.preventDefault();
    const next = tabs[choices[event.key]];
    next.focus();
    navigate(next);
  });
}

window.atlOpenRelated = async (related, placementId) => {
  const isExam = related.type === 'examen';
  const runtime = await openRuntime(isExam ? 'examinator' : 'cuadernos', child => child.atlOpenRelated &&
    (isExam ? child.M?.S : child.document.getElementById('editor')?.dataset.atlReady));
  try {
    return await runtime.atlOpenRelated(related.id, placementId, related.type);
  } catch (error) {
    setStatus(error.message);
    throw error;
  }
};

document.getElementById('app-academic').addEventListener('click', async () => {
  try {
    const runtime = await openRuntime('examinator', child => child.M?.S && child.M?.lists && child.M?.openLists);
    runtime.M.openLists();
  } catch (error) {
    setStatus(error.message);
  }
});

addEventListener('popstate', () => openSection(location.hash.slice(1)));
addEventListener('hashchange', () => openSection(location.hash.slice(1)));
let workerWarning;
try {
  await startApplicationWorker();
} catch (error) {
  workerWarning = 'No se pudo preparar el modo sin conexión: ' + error.message;
}
openSection(location.hash.slice(1));
if (workerWarning) setStatus(workerWarning);
setupBackup(prepareReload, setStatus);

void setupDropbox(prepareReload, setStatus).catch(error => setStatus(error.message));
