const base = new URL('./', import.meta.url);
let installation;
let registration;

addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installation = event;
});
addEventListener('appinstalled', () => { installation = null; });

export async function startApplicationWorker() {
  if (!navigator.serviceWorker) return;
  const legacy = ['modulos/cuaderno/', 'modulos/cuaderno/examinator-cuadernos/',
    'modulos/cuaderno-integrado/', 'modulos/cuaderno-integrado/examinator-cuadernos/', 'modulos/examinator/'];
  const scopes = new Set(legacy.map(path => new URL(path, base).href));
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.filter(item => scopes.has(item.scope)).map(item => item.unregister()));
  registration = registrations.find(item => item.scope === base.href) ??
    await navigator.serviceWorker.register(new URL('sw.js', base), { updateViaCache: 'none' });
}

export async function prepareOffline() {
  if (!registration) throw new Error('El modo sin conexión no está disponible en este navegador.');
  const worker = registration.active ?? (await navigator.serviceWorker.ready).active;
  return await new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => finish(new Error('La descarga sigue en curso. Comprueba de nuevo al terminar.')), 120000);
    function finish(error, summary) {
      clearTimeout(timeout);
      channel.port1.close();
      if (error) reject(error);
      else resolve(summary);
    }
    channel.port1.onmessage = ({ data }) => finish(data.ok ? null : new Error(data.message || 'No se pudieron descargar los recursos.'), data);
    worker.postMessage('prepare-offline', [channel.port2]);
  });
}

export async function installApplication() {
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return 'La aplicación ya está instalada.';
  if (!installation) return 'En Safari, abre Compartir y elige «Añadir a pantalla de inicio» o «Añadir al Dock».';
  const prompt = installation;
  installation = null;
  await prompt.prompt();
  return (await prompt.userChoice).outcome === 'accepted' ? 'Instalación iniciada.' : 'Instalación cancelada.';
}

export async function updateApplication(prepareReload) {
  if (!registration) throw new Error('La actualización no está disponible en este navegador.');
  if (!registration.waiting) await registration.update();
  if (!registration.waiting) {
    return registration.installing ? 'La actualización se está preparando. Vuelve a pulsar Actualizar.' : 'La aplicación está actualizada.';
  }
  if (!window.confirm('¿Aplicar la actualización y recargar la aplicación?')) return 'Actualización pendiente.';
  await prepareReload();
  const waiting = registration.waiting;
  if (!waiting) return 'La actualización ya se ha aplicado. Puedes recargar.';
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  waiting.postMessage('activate');
  return 'Aplicando actualización…';
}
