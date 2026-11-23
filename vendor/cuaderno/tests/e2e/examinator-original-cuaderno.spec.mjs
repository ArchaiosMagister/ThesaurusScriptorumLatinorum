import {createServer,request} from 'node:http';
import {test,expect} from '@playwright/test';

test('Examinator original como base: cabecera, biblioteca original y cuaderno persistente',async({page})=>{
  await page.setViewportSize({width:820,height:1180});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/examinator-cuadernos/');
  await expect(page.locator('header .brand')).toHaveText('Cuadernos Latinos');
  await expect(page.locator('main#main > #editor')).toBeVisible();
  await expect(page.locator('main#main > #preview')).toBeHidden();
  await expect(page.locator('#editor .card h3')).toHaveText('Cuaderno de textos latinos');
  await expect(page.locator('body')).toHaveCSS('grid-template-rows',/48px/);
  page.once('dialog',dialog=>dialog.accept('Cuaderno original 1'));
  await page.locator('#btnNew').click();
  await expect(page.locator('#editor .card')).toContainText('Cuaderno original 1');
  await page.locator('#btnLib').click();
  await expect(page.locator('#lib .lhead b')).toHaveText('Biblioteca');
  await expect(page.locator('#lib .lbody .lcat')).toBeVisible();
  await expect(page.locator('#lib .lbody .lread')).toBeVisible();
  await page.locator('#lib .lf').fill('Eutropio');
  const row=page.locator('#lib .lrow.have').filter({hasText:'Eutropio'}).first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.locator('#lib .rtext .rl').first()).toBeVisible();
  await page.locator('#lib .rtext .rl').first().click();
  await expect(page.locator('#lib [data-act=use]')).toBeEnabled();
  await page.locator('#lib [data-act=use]').click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
  await page.locator('#btnSave').click();
  await page.reload();
  await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
  await page.locator('.cuaderno-home-card').filter({hasText:'Cuaderno original 1'})
    .getByRole('button',{name:'Abrir'}).click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
  expect(errors).toEqual([]);
});

test('Examinator original conserva búsqueda, géneros, cabecera y 440px de catálogo',async({page})=>{
  await page.setViewportSize({width:1000,height:900});
  await page.goto('/examinator-cuadernos/');
  await expect(page.locator('#editor .card h3')).toBeVisible();
  page.once('dialog',dialog=>dialog.accept('Cuaderno original 2'));
  await page.locator('#btnNew').click();
  await page.locator('#btnLib').click();
  await expect(page.locator('#lib .lfil input.lf')).toHaveAttribute('placeholder','Autor u obra…');
  await expect(page.locator('#lib .lfil select')).toContainText('Todos los géneros');
  const width=await page.locator('#lib .lcat').evaluate(node=>node.getBoundingClientRect().width);
  expect(width).toBe(440);
  await expect(page.locator('#lib [data-act=dl]')).toHaveText('Descargar las marcadas');
  await expect(page.locator('#lib [data-act=del]')).toHaveText('Eliminar las marcadas');
  await expect(page.locator('#lib .lrow')).not.toHaveCount(0);
  await page.locator('#lib [data-act=close]').click();
  await expect(page.locator('#lib')).toBeHidden();
  await page.locator('#btnLists').click();
  await expect(page.locator('.modal .mh h2')).toHaveText('Banco de textos');
  await page.locator('.modal .mf button').click();
  await expect(page.locator('.modal')).toHaveCount(0);
});

test('cuaderno iniciado desde Examinator: cancelación de nuevo texto no crea preguntas vacías',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  await expect(page.locator('#editor .card')).toBeVisible();
  page.once('dialog',dialog=>dialog.accept('Cuaderno vacío'));
  await page.locator('#btnNew').click();
  await page.locator('#btnLib').click();
  await page.locator('#lib [data-act=close]').click();
  await expect(page.locator('#editor .cuaderno-context-count')).toHaveText('0 textos');
  await page.locator('#btnSave').click();
  await page.reload();
  await page.locator('.cuaderno-home-card').getByRole('button',{name:'Abrir'}).first().click();
  await expect(page.locator('#editor .cuaderno-context-count')).toHaveText('0 textos');
});

