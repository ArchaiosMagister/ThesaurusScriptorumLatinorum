// Storage regression tests must not race the automatic grammar cache.
export async function isolateAnalysis(context) {
  await context.addInitScript(()=>{
    const NativeWorker=window.Worker;
    window.Worker=class extends NativeWorker {
      constructor(url, options) {
        if(String(url).includes('/collatinus/worker.js')) throw Error('Collatinus desactivado para esta prueba de almacenamiento');
        super(url,options);
      }
    };
  });
}
