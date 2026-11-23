import {
  findCitation, foldLatin, searchWorks,
  type LibraryEntry, type LibraryWork,
} from '../core/library.js';
import {
  upsertText, deleteText, notebookTexts, upsertNotebook, removeNotebook, renameNotebook,
  addTextToNotebook, removeTextFromNotebook, moveTextInNotebook, type TextDraft,
} from '../core/editor-operations.js';
import type { CorpusSnapshot } from '../ports/corpus-repository.js';
import { readReaderSelection, type ReaderFragment } from './reader-selection.js';
import { IndexedDbCorpusRepository, RevisionConflictError } from '../storage/indexeddb-corpus-repository.js';
import { createEditionPane } from './edition-app.js';
import type { GrammarTag } from '../core/model.js';
import { allGrammarTags, attachGrammarTags, catalogDepth, findTagByLabel,
  GRAMMAR_GROUP_IDS, isCustomTagLabelValid, matchesGrammarFilters, matchesGrammarTag,
} from '../core/grammar-tags.js';

type Tab = 'library' | 'texts' | 'notebooks' | 'compose';
const repository = new IndexedDbCorpusRepository();
const cmp = new Intl.Collator('es', { sensitivity: 'base' });
const emptyDraft = (): TextDraft => ({ title:'',latin:'',author:'',work:'',reference:'' });
const freshId = (): string => 'doc.' + crypto.randomUUID();

