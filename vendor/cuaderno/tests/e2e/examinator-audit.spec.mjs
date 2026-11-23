import {test,expect} from '@playwright/test';

test('Revisar cuaderno protege la palabra docente y permite sustituir la otra aparición',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  await expect(page.getByRole('heading',{name:'Mis cuadernos'})).toBeVisible();
  page.once('dialog',dialog=>dialog.accept('Repeticiones'));
  await page.locator('#btnNew').click();
  for(const [title,latin] of [['Pasaje uno','Caesar Galliam vicit.'],['Pasaje dos','Roma urbs vetus est.']]){
    await page.getByRole('button',{name:'Pegar texto',exact:true}).click();
    const modal=page.locator('.modal').last();
    await modal.getByRole('textbox',{name:'Título'}).fill(title);
    await modal.getByRole('textbox',{name:'Texto latino'}).fill(latin);
    await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
    await expect(page.locator('.edition-counter')).toContainText(title==='Pasaje uno'?'Texto 1 de 1':'Texto 2 de 2');
  }
  await expect.poll(()=>page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    const [state]=await new WorkspaceRepository().listEditions();
    return state.edition.placements.filter(p=>p.vocabulary.some(v=>v.collatinusSource)).length;
  })).toBe(2);
  const fixture=await page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    const repository=new WorkspaceRepository();
    const [state]=await repository.listEditions();
    const now=new Date().toISOString();
    const optionOf=(p,kind)=>p.questions.find(q=>q.kind==='choice').options.find(o=>o.kind===kind);
    const prefixOf=p=>optionOf(p,'prefix');
    const first=prefixOf(state.edition.placements[0]).slots[0];
    const second=prefixOf(state.edition.placements[1]).slots[0];
    await repository.commitEdition(state.edition.id,state.revision,
      {command:'test.repetition',targetId:second.id,timestamp:now},edition=>{
        const a=prefixOf(edition.placements[0]).slots[0];
        Object.assign(a,{origin:'manual',locked:true,provenance:null});
        const b=prefixOf(edition.placements[1]).slots[0];
        Object.assign(b,{value:first.value,proposedLemmaId:first.proposedLemmaId,provenance:first.provenance});
        const firstBase=optionOf(edition.placements[0],'preverb');
        firstBase.preverbBasesProtected=true;
        Object.assign(optionOf(edition.placements[1],'preverb'),{
          preverbBaseIds:firstBase.preverbBaseIds,statement:firstBase.statement,
        });
        return {...edition,updatedAt:now};
      });
    return {first:first.id,second:second.id,word:first.value};
  });
  await page.reload();
  await page.locator('.cuaderno-home-card').filter({hasText:'Repeticiones'})
    .getByRole('button',{name:'Abrir'}).click();
  await expect(page.locator('.edition-repetition-notice')).toContainText('Repeticiones:');
  const audit=page.getByText('Revisar cuaderno',{exact:true});
  await audit.click();
  await expect(page.locator('.edition-audit')).toContainText('Pasaje uno (protegida)');
  await page.getByRole('button',{name:/Pasaje dos · Sustituir por/}).click();
  const readSlots=()=>page.evaluate(async fixture=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    const [state]=await new WorkspaceRepository().listEditions();
    const slots=state.edition.placements.flatMap(p=>p.questions.flatMap(q=>q.kind==='choice'
      ?q.options.flatMap(o=>o.slots):[]));
    return {
      first:slots.find(s=>s.id===fixture.first),second:slots.find(s=>s.id===fixture.second),
    };
  },fixture);
  await expect.poll(async()=>(await readSlots()).second.value).not.toBe(fixture.word);
  const result=await readSlots();
  expect(result.first.value).toBe(fixture.word);
  expect(result.first.locked).toBe(true);
  expect(result.second.value).not.toBe(fixture.word);
  await audit.click();
  await expect(page.locator('.edition-audit')).toContainText('Base preverbial repetida');
  await expect(page.locator('.edition-audit')).toContainText('Pasaje uno · Bases protegidas');
  await page.getByRole('button',{name:/Pasaje dos · Sustituir bases por/}).click();
  await expect(page.locator('.edition-repetition-notice')).toHaveCount(0);
  const pair=await page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    const [state]=await new WorkspaceRepository().listEditions();
    return state.edition.placements.map(p=>p.questions.find(q=>q.kind==='choice')
      .options.find(o=>o.kind==='preverb'));
  });
  expect(new Set(pair.flatMap(o=>o.preverbBaseIds)).size).toBe(4);
  expect(pair[0].preverbBasesProtected).toBe(true);
  expect(pair[1].statement.value).toMatch(/\(3\).*\(2\)/);
});


test('Fase 5: auditar la misma palabra en categorías diferentes sin modificar el cuaderno',async({page})=>{
  await page.goto('/examinator-cuadernos/');
  page.once('dialog',dialog=>dialog.accept('Auditoría interapartados'));
  await page.locator('#btnNew').click();
  for(const [title,latin] of [
    ['Pasaje primero','Caesar exercitum ducit.'],
    ['Pasaje segundo','Roma in Italia est.'],
  ]){
    await page.getByRole('button',{name:'Pegar texto',exact:true}).click();
    const modal=page.locator('.modal').last();
    await modal.getByRole('textbox',{name:'Título'}).fill(title);
    await modal.getByRole('textbox',{name:'Texto latino'}).fill(latin);
    await modal.getByRole('button',{name:'Añadir al cuaderno'}).click();
  }
  await expect(page.locator('.edition-counter')).toContainText('Texto 2 de 2');
  await expect.poll(()=>page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    const [state]=await new WorkspaceRepository().listEditions();
    return state.edition.placements.filter(p=>p.vocabulary.some(v=>v.collatinusSource)).length;
  })).toBe(2);
  // Detener procesos de enriquecimiento de la página antes del commit CAS externo.
  await page.reload();
  await page.evaluate(async()=>{
    const {WorkspaceRepository}=await import('/storage/workspace-repository.js');
    const repository=new WorkspaceRepository();
    const [state]=await repository.listEditions();
    const timestamp=new Date().toISOString();
    await repository.commitEdition(state.edition.id,state.revision,
      {command:'test.repetition-across-kinds',targetId:state.edition.id,timestamp},original=>{
        const edition=structuredClone(original);
        const choice=(placement)=>placement.questions.find(q=>q.kind==='choice');
        const first=choice(edition.placements[0]).options.find(o=>o.kind==='prefix').slots[0];
        const second=choice(edition.placements[1]).options.find(o=>o.kind==='latinism').slots[0];
        Object.assign(second,{value:first.value,proposedLemmaId:first.proposedLemmaId,
          provenance:first.provenance,origin:'generated',locked:false});
        edition.updatedAt=timestamp;
        return edition;
      });
  });
  await page.reload();
  await page.locator('.cuaderno-home-card').filter({hasText:'Auditoría interapartados'})
    .getByRole('button',{name:'Abrir'}).click();
  await expect(page.locator('.edition-repetition-notice')).toContainText('Repeticiones:');
  await page.getByRole('navigation',{name:'Secciones del cuaderno'})
    .getByRole('button',{name:'Organizar'}).click();
  await page.getByText('Revisar cuaderno',{exact:true}).click();
  const audit=page.locator('.edition-audit');
  await expect(audit).toContainText('Pasaje primero');
  await expect(audit).toContainText('Pasaje segundo');
  await expect(audit).toContainText('Latinismos');
  await expect(audit).toContainText('Prefijos');
});
