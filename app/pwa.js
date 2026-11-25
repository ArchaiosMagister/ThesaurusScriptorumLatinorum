import { withWorkspaceLock } from './dropbox-plan.js';

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
  const activate = async () => {
    const roots = [document.body, ...Array.from(document.querySelectorAll('iframe'),
      frame => frame.contentDocument?.documentElement).filter(Boolean)];
    const states = roots.map(root => [root, root.inert]);
    try {
      for (const [root] of states) root.inert = true;
      await prepareReload();
      const waiting = registration.waiting;
      if (!waiting) return 'La actualización ya se ha aplicado. Puedes recargar.';
      const channel = new MessageChannel();
      // Keep the write lock until the controller changes or activation is refused.
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => finish(new Error('No se pudo confirmar la actualización. Vuelve a intentarlo.')), 30000);
        const changed = () => {
          finish(null, 'Aplicando actualización…');
          location.reload();
        };
        function finish(error, message) {
          clearTimeout(timeout);
          channel.port1.close();
          navigator.serviceWorker.removeEventListener('controllerchange', changed);
          if (error) reject(error); else resolve(message);
        }
        navigator.serviceWorker.addEventListener('controllerchange', changed, { once: true });
        channel.port1.onmessage = ({ data }) => {
          if (!data?.ok) finish(new Error(data?.message || 'No se pudo activar la actualización.'));
        };
        try { waiting.postMessage('activate', [channel.port2]); }
        catch (error) { finish(error); }
      });
    } finally {
      for (const [root, previous] of states) root.inert = previous;
    }
  };
  return withWorkspaceLock(activate);
}
