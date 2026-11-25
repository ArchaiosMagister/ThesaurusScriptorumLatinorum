import { applySyncData, protectLocal, isEmptySyncEditor, maxBackupSize, readSyncData, syncFingerprint, syncTargetRows, validateSyncData } from './backup-store.js';
import { fingerprintEditorParts, isRecoverableSync, mergeEditorParts, mergeUsages, selectEditor, SyncConflict } from './dropbox-plan.js';

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

async function readRemote(session, path = file) {
  const response = await content(session, 'download', { path });
  if (!response) return null;
  const revision = JSON.parse(response.headers.get('Dropbox-API-Result'))?.rev;
  const blob = await response.blob();
  if (!revision || blob.size > maxBackupSize) throw new Error('El archivo de Dropbox no es válido o supera el límite de tamaño.');
  const envelope = JSON.parse(await blob.text());
  if (envelope?.format !== format || envelope.hash !== await syncFingerprint(envelope.data ?? null))
    throw new Error('La huella del archivo de Dropbox es incorrecta.');
  return { revision, data: validateSyncData(envelope.data), hash: envelope.hash, envelope };
}

async function publish(session, data, revision, hash) {
  const body = new Blob([JSON.stringify({ format, hash, data })]);
  if (body.size > maxBackupSize) throw new Error('Los datos de sincronización superan el límite de 128 MiB.');
  await content(session, 'upload', {
    path: file, autorename: false, strict_conflict: true, mute: true,
    mode: revision ? { '.tag': 'update', update: revision } : 'add'
  }, body);
}

async function archiveRemote(session, remote) {
  const path = '/thesaurus-recovery-' + crypto.randomUUID() + '.json';
  await content(session, 'upload', {
    path, mode: 'add', autorename: false, strict_conflict: true, mute: true
  }, new Blob([JSON.stringify(remote.envelope)]));
  const copy = await readRemote(session, path);
  if (copy?.hash !== remote.hash) throw Error('No se pudo verificar la copia anterior de Dropbox.');
}

