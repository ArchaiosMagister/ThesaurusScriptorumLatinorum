/**
 * Interfaz simplificada según el flujo docente de Examinator2.
 *
 * Solo dos lugares: Textos (seleccionar -> editar -> ver A4) y
 * Preparar cuaderno (elegir subset -> recuento gramatical -> Word/PDF).
 * Reutiliza el modelo, bancos, importadores y exportadores existentes.
 * La interfaz anterior se conserva, accesible de forma expresa.
 */
import {foldLatin,searchWorks,findCitation,
  type LibraryEntry,type LibraryWork} from '../core/library.js';
import {readReaderSelection,type ReaderFragment} from './reader-selection.js';
import {upsertText,deleteText,type TextDraft} from '../core/editor-operations.js';
import {createBackup} from '../core/backup.js';
import {createEditionPane,WORKING_EDITION_ID} from './edition-app.js';
import {IndexedDbCorpusRepository} from '../storage/indexeddb-corpus-repository.js';
import {WorkspaceRepository,type EditionSnapshotV1} from '../storage/workspace-repository.js';
import {allGrammarTags,attachGrammarTags,findTagByLabel,GRAMMAR_GROUP_IDS,
  matchesGrammarTag,isCustomTagLabelValid} from '../core/grammar-tags.js';
import {summarizeSelection} from '../core/notebook-selection.js';
import type {CorpusSnapshot} from '../ports/corpus-repository.js';
import type {GrammarTag,LatinText} from '../core/model.js';

const corpusRepository=new IndexedDbCorpusRepository();
const workspace=new WorkspaceRepository();
const collator=new Intl.Collator('es',{sensitivity:'base'});
type Stage='texts'|'prepare';
type TextMode='editor'|'authors'|'manual';
type SourceForm={title:string;author:string;work:string;reference:string;latin:string};
const emptyForm=():SourceForm=>({title:'',author:'',work:'',reference:'',latin:''});

function el<K extends keyof HTMLElementTagNameMap>(name:K,className='',text=''):HTMLElementTagNameMap[K]{
  const item=document.createElement(name);
  if(className)item.className=className;
  if(text)item.textContent=text;
  return item;
}
function button(label:string,clicked:()=>void|Promise<void>,cls='btn btn-outline'):HTMLButtonElement{
  const b=el('button',cls,label);b.type='button';
  b.addEventListener('click',()=>{void clicked();});
  return b;
}
function labelled(label:string,value:string,update:(s:string)=>void,multiline=false):HTMLElement{
  const wrap=el('label','simple-field');
  wrap.append(el('span','',label));
  const input=multiline?el('textarea','field-control'):el('input','field-control');
  input.value=value;if(multiline)(input as HTMLTextAreaElement).rows=9;
  input.addEventListener('input',()=>update(input.value));
  wrap.append(input);return wrap;
}
function backupDownload(content:string,name:string):void{
  const url=URL.createObjectURL(new Blob([content],{type:'application/json;charset=utf-8'}));
  const anchor=el('a');anchor.href=url;anchor.download=name;
  document.body.append(anchor);anchor.click();anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),30000);
}

