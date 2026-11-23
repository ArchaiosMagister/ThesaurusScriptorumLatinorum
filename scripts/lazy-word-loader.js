/* JSZip solo se descarga cuando se prepara un documento Word. */
(function () {
  'use strict';
  const source = new URL('../lib/jszip.min.js', document.currentScript.src).href;
  let loading;

  window.atlLoadWordExporter = function () {
    if (typeof window.JSZip === 'function') return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.async = true;
      script.onload = () => {
        if (typeof window.JSZip === 'function') resolve();
        else {
          script.remove();
          reject(new Error('No se ha podido iniciar el generador de Word.'));
        }
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('No se ha podido cargar el generador de Word sin conexión. Revisa la preparación offline.'));
      };
      document.head.appendChild(script);
    }).catch(error => {
      loading = null; // Un error de red no impide volver a intentarlo.
      throw error;
    });
    return loading;
  };
})();
