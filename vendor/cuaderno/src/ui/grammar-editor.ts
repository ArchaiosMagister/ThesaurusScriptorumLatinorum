import {foldLatin} from '../core/library.js';
import {allGrammarTags,GRAMMAR_GROUP_IDS,matchesGrammarTag,placementGrammarTags} from '../core/grammar-tags.js';
import type {CorpusV1} from '../core/model.js';
import type {TextPlacementV1} from '../core/edition-model.js';

function el<K extends keyof HTMLElementTagNameMap>(kind:K,cls='',text=''):HTMLElementTagNameMap[K]{
  const element=document.createElement(kind);element.className=cls;element.textContent=text;return element;
}
function button(label:string,action:()=>void|Promise<void>,cls='btn btn-outline'):HTMLButtonElement{
  const control=el('button',cls,label);control.type='button';
  control.addEventListener('click',async()=>{
    control.disabled=true;
    try{await action();}finally{control.disabled=false;}
  });
  return control;
}

export function renderGrammarEditor(placement:TextPlacementV1, corpus:CorpusV1, controls:{
  open:boolean;
  toggle:(open:boolean)=>void;
  saveTags:(ids:string[])=>Promise<void>;
  addCustomTag:(label:string)=>Promise<void>;
  addSpan:(start:number,end:number,tagId:string)=>Promise<boolean>;
  removeSpan:(id:string,tagId?:string)=>Promise<boolean>;
  updated:()=>Promise<void>;
  notice:(message:string,error?:boolean)=>void;
}):HTMLElement{
    const {saveTags,addCustomTag,notice}=controls;
    const detail=el('details','simple-grammar');detail.open=controls.open;
    detail.addEventListener('toggle',()=>{controls.toggle(detail.open);});
    detail.append(el('summary','','Etiquetas gramaticales ('+placementGrammarTags(placement).length+')'));
    const body=el('div','simple-grammar-body');
    body.append(el('p','hint','Etiquetas manuales del texto actual. No modifican las demás apariciones.'));
    const all=allGrammarTags(corpus);
    const selectedTags=placementGrammarTags(placement);
    const chips=el('div','grammar-chips');
    chips.setAttribute('aria-label','Etiquetas seleccionadas');
    for(const id of selectedTags){
      const tag=all.find(item=>item.id===id);
      const chip=el('span','grammar-chip',tag?.label??id);
      chip.dataset.group=GRAMMAR_GROUP_IDS.find(group=>matchesGrammarTag(id,group,all))??'custom';
      chips.append(chip);
    }
    body.append(chips);
    const search=el('input','field-control grammar-tag-search');
    search.type='search';search.placeholder='Buscar en el catálogo';
    search.setAttribute('aria-label','Buscar etiqueta gramatical');
    body.append(search);

    const children=(parent:string,host:HTMLElement,depth=0):void=>{
      for(const tag of all.filter(t=>t.parentId===parent)){
        const row=el('label','simple-tag-option');
        row.style.paddingLeft=(Math.min(depth,4)*12+5)+'px';
        const cb=el('input');cb.type='checkbox';cb.checked=placement.grammaticalTagIds.includes(tag.id);
        cb.setAttribute('aria-label',tag.label);
        cb.addEventListener('change',()=>{
          const next=new Set(placement.grammaticalTagIds);
          if(cb.checked)next.add(tag.id);else next.delete(tag.id);
          void saveTags([...next]);
        });
        row.append(cb,el('span','',tag.label));host.append(row);
        if(depth<5)children(tag.id,host,depth+1);
      }
    };
    for(const groupId of GRAMMAR_GROUP_IDS){
      const group=all.find(t=>t.id===groupId);
      if(!group)continue;
      const details=el('details','simple-tag-group');
      details.open=placement.grammaticalTagIds.some(id=>matchesGrammarTag(id,groupId,all));
      details.append(el('summary','',group.label));
      const list=el('div','simple-tag-group-list');children(groupId,list);
      details.append(list);body.append(details);
    }
    const custom=all.filter(t=>t.kind==='custom');
    if(custom.length){
      const group=el('details','simple-tag-group');
      group.append(el('summary','','Personalizadas'));
      for(const tag of custom){
        const row=el('label','simple-tag-option'),cb=el('input');
        cb.type='checkbox';cb.checked=placement.grammaticalTagIds.includes(tag.id);
        cb.addEventListener('change',()=>{
          const next=new Set(placement.grammaticalTagIds);
          if(cb.checked)next.add(tag.id);else next.delete(tag.id);
          void saveTags([...next]);
        });
        row.append(cb,el('span','',tag.label));group.append(row);
      }
      body.append(group);
    }
    const own=el('div','simple-new-tag'),input=el('input','field-control');
    input.placeholder='Nueva etiqueta personalizada';
    input.setAttribute('aria-label','Nueva etiqueta gramatical');
    own.append(input,button('Añadir',()=>addCustomTag(input.value)));
    body.append(own);
    search.addEventListener('input',()=>{
      const query=foldLatin(search.value.trim());
      for(const group of Array.from(body.querySelectorAll<HTMLDetailsElement>('.simple-tag-group'))){
        const options=Array.from(group.querySelectorAll<HTMLElement>('.simple-tag-option'));
        for(const option of options)option.hidden=Boolean(query)&&!foldLatin(option.textContent??'').includes(query);
        group.hidden=Boolean(query)&&options.every(option=>option.hidden);
        if(query&&!group.hidden)group.open=true;
      }
    });
    const fragments=el('details','notebook-fragments');
    fragments.append(el('summary','','Etiquetar fragmentos del texto ('+
      (placement.grammaticalSpans?.length??0)+')'));
    const segment=el('div','notebook-fragment-editor');
    segment.append(el('p','hint','Selecciona una expresión latina dentro del campo siguiente y elige su construcción gramatical.'));
    const area=el('textarea','field-control');
    area.readOnly=true;area.rows=6;area.value=placement.text.latin;
    area.setAttribute('aria-label','Seleccionar fragmento latino');
    const choose=el('select','field-control');
    choose.setAttribute('aria-label','Construcción del fragmento');
    for(const tag of all){
      const option=el('option','',tag.label);option.value=tag.id;choose.append(option);
    }
    const add=button('Etiquetar selección',async()=>{
      const start=area.selectionStart,end=area.selectionEnd;
      if(!choose.value||end<=start){notice('Selecciona primero un fragmento latino.',true);return;}
      if(await controls.addSpan(start,end,choose.value)){
        await controls.updated();
        notice('Etiqueta de fragmento guardada sin modificar las preguntas.');
      }else notice('No se ha podido guardar la etiqueta de fragmento.',true);
    },'btn btn-primary');
    segment.append(area,choose,add);
    const saved=el('div','notebook-fragment-items');
    for(const span of placement.grammaticalSpans??[]){
      const row=el('div','notebook-fragment-row');
      const names=span.tagIds.map(id=>all.find(t=>t.id===id)?.label??id);
      row.append(el('span','',span.exact+' · '+names.join(', ')+
        (span.reviewRequired?' · Revisar anclaje':'')));
      if(span.tagIds.length>1){
        const tagToRemove=el('select','field-control');
        tagToRemove.setAttribute('aria-label','Etiqueta que quitar de «'+span.exact+'»');
        span.tagIds.forEach((id,index)=>{
          const option=el('option','',names[index]);
          option.value=id;tagToRemove.append(option);
        });
        row.append(tagToRemove,button('Quitar etiqueta',async()=>{
          if(!await controls.removeSpan(span.id,tagToRemove.value))return;
          await controls.updated();
          notice('Etiqueta retirada del fragmento.');
        }));
      }
      row.append(button('Quitar',async()=>{
        if(!await controls.removeSpan(span.id))return;
        await controls.updated();
        notice('Etiqueta de fragmento retirada; texto y preguntas intactos.');
      }));
      saved.append(row);
    }
    segment.append(saved);fragments.append(segment);
    body.append(fragments);detail.append(body);return detail;
  }