test('título, obra y cita separados; tipografía global, menú de vocabulario y añadir desde el editor',async({page})=>{
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/examinator-cuadernos/');
  await expect(page.locator('#editor .card')).toBeVisible();
  page.once('dialog',dialog=>dialog.accept('Cuaderno formato'));
  await page.locator('#btnNew').click();
  await page.locator('#btnLib').click();
  await page.locator('#lib .lf').fill('Eutropio');
  await page.locator('#lib .lrow.have').filter({hasText:'Eutropio'}).first().click();
  await page.locator('#lib .rtext .rl').first().click();
  await page.locator('#lib [data-act=use]').click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
  const head=page.locator('.edition-paper > .edition-paper-head').first();
  await expect(head.locator('.edition-paper-title')).toHaveText('Texto 1');
  await expect(head.locator('.edition-paper-source')).toContainText('Eutropio');
  await expect(head).toHaveCSS('display','block');
  const tabs=page.getByRole('navigation',{name:'Secciones del cuaderno'});
  await expect(tabs.getByRole('button')).toHaveCount(5);
  await expect(tabs).toHaveCSS('position','sticky');
  await tabs.getByRole('button',{name:'Vocabulario'}).click();
  await expect(page.locator('#editor .edition-vocab-add')).toBeVisible();
  const entry=page.locator('#editor .edition-vocab-add');
  await entry.locator('input').nth(0).fill('Caesar, -aris (m.)');
  await entry.locator('input').nth(1).fill('César');
  await entry.getByRole('button',{name:'Añadir entrada'}).click();
  await expect(page.locator('.edition-paper .edition-vocabulary-line').filter({hasText:'César'}))
    .toBeVisible();
  await tabs.getByRole('button',{name:'Formato'}).click();
  await page.getByRole('combobox',{name:'Tipografía'}).selectOption('Georgia');
  const paper=page.locator('.edition-paper').first();
  await expect(paper).toHaveCSS('font-family',/Georgia/);
  await expect(paper.locator('.edition-paper-title')).toHaveCSS('font-family',/Georgia/);
  await expect(paper.locator('.edition-paper-source')).toHaveCSS('font-family',/Georgia/);
  const add=page.locator('#editor .card').getByRole('button',{name:'Biblioteca'});
  await expect(add).toBeVisible();
  await add.click();
  await expect(page.locator('#lib .lhead')).toBeVisible();
});

test('preguntas autocreadas usando bancos docentes sin formulario previo',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  await expect(page.locator('#editor .card')).toBeVisible();
  page.once('dialog',dialog=>dialog.accept('Cuaderno preguntas'));
  await page.locator('#btnNew').click();
  await page.locator('#btnLib').click();
  await page.locator('#lib .lf').fill('Eutropio');
  await page.locator('#lib .lrow.have').filter({hasText:'Eutropio'}).first().click();
  await page.locator('#lib .rtext .rl').first().click();
  await page.locator('#lib [data-act=use]').click();
  await expect(page.locator('.edition-questions > li')).toHaveCount(4);
  const options=page.locator('.edition-paper .edition-choice-options li');
  await expect(options).toHaveCount(4);
  // Una pregunta recién incorporada ha recibido candidatos filológicos:
  // la plantilla literal «Evolución fonética.» no es un ejercicio completo.
  await expect(options.nth(1)).not.toHaveText('Evolución fonética.');
  await expect(options.nth(2)).not.toHaveText('Prefijos.');
  await expect(options.nth(3)).not.toHaveText('Latinismos.');
  await page.locator('#btnSave').click();
  await page.reload();
  await page.locator('.cuaderno-home-card').getByRole('button',{name:'Abrir'}).first().click();
  await expect(page.locator('.edition-paper .edition-choice-options li')).toHaveCount(4);
  await expect(page.locator('.edition-paper .edition-choice-options li').nth(1))
    .not.toHaveText('Evolución fonética.');
});


