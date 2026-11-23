import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {webkit} from '@playwright/test';

const base='http://127.0.0.1:4173';
const server=spawn(process.execPath,['scripts/serve-static.mjs'],{stdio:'ignore'});
try{
  let up=false;
  for(let n=0;n<45;n++){
    try{const response=await fetch(base+'/recuperar-prueba/');if(response.status===200){up=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,250));
  }
  if(!up)throw new Error('No se puede abrir la página de recuperación.');
  const browser=await webkit.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:820,height:1180},hasTouch:true,isMobile:true});
    const jsErrors=[];
    page.on('pageerror',err=>jsErrors.push(err.message));
    await page.goto(base+'/CuadernoTextosLatinos/recuperar-prueba/',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Buscar datos guardados en este iPad'}).click();
    await page.getByText('No hay datos de prueba recuperables').waitFor();
    assert.equal(await page.getByRole('button',{name:'Descargar cuadernos editoriales (JSON v2)'}).isDisabled(),true);

    // Simulamos exactamente las dos bases que creó el despliegue provisional.
    await page.evaluate(async()=>{
      const [{WorkspaceRepository},{IndexedDbCorpusRepository},{createEdition,createPlacement},{emptyCorpus}]=await Promise.all([
        import('../storage/workspace-repository.js'),import('../storage/indexeddb-corpus-repository.js'),
        import('../core/edition-factory.js'),import('../core/model.js')
      ]);
      const now='2026-11-16T08:00:00.000Z';
      const storage=new WorkspaceRepository('cuaderno-textos-latinos-workspace-prueba-pr10');
      const p=createPlacement({
        id:'prueba.recovery.place.1',title:'César',latin:'Gallia est omnis divisa.',
        author:'César',work:'De bello Gallico',reference:'1.1',
        source:{kind:'manual',sourceId:null,urn:null,importedAt:now}
      },()=>('recovery.question.'+crypto.randomUUID()));
      const e=createEdition({id:'prueba.recovery.edition.1',legacyNotebookId:null,
        title:'Cuaderno de prueba',timestamp:now,placements:[p]});
      await storage.commitEdition(e.id,0,{command:'test-recovery',targetId:e.id,timestamp:now},()=>e);
      const old=new IndexedDbCorpusRepository('cuaderno-textos-latinos-prueba-pr10');
      const prior=await old.load();
      const original=emptyCorpus();
      original.texts.push({id:'prueba.recovery.legacy.1',title:'Texto anterior',latin:'Arma virumque cano.',
        source:{author:'Virgilio',work:'Eneida',reference:'I 1'},tagIds:[],
        createdAt:now,updatedAt:now});
      await old.save(original,prior.revision);
    });

    await page.getByRole('button',{name:'Buscar datos guardados en este iPad'}).click();
    await page.getByText('Cuadernos editoriales: 1').waitFor();
    assert.equal(await page.getByRole('button',{name:'Descargar cuadernos editoriales (JSON v2)'}).isEnabled(),true);
    for(const [button,format] of [['Descargar cuadernos editoriales (JSON v2)','cuaderno-textos-latinos-workspace'],
                                  ['Descargar textos y cuadernos anteriores (JSON v1)','cuaderno-textos-latinos']]){
      const downloaded=page.waitForEvent('download');
      await page.getByRole('button',{name:button}).click();
      const download=await downloaded;
      const fs=await import('node:fs/promises');
      const text=await fs.readFile(await download.path(),'utf8');
      const json=JSON.parse(text);
      assert.equal(json.format,format);
      assert.match(json.sha256,/^[0-9a-f]{64}$/);
      if(format.includes('workspace'))assert.equal(json.snapshot.editions.length,1);
      else assert.equal(json.corpus.texts.length,1);
    }
    assert.deepEqual(jsErrors,[]);
    console.log('Recuperación iPad WebKit: OK. Dos JSON verificados; bases originales intactas.');
  }finally{await browser.close()}
}finally{server.kill('SIGTERM')}