export function mountSimpleApp(root:HTMLElement):void{
  const composer=createEditionPane({autoApply:true});
  let stage:Stage='texts',textMode:TextMode='editor';
  let snapshot:CorpusSnapshot|null=null,catalogue:LibraryEntry[]=[];
  let editions:EditionSnapshotV1[]=[];
  let activeTextId:string|null=null;
  let selectedEditionId:string|null=null;
  let selectedIds:string[]=[];
  let selectionInitialized=false;
  let working=false,tagPanelOpen=false;
  let feedback='Selecciona un texto para empezar.',isError=false;
  let textSearch='',authorSearch='',authorFilter='all';
  let collectionSearch='';
  let work:LibraryWork|null=null;
  const works=new Map<string,LibraryWork>();
  let readerSelection:ReaderFragment|null=null;
  let preservingSelection=false;
  let form=emptyForm(),notebookTitle='Cuaderno de textos latinos';

  function message(value:string,error=false):void{
    feedback=value;isError=error;
    const target=root.querySelector<HTMLElement>('.simple-status');
    if(target){target.textContent=feedback;target.dataset.error=String(isError);}
  }
  function getActiveText():LatinText|undefined{
    return snapshot?.corpus.texts.find(t=>t.id===activeTextId);
  }
  async function chooseText(id:string):Promise<void>{
    if(working)return;
    working=true;
    try{
      if(!await composer.openSourceText(id))throw Error('El editor no ha podido abrir este texto.');
      activeTextId=id;textMode='editor';stage='texts';
      message('Texto añadido. Edita sus preguntas, el latín y el vocabulario; la vista previa está al lado.');
      render();
    }catch(error){message('No se pudo seleccionar el texto: '+String(error),true);}
    finally{working=false;}
  }

  async function removeSourceText(id:string):Promise<void>{
    if(working)return;
    const entry=snapshot?.corpus.texts.find(x=>x.id===id);
    if(!entry)return;
    const prepared=editions.filter(e=>e.edition.id!==WORKING_EDITION_ID&&
      e.edition.placements.some(p=>p.source.sourceId===id)).length;
    const description='¿Eliminar «'+entry.title+'» del banco de textos?'+
      (prepared?' Se conservarán sus copias en '+prepared+' cuaderno(s) preparados.':'')+
      ' Esta acción no se puede deshacer desde «Textos».';
    if(!window.confirm(description))return;
    if(!await composer.flush())return;
    working=true;
    try{
      const original=await corpusRepository.load();
      if(!original.corpus.texts.some(x=>x.id===id))throw new Error('El texto ya no está disponible');
      snapshot=await corpusRepository.save(deleteText(original.corpus,id),original.revision);
      await composer.removeWorkingSource(id);
      selectedIds=selectedIds.filter(x=>x!==id);
      if(activeTextId===id)activeTextId=null;
      window.dispatchEvent(new CustomEvent('corpus-updated'));
      render();
      message('Texto eliminado de la biblioteca. Los cuadernos preparados no se han modificado.');
    }catch(err){message('No se pudo eliminar el texto: '+(err instanceof Error?err.message:String(err)),true);}
    finally{working=false;}
  }

  async function storeText(data:TextDraft):Promise<void>{
    if(working)return;
    const title=data.title.trim(),latin=data.latin.trim();
    if(!title||!latin){message('Completa el título y el texto latino.',true);return;}
    working=true;
    try{
      const previous=await corpusRepository.load();
      const existing=previous.corpus.texts.find(t=>t.latin===latin
        &&t.source.author===(data.author.trim()||null)
        &&t.source.work===(data.work.trim()||null)
        &&t.source.reference===(data.reference.trim()||null));
      let id=existing?.id??'doc.'+crypto.randomUUID();
      if(!existing){
        const result=upsertText(previous.corpus,data,id,new Date().toISOString());
        snapshot=await corpusRepository.save(result,previous.revision);
        window.dispatchEvent(new CustomEvent('corpus-updated'));
      }else snapshot=previous;
      working=false;
      await chooseText(id);
    }catch(err){message('No se guardó el texto: '+(err instanceof Error?err.message:String(err)),true);}
    finally{working=false;}
  }
  async function addFromWork(latin:string,reference:string):Promise<void>{
    if(!work)return;
    const record:TextDraft={
      title:work.author+' · '+work.latin+' '+reference,
      latin,author:work.author,work:work.latin,reference,
    };
    await storeText(record);
  }
  async function openWork(meta:LibraryEntry):Promise<void>{
    if(working)return;
    working=true;
    try{
      let result=works.get(meta.urn);
      if(!result){
        const response=await fetch(new URL('../library/'+meta.file,import.meta.url));
        if(!response.ok)throw Error('No se pudo abrir la obra ('+response.status+').');
        const candidate:unknown=await response.json();
        if(!candidate||typeof candidate!=='object'||!Array.isArray((candidate as LibraryWork).lines)
          ||!(candidate as LibraryWork).lines.length||(candidate as LibraryWork).urn!==meta.urn)
          throw Error('La obra no pasa las comprobaciones del catálogo.');
        result=candidate as LibraryWork;works.set(meta.urn,result);
      }
      work=result;readerSelection=null;
      render();
      message('Toca un pasaje para añadirlo directamente, o selecciona un fragmento más largo.');
    }catch(err){message('Error al abrir la obra: '+String(err),true);}
    finally{working=false;}
  }

  function syncReaderSelection():void{
    if(stage!=='texts'||textMode!=='authors'||!work||preservingSelection)return;
    const reader=root.querySelector<HTMLElement>('.simple-reader-lines');
    if(!reader)return;
    const selection=window.getSelection();
    const candidate=readReaderSelection(work,reader,selection);
    if(candidate)readerSelection=candidate;
    else if(selection?.isCollapsed&&selection.anchorNode&&reader.contains(selection.anchorNode))
      readerSelection=null;
    const add=root.querySelector<HTMLButtonElement>('[data-add-range]');
    const desc=root.querySelector<HTMLElement>('.simple-selection-message');
    if(add)add.disabled=!readerSelection;
    if(desc)desc.textContent=readerSelection
      ? readerSelection.wordCount+' palabras · '+readerSelection.reference
      :'Toca un pasaje para añadirlo, o selecciona varias frases con los tiradores.';
  }
  function renderAuthors():HTMLElement{
    const columns=el('div','simple-authors-layout');
    const aside=el('aside','simple-work-list');
    const head=el('div','simple-pane-head');
    head.append(el('h2','','Autores y obras'),
      el('p','hint','Elige una obra y toca un pasaje para añadirlo y editarlo.'));
    aside.append(head);
    const search=el('input','field-control');search.type='search';
    search.placeholder='Buscar autor u obra';search.value=authorSearch;
    search.setAttribute('aria-label','Buscar autor u obra');
    const filter=el('select','field-control');
    filter.setAttribute('aria-label','Filtrar autores');
    for(const author of ['all',...[...new Set(catalogue.map(w=>w.author))].sort(collator.compare)]){
      const option=el('option','',author==='all'?'Todos los autores':author);option.value=author;filter.append(option);
    }
    filter.value=authorFilter;
    const list=el('div','simple-work-scroll');
    const draw=()=>{
      list.replaceChildren();
      const matches=searchWorks(catalogue,authorSearch,authorFilter);
      let previous='';
      for(const meta of matches){
        if(meta.author!==previous){previous=meta.author;list.append(el('h3','simple-author-heading',previous));}
        const row=button((meta.latin||meta.title)+' · '+meta.count+' pasajes',
          ()=>openWork(meta),'simple-work-item'+(work?.urn===meta.urn?' selected':''));
        list.append(row);
      }
      if(!matches.length)list.append(el('p','hint','No hay obras con esa búsqueda.'));
    };
    search.addEventListener('input',()=>{authorSearch=search.value;draw();});
    filter.addEventListener('change',()=>{authorFilter=filter.value;draw();});
    aside.append(search,filter,list);draw();
    const reading=el('section','simple-work-reading');
    if(!work){
      reading.append(el('h2','','Selecciona una obra'),
        el('p','hint','Después toca el pasaje que quieras. Se guardará en tus textos y se abrirá automáticamente el editor A4.'));
    }else{
      reading.append(el('h2','',work.author),
        el('p','simple-work-title',work.latin+' · '+work.title));
      const jump=el('div','simple-ref-jump');
      const location=el('input','field-control');location.placeholder='Ir a pasaje: 1.1';
      location.setAttribute('aria-label','Ir a pasaje');
      const go=button('Ir a',()=>{
        const idx=findCitation(work!,location.value);
        if(idx<0){message('No existe esa referencia.',true);return;}
        reading.querySelector<HTMLElement>('[data-index="'+idx+'"]')
          ?.scrollIntoView({block:'center',behavior:'smooth'});
      });
      location.addEventListener('keydown',e=>{if(e.key==='Enter')go.click();});
      jump.append(location,go);
      const selection=el('div','simple-selection-toolbar');
      const desc=el('span','simple-selection-message','Toca un pasaje para añadirlo, o selecciona varias frases con los tiradores.');
      const add=button('Añadir fragmento seleccionado',async()=>{
        if(!readerSelection)return;
        await addFromWork(readerSelection.latin,readerSelection.reference);
      },'btn btn-primary');
      add.dataset.addRange='true';add.disabled=!readerSelection;
      add.addEventListener('pointerdown',()=>{preservingSelection=true;});
      add.addEventListener('pointercancel',()=>{preservingSelection=false;});
      add.addEventListener('click',()=>{preservingSelection=false;});
      selection.append(desc,add);
      const lines=el('div','simple-reader-lines reader-lines');
      for(const [index,line] of work.lines.entries()){
        const row=el('div','reader-line simple-reader-line');row.dataset.index=String(index);
        row.dataset.c=line.c;row.tabIndex=0;
        row.setAttribute('aria-label','Añadir pasaje '+line.c);
        row.append(el('span','reader-ref',line.c),el('span','reader-latin',line.t));
        row.addEventListener('click',()=>{
          if(window.getSelection() && !window.getSelection()!.isCollapsed){
            syncReaderSelection();return;
          }
          void addFromWork(line.t,line.c);
        });
        row.addEventListener('keydown',event=>{
          if(event.key==='Enter'){event.preventDefault();void addFromWork(line.t,line.c);}
        });
        lines.append(row);
      }
      lines.addEventListener('pointerup',()=>window.setTimeout(syncReaderSelection,0));
      lines.addEventListener('touchend',()=>window.setTimeout(syncReaderSelection,90),{passive:true});
      lines.addEventListener('keyup',syncReaderSelection);
      const source=el('p','hint');
      source.append(document.createTextNode(work.editorial+' · '));
      const link=el('a','','Fuente y edición');
      link.href=work.source;link.target='_blank';link.rel='noopener noreferrer';source.append(link);
      reading.append(jump,selection,lines,source);
    }
    columns.append(aside,reading);return columns;
  }

  function renderManual():HTMLElement{
    const section=el('section','simple-manual');
    section.append(el('h2','','Añadir texto propio'),
      el('p','hint','Al guardarlo se abrirán directamente sus preguntas y su vista previa.'));
    const formElement=el('form','simple-manual-form');
    for(const [key,label] of [
      ['title','Título'],['author','Autor'],['work','Obra'],['reference','Libro, capítulo o pasaje'],
      ['latin','Texto latino'],
    ] as const){
      formElement.append(labelled(label,form[key],value=>{form={...form,[key]:value};},key==='latin'));
    }
    const actions=el('div','simple-actions');
    actions.append(button('Añadir y editar',async()=>{
      await storeText({...form});
      if(textMode==='editor')form=emptyForm();
    },'btn btn-primary'));
    actions.append(button('Cancelar',()=>{textMode='editor';render();}));
    formElement.append(actions);
    formElement.addEventListener('submit',e=>{e.preventDefault();actions.querySelector('button')?.click();});
    section.append(formElement);return section;
  }

  async function saveTags(id:string,selected:readonly string[],custom:readonly GrammarTag[]=[]):Promise<void>{
    if(working)return;working=true;
    try{
      const existing=await corpusRepository.load();
      const result=attachGrammarTags(existing.corpus,id,selected,custom);
      snapshot=await corpusRepository.save(result,existing.revision);
      window.dispatchEvent(new CustomEvent('corpus-updated'));
      const synced=await composer.syncSourceTags(id,selected);
      message(synced?'Etiquetas guardadas.':'Etiquetas guardadas en la biblioteca; revisa la vista editorial.',!synced);
      tagPanelOpen=true;render();
    }catch(err){message('No se guardaron las etiquetas: '+String(err),true);}
    finally{working=false;}
  }
  function renderTags(text:LatinText):HTMLElement{
    const container=el('details','simple-grammar');
    container.open=tagPanelOpen;
    container.addEventListener('toggle',()=>{tagPanelOpen=container.open;});
    const all=allGrammarTags(snapshot!.corpus);
    container.append(el('summary','','Etiquetas gramaticales ('+text.tagIds.length+')'));
    const inner=el('div','simple-grammar-body');
    inner.append(el('p','hint','Marca las construcciones que aparecen en este texto. Se guardan automáticamente; no hay detección automática de IA.'));
    const parentMap=new Map<string|null,GrammarTag[]>();
    for(const t of all){const a=parentMap.get(t.parentId)??[];a.push(t);parentMap.set(t.parentId,a);}
    function buildChildren(parent:string,host:HTMLElement,depth=0):void{
      for(const t of parentMap.get(parent)??[]){
        const row=el('label','simple-tag-option');
        row.style.paddingLeft=(Math.min(depth,3)*13+6)+'px';
        const check=el('input');check.type='checkbox';check.checked=text.tagIds.includes(t.id);
        check.setAttribute('aria-label',t.label);
        check.addEventListener('change',()=>{
          const ids=new Set(text.tagIds);
          if(check.checked)ids.add(t.id);else ids.delete(t.id);
          void saveTags(text.id,[...ids]);
        });
        row.append(check,el('span','',t.label));host.append(row);
        if(depth<5)buildChildren(t.id,host,depth+1);
      }
    }
    for(const id of GRAMMAR_GROUP_IDS){
      const head=all.find(t=>t.id===id);if(!head)continue;
      const group=el('details','simple-tag-group');
      group.open=text.tagIds.some(tid=>matchesGrammarTag(tid,id,all));
      const summary=el('summary','',head.label);group.append(summary);
      const body=el('div','simple-tag-group-list');
      buildChildren(id,body);
      group.append(body);inner.append(group);
    }
    const customs=all.filter(t=>t.kind==='custom');
    if(customs.length){
      const group=el('details','simple-tag-group');
      group.open=customs.some(t=>text.tagIds.includes(t.id));
      group.append(el('summary','','Personalizadas'));
      for(const tag of customs){
        const label=el('label','simple-tag-option');
        const check=el('input');check.type='checkbox';check.checked=text.tagIds.includes(tag.id);
        check.setAttribute('aria-label',tag.label);
        check.addEventListener('change',()=>{
          const ids=new Set(text.tagIds);
          if(check.checked)ids.add(tag.id);else ids.delete(tag.id);
          void saveTags(text.id,[...ids]);
        });
        label.append(check,el('span','',tag.label));group.append(label);
      }
      inner.append(group);
    }
    const addRow=el('div','simple-new-tag');
    const input=el('input','field-control');input.placeholder='Etiqueta personalizada';
    input.setAttribute('aria-label','Nueva etiqueta personalizada');
    const add=button('Añadir',async()=>{
      const value=input.value.trim();
      if(!isCustomTagLabelValid(value)){
        message('La etiqueta debe tener entre 1 y 160 caracteres.',true);return;
      }
      const already=findTagByLabel(value,all);
      if(already)await saveTags(text.id,[...new Set([...text.tagIds,already.id])]);
      else{
        const item:GrammarTag={id:'custom.'+crypto.randomUUID(),label:value,
          kind:'custom',parentId:null};
        await saveTags(text.id,[...text.tagIds,item.id],[item]);
      }
    });
    addRow.append(input,add);
    inner.append(addRow);container.append(inner);
    return container;
  }

  function renderTexts():HTMLElement{
    const layout=el('div','simple-text-layout');
    const aside=el('aside','simple-text-sidebar');
    const heading=el('div','simple-pane-head');
    heading.append(el('h2','','Textos'),
      el('p','hint','Toca un texto para editarlo al instante.'));
    aside.append(heading);
    const addActions=el('div','simple-sidebar-actions');
    addActions.append(button('Buscar autores',()=>{
      textMode='authors';render();
    },'btn btn-primary'));
    addActions.append(button('+ Texto propio',()=>{
      form=emptyForm();textMode='manual';render();
    }));
    if(textMode!=='editor')addActions.append(button('Volver al editor',()=>{
      textMode='editor';render();
    }));
    aside.append(addActions);
    const search=el('input','field-control');search.type='search';
    search.placeholder='Buscar entre mis textos';search.value=textSearch;
    search.setAttribute('aria-label','Buscar textos guardados');
    const list=el('div','simple-source-list');
    const draw=()=>{
      list.replaceChildren();
      const needle=foldLatin(textSearch);
      const found=(snapshot?.corpus.texts??[]).filter(t=>
        !needle||foldLatin([t.title,t.source.author??'',t.source.work??'',
          t.source.reference??'',t.latin].join(' ')).includes(needle));
      for(const t of found){
        const row=button(t.title,()=>chooseText(t.id),
          'simple-source-row'+(activeTextId===t.id?' selected':''));
        row.setAttribute('aria-label',t.title);
        const meta=el('span','',[
          t.source.author,t.source.work,t.source.reference,
        ].filter(Boolean).join(' · '));
        row.append(meta);
        const tags=t.tagIds.length;
        if(tags)row.append(el('small','',tags+' etiqueta'+(tags!==1?'s':'')));
        list.append(row);
      }
      if(!found.length)list.append(el('p','hint',
        snapshot?.corpus.texts.length?'No hay textos con esa búsqueda.':'Todavía no hay textos. Busca un autor o añade uno propio.'));
    };
    search.addEventListener('input',()=>{textSearch=search.value;draw();});
    aside.append(search,list);draw();
    const active=getActiveText();
    if(active&&textMode==='editor'){
      aside.append(renderTags(active));
      const remove=button('Eliminar este texto',()=>removeSourceText(active.id),
        'btn btn-outline simple-delete-text');
      remove.setAttribute('aria-label','Eliminar texto '+active.title);
      aside.append(remove);
    }
    layout.append(aside);
    const content=el('main','simple-text-content');
    if(textMode==='authors')content.append(renderAuthors());
    else if(textMode==='manual')content.append(renderManual());
    else if(active){
      content.append(composer.element);
    }else{
      const empty=el('div','simple-start');
      empty.append(el('h2','','Elige un texto y empieza'),
        el('p','','Busca un autor y toca el pasaje que te interese. Se guardará automáticamente y aparecerán su editor, el panel de preguntas y la vista previa A4.'));
      empty.append(button('Buscar autores y obras',()=>{textMode='authors';render();},'btn btn-primary'));
      empty.append(button('Añadir texto propio',()=>{form=emptyForm();textMode='manual';render();}));
      content.append(empty);
    }
    layout.append(content);return layout;
  }

  async function openPrepared(id:string):Promise<void>{
    if(!await composer.openEdition(id)){message('No se pudo abrir el cuaderno.',true);return;}
    selectedEditionId=id;
    const saved=(await workspace.loadEdition(id))?.edition;
    if(saved){
      selectedIds=saved.placements.map(p=>p.source.sourceId).filter((v):v is string=>Boolean(v));
      selectionInitialized=true;
      notebookTitle=saved.title;
    }
    render();
    message('Cuaderno abierto para revisar, ajustar formato o exportar.');
  }
  async function prepare():Promise<void>{
    if(!selectedIds.length){message('Marca al menos un texto.',true);return;}
    if(!notebookTitle.trim()){message('Escribe el título del cuaderno.',true);return;}
    const before=new Set(editions.map(e=>e.edition.id));
    if(!await composer.prepareFromIds(selectedIds,notebookTitle))return;
    editions=await workspace.listEditions();
    const created=editions.find(e=>!before.has(e.edition.id));
    selectedEditionId=created?.edition.id??null;
    render();
    message('Cuaderno con '+selectedIds.length+' textos listo. Puedes ajustar preguntas y exportar Word/PDF.');
  }
  function renderPrepare():HTMLElement{
    const main=el('div','simple-prepare-layout');
    const aside=el('aside','simple-prepare-select');
    aside.append(el('h2','','Preparar cuaderno'),
      el('p','hint','Selecciona los textos. El recuento de etiquetas se actualiza con la selección. Después crea o abre el documento.'));
    const corpus=snapshot?.corpus;
    if(!corpus)return main;
    if(!selectionInitialized){selectedIds=corpus.texts.map(t=>t.id);selectionInitialized=true;}
    const title=labelled('Título del cuaderno',notebookTitle,v=>{notebookTitle=v;});
    aside.append(title);
    const actions=el('div','simple-actions');
    const all=button('Marcar todos',()=>{selectedIds=corpus.texts.map(t=>t.id);render();});
    const none=button('Quitar todos',()=>{selectedIds=[];render();});
    actions.append(all,none);aside.append(actions);
    const search=el('input','field-control');search.type='search';
    search.placeholder='Buscar texto para incluir';search.value=collectionSearch;
    search.setAttribute('aria-label','Buscar textos para el cuaderno');
    const list=el('div','simple-selection-list');
    const draw=()=>{
      list.replaceChildren();
      const terms=foldLatin(collectionSearch);
      const options=corpus.texts.filter(t=>
        !terms||foldLatin([t.title,t.source.author??'',t.source.work??''].join(' ')).includes(terms));
      for(const t of options){
        const row=el('div','simple-select-row');
        const label=el('label','simple-select-label');
        const cb=el('input');cb.type='checkbox';cb.checked=selectedIds.includes(t.id);
        cb.setAttribute('aria-label','Incluir '+t.title);
        cb.addEventListener('change',()=>{
          if(cb.checked&&!selectedIds.includes(t.id))selectedIds=[...selectedIds,t.id];
          else if(!cb.checked)selectedIds=selectedIds.filter(id=>id!==t.id);
          render();
        });
        label.append(cb,el('span','',t.title));
        row.append(label);
        if(cb.checked){
          const order=selectedIds.indexOf(t.id);
          const up=button('↑',()=>{
            if(order<1)return;
            const updated=[...selectedIds];
            [updated[order-1],updated[order]]=[updated[order]!,updated[order-1]!];
            selectedIds=updated;render();
          },'btn btn-outline simple-order');
          up.title='Mover texto anterior';up.disabled=order<=0;
          const down=button('↓',()=>{
            if(order<0||order===selectedIds.length-1)return;
            const updated=[...selectedIds];
            [updated[order+1],updated[order]]=[updated[order]!,updated[order+1]!];
            selectedIds=updated;render();
          },'btn btn-outline simple-order');
          down.title='Mover texto siguiente';down.disabled=order>=selectedIds.length-1;
          row.append(el('small','simple-order-number',String(order+1)),up,down);
        }
        list.append(row);
      }
      if(!options.length)list.append(el('p','hint','No hay textos con esta búsqueda.'));
    };
    search.addEventListener('input',()=>{collectionSearch=search.value;draw();});
    aside.append(search,list);draw();
    const make=button('Preparar '+selectedIds.length+' texto'+(selectedIds.length===1?'':'s'),
      prepare,'btn btn-primary simple-create-notebook');
    make.disabled=!selectedIds.length;
    aside.append(make);
    const previous=editions.filter(e=>e.edition.id!==WORKING_EDITION_ID);
    if(previous.length){
      const saved=el('div','simple-existing');
      saved.append(el('h3','','Cuadernos preparados'));
      const choose=el('select','field-control');
      choose.setAttribute('aria-label','Cuaderno preparado');
      const placeholder=el('option','','Elige un cuaderno guardado');
      placeholder.value='';choose.append(placeholder);
      for(const edition of previous){
        const option=el('option','',edition.edition.title+' · '+edition.edition.placements.length+' textos');
        option.value=edition.edition.id;choose.append(option);
      }
      choose.value=selectedEditionId??'';
      saved.append(choose,button('Abrir cuaderno',()=>openPrepared(choose.value)));
      aside.append(saved);
    }
    if(corpus.notebooks.length){
      const old=el('details','simple-legacy-notebooks');
      old.append(el('summary','','Cuadernos anteriores'));
      for(const notebook of corpus.notebooks){
        const b=button(notebook.title+' · '+notebook.textIds.length+' textos',async()=>{
          if(!await composer.importLegacyNotebook(notebook.id))return;
          editions=await workspace.listEditions();
          const edition=editions.find(e=>e.edition.legacyNotebookId===notebook.id);
          if(edition)await openPrepared(edition.edition.id);
        });
        old.append(b);
      }
      aside.append(old);
    }
    main.append(aside);
    const overview=el('main','simple-prepare-preview');
    const summary=summarizeSelection(corpus,selectedIds);
    const card=el('section','simple-grammar-summary');
    card.append(el('h2','','Resumen gramatical'),
      el('p','simple-total',summary.total+' texto'+(summary.total===1?'':'s')+' seleccionado'+(summary.total===1?'':'s')));
    if(summary.counts.length){
      const counts=el('div','simple-counts');
      for(const count of summary.counts){
        const row=el('div','simple-count-row');
        row.append(el('span','',count.label),el('strong','',String(count.count)));
        if(count.kind==='custom')row.classList.add('custom');
        counts.append(row);
      }
      card.append(counts);
    }else card.append(el('p','hint','Todavía no hay etiquetas asignadas a la selección.'));
    if(summary.withoutTags)card.append(el('p','hint',summary.withoutTags+
      ' texto'+(summary.withoutTags===1?'':'s')+' sin etiquetas gramaticales.'));
    overview.append(card);
    if(selectedEditionId)overview.append(composer.element);
    else overview.append(el('p','simple-prepare-help',
      'Cuando pulses «Preparar», aparecerá aquí el documento con su vista previa A4 y los botones de exportación.'));
    main.append(overview);return main;
  }

  function render():void{
    root.replaceChildren();
    const surface=el('div','simple-app');surface.dataset.stage=stage;
    const header=el('header','simple-header');
    const heading=el('div');
    heading.append(el('p','simple-eyebrow','CUADERNO DE TEXTOS LATINOS'),
      el('h1','','Textos latinos'),
      el('p','hint','Elige, edita y reúne textos en dos pasos.'));
    const tabs=el('nav','simple-tabs');tabs.setAttribute('aria-label','Navegación principal');
    for(const [key,label] of [['texts','Textos'],['prepare','Preparar cuaderno']] as const){
      const b=button(label,async()=>{
        if(key===stage)return;
        if(!await composer.flush())return;
        stage=key;
        if(key==='prepare'){
          editions=await workspace.listEditions();
        }
        render();
      },'simple-tab'+(stage===key?' active':''));
      b.setAttribute('aria-current',String(stage===key?'page':'false'));
      tabs.append(b);
    }
    const library=el('a','simple-tab','Biblioteca de textos');
    library.href='?biblioteca=1';
    library.addEventListener('click',event=>{
      if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();
      void composer.flush().then(saved=>{
        if(saved)window.location.assign(library.href);
      });
    });
    tabs.append(library);
    header.append(heading,tabs);
    surface.append(header);
    if(stage==='texts')surface.append(renderTexts());
    else surface.append(renderPrepare());
    const status=el('p','simple-status',feedback);
    status.role='status';status.setAttribute('aria-live','polite');
    status.dataset.error=String(isError);
    surface.append(status);
    const advanced=el('details','simple-advanced');
    advanced.append(el('summary','','Opciones avanzadas y datos anteriores'));
    const detail=el('div','simple-advanced-content');
    const classical=el('a','','Abrir interfaz anterior');
    classical.href='?classic=1';
    detail.append(classical);
    detail.append(button('Copia JSON de mis textos',async()=>{
      try{
        const original=await corpusRepository.load();
        const json=await createBackup(original.corpus);
        backupDownload(json,'cuaderno-textos-'+new Date().toISOString().slice(0,10)+'.json');
        message('Copia del banco de textos preparada.');
      }catch(err){message('No se pudo generar la copia: '+String(err),true);}
    }));
    detail.append(el('p','hint','Los cuadernos anteriores y sus copias siguen disponibles. La interfaz simplificada no borra ni migra datos automáticamente.'));
    advanced.append(detail);surface.append(advanced);
    root.append(surface);
  }
  window.addEventListener('focus',()=>{
    if(working)return;
    void (async()=>{try{const latest=await corpusRepository.load();
      if(!snapshot||latest.revision!==snapshot.revision){snapshot=latest;render();}
    }catch(err){message('Error al actualizar los textos: '+String(err),true);}})();
  });
  document.addEventListener('selectionchange',syncReaderSelection);
  render();
  void (async()=>{
    try{
      const [db,manifest]=await Promise.all([
        corpusRepository.load(),
        fetch(new URL('../library/catalog.json',import.meta.url)),
      ]);
      if(!manifest.ok)throw Error('Catálogo no disponible: '+manifest.status);
      const value:unknown=await manifest.json();
      if(!value||typeof value!=='object'||!Array.isArray((value as {works?:unknown}).works))
        throw Error('Catálogo incompleto.');
      snapshot=db;catalogue=(value as {works:LibraryEntry[]}).works;
      editions=await workspace.listEditions();
      await composer.open();
      const source=editions.find(e=>e.edition.id===WORKING_EDITION_ID)
        ?.edition.placements.at(-1)?.source.sourceId??null;
      if(source&&snapshot.corpus.texts.some(t=>t.id===source)){
        if(await composer.openSourceText(source))activeTextId=source;
      }
      render();
      message('Listo. Selecciona un texto; el editor se abrirá automáticamente.');
    }catch(err){
      render();
      message('No se pudo cargar la biblioteca: '+(err instanceof Error?err.message:String(err)),true);
    }
  })();
}