test('Collatinus original: solo nombres propios/gentilicios de inicio; el resto no se impone',async({page})=>{
  test.setTimeout(120000);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/examinator-cuadernos/');
  await expect(page.locator('#editor .card')).toBeVisible();
  page.once('dialog',d=>d.accept('Cuaderno nombres propios'));
  await page.locator('#btnNew').click();
  await page.locator('#btnLists').click();
  await page.getByRole('button',{name:'Pegar texto propio'}).click();
  const modal=page.locator('.modal');
  await modal.getByRole('textbox',{name:'Título'}).fill('Paso del Rubicón');
  await modal.getByRole('textbox',{name:'Autor'}).fill('Julio César');
  await modal.getByRole('textbox',{name:'Obra'}).fill('Commentarii');
  await modal.getByRole('textbox',{name:'Referencia'}).fill('I 1');
  await modal.getByRole('textbox',{name:'Texto latino'}).fill(
    'Caesar in Gallia est. Milites magna cum cura laborant.');
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
  const chosen=page.locator('.edition-paper .edition-vocabulary-line');
  const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/æ/gi,'ae').toLowerCase();
  await expect.poll(async()=>normalize((await chosen.allTextContents()).join(' ')),{timeout:90000})
    .toContain('caesar');
  const words=(await chosen.allTextContents()).join(' ');
  expect(words.toLowerCase()).not.toContain('milites');
  expect(words.toLowerCase()).not.toContain('laborant');
  await page.getByRole('navigation',{name:'Secciones del cuaderno'})
    .getByRole('button',{name:'Vocabulario'}).click();
  await expect(page.locator('#editor .edition-vocab-row')).not.toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Decisión 1A: títulos por cuaderno, edición propia y sin duplicar tras borrar',async({page})=>{
  test.setTimeout(120000);
  await page.goto('/examinator-cuadernos/');
  await expect(page.locator('#editor .card')).toBeVisible();
  page.once('dialog',dialog=>dialog.accept('Cuaderno A'));
  await page.locator('#btnNew').click();
  const choose=async(line)=>{
    await page.locator('#btnLib').click();
    await page.locator('#lib .lf').fill('Eutropio');
    await page.locator('#lib .lrow.have').filter({hasText:'Eutropio'}).first().click();
    await page.locator('#lib .rtext .rl').nth(line).click();
    // El toast se emite tras completar addText(), su generación académica y
    // la renderización. Collatinus puede sobrescribir enseguida el estado del
    // editor; por eso esperar al mensaje de estado provocaba falsas alarmas.
    const completed=page.locator('.toast').filter({hasText:'Fragmento incorporado al cuaderno.'});
    await expect(completed).toHaveCount(0);
    await page.locator('#lib [data-act=use]').click();
    await expect(completed).toBeVisible({timeout:30000});
  };
  await choose(0);
  await expect(page.locator('.edition-paper-title').first()).toHaveText('Texto 1');
  await choose(1);
  await expect(page.locator('.edition-paper-title').first()).toHaveText('Texto 2');
  const tabs=page.getByRole('navigation',{name:'Secciones del cuaderno'});
  await tabs.getByRole('button',{name:'Organizar'}).click();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('.edition-notebook-row').first().getByRole('button',{name:'Quitar del cuaderno'}).click();
  await expect(page.locator('.edition-notebook-row')).toHaveCount(1);
  await choose(2);
  await expect(page.locator('.edition-paper-title').first()).toHaveText('Texto 3');
  // Segunda libreta: la misma fuente no hereda el número del cuaderno A.
  page.once('dialog',dialog=>dialog.accept('Cuaderno B'));
  await page.locator('#btnNew').click();
  await choose(1);
  await expect(page.locator('.edition-paper-title').first()).toHaveText('Texto 1');
  await tabs.getByRole('button',{name:'Texto'}).click();
  await page.getByRole('textbox',{name:'Título del texto'}).fill('El relato de Eutropio');
  await expect(page.locator('.edition-paper-title').first()).toHaveText('El relato de Eutropio');
  await expect(page.locator('.edition-paper-source').first()).toContainText('Eutropio');
  await choose(2);
  await expect(page.locator('.edition-paper-title').first()).toHaveText('Texto 2');
  await page.locator('#btnSave').click();
});

