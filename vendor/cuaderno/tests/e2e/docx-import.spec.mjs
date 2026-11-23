import {test,expect} from '@playwright/test';
import {deflateRawSync} from 'node:zlib';

/** ZIP DOCX comprimido de un fichero, sin librerías de terceros. */
function sampleDocx(xml){
  const name=Buffer.from('word/document.xml'),source=Buffer.from(xml,'utf8');
  const zipped=deflateRawSync(source);
  const local=Buffer.alloc(30+name.length),central=Buffer.alloc(46+name.length),tail=Buffer.alloc(22);
  local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);
  local.writeUInt16LE(8,8);local.writeUInt32LE(zipped.length,18);
  local.writeUInt32LE(source.length,22);local.writeUInt16LE(name.length,26);
  name.copy(local,30);
  central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);
  central.writeUInt16LE(20,6);central.writeUInt16LE(8,10);
  central.writeUInt32LE(zipped.length,20);central.writeUInt32LE(source.length,24);
  central.writeUInt16LE(name.length,28);name.copy(central,46);
  tail.writeUInt32LE(0x06054b50,0);tail.writeUInt16LE(1,8);
  tail.writeUInt16LE(1,10);tail.writeUInt32LE(central.length,12);
  tail.writeUInt32LE(local.length+zipped.length,16);
  return Buffer.concat([local,zipped,central,tail]);
}
function p(parts){
  return '<w:p>'+parts.map(part=>{
    const txt=typeof part==='string'?part:part.text;
    const u=typeof part==='string'?'':part.under?'<w:rPr><w:u w:val="single"/></w:rPr>':'';
    return '<w:r>'+u+'<w:t xml:space="preserve">'+txt+'</w:t></w:r>';
  }).join('')+'</w:p>';
}
function documentXml(){
  return '<?xml version="1.0"?>'+
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+
    [
      p(['Texto de repaso\tLatín II']),
      p(['Nombre y apellidos:       Fecha:']),
      p(['Los romanos envían legados a Ptolomeo prometiéndole ayuda']),
      p(['Eutropio, Breviarium III 1']),
      p(['Finito igitur Punico bello, quod per XXIII annos ',
        {text:'tractum est',under:true},', Romani iam ',
        {text:'clarissima',under:true},' gloria ',
        {text:'noti',under:true},', legatos miserunt auxilia promittentes ',
        {text:'ei',under:true},' in Aegyptum, quia rex Syriæ Antiochus bellum ei intulerat.']),
      p(['Vocabulario']),
      p(['Ægyptus, −ī: ‘Egipto’']),
      p(['Aegyptus, −ī: ‘Egipto’']),
      p(['Sўrĭa, −æ: ‘Siria’ (provincia romana)']),
      p(['grātĭās ăgĕre: “dar las gracias”']),
      p(['Traducción del texto. (4p.)']),
      p(['Análisis sintáctico del texto. (1p.)']),
      p(['Análisis morfológico de las palabras subrayadas. (1p.)']),
      p(['Elige dos de estas tres preguntas (2p.):']),
      p(['Modificación preverbial a partir de A (3) y de B (2).']),
      p(['Evolución fonética de A, B, C y D.']),
      p(['Señala el prefijo y el significado que aporta a estas palabras: A, B, C, D.']),
    ].join('')+'</w:body></w:document>';
}
test('iPad: importar DOCX offline con subrayados, vocabulario y latinismos generados',async({page})=>{
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/examinator-cuadernos/');
  await expect(page.locator('#editor .card')).toBeVisible();
  page.once('dialog',dialog=>dialog.accept('Cuaderno de importación'));
  await page.locator('#btnNew').click();
  const chooser=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'Importar Word',exact:true}).click();
  await (await chooser).setFiles({name:'eutropio.docx',
    mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer:sampleDocx(documentXml())});
  // Parsear DOCX en Safari puede tardar más de los 5 s del timeout global
  // en CI; seguimos exigiendo que el botón aparezca y el archivo sea válido.
  await expect(page.getByRole('button',{name:'Incorporar al cuaderno'}))
    .toBeVisible({timeout:15000});
  await expect(page.getByText('4 subrayados · 4 entradas reales de vocabulario.')).toBeVisible();
  await page.getByRole('button',{name:'Incorporar al cuaderno'}).click();
  await expect(page.locator('.edition-paper-title')).toHaveText(
    'Los romanos envían legados a Ptolomeo prometiéndole ayuda',{timeout:30000});
  await expect(page.locator('.edition-paper-source')).toContainText('Eutropio');
  await expect(page.locator('.edition-underlined')).toHaveCount(4);
  await page.getByRole('button',{name:'Vocabulario',exact:true}).click();
  await expect.poll(()=>page.locator('.edition-vocab-row').count(),{timeout:110000}).toBeGreaterThan(3);
  const vocabularyLines=page.locator('.edition-vocabulary-line');
  await expect(vocabularyLines.filter({hasText:/Egipto/i})).toHaveCount(1);
  const syria=vocabularyLines.filter({hasText:/Siria/i});
  await expect(syria).toHaveCount(1);
  await expect(syria).toContainText('Sўrĭa, −æ');
  const syriaHeads=page.locator('.edition-vocab-headword');
  expect(await syriaHeads.evaluateAll(inputs=>inputs.map(input=>input.value)
    .filter(value=>/^s[yу]ria(?:e|m)?$/i.test(value.split(',')[0].normalize('NFD')
      .replace(/\p{M}/gu,'').replaceAll('æ','ae').trim())))).toEqual(['Sўrĭa, −æ']);
  await expect(syria).toContainText('provincia romana');
  const edition=page.locator('.edition-paper').first();
  await expect(edition).toContainText('Latinismos');
  await expect(edition.locator('.edition-choice-options > li')).toHaveCount(4);
  // No basta con crear el encabezado: latinismos ha de recibir términos del banco.
  await expect(edition.locator('.edition-choice-options > li').nth(3).locator('em')).toHaveCount(4);
  await expect(edition).not.toContainText('A, B, C y D');
});

