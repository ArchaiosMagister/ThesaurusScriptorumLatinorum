/** Ficha de lectura local, fuera de la hoja exportable. Safari/iPad: tap; escritorio: hover. */
import type {CollatinusGrammarToken,CollatinusGrammarCandidate} from '../core/collatinus-grammar.js';
type RichCandidate=CollatinusGrammarCandidate & {trad?:string};
type RichToken=Omit<CollatinusGrammarToken,'cands'> & {cands?:RichCandidate[]};
interface Hit {paragraph:HTMLElement;start:number;end:number;word:string;rect:DOMRect}
const WORD=/[\p{L}][\p{L}\p{M}]*/gu;
export function latinWordAtOffset(latin:string,offset:number):{start:number;end:number;word:string}|null{
  if(!Number.isSafeInteger(offset)||offset<0||offset>latin.length)return null;
  for(const m of latin.matchAll(WORD)){
    const start=m.index!,end=start+m[0].length;
    if(offset>=start&&offset<=end)return {start,end,word:m[0]};
  }
  return null;
}
function textRange(paragraph:HTMLElement,start:number,end:number):Range|null{
  const walk=document.createTreeWalker(paragraph,NodeFilter.SHOW_TEXT);
  let cur:Node|null,total=0,first:Text|null=null,last:Text|null=null,firstAt=0,lastAt=0;
  while((cur=walk.nextNode())){
    const text=cur as Text,length=text.length;
    if(!first&&start>=total&&start<=total+length){first=text;firstAt=start-total;}
    if(end>=total&&end<=total+length){last=text;lastAt=end-total;break;}
    total+=length;
  }
  if(!first||!last)return null;
  const r=document.createRange();
  r.setStart(first,firstAt);r.setEnd(last,lastAt);
  return r;
}
function hitAt(x:number,y:number,root:HTMLElement):Hit|null{
  // En Safari el cursor obtenido por caretPositionFromPoint puede ser el de
  // un nodo vecino, especialmente si el texto está subrayado o tiene zoom.
  // Comprobamos el rectángulo de cada token: el punto debe estar dentro de
  // las letras reales y no en el margen ni en el espacio entre palabras.
  const element=document.elementFromPoint(x,y);
  // WebKit puede asignar el clic al papel o a un elemento adyacente aunque
  // el rectángulo real del token coincida con ese punto. La comprobación
  // final se hace siempre contra las letras del texto (exact), no el margen.
  if(!element||!root.contains(element))return null;
  const paragraph=element.closest<HTMLElement>('.edition-latin')??
    Array.from(root.querySelectorAll<HTMLElement>('.edition-latin')).find(candidate=>{
      const box=candidate.getBoundingClientRect();
      return x>=box.left-4&&x<=box.right+4&&y>=box.top-4&&y<=box.bottom+4;
    });
  if(!paragraph)return null;
  const latin=paragraph.textContent??'';
  const doc=document as Document&{
    caretRangeFromPoint?:(x:number,y:number)=>Range|null;
    caretPositionFromPoint?:(x:number,y:number)=>{offsetNode:Node;offset:number}|null;
  };
  const pos=doc.caretPositionFromPoint?.(x,y)??(()=>{
    const r=doc.caretRangeFromPoint?.(x,y);
    return r?{offsetNode:r.startContainer,offset:r.startOffset}:null;
  })();
  let preferred:ReturnType<typeof latinWordAtOffset>=null;
  if(pos){
    const prefix=document.createRange();prefix.selectNodeContents(paragraph);
    try{
      prefix.setEnd(pos.offsetNode,pos.offset);
      preferred=latinWordAtOffset(latin,prefix.toString().length);
    }catch{/* Usar la búsqueda geométrica. */}
  }
  function exact(start:number,end:number,word:string):Hit|null{
    const range=textRange(paragraph!,start,end);
    if(!range)return null;
    for(const box of Array.from(range.getClientRects())){
      if(box.width>0&&box.height>0&&x>=box.left-4&&x<=box.right+4&&
        y>=box.top-4&&y<=box.bottom+4){
        return {paragraph:paragraph!,start,end,word,rect:box};
      }
    }
    return null;
  }
  if(preferred){
    const hit=exact(preferred.start,preferred.end,preferred.word);
    if(hit)return hit;
  }
  for(const item of latin.matchAll(WORD)){
    const start=item.index!,end=start+item[0].length;
    if(preferred?.start===start)continue;
    const hit=exact(start,end,item[0]);
    if(hit)return hit;
  }
  return null;
}
function el<K extends keyof HTMLElementTagNameMap>(tag:K,cls='',content=''):HTMLElementTagNameMap[K]{
  const item=document.createElement(tag);
  if(cls)item.className=cls;
  if(content)item.textContent=content;
  return item;
}
export function attachLatinReadingCards(
  root:HTMLElement,
  analyze:(latin:string)=>Promise<CollatinusGrammarToken[]>,
):()=>void{
  let pop:HTMLElement|null=null,opened='',latest=0,hoverTimer:number|undefined;
  let pointerDown:{x:number;y:number}|null=null;
  const fine=matchMedia('(hover: hover) and (pointer: fine)').matches;
  const close=()=>{latest++;opened='';pop?.remove();pop=null;};
  const cancelHover=()=>{if(hoverTimer!==undefined){clearTimeout(hoverTimer);hoverTimer=undefined;}};
  function position(card:HTMLElement,rect:DOMRect){
    const width=Math.min(380,window.innerWidth-24);
    card.style.width=width+'px';
    if(window.matchMedia('(max-width: 560px)').matches){
      card.classList.add('edition-lexical-sheet');card.style.left='0px';card.style.top='';
      return;
    }
    const x=Math.min(window.innerWidth-width-10,Math.max(10,rect.left+(rect.width-width)/2));
    const below=rect.bottom+10,above=rect.top-card.offsetHeight-10;
    const y=below+card.offsetHeight<window.innerHeight-12?below:Math.max(10,above);
    card.style.left=x+'px';card.style.top=y+'px';
  }
  function head(card:HTMLElement,word:string,rect:DOMRect){
    const top=el('div','edition-lexical-card-head');
    const form=el('strong','edition-lexical-card-form',word);
    form.lang='la';
    const x=el('button','edition-lexical-close','×');x.type='button';x.setAttribute('aria-label','Cerrar ficha');
    x.addEventListener('click',close);
    top.append(form,x);card.append(top);
    position(card,rect);
  }
  function fill(card:HTMLElement,token:RichToken|null,rect:DOMRect){
    card.querySelector('.edition-lexical-card-body')?.remove();
    const body=el('div','edition-lexical-card-body');
    if(!token?.cands?.length){
      body.append(el('p','edition-lexical-empty','No hay análisis de Collatinus para esta forma.'));
    }else{
      const ordered=[...token.cands].sort((a,b)=>Number(b.lid===token.sel?.lid)-Number(a.lid===token.sel?.lid));
      for(const cand of ordered){
        const block=el('div','edition-lexical-lemma');
        const heading=el('strong','edition-lexical-lemma-name',cand.lemma);heading.lang='la';
        block.append(heading);
        if(cand.im)block.append(el('span','edition-lexical-indication',cand.im));
        if(cand.trad)block.append(el('p','edition-lexical-gloss',cand.trad));
        const orderedMorphs=[...cand.morphos].sort((a,b)=>
          Number(b===token.sel?.morpho&&cand.lid===token.sel?.lid)-
          Number(a===token.sel?.morpho&&cand.lid===token.sel?.lid));
        const list=el('ul','edition-lexical-analyses');
        for(const morph of orderedMorphs.slice(0,6)){
          const preferred=cand.lid===token.sel?.lid&&morph===token.sel?.morpho;
          const item=el('li',preferred?'edition-lexical-preferred':'',morph||'Análisis no disponible');
          if(preferred){
            item.prepend(el('span','edition-lexical-preferred-label','Más probable según el contexto · '));
          }
          list.append(item);
        }
        if(orderedMorphs.length>6)block.append(el('p','edition-lexical-more',
          'Se muestran seis de '+orderedMorphs.length+' análisis.'));
        block.append(list);body.append(block);
      }
      body.append(el('p','edition-lexical-caveat',
        'La lectura contextual es una estimación de Collatinus, no una verificación docente.'));
    }
    card.append(body);position(card,rect);
  }
  async function show(hit:Hit){
    const latin=hit.paragraph.textContent??'';
    const id=(hit.paragraph.dataset.placementId??'')+':'+hit.start+':'+hit.end;
    if(id===opened&&pop)return;
    close();opened=id;
    const req=++latest;
    const card=el('section','edition-lexical-card');
    card.setAttribute('role','dialog');card.setAttribute('aria-label','Lematización de '+hit.word);
    head(card,hit.word,hit.rect);
    card.append(el('div','edition-lexical-card-body','Consultando Collatinus…'));
    document.body.append(card);pop=card;position(card,hit.rect);
    try{
      const result=await analyze(latin) as RichToken[];
      if(req!==latest||!card.isConnected)return;
      const token=result.find(t=>t.s===hit.start&&t.e===hit.end&&t.w===hit.word)??null;
      fill(card,token,hit.rect);
    }catch{
      if(req!==latest||!card.isConnected)return;
      const body=card.querySelector('.edition-lexical-card-body');
      if(body)body.textContent='No se pudo cargar el análisis local de Collatinus.';
    }
  }
  function move(e:PointerEvent){
    if(!fine||e.buttons||e.pointerType==='touch')return;
    cancelHover();
    const hit=hitAt(e.clientX,e.clientY,root);
    if(!hit)return;
    const id=(hit.paragraph.dataset.placementId??'')+':'+hit.start+':'+hit.end;
    if(id===opened)return;
    hoverTimer=window.setTimeout(()=>{void show(hit);},450);
  }
  function down(e:PointerEvent){pointerDown={x:e.clientX,y:e.clientY};}
  function click(e:MouseEvent){
    const selection=window.getSelection();
    if(selection&&!selection.isCollapsed&&selection.toString().trim())return;
    if(pointerDown&&Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)>10)return;
    const hit=hitAt(e.clientX,e.clientY,root);
    if(hit)void show(hit);else close();
  }
  function outside(e:PointerEvent){if(pop&&!pop.contains(e.target as Node)&&!root.contains(e.target as Node))close();}
  function escape(e:KeyboardEvent){if(e.key==='Escape')close();}
  root.addEventListener('pointermove',move);root.addEventListener('pointerdown',down);
  root.addEventListener('click',click);root.addEventListener('pointerleave',cancelHover);
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return ()=>{cancelHover();close();root.removeEventListener('pointermove',move);
    root.removeEventListener('pointerdown',down);root.removeEventListener('click',click);
    root.removeEventListener('pointerleave',cancelHover);
    document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);
  };
}
