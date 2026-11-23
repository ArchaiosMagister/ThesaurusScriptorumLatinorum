import { applySyncData, isEmptySyncEditor, maxBackupSize, readSyncData, syncFingerprint, validateSyncData } from './backup-store.js';
import { mergeUsages, selectEditor } from './dropbox-plan.js';

const key = 'atl-v1:dropbox';
const file = '/thesaurus-sync-v1.json';
const redirect = new URL('./', location.href).href;
const format = 'thesaurus-dropbox-v1';
const tokenEndpoint = 'https://api.dropboxapi.com/oauth2/token';

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
    code_challenge: base64url(new Uint8Array(hash)), code_challenge_method: 'S256',
    token_access_type: 'offline'
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
  const response = await requestToken({
    code: url.searchParams.get('code'), grant_type: 'authorization_code', client_id: pending.appKey,
    code_verifier: pending.verifier, redirect_uri: redirect
  });
  if (!response.ok) throw new Error('Dropbox no pudo completar la autorización. Comprueba la clave y la URL de retorno.');
  const result = await response.json();
  if (typeof result.refresh_token !== 'string' || !result.refresh_token ||
      typeof result.account_id !== 'string' || !result.account_id) {
    throw new Error('Dropbox no concedió acceso persistente. Vuelve a autorizar la aplicación.');
  }
  const connection = {
    id: crypto.randomUUID(), refresh: result.refresh_token, account: result.account_id, appKey: pending.appKey
  };
  const session = accessSession(connection, result);
  save(localStorage, 'connection', connection);
  save(sessionStorage, 'session', session);
  return true;
}

async function requestToken(fields) {
  try {
    return await fetch(tokenEndpoint, {
      method: 'POST', signal: AbortSignal.timeout(30_000), body: new URLSearchParams(fields)
    });
  } catch {
    throw new Error('No se pudo conectar con Dropbox. Comprueba la conexión y vuelve a intentarlo.');
  }
}

function accessSession(connection, result) {
  const { access_token: token, expires_in: lifetime } = result;
  if (typeof token !== 'string' || !token || !Number.isFinite(lifetime) || lifetime <= 0 ||
      (result.account_id && result.account_id !== connection.account)) {
    throw new Error('Dropbox devolvió una sesión incompleta.');
  }
  return {
    id: connection.id, token, account: connection.account, appKey: connection.appKey,
    expires: Date.now() + lifetime * 1000
  };
}

async function activeSession(expected) {
  const connection = read(localStorage, 'connection');
  if (!connection || (expected && expected.id !== connection.id))
    throw new Error('Vuelve a vincular la cuenta de Dropbox.');
  const cached = read(sessionStorage, 'session');
  if (cached?.id === connection.id && cached.expires > Date.now() + 60_000) return cached;
  const response = await requestToken({
    grant_type: 'refresh_token', refresh_token: connection.refresh, client_id: connection.appKey
  });
  const result = await response.json().catch(() => ({}));
  if (read(localStorage, 'connection')?.id !== connection.id)
    throw new Error('La conexión de Dropbox cambió en otra pestaña.');
  if (!response.ok) {
    if (response.status === 400 && result.error === 'invalid_grant') {
      remove(localStorage, 'connection');
      remove(sessionStorage, 'session');
      throw new Error('Dropbox retiró el acceso. Vuelve a vincular la cuenta.');
    }
    throw new Error('No se pudo renovar la sesión de Dropbox (' + response.status + '). Vuelve a intentarlo.');
  }
  const session = accessSession(connection, result);
  save(sessionStorage, 'session', session);
  return session;
}

async function content(expected, route, args, body, retry = true) {
  const session = await activeSession(expected);
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
    if (retry) return content(expected, route, args, body, false);
    throw new Error('Dropbox rechazó la sesión renovada. Comprueba el acceso de la aplicación.');
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
  if (localChanges) {
    save(sessionStorage, 'completed', true);
    location.reload();
  }
}

export async function setupDropbox(prepareReload, setStatus) {
  const dialog = document.getElementById('dropbox-dialog');
  const backupDialog = document.getElementById('backup-dialog');
  const open = document.getElementById('app-dropbox');
  const back = document.getElementById('dropbox-back');
  const setup = document.getElementById('dropbox-setup');
  const connection = document.getElementById('dropbox-connection');
  const connectButton = document.getElementById('dropbox-connect');
  const syncButton = document.getElementById('dropbox-sync');
  const quickSync = document.getElementById('app-dropbox-sync');
  const disconnect = document.getElementById('dropbox-disconnect');
  const appKey = document.getElementById('dropbox-app-key');
  const message = document.getElementById('dropbox-status');
  let busy = false;
  function report(text) { message.textContent = text; setStatus(text); }
  function paint() {
    const connected = Boolean(read(localStorage, 'connection'));
    dialog.dataset.connected = String(connected);
    connection.textContent = connected ? 'Vinculado' : 'Sin vincular';
    setup.hidden = connectButton.hidden = connected;
    syncButton.hidden = disconnect.hidden = !connected;
    connectButton.disabled = syncButton.disabled = disconnect.disabled = appKey.disabled = busy;
    back.disabled = quickSync.disabled = busy;
    if (connected) quickSync.removeAttribute('aria-haspopup');
    else quickSync.setAttribute('aria-haspopup', 'dialog');
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
  function openDialog() {
    if (backupDialog.open) backupDialog.close();
    paint();
    dialog.showModal();
  }
  open.addEventListener('click', openDialog);
  back.addEventListener('click', () => {
    dialog.close();
    backupDialog.showModal();
    open.focus();
  });
  connectButton.addEventListener('click', () => void run(async () => {
    const value = appKey.value.trim();
    if (!/^[a-z0-9]{5,64}$/i.test(value)) throw new Error('Introduce la clave pública de la aplicación de Dropbox.');
    save(localStorage, 'appKey', value);
    await prepareReload();
    await connect(value);
  }));
  disconnect.addEventListener('click', () => {
    remove(localStorage, 'connection');
    remove(sessionStorage, 'session');
    paint();
    report('Sesión de Dropbox cerrada en este navegador.');
  });
  function syncNow() {
    void run(async () => {
      const current = read(localStorage, 'connection');
      if (!current) throw new Error('Vuelve a vincular la cuenta de Dropbox.');
      report('Comparando los datos con Dropbox…');
      const work = () => synchronize(current, prepareReload, report);
      if (navigator.locks) await navigator.locks.request(key, work);
      else await work();
    });
  }
  syncButton.addEventListener('click', syncNow);
  quickSync.addEventListener('click', () => {
    if (read(localStorage, 'connection')) syncNow();
    else openDialog();
  });
  addEventListener('storage', event => {
    if (event.key === key + ':connection' || event.key === null) paint();
  });
  if (read(sessionStorage, 'completed')) {
    remove(sessionStorage, 'completed');
    report('Sincronización con Dropbox completada.');
  }
  try {
    if (await authorizeCallback()) {
      report('Dropbox vinculado. Pulsa «Sincronizar ahora» para comparar los datos.');
      dialog.showModal();
    }
  } catch (error) { report(error.message); }
  paint();
}