test('Salustio sin vocabulario en Word: analizar todo el pasaje sin marcar palabras comunes',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/examinator-cuadernos/');
  await expect(page.locator('#editor .card')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
  page.once('dialog',dialog=>dialog.accept('Cuaderno de Salustio'));
  await page.locator('#btnNew').click();
  const latin='Omnis homines qui sese student praestare ceteris animalibus summa ope niti decet.';
  const xml='<?xml version="1.0"?>'+
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+
    p(['Texto de repaso'])+p(['Nombre:     Fecha:'])+
    p(['Salustio. Reflexión inicial'])+p(['Salustio, Bellum Catilinae I 1'])+
    p([latin])+p(['Vocabulario'])+p(['Traducción del texto. (4p.)'])+
    p(['Análisis sintáctico del texto. (1p.)'])+
    p(['Análisis morfológico de las palabras subrayadas. (1p.)'])+
    '</w:body></w:document>';
  const choose=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'Importar Word',exact:true}).click();
  await (await choose).setFiles({name:'salustio.docx',
    mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer:sampleDocx(xml)});
  await expect(page.getByText(/0 entradas reales de vocabulario/)).toBeVisible();
  await page.getByRole('button',{name:'Incorporar al cuaderno'}).click();
  await expect(page.locator('.edition-latin')).toContainText('Omnis homines');
  const tabs=page.getByRole('navigation',{name:'Secciones del cuaderno'});
  await tabs.getByRole('button',{name:'Vocabulario'}).click();
  await expect(page.getByRole('button',{name:/Buscar otras formas/})).toBeVisible();
  await expect.poll(()=>page.locator('.edition-vocab-headword').count(),
    {timeout:110000}).toBeGreaterThan(5);
  await expect(page.locator('.edition-vocab-include:checked')).toHaveCount(0);
  // Edición en filas, no una tarjeta apilada por lema.
  const newWord=page.getByRole('textbox',{name:'Enunciado nuevo'});
  await newWord.fill('animal, -alis');
  await page.getByRole('textbox',{name:'Traducción nueva'}).fill('animal');
  await page.getByRole('button',{name:'Añadir entrada'}).click();
  await expect(page.locator('.edition-vocab-row').filter({has:page.getByRole('textbox',{name:'Enunciado de animal, -alis'})})).toBeVisible();
  const newRow=page.locator('.edition-vocab-row').filter({has:page.getByRole('textbox',{name:'Enunciado de animal, -alis'})});
  await expect(newRow.locator('.edition-vocab-meaning')).toHaveValue('animal');
  const metrics=await page.evaluate(()=>{
    const paper=document.querySelector('.edition-paper');
    const latin=paper?.querySelector('.edition-latin');
    const vocab=paper?.querySelector('.edition-vocabulary');
    const heading=paper?.querySelector('.edition-question:last-child > strong');
    const sub=paper?.querySelector('.edition-choice-options > li');
    if(!latin||!vocab||!heading||!sub)throw Error('Falta el texto o un apartado');
    return {
      latinLineHeight:parseFloat(getComputedStyle(latin).lineHeight),
      spaceAfterLatin:vocab.getBoundingClientRect().top-latin.getBoundingClientRect().bottom,
      headingFont:parseFloat(getComputedStyle(heading).fontSize),
      subFont:parseFloat(getComputedStyle(sub).fontSize),
    };
  });
  expect(metrics.latinLineHeight).toBeCloseTo(20.8,0); // (10,5×1,2 + 3) pt
  expect(metrics.spaceAfterLatin).toBeGreaterThanOrEqual(0);
  expect(metrics.spaceAfterLatin).toBeLessThan(12);
  expect(Math.abs(metrics.headingFont-metrics.subFont)).toBeLessThan(0.5);
  // WebKit en Linux puede no exponer webkitTextSizeAdjust en CSSStyleDeclaration.
  // Comprobamos la regla realmente servida al navegador y la igualdad de tamaños
  // de letra medida arriba, sin depender de una API CSSOM no portable.
  const cssDeclarations=await page.locator('link[rel="stylesheet"]').evaluateAll(async links=>
    Promise.all(links.map(async link=>{
      const response=await fetch(link.href);
      if(!response.ok)throw Error('No se ha podido cargar '+link.href);
      return response.text();
    })));
  const paperRules=cssDeclarations
    .flatMap(css=>[...css.matchAll(/\.edition-paper\s*\{([^}]*)\}/g)].map(match=>match[1]));
  expect(paperRules.some(rule=>
    /(?:^|;)\s*-webkit-text-size-adjust\s*:\s*100%\s*;/.test(rule) &&
    /(?:^|;)\s*text-size-adjust\s*:\s*100%\s*;?/.test(rule)
  )).toBe(true);
  await tabs.getByRole('button',{name:'Formato'}).click();
  await expect(page.getByRole('spinbutton',{name:'Espacio adicional entre líneas (pt)'})).toHaveValue('3');
  const spacing=page.getByRole('spinbutton',{name:'Espacio adicional entre líneas (pt)'});
  await spacing.fill('0.9');
  const lineHeight=()=>page.locator('.edition-latin').evaluate(el=>parseFloat(getComputedStyle(el).lineHeight));
  const compactHeight=await lineHeight();
  await spacing.fill('5');
  expect(await lineHeight()-compactHeight).toBeCloseTo((5-.9)*4/3,1);
  await tabs.getByRole('button',{name:'Vocabulario'}).click();
  await page.locator('#btnSave').click();
  await expect(page.getByText('Cuaderno guardado.',{exact:true})).toBeVisible();
  await page.reload();
  await page.locator('.cuaderno-home-card').filter({hasText:'Cuaderno de Salustio'})
    .getByRole('button',{name:'Abrir'}).click();
  await tabs.getByRole('button',{name:'Vocabulario'}).click();
  await expect(page.getByRole('textbox',{name:'Traducción de animal, -alis'})).toHaveValue('animal');
});