async function synchronize(session, prepareReload, report, resolution, restoreFromCloud = false) {
  const scope = session.appKey + ':' + session.account;
  const checkpointKey = 'checkpoint:' + scope;
  const pendingKey = 'checkpoint-pending:' + scope;
  const checkpoint = read(localStorage, checkpointKey);
  const remote = await readRemote(session);
  if (!remote && checkpoint) throw new Error('El archivo de sincronización ya no está en Dropbox. Recupéralo desde Dropbox antes de continuar.');
  await prepareReload();
  const local = await readSyncData();
  const names = Object.keys(local.rows);
  const fingerprints = async rows => Object.fromEntries(await Promise.all(
    names.map(async name => [name, await syncFingerprint(rows[name])])));
  async function saveCheckpoint(data) {
    save(localStorage, checkpointKey, {
      editor: await syncFingerprint(data.editor),
      editorParts: await fingerprintEditorParts(data.editor, syncFingerprint),
      bankReviews: await Promise.all((data.bankReviews ?? []).map(async ([id, row]) => [id, await syncFingerprint(row)])),
      templates: await Promise.all((data.templates ?? []).map(async ([id, row]) => [id, await syncFingerprint(row)])),
      usages: await Promise.all(data.usages.map(async ([id, row]) => [id, await syncFingerprint(row)]))
    });
  }
  // Una restauración explícita es unidireccional: nunca publica ni combina datos.
  // También permite salir de una sincronización interrumpida, conservando una copia local.
  if (restoreFromCloud) {
    if (!remote) throw new Error('No existe una copia de Thesaurus en Dropbox. No se han modificado los datos locales.');
    const before = await fingerprints(local.rows);
    const after = syncTargetRows(remote.data, local.rows);
    await protectLocal('Antes de sustituir este dispositivo por la copia de Dropbox');
    await prepareReload();
    const current = await readSyncData();
    if (!isRecoverableSync(await fingerprints(current.rows), before, before))
      throw new Error('Los datos locales cambiaron durante la preparación. Vuelve a intentar la restauración.');
    const latest = await readRemote(session);
    if (latest?.revision !== remote.revision || latest?.hash !== remote.hash)
      throw new Error('La copia de Dropbox cambió durante la preparación. Vuelve a intentar la restauración.');
    const target = await fingerprints(after);
    // Conserva el diario hasta verificar la aplicación y actualizar el punto de control.
    save(localStorage, pendingKey, {
      hash: remote.hash, applyLocal: true, revision: remote.revision, previousHash: remote.hash,
      before, after: target
    });
    await applySyncData(remote.data, current.rows);
    await saveCheckpoint(remote.data);
    remove(localStorage, pendingKey);
    report('Sincronización con Dropbox completada.');
    save(sessionStorage, 'completed', true);
    location.reload();
    return;
  }
  // Recupera una aplicación interrumpida entre transacciones de IndexedDB.
  // Rechaza cambios ajenos y no sobrescribe una revisión nueva de Dropbox.
  let pending = read(localStorage, pendingKey);
  if (pending && Object.hasOwn(pending, 'revision') && pending.hash !== remote?.hash &&
      pending.revision === (remote?.revision ?? null) && pending.previousHash === (remote?.hash ?? null)) {
    // Dropbox conserva el estado anterior. Volvemos a comparar antes de publicar.
    remove(localStorage, pendingKey);
    pending = null;
  }
  if (pending) {
    if (!remote || pending.hash !== remote.hash)
      throw new Error('Dropbox cambió mientras había una sincronización pendiente. Conserva una copia local y revisa ambas versiones.');
    const current = await fingerprints(local.rows);
    for (const collection of ['bankReviews', 'templates']) {
      if (pending.before && pending.after && !Object.hasOwn(pending.before, collection) &&
          !Object.hasOwn(pending.after, collection)) {
        const empty = await syncFingerprint([]);
        pending.before[collection] = pending.after[collection] = empty;
      }
    }
    const target = pending.applyLocal === false ? local.rows : syncTargetRows(remote.data, local.rows);
    if (!isRecoverableSync(current, pending.before ?? {}, pending.after ?? {}) ||
        !isRecoverableSync(await fingerprints(target), pending.after ?? {}, pending.after ?? {}))
      throw new Error('Se detectaron cambios durante una sincronización interrumpida. Conserva los datos locales y revisa ambas copias.');
    if (pending.applyLocal !== false) await applySyncData(remote.data, local.rows);
    await saveCheckpoint(remote.data);
    remove(localStorage, pendingKey);
    report('Sincronización con Dropbox completada.');
    save(sessionStorage, 'completed', true);
    location.reload();
    return;
  }
  const localHash = await syncFingerprint(local.data);
  const comparison = { connection: session.id, localHash, revision: remote?.revision, remoteHash: remote?.hash };
  const sameComparison = resolution && Object.keys(comparison).every(name => comparison[name] === resolution[name]);
  const choices = sameComparison ? resolution.choices : {};
  const preference = choices.editor;
  if (resolution && !sameComparison && !remote) {
    throw new Error('La copia de Dropbox ya no está disponible. Se han conservado los datos de este dispositivo.');
  }
  let data = local.data;
  if (remote) {
    const editorHash = await syncFingerprint(local.data.editor);
    const remoteEditorHash = await syncFingerprint(remote.data.editor);
    try {
      let editor;
      if (checkpoint?.editorParts && editorHash !== remoteEditorHash &&
          editorHash !== checkpoint.editor && remoteEditorHash !== checkpoint.editor && !preference) {
        const merged = await mergeEditorParts(local.data.editor, remote.data.editor, checkpoint.editorParts,
          syncFingerprint, id => choices[id]);
        if (merged) {
          try { editor = validateSyncData({ editor: merged, usages: [] }).editor; }
          catch { /* Interdependent changes require choosing the complete editorial space. */ }
        }
      }
      if (!editor) {
        const action = selectEditor(editorHash, remoteEditorHash, checkpoint?.editor,
          isEmptySyncEditor(local.data.editor), preference);
        editor = action === 'download' ? remote.data.editor : local.data.editor;
      }
      const hashes = new Map();
      for (const collection of ['usages', 'bankReviews', 'templates']) {
        await Promise.all([...(local.data[collection] ?? []), ...(remote.data[collection] ?? [])].map(async ([, row]) =>
          hashes.set(row, await syncFingerprint(row))));
      }
      const merge = (name, conflict) => {
        try {
          return mergeUsages(local.data[name] ?? [], remote.data[name] ?? [], new Map(checkpoint?.[name]),
            row => hashes.get(row), () => conflict, id => choices[JSON.stringify([name, id])]);
        } catch (error) {
          if (error instanceof SyncConflict) error.item = JSON.stringify([name, error.item]);
          throw error;
        }
      };
      const bankReviews = merge('bankReviews', 'La revisión gramatical de una ficha cambió en ambos dispositivos.');
      const templates = merge('templates', 'Una plantilla cambió en ambos dispositivos.');
      data = {
        ...(templates.length && { templates }),
        ...(bankReviews.length && { bankReviews }),
        editor,
        usages: merge('usages', 'Un uso de examen cambió o se eliminó en ambos dispositivos.')
      };
    } catch (error) {
      if (!(error instanceof SyncConflict)) throw error;
      error.comparison = { ...comparison, item: error.item ?? 'editor', choices };
      throw error;
    }
  }
  if (resolution && !sameComparison) {
    throw new Error('Una copia cambió desde la comparación. Pulsa «Sincronizar ahora» para volver a comparar.');
  }
  const hash = await syncFingerprint(data);
  const localChanges = hash !== localHash;
  const remoteChanges = hash !== remote?.hash;
  if (localChanges) await protectLocal('Antes de sincronizar con Dropbox');
  if (remoteChanges && remote) await archiveRemote(session, remote);
  if (localChanges || remoteChanges) {
    await prepareReload();
    const current = await readSyncData();
    const before = await fingerprints(local.rows);
    if (!isRecoverableSync(await fingerprints(current.rows), before, before))
      throw Error('Los datos locales cambiaron durante la preparación. Vuelve a sincronizar.');
    const after = localChanges ? syncTargetRows(data, local.rows) : local.rows;
    save(localStorage, pendingKey, {
      hash, applyLocal: localChanges, revision: remote?.revision ?? null, previousHash: remote?.hash ?? null,
      before, after: await fingerprints(after)
    });
    if (remoteChanges) await publish(session, data, remote?.revision, hash);
    const saved = await readRemote(session);
    if (saved?.hash !== hash)
      throw Error('Dropbox cambió antes de verificar la sincronización. Se ha conservado la copia local.');
    if (localChanges) await applySyncData(data, local.rows);
  }
  await saveCheckpoint(data);
  remove(localStorage, pendingKey);
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
  const restoreRemote = document.getElementById('dropbox-restore-remote');
  const disconnect = document.getElementById('dropbox-disconnect');
  const appKey = document.getElementById('dropbox-app-key');
  const message = document.getElementById('dropbox-status');
  const conflictPanel = document.getElementById('dropbox-conflict');
  const keepRemote = document.getElementById('dropbox-keep-remote');
  const keepLocal = document.getElementById('dropbox-keep-local');
  let comparison;
  let busy = false;
  let completionTimer = null;
  function report(text) {
    if (completionTimer !== null) clearTimeout(completionTimer);
    completionTimer = null;
    message.textContent = text;
    setStatus(text);
    if (text === 'Sincronización con Dropbox completada.') {
      completionTimer = setTimeout(() => {
        completionTimer = null;
        if (message.textContent === text) message.textContent = '';
        if (document.getElementById('app-status')?.textContent === text) setStatus('');
      }, 5000);
    }
  }
  function paint() {
    const connected = Boolean(read(localStorage, 'connection'));
    dialog.dataset.connected = String(connected);
    connection.textContent = connected ? 'Vinculado' : 'Sin vincular';
    setup.hidden = connectButton.hidden = connected;
    syncButton.hidden = disconnect.hidden = restoreRemote.hidden = !connected;
    restoreRemote.disabled = busy;
    connectButton.disabled = syncButton.disabled = disconnect.disabled = appKey.disabled = busy;
    back.disabled = quickSync.disabled = keepRemote.disabled = keepLocal.disabled = busy;
    conflictPanel.hidden = !connected || !comparison;
    if (connected) quickSync.removeAttribute('aria-haspopup');
    else quickSync.setAttribute('aria-haspopup', 'dialog');
  }
  async function run(work) {
    if (busy) return;
    busy = true;
    paint();
    try { await work(); }
    catch (error) {
      report(error.message);
      if (error instanceof SyncConflict && error.comparison) {
        comparison = error.comparison;
        paint();
        if (!dialog.open) openDialog();
        document.getElementById('dropbox-conflict-title').focus();
      }
    }
    finally { busy = false; paint(); }
  }
  appKey.value = read(localStorage, 'appKey') ?? '';
  function openDialog() {
    if (backupDialog.open) backupDialog.close();
    paint();
    dialog.showModal();
  }
  open.addEventListener('click', openDialog);
  dialog.addEventListener('close', () => { comparison = undefined; paint(); });
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
    comparison = undefined;
    paint();
    report('Sesión de Dropbox cerrada en este navegador.');
  });
  function syncNow(preference, restoreFromCloud = false) {
    if (busy || (preference && !comparison)) return;
    const resolution = preference ? {
      ...comparison, choices: { ...comparison.choices, [comparison.item]: preference }
    } : undefined;
    comparison = undefined;
    void run(async () => {
      const current = read(localStorage, 'connection');
      if (!current) throw new Error('Vuelve a vincular la cuenta de Dropbox.');
      report(restoreFromCloud ? 'Verificando la copia de Dropbox…' : 'Comparando los datos con Dropbox…');
      const work = () => synchronize(current, prepareReload, report, resolution, restoreFromCloud);
      if (navigator.locks) await navigator.locks.request(key, work);
      else await work();
    });
  }
  syncButton.addEventListener('click', () => syncNow());
  restoreRemote.addEventListener('click', () => {
    if (busy || !read(localStorage, 'connection')) return;
    if (!confirm('¿Sustituir el banco, los cuadernos, las etiquetas, las plantillas y el registro compartido de exámenes de este dispositivo por los de Dropbox? Se guardará una copia de seguridad local. No se modificará Dropbox ni se borrarán los exámenes completos locales.')) return;
    syncNow(undefined, true);
  });
  keepRemote.addEventListener('click', () => syncNow('remote'));
  keepLocal.addEventListener('click', () => syncNow('local'));
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