function el<K extends keyof HTMLElementTagNameMap>(
  kind: K, cls = '', text = '',
): HTMLElementTagNameMap[K] {
  const e = document.createElement(kind);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
function button(label: string, action: () => void | Promise<void>, cls = 'btn'): HTMLButtonElement {
  const b = el('button', cls, label);
  b.type='button';
  b.addEventListener('click',()=>{void action();});
  return b;
}
function field(labelText: string, value: string, change: (value:string)=>void, multiline = false): HTMLElement {
  const wrapper=el('label','field2');
  wrapper.append(el('span','field-label',labelText));
  const control = multiline ? el('textarea','field-control field-textarea') : el('input','field-control');
  control.value=value;
  if (multiline) (control as HTMLTextAreaElement).rows=10;
  control.addEventListener('input',()=>change(control.value));
  wrapper.append(control);
  return wrapper;
}
function notify(id: string): void { window.dispatchEvent(new CustomEvent(id)); }

/** Selector de árboles compacto: grupo/forma/función nunca se confunden. */
function grammarPicker(tags:readonly GrammarTag[],selected:ReadonlySet<string>,
  changed:(id:string,checked:boolean)=>void,cls:string):HTMLElement{
  const root=el('div',cls);
  const byParent=new Map<string|null,GrammarTag[]>();
  for(const tag of tags){
    const siblings=byParent.get(tag.parentId)??[];
    siblings.push(tag);byParent.set(tag.parentId,siblings);
  }
  function addChildren(parent:string,body:HTMLElement,level=0):void{
    for(const tag of byParent.get(parent)??[]){
      const label=el('label','grammar-item');
      label.style.setProperty('--level',String(Math.min(level,3)));
      const input=el('input');
      input.type='checkbox';
      input.checked=selected.has(tag.id);
      input.setAttribute('aria-label',tag.label);
      input.addEventListener('change',()=>changed(tag.id,input.checked));
      label.append(input,el('span','',tag.label));
      body.append(label);
      if(level<5)addChildren(tag.id,body,level+1);
    }
  }
  for(const groupId of GRAMMAR_GROUP_IDS){
    const group=tags.find(tag=>tag.id===groupId);
    if(!group)continue;
    const details=el('details','grammar-group');
    details.open=tags.some(tag=>selected.has(tag.id) &&
      matchesGrammarTag(tag.id,groupId,tags));
    details.append(el('summary','',group.label));
    const body=el('div','grammar-group-body');
    // El nodo padre es seleccionable por sí mismo.
    const label=el('label','grammar-item grammar-root');
    const input=el('input');input.type='checkbox';
    input.checked=selected.has(groupId);
    input.setAttribute('aria-label',group.label);
    input.addEventListener('change',()=>changed(groupId,input.checked));
    label.append(input,el('span','','Etiquetar: '+group.label));
    body.append(label);
    addChildren(groupId,body);
    details.append(body);root.append(details);
  }
  const custom=tags.filter(tag=>tag.kind==='custom');
  if(custom.length){
    const details=el('details','grammar-group');
    details.open=custom.some(tag=>selected.has(tag.id));
    details.append(el('summary','','Etiquetas personalizadas'));
    const body=el('div','grammar-group-body');
    for(const tag of custom){
      const label=el('label','grammar-item');
      label.style.setProperty('--level',String(catalogDepth(tag,tags)));
      const input=el('input');input.type='checkbox';
      input.checked=selected.has(tag.id);
      input.setAttribute('aria-label',tag.label);
      input.addEventListener('change',()=>changed(tag.id,input.checked));
      label.append(input,el('span','',tag.label));
      body.append(label);
    }
    details.append(body);root.append(details);
  }
  return root;
}

export function mountLibraryApp(root: HTMLElement, { independent = false } = {}): void {
  let snapshot: CorpusSnapshot | null = null;
  let catalogue: LibraryEntry[] = [];
  const cachedWorks = new Map<string,LibraryWork>();
  const composer = createEditionPane();
  let activeWork: LibraryWork | null = null;
  let selectedFragment: ReaderFragment | null = null;
  let preservingSelection = false;
  let tab: Tab = independent ? 'texts' : 'library';
  let authorFilter = 'all';
  let genreFilter = 'all';
  let query = '';
  let ownQuery = '';
  let reviewFilter = 'all';
  const sourceFilters = { author: '', work: '', reference: '' };
  const tagFilters=new Set<string>();
  const selectedTagIds=new Set<string>();
  let pendingCustomTags:GrammarTag[]=[];
  let editingId: string | null = null;
  let draft = emptyDraft();
  let dirty = false;
  let currentNotebook = '';
  let statusMessage = 'Cargando biblioteca y datos locales…';
  let statusIsError = false;
  let busy = false;
  let offlinePrepared = false;

  function message(content:string, error=false):void {
    statusMessage = content;
    statusIsError = error;
    const node=root.querySelector<HTMLElement>('#phase2-status');
    if (node) {
      node.textContent=content;
      node.dataset.error=String(error);
    }
  }
  function ready(): boolean {
    return snapshot !== null && !busy;
  }
  async function transaction(transform:(corpus:CorpusSnapshot['corpus'])=>CorpusSnapshot['corpus']): Promise<boolean> {
    if (!snapshot || busy) return false;
    busy=true;
    try {
      const next=transform(snapshot.corpus);
      snapshot=await repository.save(next,snapshot.revision);
      notify('corpus-updated');
      message('Cambios guardados en este dispositivo. Revisión ' + snapshot.revision + '.');
      return true;
    } catch(error) {
      const detail=error instanceof Error?error.message:String(error);
      message(error instanceof RevisionConflictError
        ? 'Otra pestaña ha cambiado los datos. Conservamos tu borrador; recarga los datos antes de guardar. '+detail
        : detail,true);
      return false;
    } finally {busy=false;}
  }
  function confirmDiscard(): boolean {
    return !dirty || window.confirm('Hay cambios sin guardar en el editor. ¿Deseas descartarlos?');
  }
  async function setTab(t:Tab):Promise<void> {
    if (t===tab)return;
    if (tab==='compose' && !await composer.flush())return;
    if(t!==tab && !confirmDiscard())return;
    if(t!=='texts'){
      draft=emptyDraft();dirty=false;editingId=null;
      selectedTagIds.clear();pendingCustomTags=[];
    }
    if(t!=='library'){selectedFragment=null;window.getSelection()?.removeAllRanges();}
    tab=t;
    if(t==='compose')await composer.open();
    render();
  }
  function editText(id:string):void {
    if(!confirmDiscard())return;
    const text=snapshot?.corpus.texts.find(t=>t.id===id);
    if(!text)return;
    draft={
      id:text.id,title:text.title,latin:text.latin,
      author:text.source.author??'',work:text.source.work??'',reference:text.source.reference??'',
      notes:text.notes??'',...(text.reviewed !== undefined && { reviewed:text.reviewed }),vocabulary:structuredClone(text.vocabulary??[]),
    };
    editingId=text.id;
    selectedTagIds.clear();
    for(const id of text.tagIds)selectedTagIds.add(id);
    pendingCustomTags=[];
    dirty=false;tab='texts';render();
  }
  /**
   * Selectionchange llega también tras tocar los botones en Safari.
   * Se conserva el último rango válido al cambiar de foco y sólo se borra
   * al hacer otra selección en el lector o pulsar «Limpiar».
   */
  function syncReaderSelection():void {
    if (tab!=='library' || !activeWork || preservingSelection) return;
    const reader=root.querySelector<HTMLElement>('.reader-lines');
    if(!reader)return;
    const selection=window.getSelection();
    const picked=readReaderSelection(activeWork,reader,selection);
    if(picked) selectedFragment=picked;
    else if(selection?.isCollapsed && selection.anchorNode && reader.contains(selection.anchorNode)) {
      selectedFragment=null;
    }
    const add=root.querySelector<HTMLButtonElement>('[data-use-selection]');
    const clear=root.querySelector<HTMLButtonElement>('[data-clear-selection]');
    const description=root.querySelector<HTMLElement>('.selection-description');
    if(add)add.disabled=!selectedFragment || !ready();
    if(clear)clear.disabled=!selectedFragment;
    if(description)description.textContent=selectedFragment
      ? selectedFragment.reference+' · '+selectedFragment.wordCount+' palabras seleccionadas'
      : 'Selecciona con el ratón o mantén pulsado y arrastra los tiradores con el dedo.';
  }

  function useFragment():void {
    if(!activeWork||!selectedFragment||!ready())return;
    const frag=selectedFragment;
    if(!confirmDiscard())return;
    const duplicate=snapshot!.corpus.texts.find(t=>
      t.latin===frag.latin && t.source.author===activeWork?.author
      && t.source.work===activeWork?.latin && t.source.reference===frag.reference
    );
    if(duplicate){ editText(duplicate.id); message('Este fragmento ya estaba guardado. Se ha abierto su ficha.');return; }
    draft={
      title: activeWork.author + ' · ' + activeWork.latin + ' ' + frag.reference,
      author:activeWork.author,work:activeWork.latin,reference:frag.reference,
      latin:frag.latin,
    };
    editingId=null;selectedTagIds.clear();pendingCustomTags=[];
    dirty=true;tab='texts';selectedFragment=null;render();
    message('Fragmento de '+frag.wordCount+' palabras incorporado al editor. Pulsa «Guardar texto».');
  }

  async function showWork(meta:LibraryEntry):Promise<void> {
    if(busy)return;
    busy=true;
    message('Abriendo ' + meta.author + ', ' + meta.latin + '…');
    try {
      let work=cachedWorks.get(meta.urn);
      if(!work){
        const url=new URL('../library/'+meta.file,import.meta.url);
        const response=await fetch(url);
        if(!response.ok)throw new Error('No está disponible la obra ('+response.status+').');
        const value:unknown=await response.json();
        if(!value||typeof value!=='object'
          ||!Array.isArray((value as LibraryWork).lines)
          ||!(value as LibraryWork).lines.length
          ||(value as LibraryWork).urn!==meta.urn
        )throw new Error('La obra descargada no pasa la validación básica.');
        work=value as LibraryWork;
        cachedWorks.set(meta.urn,work);
      }
      activeWork=work;
      selectedFragment=null;
      window.getSelection()?.removeAllRanges();
      message('Selecciona cualquier fragmento con el ratón o el dedo; el botón se activará automáticamente.');
      render();
    }catch(err){message(err instanceof Error?err.message:String(err),true);}
    finally{busy=false;}
  }
  function renderCatalog(): HTMLElement {
    // Reproduce el patrón comprobado de Examinator2: catálogo filtrable a la
    // izquierda, lectura y cita del pasaje a la derecha. Solo UI; las obras,
    // las selecciones y el almacenamiento conservan sus contratos originales.
    const main=el('div','library-columns');
    const sidebar=el('aside','lib-sidebar');
    sidebar.setAttribute('aria-label','Buscar autores y obras');
    const sidebarHead=el('div','lib-sidebar-heading');
    sidebarHead.append(el('h2','','Autores y obras'),
      el('p','hint','Busca un autor o una obra y elige un título para leerlo.'));
    sidebar.append(sidebarHead);
    const filters=el('div','lib-filters');
    const f=el('input','field-control');
    f.type='search';f.placeholder='Autor u obra…';f.value=query;f.setAttribute('aria-label','Buscar autor u obra');
    const select=el('select','field-control');select.setAttribute('aria-label','Filtrar por autor');
    const authors=[...new Set(catalogue.map(x=>x.author))].sort(cmp.compare);
    for(const author of ['all',...authors]){
      const option=el('option','',author==='all'?'Todos los autores':author);
      option.value=author;select.append(option);
    }
    select.value=authorFilter;
    const genre=el('select','field-control');genre.setAttribute('aria-label','Filtrar por género');
    const genres=[...new Set(catalogue.map(x=>x.genre))].sort(cmp.compare);
    for(const name of ['all',...genres]){
      const option=el('option','',name==='all'?'Todos los géneros':name);
      option.value=name;genre.append(option);
    }
    genre.value=genreFilter;
    const selectRow=el('div','lib-filter-row');selectRow.append(select,genre);
    const list=el('div','work-list');
    list.setAttribute('aria-label','Obras encontradas');
    const counter=el('span','lib-result-count');
    counter.setAttribute('role','status');
    counter.setAttribute('aria-live','polite');
    const clear=button('Limpiar filtros',()=>{
      query='';authorFilter='all';genreFilter='all';f.value='';
      select.value='all';genre.value='all';updateList();f.focus();
    },'btn btn-outline lib-clear-filters');
    const feedback=el('div','lib-filter-feedback');feedback.append(counter,clear);
    const updateList=()=>{
      const matches=searchWorks(catalogue,query,authorFilter)
        .filter(item=>genreFilter==='all'||item.genre===genreFilter);
      counter.textContent=matches.length+' de '+catalogue.length+' obras';
      clear.disabled=!query&&authorFilter==='all'&&genreFilter==='all';
      list.replaceChildren();
      // Encabezados por autor: el alumno/docente recorre el corpus sin
      // desplegar listas, y la búsqueda sigue siendo ortográficamente flexible.
      const groups=new Map<string,LibraryEntry[]>();
      for(const item of matches){
        const group=groups.get(item.author)??[];
        group.push(item);groups.set(item.author,group);
      }
      for(const [author,works] of groups){
        const section=el('section','lib-author-group');
        const title=el('div','lib-author-label');
        title.append(el('h3','',author),el('span','lib-author-count',String(works.length)));
        section.append(title);
        for(const item of works){
          const row=el('button','work-row'+(activeWork?.urn===item.urn?' active':''));
          row.type='button';
          row.setAttribute('aria-label',item.author+', '+(item.latin||item.title));
          row.setAttribute('aria-pressed',String(activeWork?.urn===item.urn));
          const heading=el('span','work-title',item.latin||item.title);
          const subtitle=el('span','work-desc',item.title+' · '+item.count+' pasajes');
          const source=el('span','work-offline','Incluida · sin conexión');
          row.append(heading,subtitle,source);
          row.addEventListener('click',()=>{void showWork(item);});
          section.append(row);
        }
        list.append(section);
      }
      if(!matches.length)list.append(el('p','hint','No hay obras con esos filtros. Prueba a buscar por autor o por título.'));
    };
    f.addEventListener('input',()=>{query=f.value;updateList();});
    select.addEventListener('change',()=>{authorFilter=select.value;updateList();});
    genre.addEventListener('change',()=>{genreFilter=genre.value;updateList();});
    filters.append(f,selectRow,feedback);
    sidebar.append(filters,list);
    updateList();
    const reader=el('section','lib-reader');
    reader.setAttribute('aria-label','Lector de textos latinos');
    if(!activeWork){
      const empty=el('div','empty-reader');
      empty.append(el('h2','','Lector de textos'),el('p','','Selecciona una obra en la columna izquierda para leerla y extraer un fragmento.'));
      const online=el('p','hint');
      online.textContent='César, Eutropio y Cornelio Nepote están incluidos. El acceso a otros autores se podrá incorporar en una fase posterior.';
      empty.append(online);reader.append(empty);
    }else{
      const head=el('div','reader-head');
      const tit=el('div','reader-heading');
      tit.append(el('h2','',activeWork.author),el('p','reader-work',activeWork.latin+' · '+activeWork.title));
      const readerTools=el('div','reader-tools');
      const citation=el('input','field-control citation-input');
      citation.placeholder='Ir a 1.1 / 1.1.2'; citation.setAttribute('aria-label','Ir a pasaje');
      const go=button('Ir a',()=>{
        const index=findCitation(activeWork!,citation.value);
        if(index<0){message('No existe el pasaje «'+citation.value+'».',true);return;}
        const row=Array.from(root.querySelectorAll<HTMLElement>('.reader-line'))
          .find(element=>element.dataset.index===String(index));
        row?.scrollIntoView({block:'center',behavior:'auto'});
        message('Mostrando el pasaje '+citation.value+'.');
      },'btn btn-outline');
      citation.addEventListener('keydown',event=>{if(event.key==='Enter')go.click();});
      readerTools.append(citation,go);
      head.append(tit,readerTools);
      const readInfo=el('p','hint','Selecciona palabras libremente, incluso dentro de una frase o entre varios párrafos. En iPad, mantén pulsado y ajusta los tiradores.');
      const readerLines=el('div','reader-lines');
      readerLines.setAttribute('aria-label','Texto latino seleccionable');
      activeWork.lines.forEach((line,index)=>{
        const row=el('div','reader-line');
        row.dataset.index=String(index);
        row.dataset.c=line.c;
        row.append(el('span','reader-ref',line.c),el('span','reader-latin',line.t));
        readerLines.append(row);
      });
      readerLines.addEventListener('pointerup',()=>window.setTimeout(syncReaderSelection,0));
      readerLines.addEventListener('keyup',syncReaderSelection);
      readerLines.addEventListener('touchend',()=>window.setTimeout(syncReaderSelection,80),{passive:true});
      const selection=el('div','lib-selection');
      const description=el('span','selection-description',
        selectedFragment
          ? selectedFragment.reference+' · '+selectedFragment.wordCount+' palabras seleccionadas'
          : 'Selecciona con el ratón o mantén pulsado y arrastra los tiradores con el dedo.');
      const add=button('Añadir selección a mis textos',useFragment,'btn btn-primary');
      add.dataset.useSelection='true';
      add.disabled=!selectedFragment || !ready();
      add.addEventListener('pointerdown',()=>{preservingSelection=true;});
      add.addEventListener('click',()=>{preservingSelection=false;});
      add.addEventListener('pointercancel',()=>{preservingSelection=false;});
      const clearSelection=button('Limpiar',()=>{
        selectedFragment=null;
        preservingSelection=false;
        window.getSelection()?.removeAllRanges();
        syncReaderSelection();
      },'btn btn-outline');
      clearSelection.dataset.clearSelection='true';
      clearSelection.disabled=!selectedFragment;
      selection.append(description,add,clearSelection);
      const source=el('p','source-reference');
      source.append(el('span','',activeWork.editorial+' '));
      const link=el('a','','Fuente y edición');
      link.href=activeWork.source;link.target='_blank';link.rel='noopener noreferrer';
      source.append(link);
      reader.append(head,readInfo,selection,readerLines,source);
    }
    main.append(sidebar,reader);
    return main;
  }

  function renderMyTexts(): HTMLElement {
    const shell=el('div','library-columns');
    const sidebar=el('aside','lib-sidebar');
    sidebar.append(el('h2','','Mis textos'),
      el('p','hint','Textos de la biblioteca guardados y fragmentos que hayas escrito tú.'));
    const newBtn=button('Nuevo texto',()=>{
      if(!confirmDiscard())return;
      draft=emptyDraft();editingId=null;dirty=false;
      selectedTagIds.clear();pendingCustomTags=[];
      render();
    },'btn btn-primary');
    const find=el('input','field-control');
    find.type='search';find.placeholder='Buscar en mis textos…';find.value=ownQuery;
    find.setAttribute('aria-label','Buscar en mis textos');
    const tagFilterDetails=el('details','grammar-filter');
    const tagFilterSummary=el('summary','','Filtrar por etiquetas gramaticales');
    tagFilterDetails.append(tagFilterSummary);
    const tags=allGrammarTags(snapshot?.corpus??{schemaVersion:1,texts:[],tags:[],notebooks:[]});
    const filterBody=el('div','grammar-filter-inner');
    filterBody.append(el('p','hint','Marca varias etiquetas para encontrar textos que cumplan todas las condiciones. Una etiqueta general incluye sus subtipos.'));
    const clearFilters=button('Quitar filtros de etiquetas',()=>{
      tagFilters.clear();render();
    },'btn btn-outline');
    filterBody.append(grammarPicker(tags,tagFilters,(id,checked)=>{
      if(checked)tagFilters.add(id);else tagFilters.delete(id);
      draw();
      clearFilters.disabled=!tagFilters.size;
    },'grammar-filter-choices'),clearFilters);
    clearFilters.disabled=!tagFilters.size;
    tagFilterDetails.append(filterBody);
    tagFilterDetails.open=tagFilters.size>0;
    const list=el('div','work-list');
    const draw=()=>{
      list.replaceChildren();
      const corpus=snapshot?.corpus;
      if(!corpus)return;
      const needle=foldLatin(ownQuery);
      const matches=corpus.texts.filter(t=>
        (!needle||foldLatin([t.title,t.latin,t.source.author??'',t.source.work??'',t.source.reference??''].join(' ')).includes(needle))
        && Object.entries(sourceFilters).every(([key, value]) =>
          foldLatin(t.source[key as keyof typeof sourceFilters] ?? '').includes(foldLatin(value)))
        && (reviewFilter==='all' || (reviewFilter==='reviewed')===Boolean(t.reviewed))
        && matchesGrammarFilters(t.tagIds,[...tagFilters],tags)
      ).sort((a,b)=>cmp.compare(a.title,b.title));
      for(const entry of matches){
        const b=el('button','work-row'+(editingId===entry.id?' active':''));
        b.type='button';
        b.append(el('strong','',entry.title),el('span','work-desc',[entry.source.author,entry.source.work,entry.source.reference].filter(Boolean).join(' · ')));
        if(entry.tagIds.length){
          const label=el('span','work-tags',
            entry.tagIds.map(id=>tags.find(tag=>tag.id===id)?.label??id).join(' · '));
          b.append(label);
        }
        b.addEventListener('click',()=>editText(entry.id));
        list.append(b);
      }
      if(!matches.length)list.append(el('p','hint','Todavía no hay textos con ese filtro.'));
    };
    find.addEventListener('input',()=>{ownQuery=find.value;draw();});
    const bibliography = el('details','grammar-group');
    bibliography.append(el('summary','','Filtrar por referencia bibliográfica'));
    for (const [key,label] of [['author','Autor'],['work','Obra'],['reference','Libro, capítulo o pasaje']] as const) {
      bibliography.append(field('Filtrar por '+label,sourceFilters[key],value=>{
        sourceFilters[key]=value;
        draw();
      }));
    }
    if (independent) {
      const review = el('select','field-control');
      review.setAttribute('aria-label','Filtrar por estado de revisión');
      for (const [value,label] of [['all','Todos los estados'],['reviewed','Revisados'],['pending','Pendientes de revisión']] as const) {
        const option = el('option','',label);
        option.value = value;
        review.append(option);
      }
      review.value = reviewFilter;
      review.addEventListener('change', () => { reviewFilter = review.value; draw(); });
      sidebar.append(review);
    }
    bibliography.open = Object.values(sourceFilters).some(Boolean);
    sidebar.append(newBtn);
    if (independent) {
      const importText = el('input');
      importText.type = 'file';
      importText.accept = '.txt,text/plain';
      importText.hidden = true;
      const importButton = button('Importar texto (.txt)', () => importText.click(), 'btn btn-outline');
      importText.addEventListener('change', () => {
        const file = importText.files?.[0];
        importText.value = '';
        if (!file || !confirmDiscard()) return;
        if (file.size > 800_000) {
          message('El archivo supera el tamaño admitido para un texto.', true);
          return;
        }
        const previousDraft = draft;
        void file.arrayBuffer().then(bytes => {
          if (!importText.isConnected || draft !== previousDraft) return;
          const latin = new TextDecoder('utf-8', { fatal: true }).decode(bytes).trim();
          if (!latin || latin.length > 200_000 || latin.includes(String.fromCharCode(0))) {
            throw new Error('Elige un archivo de texto UTF-8 de entre 1 y 200 000 caracteres.');
          }
          editingId = null;
          draft = { ...emptyDraft(), title: file.name.replace(/\.txt$/iu, '').slice(0, 250), latin };
          selectedTagIds.clear();
          pendingCustomTags = [];
          dirty = true;
          render();
          message('Texto importado al borrador. Revisa la ficha y pulsa «Guardar texto».');
        }).catch(() => {
          if (importText.isConnected && draft === previousDraft) {
            message('No se pudo importar el archivo. Elige un texto válido en UTF-8.', true);
          }
        });
      });
      sidebar.append(importButton, importText);
    }
    sidebar.append(find,bibliography,tagFilterDetails,list);draw();
    const editor=el('section','editor-pane');
    editor.append(el('h2','',editingId?'Editar texto':'Nuevo texto'));
    const form=el('form','editor-form');
    const bind=(k:keyof Omit<TextDraft,'id'|'vocabulary'|'reviewed'>)=>(value:string)=>{draft={...draft,[k]:value};dirty=true;};
    form.append(
      field('Título',draft.title,bind('title')),
      field('Autor',draft.author,bind('author')),
      field('Obra',draft.work,bind('work')),
      field('Libro, capítulo o pasaje',draft.reference,bind('reference')),
      field('Texto latino',draft.latin,bind('latin'),true),
    );
    if (independent) {
      form.append(field('Notas del texto', draft.notes ?? '', bind('notes'), true));
      const vocabulary = el('details','grammar-group');
      vocabulary.append(el('summary','','Vocabulario del texto'));
      const entries = el('div','editor-form');
      function drawVocabulary(): void {
        entries.replaceChildren();
        for (const [index, entry] of (draft.vocabulary ?? []).entries()) {
          const item = el('fieldset','editor-form');
          item.append(el('legend','',entry.headword || 'Nueva entrada'));
          for (const [key, label] of [['lemma','Lema'],['headword','Enunciado'],['meaning','Significado'],['note','Nota']] as const) {
            item.append(field(label, entry[key] ?? '', value => {
              draft = {...draft, vocabulary: draft.vocabulary!.map((current, i) => i === index
                ? {...current, [key]: key === 'meaning' || key === 'note' ? value || null : value}
                : current)};
              dirty = true;
            }));
          }
          item.append(button('Quitar entrada', () => {
            draft = {...draft, vocabulary: draft.vocabulary?.filter((_, i) => i !== index) ?? []};
            dirty = true;
            drawVocabulary();
          }, 'btn btn-outline'));
          entries.append(item);
        }
      }
      vocabulary.append(entries, button('Añadir entrada de vocabulario', () => {
        const existing = draft.vocabulary ?? [];
        const order = Math.max(-1, ...existing.map(entry => entry.order)) + 1;
        draft = {...draft, vocabulary: [...existing, {
          id: 'vocab.' + crypto.randomUUID(), lemma: '', headword: '', meaning: null, note: null,
          included: true, order, provenance: null, reviewState: 'manual', origin: 'manual', locked: true,
        }]};
        dirty = true;
        drawVocabulary();
      }, 'btn btn-outline'));
      drawVocabulary();
      form.append(vocabulary);
    }
    const grammar=el('section','grammar-editor');
    grammar.append(el('h3','','Etiquetas gramaticales'),
      el('p','hint','Selección docente manual. Clasifica por separado construcción, tiempo y voz del infinitivo, funciones sintácticas y pronombres. No se asignan etiquetas por IA.'));
    grammar.append(grammarPicker(allGrammarTags(snapshot?.corpus??{
      schemaVersion:1,texts:[],tags:[],notebooks:[],
    },pendingCustomTags),selectedTagIds,(id,checked)=>{
      if(checked)selectedTagIds.add(id);else selectedTagIds.delete(id);
      dirty=true;message('Etiquetas pendientes de guardar. Pulsa «Guardar texto».');
    },'grammar-editor-choices'));
    const customRow=el('div','grammar-custom-row');
    const customInput=el('input','field-control');
    customInput.placeholder='Nueva etiqueta personalizada';
    customInput.setAttribute('aria-label','Nueva etiqueta personalizada');
    const addCustom=button('Añadir etiqueta',()=>{
      const label=customInput.value.trim();
      if(!isCustomTagLabelValid(label)){
        message('Escribe una etiqueta personalizada de 1 a 160 caracteres.',true);return;
      }
      const already=findTagByLabel(label,allGrammarTags(snapshot?.corpus??{
        schemaVersion:1,texts:[],tags:[],notebooks:[],
      },pendingCustomTags));
      if(already){
        selectedTagIds.add(already.id);
        message('Etiqueta existente seleccionada. Guarda el texto.');
      }else{
        const tag:GrammarTag={id:'custom.'+crypto.randomUUID(),label,
          kind:'custom',parentId:null};
        pendingCustomTags.push(tag);selectedTagIds.add(tag.id);
        message('Etiqueta personalizada añadida al borrador. Guarda el texto.');
      }
      dirty=true;render();
    },'btn btn-outline');
    customRow.append(customInput,addCustom);
    grammar.append(customRow);
    form.append(grammar);
    if (independent) {
      const reviewLabel = el('label','grammar-item');
      const reviewed = el('input');
      reviewed.type = 'checkbox';
      reviewed.checked = draft.reviewed ?? false;
      reviewed.addEventListener('change', () => {
        draft = {...draft, reviewed: reviewed.checked};
        dirty = true;
      });
      form.querySelector('textarea')?.addEventListener('input', () => {
        if (!reviewed.checked) return;
        reviewed.checked = false;
        draft = {...draft, reviewed: false};
      });
      reviewLabel.append(reviewed,el('span','','Etiquetas revisadas'));
      form.append(reviewLabel);
    }
    const action=el('div','editor-actions');
    const save=button('Guardar texto',async()=>{
      if(!ready())return;
      if(!draft.title.trim()||!draft.latin.trim()){message('El título y el texto latino son obligatorios.',true);return;}
      const id=editingId??freshId();
      const chosen=[...selectedTagIds],customs=[...pendingCustomTags];
      const ok=await transaction(corpus=>attachGrammarTags(
        upsertText(corpus,draft,id,new Date().toISOString()),id,chosen,customs));
      if(ok){editingId=id;draft.id=id;dirty=false;pendingCustomTags=[];render();}
    },'btn btn-primary');
    if(!snapshot)save.disabled=true;
    action.append(save);
    if(editingId){
      const remove=button('Eliminar texto',async()=>{
        const references=snapshot?.corpus.notebooks.filter(book=>book.textIds.includes(editingId!)).length??0;
        if(!window.confirm('¿Eliminar este texto?'+(references?' Se conservará la versión usada en '+references+' cuaderno(s).':'')+' Esta acción no se puede deshacer sin una copia de seguridad.'))return;
        const id=editingId!;
        const ok=await transaction(corpus=>deleteText(corpus,id));
        if(ok){
          editingId=null;draft=emptyDraft();dirty=false;
          selectedTagIds.clear();pendingCustomTags=[];render();
        }
      },'btn btn-danger');
      action.append(remove);
      if(snapshot?.corpus.notebooks.length){
        const choose=el('select','field-control notebook-choice');
        choose.setAttribute('aria-label','Cuaderno al que añadir el texto');
        for(const book of snapshot.corpus.notebooks){
          const option=el('option','',book.title);option.value=book.id;choose.append(option);
        }
        if(currentNotebook)choose.value=currentNotebook;
        action.append(choose);
        action.append(button('Añadir al cuaderno',async()=>{
          currentNotebook=choose.value;
          const ok=await transaction(corpus=>addTextToNotebook(corpus,currentNotebook,editingId!));
          if(ok)render();
        },'btn btn-outline'));
      }
    }
    form.append(action);form.addEventListener('submit',(e)=>e.preventDefault());
    const hint=el('p','hint','Los textos se guardan localmente en IndexedDB. Las copias JSON de la fase 1 incluyen también estos textos.');
    editor.append(form,hint);
    shell.append(sidebar,editor);return shell;
  }

  function renderNotebooks(): HTMLElement {
    const shell=el('div','library-columns');
    const sidebar=el('aside','lib-sidebar');
    sidebar.append(el('h2','','1. Seleccionar textos'),
      el('p','hint','Crea un cuaderno, incorpora textos y ordénalos. Después pulsa «Cuaderno terminado» para entrar en la preparación A4.'));
    const createName=el('input','field-control');
    createName.placeholder='Nombre del cuaderno';createName.maxLength=250;
    sidebar.append(createName);
    sidebar.append(button('Crear cuaderno',async()=>{
      if(!createName.value.trim()){message('Escribe un nombre de cuaderno.',true);return;}
      const id='book.'+crypto.randomUUID();
      if(await transaction(corpus=>upsertNotebook(corpus,createName.value,id))){
        currentNotebook=id;render();
      }
    },'btn btn-primary'));
    const items=el('div','work-list');
    for(const notebook of snapshot?.corpus.notebooks??[]){
      const b=el('button','work-row'+(currentNotebook===notebook.id?' active':''));
      b.type='button';
      b.append(el('strong','',notebook.title),el('span','work-desc',notebook.textIds.length+' texto(s)'));
      b.addEventListener('click',()=>{currentNotebook=notebook.id;render();});
      items.append(b);
    }
    sidebar.append(items);
    const editor=el('section','editor-pane');
    const notebook=snapshot?.corpus.notebooks.find(b=>b.id===currentNotebook);
    if(!notebook) {
      editor.append(el('h2','','Selección de textos'));
      editor.append(el('p','hint','Crea un cuaderno y añade los textos que quieras. «Cuaderno terminado» abrirá las preguntas, el vocabulario y la vista previa A4.'));
    } else {
      editor.append(el('h2','',notebook.title));
      const rename=el('input','field-control');rename.value=notebook.title;rename.maxLength=250;rename.setAttribute('aria-label','Cambiar nombre del cuaderno');
      const actions=el('div','editor-actions');
      actions.append(button('Renombrar',async()=>{
        if(await transaction(corpus=>renameNotebook(corpus,notebook.id,rename.value)))render();
      },'btn btn-outline'));
      actions.append(button('Eliminar cuaderno',async()=>{
        if(!window.confirm('¿Eliminar el cuaderno? Los textos continuarán guardados en Mis textos.'))return;
        if(await transaction(corpus=>removeNotebook(corpus,notebook.id))){currentNotebook='';render();}
      },'btn btn-danger'));
      const finish=button('Cuaderno terminado',async()=>{
        if(!ready()||!confirmDiscard())return;
        await composer.open();
        if(!await composer.importLegacyNotebook(notebook.id))return;
        tab='compose';render();
      },'btn btn-primary workflow-finish');
      finish.disabled=!notebook.textIds.length;
      actions.append(finish);
      editor.append(rename,actions);
      editor.append(el('p','hint',
        notebook.textIds.length
          ? 'Al pulsar «Cuaderno terminado» se abre la preparación A4. Puedes volver aquí, añadir nuevos textos y pulsarlo otra vez; se conservan las preguntas y el vocabulario.'
          : 'Añade al menos un texto para habilitar «Cuaderno terminado».'));
      const available=snapshot?.corpus.texts.filter(t=>!notebook.textIds.includes(t.id))??[];
      if(available.length){
        const row=el('div','editor-actions');
        const select=el('select','field-control');
        select.setAttribute('aria-label','Seleccionar texto para añadir');
        for(const item of available){
          const option=el('option','',item.title);option.value=item.id;select.append(option);
        }
        row.append(select,button('Añadir texto',async()=>{
          if(await transaction(corpus=>addTextToNotebook(corpus,notebook.id,select.value)))render();
        },'btn btn-primary'));editor.append(row);
      }
      const sequence=el('ol','notebook-contents');
      for(const text of notebookTexts(snapshot!.corpus, notebook)){
        const id=text.id;
        const row=el('li','notebook-line');
        const label=el('div');
        label.append(el('strong','',text.title),el('span','work-desc',[text.source.author,text.source.work,text.source.reference].filter(Boolean).join(' · ')));
        row.append(label);
        row.append(button('↑',async()=>{if(await transaction(c=>moveTextInNotebook(c,notebook.id,id,-1)))render();},'btn btn-outline btn-icon'));
        row.append(button('↓',async()=>{if(await transaction(c=>moveTextInNotebook(c,notebook.id,id,1)))render();},'btn btn-outline btn-icon'));
        if(notebook.retainedTexts?.some(item=>item.textId===id)){
          const preview=el('details');
          preview.append(el('summary','','Ver pasaje conservado'),el('p','',text.latin));
          label.append(preview);
        }else{
          row.append(button('Abrir',()=>editText(id),'btn btn-outline'));
        }
        row.append(button('Quitar',async()=>{if(await transaction(c=>removeTextFromNotebook(c,notebook.id,id)))render();},'btn btn-outline'));
        sequence.append(row);
      }
      if(!notebook.textIds.length)editor.append(el('p','hint','Este cuaderno todavía no contiene textos.'));
      editor.append(sequence);
    }
    shell.append(sidebar,editor);return shell;
  }

  function render():void {
    root.replaceChildren();
    const head=el('div','workspace-header');
    const brand=el('div','workspace-brand');
    brand.append(el('p','phase','BIBLIOTECA · SELECCIÓN DE TEXTOS → PREPARACIÓN A4'),
      el('h1','','Cuaderno de textos latinos'),
      el('p','workspace-subtitle','Selecciona pasajes, prepara preguntas y compón tus cuadernos.'));
    const tag=el('span','offline-indicator',offlinePrepared?'Biblioteca preparada sin conexión':'Preparando biblioteca sin conexión');
    head.append(brand,tag);
    const tabs=el('nav','workspace-tabs');
    tabs.setAttribute('aria-label','Apartados del cuaderno');
    // Conservar los nombres históricos de los apartados para accesibilidad
    // y compatibilidad; el orden del flujo se explica dentro de Cuadernos.
    const buttons:[Tab,string][]=[['library','Biblioteca'],['texts','Mis textos'],
      ['notebooks','Cuadernos'],['compose','Preparar cuaderno']];
    for(const [key,title] of buttons) {
      const b=button(title,()=>setTab(key),'workspace-tab'+(tab===key?' current':''));
      b.setAttribute('aria-current',tab===key?'page':'false');
      tabs.append(b);
    }
    if(independent){
      const home=el('a','workspace-tab','Volver al inicio');
      home.href='?';
      home.addEventListener('click',event=>{
        if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
        event.preventDefault();
        if(!confirmDiscard())return;
        void (async()=>{
          if(tab!=='compose'||await composer.flush())window.location.assign(home.href);
        })();
      });
      tabs.append(home);
    }
    const state=el('p','workspace-status','');
    state.id='phase2-status';
    state.role='status';
    state.setAttribute('aria-live','polite');
    state.dataset.error=String(statusIsError);
    state.textContent=statusMessage;
    root.append(head,tabs);
    if(tab==='library')root.append(renderCatalog());
    else if(tab==='texts')root.append(renderMyTexts());
    else if(tab==='notebooks')root.append(renderNotebooks());
    else root.append(composer.element);
    root.append(state);
  }

  const originEvent=async()=>{
    try {
      const next=await repository.load();
      // Cambiar el foco (p. ej., al mostrar los tiradores de Safari) no debe
      // repintar todo el lector y destruir la selección nativa.
      if(!dirty){
        if(!snapshot || next.revision!==snapshot.revision){snapshot=next;render();}
      } else if(!snapshot || next.revision!==snapshot.revision) {
        message('El almacenamiento ha cambiado: guarda o descarta tu borrador antes de releer.',true);
      }
    }catch(err){message(err instanceof Error?err.message:String(err),true);}
  };
  document.addEventListener('selectionchange',syncReaderSelection);
  window.addEventListener('corpus-updated',()=>{void originEvent();});
  window.addEventListener('focus',()=>{if(!busy&&!dirty)void originEvent();});
  window.addEventListener('online',()=>{message('Conexión disponible. La biblioteca instalada también funciona sin conexión.');});
  window.addEventListener('offline',()=>{message('Sin conexión: usa la biblioteca de César, Eutropio y Nepote y tus textos locales.');});

  render();
  void (async()=>{
    try {
      const [s,response]=await Promise.all([
        repository.load(),
        fetch(new URL('../library/catalog.json',import.meta.url)),
      ]);
      if(!response.ok)throw new Error('La biblioteca offline no se ha incluido en la publicación ('+response.status+').');
      const catalog:unknown=await response.json();
      const works=(catalog as {works?:unknown})?.works;
      if(!Array.isArray(works)||works.length<27)throw new Error('El catálogo de la biblioteca está incompleto.');
      if(!works.every(x=>x&&typeof x==='object'&&typeof x.urn==='string'&&typeof x.author==='string'&&typeof x.file==='string')){
        throw new Error('Formato del catálogo incorrecto.');
      }
      snapshot=s;catalogue=works as LibraryEntry[];
      currentNotebook=s.corpus.notebooks[0]?.id??'';
      message('Biblioteca cargada ('+catalogue.length+' obras). Toca una obra para elegir fragmentos.');
      render();
    }catch(err){
      try{snapshot=await repository.load();}catch{}
      message('No se ha podido abrir la biblioteca: '+(err instanceof Error?err.message:String(err)),true);
      render();
    }
  })();

  if('serviceWorker' in navigator && window.isSecureContext){
    void navigator.serviceWorker.register('./service-worker.js').then(async()=>{
      await navigator.serviceWorker.ready;
      offlinePrepared=true;
      const indicator=root.querySelector<HTMLElement>('.offline-indicator');
      if(indicator)indicator.textContent='Biblioteca preparada sin conexión';
    }).catch(e=>message('Los textos se pueden consultar en línea, pero no se ha podido preparar la caché sin conexión: '+String(e),true));
  }
}
