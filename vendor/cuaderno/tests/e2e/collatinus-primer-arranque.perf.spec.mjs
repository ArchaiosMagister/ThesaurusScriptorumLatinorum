import {stat} from 'node:fs/promises';
import {test,expect} from '@playwright/test';

/**
 * Diagnóstico reproducible del primer uso real del worker empaquetado.
 * No impone un presupuesto rígido: los tiempos dependen de la máquina CI.
 * Se ejecuta en un perfil nuevo, sin servicio trabajador PWA ni IndexedDB previo.
 */
test('Collatinus: medir arranque frío, reutilización y segundo worker sin alterar resultados',async({browser},testInfo)=>{
  test.setTimeout(150000);
  const context=await browser.newContext({serviceWorkers:'block'});
  try{
    const page=await context.newPage();
    await page.goto('/examinator-cuadernos/',{waitUntil:'domcontentloaded'});
    const metrics=await page.evaluate(async()=>{
      const latin='Amatus est. Loquitur. Liber legendus. Amavisse dicit.';
      const alternative='Missi erant. Caesar Galliam vicit.';
      let id=0;
      function makeWorker(){return new Worker(new URL('./collatinus/worker.js',document.baseURI));}
      async function call(worker,method,args={}){
        const requestId=++id;
        const start=performance.now();
        const result=await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>{cleanup();reject(new Error('Collatinus no responde: '+method));},90000);
          const onMessage=({data})=>{
            if(data?.id!==requestId)return;
            cleanup();
            if(data.error)reject(new Error(String(data.error)));
            else resolve(data.result);
          };
          const onError=event=>{cleanup();reject(new Error(event.message||'Error de worker'));};
          function cleanup(){
            clearTimeout(timer);
            worker.removeEventListener('message',onMessage);
            worker.removeEventListener('error',onError);
          }
          worker.addEventListener('message',onMessage);
          worker.addEventListener('error',onError);
          worker.postMessage({id:requestId,method,args});
        });
        return {durationMs:Math.round((performance.now()-start)*10)/10,result};
      }
      const first=makeWorker();
      try{
        const cold=await call(first,'analyze',{text:latin});
        const repeated=await call(first,'analyze',{text:latin});
        const second=makeWorker();
        try{
          const cachedAnotherWorker=await call(second,'analyze',{text:latin});
          const initialization=await call(second,'warm');
          const subsequent=await call(second,'analyze',{text:alternative});
          return {
            coldFirstAnalyzeMs:cold.durationMs,
            repeatedAnalyzeMs:repeated.durationMs,
            cachedInNewWorkerMs:cachedAnotherWorker.durationMs,
            explicitEngineWarmMs:initialization.durationMs,
            freshTextAfterWarmMs:subsequent.durationMs,
            coldTokens:cold.result?.length,
            identicalCacheResult:JSON.stringify(cold.result)===JSON.stringify(repeated.result)
              &&JSON.stringify(cold.result)===JSON.stringify(cachedAnotherWorker.result),
            cacheEntries:(await (await caches.open('cuaderno-collatinus-analysis-v2')).keys()).length,
          };
        }finally{second.terminate();}
      }finally{first.terminate();}
    });
    const assets=await Promise.all(
      ['worker.js','datos.js','incluidos.js','shim.js','motor.js'].map(async filename=>({
        filename,bytes:(await stat('dist/examinator-cuadernos/collatinus/'+filename)).size,
      })),
    );
    const report={test:'webkit-profile-new',metrics,assets,
      totalBytes:assets.reduce((total,item)=>total+item.bytes,0)};
    console.log('COLLATINUS_COLD_START '+JSON.stringify(report));
    await testInfo.attach('collatinus-cold-start.json',{
      body:JSON.stringify(report,null,2),contentType:'application/json',
    });
    expect(metrics.coldTokens).toBeGreaterThanOrEqual(4);
    expect(metrics.identicalCacheResult).toBe(true);
    expect(metrics.cacheEntries).toBeGreaterThanOrEqual(2);
    for(const name of ['coldFirstAnalyzeMs','repeatedAnalyzeMs',
      'cachedInNewWorkerMs','explicitEngineWarmMs','freshTextAfterWarmMs'])
      expect(Number.isFinite(metrics[name])&&metrics[name]>=0).toBe(true);
  }finally{
    await context.close();
  }
});
