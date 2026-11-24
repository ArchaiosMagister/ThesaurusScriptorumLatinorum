import { readPauCvPdf, morphologyMarks } from './atl-pau-cv-parser.js';
export function importPauCv({modal,save,toast}) {
  const input=document.createElement('input');input.type='file';input.accept='.pdf,application/pdf';input.multiple=true;
  input.addEventListener('change',async()=>{
    const files=[...input.files];if(!files.length)return;
    const root=document.createElement('div');root.className='atl-pau-import';
    const status=document.createElement('p');status.setAttribute('role','status');root.append(status);
    let records=[],busy=true;
    const errors=[];
    const submit=document.createElement('button');submit.type='button';submit.className='hbtn primary';submit.textContent='Importar fichas al banco';submit.disabled=true;
    const popup=modal('Importar PDF · PAU CV',root,[{label:'Cancelar'}],{width:'min(1000px,96vw)',noFocus:true});
    const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
    const field=(parent,label,value,multiline=false)=>{
      const wrap=el('label',label);wrap.className='field';const control=el(multiline?'textarea':'input');
      control.value=value??'';control.setAttribute('aria-label',label);if(multiline)control.rows=5;
      wrap.append(control);parent.append(wrap);return control;
    };
    for(const file of files){
      status.textContent='Leyendo '+file.name+'…';
      try {
        const pair=await readPauCvPdf(file);
        if(!root.isConnected)return;
        const section=el('section');section.className='atl-pau-pair';
        section.append(el('h3',file.name+' · '+pair[0].session+' '+pair[0].year),
          el('p',pair[0].model==='antiguo'?'Modelo antiguo: el léxico se generará desde nuestro banco.':'Modelo actual: léxico original compartido por las dos opciones.'));
        for(const item of pair){
          const card=el('article');card.className='atl-pau-card';
          card.append(el('h4','Opción '+item.option));
          const title=field(card,'Título '+item.option,item.doc.title);
          const author=field(card,'Autor '+item.option,item.doc.author);
          const work=field(card,'Obra '+item.option,item.doc.work);
          const reference=field(card,'Referencia '+item.option,item.doc.reference);
          const latin=field(card,'Texto latino '+item.option,item.doc.latin,true);
          const forms=field(card,'Formas morfológicas '+item.option,item.doc.underlines.map(m=>m.exact).join(', '));
          const notes=field(card,'Contexto en castellano '+item.option,item.notes,true);
          if(item.doc.warnings.length)card.append(el('p',item.doc.warnings.join(' ')));
          section.append(card);
          records.push({item,read:()=>{
            const text=latin.value.trim(),words=forms.value.split(',').map(s=>s.trim()).filter(Boolean);
            if(!title.value.trim()||!author.value.trim()||!work.value.trim()||!reference.value.trim()||!text||words.length!==4)throw Error('Completa la ficha '+item.option+' y sus cuatro formas morfológicas.');
            return {...item,notes:notes.value.trim(),doc:{...item.doc,title:title.value.trim(),author:author.value.trim(),work:work.value.trim(),reference:reference.value.trim(),latin:text,underlines:morphologyMarks(text,words),warnings:[]}};
          }});
        }
        if(pair[0].model==='actual'){
          const shared=el('section');shared.className='atl-pau-lexical';shared.append(el('h4','Léxico compartido'));
          const fields={};
          for(const [kind,label] of [['phonetics','Evolución fonética'],['prefix','Prefijos'],['latinism','Latinismos']])fields[kind]=field(shared,label,pair[0].doc.lexical[kind].join('\n'),true);
          const bases=field(shared,'Bases preverbiales',pair[0].doc.preverbBases.join(', '));
          for(const record of records.filter(r=>pair.includes(r.item))){
            const read=record.read;
            record.read=()=>{
              const result=read();
              for(const [kind,control] of Object.entries(fields)){
                const values=control.value.split('\n').map(s=>s.trim()).filter(Boolean);
                if(values.length!==4)throw Error('Se necesitan cuatro términos en '+kind+'.');
                result.doc.lexical[kind]=values;
              }
              const values=bases.value.split(',').map(s=>s.trim()).filter(Boolean);
              if(values.length!==2)throw Error('Se necesitan dos bases preverbiales.');
              result.doc.preverbBases=values;return result;
            };
          }
          section.append(shared);
        }
        root.append(section);
      } catch(error){const message=file.name+': '+error.message;errors.push(message);root.append(el('p',message));}
    }
    busy=false;status.textContent=records.length+' fichas detectadas. Revisa antes de guardar.'+(errors.length?' '+errors.join(' · '):'');submit.disabled=!records.length;root.append(submit);
    submit.addEventListener('click',async()=>{
      if(busy)return;busy=true;submit.disabled=true;
      try{const result=await save(records.map(r=>r.read()));popup.close();toast(result+' fichas nuevas importadas.');}
      catch(error){status.textContent=error.message;status.scrollIntoView({block:'nearest'});}
      finally{busy=false;submit.disabled=false;}
    });
  });
  input.click();
}
