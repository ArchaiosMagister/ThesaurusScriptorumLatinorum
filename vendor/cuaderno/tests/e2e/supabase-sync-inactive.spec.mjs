import {test,expect} from '@playwright/test';

test('iPad: Supabase sigue inactivo hasta iniciar sesión y confirmar subida',async({page})=>{
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/examinator-cuadernos/');
  const initial=await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    const {upsertText}=await import('/core/editor-operations.js');
    const repo=new IndexedDbCorpusRepository(),loaded=await repo.load();
    const corpus=upsertText(loaded.corpus,{title:'Texto de prueba',
      latin:'Gallia est omnis divisa in partes tres.',author:'César',
      work:'Bellum Gallicum',reference:'I 1'},'supabase.test',
    '2026-11-20T12:00:00.000Z');
    await repo.save(corpus,loaded.revision);
    return corpus.texts.length;
  });
  expect(initial).toBe(1);
  await page.reload();
  await page.locator('.cuaderno-home-sync summary').click();
  await page.getByRole('button',{name:'Configurar sincronización'}).click();
  const dialog=page.locator('.modal').last();
  await expect(dialog).toContainText('Sincronización privada · Supabase');
  await dialog.getByRole('textbox',{name:'URL Supabase'}).fill('https://example-project.supabase.co');
  await dialog.getByRole('textbox',{name:'Clave publicable'}).fill('sb_publishable_MOCK123');
  await dialog.getByRole('textbox',{name:'Correo docente'}).fill('profesor@example.org');
  await dialog.locator('input[aria-label="Contraseña"]').fill('contraseña temporal');
  await page.evaluate(()=>{
    const original=window.fetch.bind(window);
    const user='11111111-1111-4111-8111-111111111111';
    const calls=[];
    window.__syncCalls=calls;
    window.fetch=async(input,init)=>{
      const url=String(input);
      if(!url.startsWith('https://example-project.supabase.co/'))
        return original(input,init);
      calls.push({url,method:init?.method,body:init?.body});
      if(url.includes('/auth/v1/token'))return new Response(JSON.stringify({
        access_token:'mock-jwt',user:{id:user},
      }),{status:200,headers:{'Content-Type':'application/json'}});
      if(init?.method==='GET')return new Response('[]',{status:200,
        headers:{'Content-Type':'application/json'}});
      if(init?.method==='POST'){
        const data=JSON.parse(String(init.body));
        return new Response(JSON.stringify([{revision:1,payload:data.payload}]),
          {status:201,headers:{'Content-Type':'application/json'}});
      }
      return new Response('{}',{status:404});
    };
  });
  await dialog.getByRole('button',{name:'Iniciar sesión'}).click();
  await expect(dialog).toContainText('Conectado');
  await dialog.getByRole('button',{name:'Comprobar cambios'}).click();
  await expect(dialog).toContainText('Subida disponible');
  const callsBefore=await page.evaluate(()=>window.__syncCalls.filter(x=>x.method==='POST'&&!x.url.includes('/auth/')).length);
  expect(callsBefore).toBe(0,'no se suben datos antes de confirmar');
  page.once('dialog',dialog=>dialog.accept());
  await dialog.getByRole('button',{name:'Guardar copia y subir'}).click();
  await expect(dialog).toContainText('Subida confirmada',{timeout:15000});
  const state=await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    return {texts:(await new IndexedDbCorpusRepository().load()).corpus.texts.length,
      writes:window.__syncCalls.filter(x=>x.method==='POST'&&!x.url.includes('/auth/')).length};
  });
  expect(state).toEqual({texts:1,writes:1});
});
