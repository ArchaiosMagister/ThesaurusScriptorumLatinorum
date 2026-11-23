import { applySyncData, isEmptySyncEditor, maxBackupSize, readSyncData, syncFingerprint, validateSyncData } from './backup-store.js';
import { mergeUsages, selectEditor } from './dropbox-plan.js';

const key = 'atl-v1:dropbox';
const file = '/thesaurus-sync-v1.json';
const redirect = new URL('./', location.href).href;
const format = 'thesaurus-dropbox-v1';

function randomCode() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}
function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function read(store, name) {
  return JSON.parse(store.getItem(key + ':' + name) ?? 'null');
}
function save(store, name, value) {
  store.setItem(key + ':' + name, JSON.stringify(value));
}
function remove(store, name) {
  store.removeItem(key + ':' + name);
}

async function connect(appKey) {
  const verifier = randomCode();
  const state = randomCode();
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  save(sessionStorage, 'oauth', { appKey, verifier, state, time: Date.now(), section: location.hash });
  const url = new URL('https://www.dropbox.com/oauth2/authorize');
  url.search = new URLSearchParams({
    client_id: appKey, response_type: 'code', redirect_uri: redirect, state,
    code_challenge: base64url(new Uint8Array(hash)), code_challenge_method: 'S256'
  });
  location.assign(url);
}

async function authorizeCallback() {
  const url = new URL(location.href);
  if (!url.searchParams.has('code') && !url.searchParams.has('error')) return false;
  const pending = read(sessionStorage, 'oauth');
  remove(sessionStorage, 'oauth');
  history.replaceState(null, '', redirect + (pending?.section ?? ''));
  if (!pending || pending.state !== url.searchParams.get('state') || Date.now() - pending.time > 600_000)
    throw new Error('La autorización de Dropbox ha caducado. Vuelve a vincular la cuenta.');
  if (url.searchParams.has('error')) throw new Error('Se canceló la autorización de Dropbox.');
  const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST', signal: AbortSignal.timeout(30_000),
    body: new URLSearchParams({
      code: url.searchParams.get('code'), grant_type: 'authorization_code', client_id: pending.appKey,
      code_verifier: pending.verifier, redirect_uri: redirect
    })
  });
  if (!response.ok) throw new Error('Dropbox no pudo completar la autorización. Comprueba la clave y la URL de retorno.');
  const { access_token: token, account_id: account, expires_in: lifetime } = await response.json();
  if (!token || !account || !Number.isFinite(lifetime)) throw new Error('Dropbox devolvió una sesión incompleta.');
  save(sessionStorage, 'session', { token, account, appKey: pending.appKey, expires: Date.now() + lifetime * 1000 });
  return true;
}

async function content(session, route, args, body) {
  let response;
  try {
    response = await fetch('https://content.dropboxapi.com/2/files/' + route, {
      method: 'POST', signal: AbortSignal.timeout(60_000),
      headers: { Authorization: 'Bearer ' + session.token, 'Dropbox-API-Arg': JSON.stringify(args),
        ...(body && { 'Content-Type': 'application/octet-stream' }) }, body
    });
  } catch { throw new Error('No se pudo conectar con Dropbox. Comprueba la conexión y vuelve a intentarlo.'); }
  if (response.ok) return response;
  if (response.status === 401) {
    remove(sessionStorage, 'session');
    throw new Error('La sesión de Dropbox ha caducado. Vuelve a vincular la cuenta.');
  }
  if (response.status === 409) {
    const detail = await response.json().catch(() => null);
    if (route === 'download' && detail?.error?.path?.['.tag'] === 'not_found') return null;
    if (route === 'upload' && detail?.error?.path?.reason?.['.tag'] === 'conflict')
      throw new Error('Otro dispositivo actualizó Dropbox durante la sincronización. Vuelve a intentarlo.');
  }
  throw new Error('Dropbox rechazó la operación (' + response.status + '). Comprueba los permisos y el espacio de la cuenta.');
}

async function readRemote(session) {
  const response = await content(session, 'download', { path: file });
  if (!response) return null;
  const revision = JSON.parse(response.headers.get('Dropbox-API-Result'))?.rev;
  const blob = await response.blob();
  if (!revision || blob.size > maxBackupSize) throw new Error('El archivo de Dropbox no es válido o supera el límite de tamaño.');
  const envelope = JSON.parse(await blob.text());
  if (envelope?.format !== format || envelope.hash !== await syncFingerprint(envelope.data ?? null))
    throw new Error('La huella del archivo de Dropbox es incorrecta.');
  return { revision, data: validateSyncData(envelope.data), hash: envelope.hash };
}