test('Decisión 1A: pegar texto sugiere Texto N pero conserva título escrito',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  await expect(page.locator('#editor .card')).toBeVisible();
  page.once('dialog',dialog=>dialog.accept('Cuaderno de textos propios'));
  await page.locator('#btnNew').click();
  await page.locator('#btnLists').click();
  await page.getByRole('button',{name:'Pegar texto propio'}).click();
  const modal=page.locator('.modal');
  await expect(modal.getByRole('textbox',{name:'Título'})).toHaveValue('Texto 1');
  await modal.getByRole('textbox',{name:'Título'}).fill('La llegada a Roma');
  await modal.getByRole('textbox',{name:'Texto latino'}).fill('Romam venit.');
  await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  await expect(page.locator('.edition-paper-title').first()).toHaveText('La llegada a Roma');
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
});

test('Safari iPad: conserva fragmento y cita cuando el botón pierde la selección',async({page})=>{
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/examinator-cuadernos/');
  await expect(page.locator('#editor .card')).toBeVisible();
  page.once('dialog',dialog=>dialog.accept('Prueba táctil de selección'));
  await page.locator('#btnNew').click();
  await page.locator('#btnLib').click();
  await page.locator('#lib .lf').fill('Eutropio');
  await page.locator('#lib .lrow.have').filter({hasText:'Eutropio'}).first().click();
  const reader=page.locator('#lib .rtext');
  await expect(reader.locator('.rl').first()).toBeVisible();
  const button=page.locator('#lib [data-act=use]');
  await expect(button).toBeEnabled();
  // Safari/WebKit puede exponer -webkit-user-select sin la propiedad estándar.
  // El test de origen de Examinator2 verifica el CSS; aquí comprobamos la interacción real.
  const expected=await page.evaluate(()=>{
    const rx=document.querySelector('#lib .rtext .rl .rx');
    if(!rx)throw Error('Falta el texto del lector');
    const range=document.createRange();range.selectNodeContents(rx);
    const text=range.toString().trim();
    const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    return text;
  });
  await expect(page.locator('#lib .rsel')).toContainText('Selección:');
  // Simular pérdida de foco iPad al tocar «Usar». La selección viva se pierde,
  // pero la copia textual con la referencia debe permanecer.
  await page.evaluate(()=>{
    const btn=document.querySelector('#lib [data-act=use]');
    btn.dispatchEvent(new Event('touchstart',{bubbles:true}));
    window.getSelection().removeAllRanges();
    document.dispatchEvent(new Event('selectionchange'));
  });
  await expect(button).toBeEnabled();
  await expect(page.locator('#lib .rsel')).toContainText('Selección:');
  await button.click();
  await expect(page.locator('.edition-counter')).toHaveText('Texto 1 de 1');
  await expect(page.locator('.edition-paper .edition-latin').first()).toContainText(expected);
  await expect(page.locator('.edition-paper .edition-paper-source').first()).toContainText('Eutropio');
});