test('selecciona varios Word y conserva el orden de los textos en un solo cuaderno',async({page})=>{
  await page.setViewportSize({width:390,height:740});
  await page.goto('/examinator-cuadernos/');
  await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
  page.once('dialog',dialog=>dialog.accept('Cuaderno por lotes'));
  await page.locator('#btnNew').click();
  const chooser=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'Importar Word',exact:true}).click();
  const file=name=>({name,mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer:sampleDocx(documentXml())});
  await (await chooser).setFiles([file('primero.docx'),file('segundo.docx')]);
  const modal=page.locator('.modal').last();
  await expect(modal.locator('.word-review-item')).toHaveCount(2);
  const first=modal.locator('.word-review-item').nth(0);
  const second=modal.locator('.word-review-item').nth(1);
  await first.locator('summary').first().click();
  await first.getByRole('textbox',{name:'Título del texto'}).fill('Entrada primera');
  await second.locator('summary').first().click();
  await second.getByRole('textbox',{name:'Título del texto'}).fill('Entrada segunda');
  await expect(modal.locator('.mf').getByRole('button',{name:'Incorporar 2 textos'})).toBeInViewport();
  await modal.getByRole('button',{name:'Incorporar 2 textos'}).click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 2 de 2');
  await expect(page.getByRole('combobox',{name:'Ir a texto del cuaderno'}).locator('option')).toHaveText([
    'Entrada primera','Entrada segunda',
  ]);
});