async function publish(session, data, revision, hash) {
  const body = new Blob([JSON.stringify({ format, hash, data })]);
  if (body.size > maxBackupSize) throw new Error('Los datos de sincronización superan el límite de 128 MiB.');
  await content(session, 'upload', {
    path: file, autorename: false, strict_conflict: true, mute: true,
    mode: revision ? { '.tag': 'update', update: revision } : 'add'
  }, body);
}

async function synchronize(session, prepareReload, report) {
  const checkpointKey = 'checkpoint:' + session.appKey + ':' + session.account;
  const checkpoint = read(localStorage, checkpointKey);
  const remote = await readRemote(session);
  if (!remote && checkpoint) throw new Error('El archivo de sincronización ya no está en Dropbox. Recupéralo desde Dropbox antes de continuar.');
  await prepareReload();
  const local = await readSyncData();
  const editorHash = await syncFingerprint(local.data.editor);
  let data = local.data;
  if (remote) {
    const remoteEditorHash = await syncFingerprint(remote.data.editor);
    const action = selectEditor(editorHash, remoteEditorHash, checkpoint?.editor, isEmptySyncEditor(local.data.editor));
    const hashes = new Map();
    await Promise.all([...local.data.usages, ...remote.data.usages].map(async ([, row]) =>
      hashes.set(row, await syncFingerprint(row))));
    data = {
      editor: action === 'download' ? remote.data.editor : local.data.editor,
      usages: mergeUsages(local.data.usages, remote.data.usages, new Map(checkpoint?.usages), row => hashes.get(row))
    };
  }
  const hash = await syncFingerprint(data);
  const localChanges = hash !== await syncFingerprint(local.data);
  if (hash !== remote?.hash) await publish(session, data, remote?.revision, hash);
  if (localChanges) {
    await prepareReload();
    await applySyncData(data, local.rows);
  }
  save(localStorage, checkpointKey, {
    editor: await syncFingerprint(data.editor),
    usages: await Promise.all(data.usages.map(async ([id, row]) => [id, await syncFingerprint(row)]))
  });
  report('Sincronización con Dropbox completada.');
  if (localChanges) location.reload();
}

export async function setupDropbox(prepareReload, setStatus) {
  const dialog = document.getElementById('dropbox-dialog');
  const open = document.getElementById('app-dropbox');
  const connectButton = document.getElementById('dropbox-connect');
  const syncButton = document.getElementById('dropbox-sync');
  const disconnect = document.getElementById('dropbox-disconnect');
  const appKey = document.getElementById('dropbox-app-key');
  const message = document.getElementById('dropbox-status');
  let busy = false;
  function report(text) { message.textContent = text; setStatus(text); }
  function session() {
    const current = read(sessionStorage, 'session');
    return current?.expires > Date.now() ? current : null;
  }
  function paint() {
    connectButton.disabled = busy || Boolean(session());
    syncButton.disabled = busy || !session();
    disconnect.disabled = busy || !session();
    appKey.disabled = busy || Boolean(session());
  }
  async function run(work) {
    if (busy) return;
    busy = true;
    paint();
    try { await work(); }
    catch (error) { report(error.message); }
    finally { busy = false; paint(); }
  }
  appKey.value = read(localStorage, 'appKey') ?? '';
  open.addEventListener('click', () => {
    document.getElementById('backup-dialog').close();
    paint();
    dialog.showModal();
  });
  connectButton.addEventListener('click', () => void run(async () => {
    const value = appKey.value.trim();
    if (!/^[a-z0-9]{5,64}$/i.test(value)) throw new Error('Introduce la clave pública de la aplicación de Dropbox.');
    save(localStorage, 'appKey', value);
    await prepareReload();
    await connect(value);
  }));
  disconnect.addEventListener('click', () => {
    remove(sessionStorage, 'session');
    paint();
    report('Sesión de Dropbox cerrada en este navegador.');
  });
  syncButton.addEventListener('click', () => void run(async () => {
    const current = session();
    if (!current) throw new Error('Vuelve a vincular la cuenta de Dropbox.');
    report('Comparando los datos con Dropbox…');
    const work = () => synchronize(current, prepareReload, report);
    if (navigator.locks) await navigator.locks.request(key, work);
    else await work();
  }));
  try {
    if (await authorizeCallback()) {
      report('Dropbox vinculado. Pulsa «Sincronizar ahora» para comparar los datos.');
      dialog.showModal();
    }
  } catch (error) { report(error.message); }
  paint();
}