test('Safari iPad: no añade selección antigua tras abrir otra obra',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  await expect(page.locator('#editor .card')).toBeVisible();
  page.once('dialog',dialog=>dialog.accept('Prueba cambio de obra'));
  await page.locator('#btnNew').click();
  await page.locator('#btnLib').click();
  await page.locator('#lib .lf').fill('Eutropio');
  await page.locator('#lib .lrow.have').filter({hasText:'Eutropio'}).first().click();
  await expect(page.locator('#lib .rtext .rl').first()).toBeVisible();
  await page.evaluate(()=>{
    const rx=document.querySelector('#lib .rtext .rl .rx');
    const range=document.createRange();range.selectNodeContents(rx);
    const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await expect(page.locator('#lib .rsel')).toContainText('Selección:');
  await page.locator('#lib .lf').fill('César');
  await page.locator('#lib .lrow.have').filter({hasText:'César'}).first().click();
  await expect(page.locator('#lib .rtext .rl').first()).toBeVisible();
  await expect(page.locator('#lib [data-act=use]')).toBeEnabled();
  await page.evaluate(()=>{
    window.getSelection().removeAllRanges();
    document.dispatchEvent(new Event('selectionchange'));
  });
  await expect(page.locator('#lib .rsel')).not.toContainText('Selección:');
  await page.locator('#lib [data-act=use]').click();
  await expect(page.locator('.edition-counter')).toHaveText('Sin textos');
  await expect(page.locator('#lib .lhead')).toBeVisible();
});


test('iPhone: Inicio usa tarjetas y no reabre automáticamente el último cuaderno',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/examinator-cuadernos/');
  await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
  const selector=page.getByRole('combobox',{name:'Elegir cuaderno',exact:true});
  await expect(selector).toHaveCount(0);
  for(const title of ['Cuaderno primero','Cuaderno segundo']){
    page.once('dialog',dialog=>dialog.accept(title));
    await page.locator('#btnNew').click();
    await expect(selector.locator('option:checked')).toContainText(title);
  }
  const first=await selector.locator('option').filter({hasText:'Cuaderno primero'}).getAttribute('value');
  await selector.selectOption(first);
  await expect(selector.locator('option:checked')).toContainText('Cuaderno primero');
  await page.reload();
  await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
  await expect(selector).toHaveCount(0);
  await page.locator('.cuaderno-home-card').filter({hasText:'Cuaderno primero'})
    .getByRole('button',{name:'Abrir'}).click();
  await expect(selector.locator('option:checked')).toContainText('Cuaderno primero');
});

test('WebKit: el cuaderno experimental recarga y analiza Collatinus sin red',async({page,baseURL})=>{
  // Simular una caída del servidor. setOffline corta WebKit antes del service worker.
  let disconnected=false;
  const proxy=createServer((incoming,outgoing)=>{
    if(disconnected){incoming.socket.destroy();return;}
    const forward=request(new URL(incoming.url,baseURL),response=>{
      outgoing.writeHead(response.statusCode,response.headers);
      response.pipe(outgoing);
    });
    forward.on('error',()=>outgoing.destroy());
    forward.end();
  });
  await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
  try{
    const url='http://127.0.0.1:'+proxy.address().port+'/CuadernoTextosLatinos/examinator-cuadernos/';
    await page.goto(url);
    const selector=page.getByRole('combobox',{name:'Elegir cuaderno',exact:true});
    await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
    await page.waitForFunction(()=>navigator.serviceWorker.controller?.scriptURL
      .endsWith('/examinator-cuadernos/service-worker.js'));
    page.once('dialog',dialog=>dialog.accept('Cuaderno offline'));
    await page.locator('#btnNew').click();
    await page.getByRole('button',{name:'Pegar texto',exact:true}).click();
    await page.getByRole('textbox',{name:'Texto latino'}).fill('Amatus est.');
    await page.getByRole('button',{name:'Añadir al cuaderno'}).click();
    await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
    await page.locator('#btnSave').click();
    await expect(page.getByText('Cuaderno guardado.',{exact:true})).toBeVisible();

    disconnected=true;
    await page.reload();
    await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
    await page.locator('.cuaderno-home-card').filter({hasText:'Cuaderno offline'})
      .getByRole('button',{name:'Abrir'}).click();
    await expect(selector.locator('option:checked')).toContainText('Cuaderno offline');
    await page.getByRole('button',{name:'Etiquetas gramaticales',exact:true}).click();
    await page.getByRole('button',{name:'Analizar etiquetas con Collatinus'}).click();
    await expect(page.getByText('Amatus est · Voz pasiva · Pendiente',{exact:true})).toBeVisible();
  }finally{
    proxy.closeAllConnections();
    await new Promise(resolve=>proxy.close(resolve));
  }
});
