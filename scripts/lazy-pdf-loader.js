/* Este motor PDF se descarga al exportar, nunca al abrir Examinator. */
(function () {
  'use strict';
  const source = new URL('../lib/html2pdf.bundle.min.js', document.currentScript.src).href;
  let loading;
  window.atlLoadPdfExporter = function () {
    if (typeof window.html2pdf === 'function') return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.async = true;
      script.onload = () => {
        if (typeof window.html2pdf === 'function') resolve();
        else {
          script.remove();
          reject(new Error('No se ha podido iniciar el generador de PDF.'));
        }
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('No se ha podido cargar el generador de PDF sin conexión. Revisa la preparación offline.'));
      };
      document.head.appendChild(script);
    }).catch(error => {
      loading = null;
      throw error;
    });
    return loading;
  };
})();