test('Banco propio: importa varios DOCX sin cuaderno y conserva marcas y vocabulario al reutilizar',async({page})=>{
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/examinator-cuadernos/');
  const bank=page.locator('.cuaderno-home-bank');
  const chooser=page.waitForEvent('filechooser');
  await bank.getByRole('button',{name:'Importar Word al banco'}).click();
  await (await chooser).setFiles([
    {name:'primero.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer:sampleDocx(documentXml())},
    {name:'segundo.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer:sampleDocx(documentXml().replace('Finito igitur','Postremo igitur'))},
  ]);
  const modal=page.locator('.modal').last();
  await expect(modal.locator('.word-review-item')).toHaveCount(2);
  await modal.getByRole('button',{name:'Guardar 2 textos en el banco'}).click();
  await expect(bank).toContainText('2 textos distintos');
  const data=await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    const x=(await new IndexedDbCorpusRepository().load()).corpus.texts;
    return x.map(t=>({title:t.title,underlines:t.teacherDocx?.underlines.length,
      vocabulary:t.teacherDocx?.vocabulary.length,lexical:t.teacherDocx?.lexical.phonetics.length}));
  });
  expect(data).toHaveLength(2);
  expect(data.every(x=>x.underlines===4 && x.vocabulary===4)).toBe(true);
  // Las etiquetas confirmadas en el banco deben pasar a la aparición,
  // incluso cuando el Word lleva subrayados y vocabulario.
  await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    const {attachGrammarTags}=await import('/core/grammar-tags.js');
    const repository=new IndexedDbCorpusRepository();
    const saved=await repository.load();
    const next=attachGrammarTags(saved.corpus,saved.corpus.texts[0].id,['gram.voz.pasiva']);
    await repository.save(next,saved.revision);
  });
  page.once('dialog',d=>d.accept('Cuaderno que reutiliza Word'));
  await page.locator('#btnNew').click();
  await page.getByRole('button',{name:'Banco propio'}).click();
  const listing=page.locator('.modal').last();
  await listing.getByRole('button',{name:/Añadir «Los romanos envían legados/}).first().click();
  await expect(page.locator('.edition-counter')).toContainText('Texto 1 de 1');
  await expect(page.locator('.edition-underlined')).toHaveCount(4);
  await expect(page.locator('.edition-vocabulary-line').filter({hasText:'Egipto'})).toHaveCount(1);
  expect(await page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    const saved=(await new WorkspaceRepository().listEditions())
      .find(n=>n.edition.title==='Cuaderno que reutiliza Word');
    return saved?.edition.placements[0]?.grammaticalTagIds.includes('gram.voz.pasiva');
  })).toBe(true);
});


test('Banco propio: omite DOCX inválidos y guarda los archivos posteriores',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  const bank=page.locator('.cuaderno-home-bank');
  const chooser=page.waitForEvent('filechooser');
  await bank.getByRole('button',{name:'Importar Word al banco'}).click();
  const docx=(name,xml)=>({name,mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer:sampleDocx(xml)});
  await (await chooser).setFiles([
    docx('primero.docx',documentXml()),
    docx('glosa-larga.docx',documentXml().replace('Finito igitur','Postremo igitur')
      .replaceAll('Egipto','a'.repeat(2001))),
    {name:'dañado.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer:Buffer.from('No es un DOCX')},
    docx('último.docx',documentXml().replace('Finito igitur','Denique igitur')),
  ]);
  await page.getByRole('button',{name:'Guardar 3 textos en el banco'}).click();
  const report=page.locator('.modal').filter({hasText:'Resultado de la importación Word'});
  await expect(report).toContainText('2 archivos guardados · 2 omitidos');
  const failures=report.locator('.word-import-errors li');
  await expect(failures).toHaveText([/dañado\.docx/,/glosa-larga\.docx.*meaning.*2000/]);
  await report.getByRole('button',{name:'Cerrar',exact:true}).click();
  await expect(bank).toContainText('2 textos distintos');
  await page.reload();
  await expect(bank).toContainText('2 textos distintos');
  const texts=await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    return (await new IndexedDbCorpusRepository().load()).corpus.texts.map(text=>text.latin);
  });
  expect(texts).toEqual([expect.stringContaining('Finito igitur'),expect.stringContaining('Denique igitur')]);
});


test('Banco: ocho Word históricos, siete textos válidos y un marcador rechazado',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  const bank=page.locator('.cuaderno-home-bank');
  const chooser=page.waitForEvent('filechooser');
  await bank.getByRole('button',{name:'Importar Word al banco'}).click();

  // Reproducción estructural de los ocho Word aportados, sin publicar los
  // documentos personales originales como archivos del repositorio.
  const examples=[
    ['antiguo examen 1a ev.docx','Eutropio, Breviarium VII 2','Fugatus Antonius amisso exercitu confugit ad Lepidum.'],
    ['antiguo examen b 1a ev.docx','Julio César, De bello Gallico V 22','Cassivellaunus hoc proelio nuntiato legatos ad Caesarem mittit.'],
    ['cesar.docx','Julio César, De bello civili I 18','Caesar eas cohortes cum exercitu suo coniunxit.'],
    ['eutrop.docx','Eutropio, Breviarium III','Anno quarto postquam ad Italiam Hannibal venit Marcellus consul pugnavit.'],
    ['eutropio2.docx','Eutropio, Breviarium VI 23 (bis)','Duces autem Romani erant Cornelius Scipio et Cornelius Faustus.'],
    ['nepote.docx','Cornelio Nepote, Milcíades VII','Texto'],
    ['nepote adaptado.docx','Adaptado de Cornelio Nepote, Milcíades III','In his fuit tum Miltiades. Hic hortatus est pontis custodes.'],
    ['nepote otro.docx','Cornelio Nepote, Milcíades III','Eisdem temporibus Persarum rex Darius Scythis bellum inferre decrevit.'],
  ];
  const xml=(source,latin,i)=>
    '<?xml version="1.0"?>'+
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+
    [
      p(['Texto de repaso Latín II']),p(['Nombre y apellidos: Fecha:']),
      p(['Pasaje '+i]),p([source]),p([latin]),p(['Vocabulario']),p(['A']),
      p(['Traducción del texto. (4p.)']),
      p(['Análisis sintáctico del texto. (1p.)']),
      p(['Análisis morfológico de las palabras subrayadas. (1p.)']),
      p(['Elige dos de estas tres preguntas (2p.):']),
      p(['Modificación preverbial a partir de A (3) y de B (2).']),
      p(['Evolución fonética de A, B, C y D.']),
      p(['Señala el prefijo y el significado que aporta a estas palabras: A, B, C, D.']),
    ].join('')+'</w:body></w:document>';
  await (await chooser).setFiles(examples.map(([name,source,latin],i)=>({
    name,mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer:sampleDocx(xml(source,latin,i)),
  })));
  const modal=page.locator('.modal').last();
  await expect(modal.locator('.word-review-item')).toHaveCount(7);
  await expect(modal.locator('.word-import-errors')).toContainText('nepote.docx');
  await expect(modal.locator('.word-import-errors')).toContainText('marcador «Texto»');
  await expect(modal).toContainText('pasaje adaptado');
  await modal.getByRole('button',{name:'Guardar 7 textos en el banco'}).click();
  const report=page.locator('.modal').filter({hasText:'Resultado de la importación Word'});
  await expect(report).toContainText('7 archivos guardados · 1 omitido');
  await report.getByRole('button',{name:'Cerrar',exact:true}).click();
  await expect(bank).toContainText('7 textos distintos');
  const texts=await page.evaluate(async()=>{
    const {IndexedDbCorpusRepository}=await import('/storage/indexeddb-corpus-repository.js');
    return (await new IndexedDbCorpusRepository().load()).corpus.texts.map(x=>({
      author:x.source.author,work:x.source.work,reference:x.source.reference,
      latin:x.latin,adapted:x.teacherDocx?.warnings.some(s=>s.includes('pasaje adaptado')),
    }));
  });
  expect(texts).toHaveLength(7);
  expect(texts).not.toContainEqual(expect.objectContaining({latin:'Texto'}));
  expect(texts).toContainEqual(expect.objectContaining({
    author:'Cornelio Nepote',work:'Milcíades',reference:'III',adapted:true,
  }));
  expect(texts).toContainEqual(expect.objectContaining({
    author:'Eutropio',work:'Breviarium',reference:'VI 23 (bis)',
  }));
});
