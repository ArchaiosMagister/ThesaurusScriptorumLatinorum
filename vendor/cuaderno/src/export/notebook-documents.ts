/** Exportación OOXML del mismo NotebookEditionV1 que dibuja la hoja A4.
 * Formato DOCX portable: A4, títulos, cursivas/subrayados por offsets UTF-16,
 * cuatro preguntas, vocabulario y campos PAGE / NUMPAGES.
 * PDF se imprime desde el mismo modelo mediante el sistema del navegador.
 */
import {formattedVocabularyMeaning} from '../core/vocabulary-format.js';
import {vocabularySortKey} from '../core/vocabulary-preferences.js';
import {extraLatinSpacingPt} from '../core/latin-spacing.js';
import type { NotebookEditionV1, TextPlacementV1, QuestionV1, PageFormatV1, NotebookCoverV1 } from '../core/edition-model.js';
import { validateEdition, checkEditionReadiness } from '../core/edition-validation.js';
import { questionDisplayText } from '../core/edition-operations.js';
import {displayedAcademicSlotValue} from '../core/academic-engine.js';
import { splitInlineItalics, splitLatinOmissions } from '../core/edition-inline-formatting.js';
import { zipStore } from './zip-store.js';

const XML='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function esc(value:string):string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&apos;');
}
const twips=(points:number)=>Math.round(points*20);
const attrs=(x:Record<string,string|number>)=>Object.entries(x).map(([k,v])=>' '+k+'="'+esc(String(v))+'"').join('');
function paraProps(options:{
  align?:'center'|'left'|'both';before?:number;after?:number;linePt?:number;
  keepNext?:boolean;keepLines?:boolean;pageBreak?:boolean;left?:number;hanging?:number;
  topBorder?:boolean;bottomBorder?:boolean;
}={}):string {
  // Orden CT_PPrBase de WordprocessingML: keep*, borders, spacing, ind, jc.
  let s='<w:pPr>';
  if(options.keepNext)s+='<w:keepNext/>';
  if(options.keepLines)s+='<w:keepLines/>';
  if(options.pageBreak)s+='<w:pageBreakBefore/>';
  if(options.topBorder||options.bottomBorder){
    s+='<w:pBdr>';
    for(const name of ['top','bottom'] as const){
      if(options[name==='top'?'topBorder':'bottomBorder'])
        s+='<w:'+name+' w:val="single" w:sz="4" w:color="777777" w:space="5"/>';
    }
    s+='</w:pBdr>';
  }
  if(options.before!==undefined||options.after!==undefined||options.linePt!==undefined){
    const a:Record<string,string|number>={};
    if(options.before!==undefined)a['w:before']=twips(options.before);
    if(options.after!==undefined)a['w:after']=twips(options.after);
    if(options.linePt!==undefined){a['w:line']=twips(options.linePt);a['w:lineRule']='exact';}
    s+='<w:spacing'+attrs(a)+'/>';
  }
  if(options.left!==undefined||options.hanging!==undefined)
    s+='<w:ind'+attrs({'w:left':options.left??0,'w:hanging':options.hanging??0})+'/>';
  if(options.align)s+='<w:jc w:val="'+options.align+'"/>';
  return s+'</w:pPr>';
}
function run(text:string,{bold=false,italic=false,underline=false,sizePt}:{
  bold?:boolean;italic?:boolean;underline?:boolean;sizePt?:number;
}={}):string {
  if(!text)return '';
  const flags=(bold?'<w:b/>':'')+(italic?'<w:i/>':'')+
    (underline?'<w:u w:val="single"/>':'')+
    (sizePt===undefined?'':'<w:sz w:val="'+Math.round(sizePt*2)+'"/>');
  const parts=text.replace(/\r\n?/g,'\n').split('\n');
  return '<w:r>'+(flags?'<w:rPr>'+flags+'</w:rPr>':'')+
    parts.map((part,i)=>(i?'<w:br/>':'')+'<w:t xml:space="preserve">'+esc(part)+'</w:t>').join('')+
    '</w:r>';
}
function paragraph(text:string,props:string,flags:{bold?:boolean;italic?:boolean;underline?:boolean;sizePt?:number}={}):string{
  return '<w:p>'+props+run(text,flags)+'</w:p>';
}
/** Corchetes y omisiones en redonda también en Word. */
function latinRun(text:string,start:number,end:number,italic:boolean,underline=false):string{
  return splitLatinOmissions(text,start,end).map(part=>run(part.text,{
    italic:italic&&!part.roman,underline,
  })).join('');
}
function latin(p:TextPlacementV1,f:PageFormatV1):string{
  const marks=p.text.markup.slice().sort((a,b)=>a.startUtf16-b.startUtf16);
  const source=p.text.latin;
  let cursor=0,body='';
  for(const mark of marks){
    if(mark.startUtf16<cursor||mark.endUtf16>source.length)continue;
    body+=latinRun(source,cursor,mark.startUtf16,true);
    // No aparentar un subrayado válido si el anclaje está pendiente.
    body+=latinRun(source,mark.startUtf16,mark.endUtf16,mark.kind!=='editorial-roman',
      mark.kind==='morph-underline'&&!mark.reviewRequired);
    cursor=mark.endUtf16;
  }
  body+=latinRun(source,cursor,source.length,true);
  // Espacio posterior del pasaje igual al interlineado adicional (3 pt por defecto),
  // sin la antigua separación artificial de 6 em.
  return '<w:p>'+paraProps({align:'both',after:extraLatinSpacingPt(f.fontSizePt,f.lineSpacingPt),linePt:f.lineSpacingPt})+body+'</w:p>';
}
function vocabulary(p:TextPlacementV1,f:PageFormatV1):string{
  const rows=p.vocabulary.filter(v=>v.included).sort((a,b)=>
    vocabularySortKey(a.headword).localeCompare(vocabularySortKey(b.headword),'es',{sensitivity:'base'}));
  if(!rows.length)return '';
  // El ancho auto sin tblGrid dejaba la tabla fuera del A4 y LibreOffice
  // incluso omitía su primera fila ("Vocabulario"). Anchura fija entre márgenes.
  const availableTwips=11906-twips(f.marginsPt.left)-twips(f.marginsPt.right);
  const cell=(inside:string)=>'<w:tr><w:tc><w:tcPr><w:tcW w:w="'+availableTwips+
    '" w:type="dxa"/></w:tcPr>'+inside+'</w:tc></w:tr>';
  let body=cell(paragraph('Vocabulario',paraProps({align:'center',after:5,keepNext:true}),{bold:true}));
  for(const entry of rows){
    const meaning=entry.meaning?': '+formattedVocabularyMeaning(entry.meaning,entry.glossesSeparated):': [significado pendiente]';
    let text='<w:p>'+paraProps({after:1})+run(entry.headword,{italic:true})+
      run(meaning)+(entry.note?run(' ('+entry.note+')'):'')+'</w:p>';
    body+=cell(text);
  }
  return '<w:tbl><w:tblPr><w:tblW w:w="'+availableTwips+'" w:type="dxa"/>'+
    '<w:tblBorders><w:top w:val="single" w:sz="6"/><w:left w:val="single" w:sz="6"/>'+
    '<w:bottom w:val="single" w:sz="6"/><w:right w:val="single" w:sz="6"/>'+
    '<w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>'+
    '<w:tblCellMar><w:top w:w="30" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/>'+
    '<w:left w:w="85" w:type="dxa"/><w:right w:w="85" w:type="dxa"/></w:tblCellMar>'+
    '<w:tblLayout w:type="fixed"/></w:tblPr>'+
    '<w:tblGrid><w:gridCol w:w="'+availableTwips+'"/></w:tblGrid>'+
    body+'</w:tbl>';
}
export function exportQuestionHeading(q:QuestionV1,showPoints:boolean):string {
  const text=questionDisplayText(q);
  if(!showPoints)return text;
  const pts=(q.pointsHundredths/100).toLocaleString('es-ES');
  const points=' ('+pts+'p.)';
  return text.trimEnd().endsWith(':')?text.trimEnd().slice(0,-1)+points+':':text+points;
}
function questions(p:TextPlacementV1,f:PageFormatV1):string{
  let body='',index=0;
  for(const q of p.questions.filter(q=>q.enabled)){
    index++;
    const style=q.styleOverride;
    const before=style?.beforePt??(index===1?8:f.questionGapPt);
    const after=style?.afterPt??(q.kind==='choice'?4:0);
    // Mantener unida la batería de preguntas cortas. Sin keepNext, la primera
    // quedaba huérfana al final de la página 2 en documentos largos reales.
    body+=paragraph(index+'.  '+exportQuestionHeading(q,f.showPoints),
      paraProps({before,after,keepNext:true,keepLines:true,left:360,hanging:260}),
      {bold:true});
    if(q.kind==='choice'){
      let letter=0;
      const enabledOptions=q.options.filter(o=>o.enabled);
      for(const option of enabledOptions){
        letter++;
        let optionRuns=run(String.fromCharCode(96+letter)+'.  ');
        optionRuns+=splitInlineItalics(option.statement.value)
          .map(segment=>run(segment.text,{italic:segment.italic})).join('');
        // Los derivados preverbiales son datos internos: nunca imprimir un solucionario.
        if(option.kind!=='preverb'&&option.slots.length){
          optionRuns+=run(' ');
          option.slots.forEach((slot,index)=>{
            if(index)optionRuns+=run(', ');
            optionRuns+=run(displayedAcademicSlotValue(option.kind,slot),{italic:true});
          });
          optionRuns+=run('.');
        }
        body+='<w:p>'+paraProps({after:style?.subquestionGapPt??3,
          keepLines:true,keepNext:letter<enabledOptions.length,left:700,hanging:250})+
          optionRuns+'</w:p>';
      }
    }
  }
  return body;
}
function placementContent(p:TextPlacementV1,index:number,f:PageFormatV1,hasCover=false):string{
  const sourceParts=[
    p.text.author?run(p.text.author):'',
    p.text.work?run((p.text.author?', ':'')+p.text.work,{italic:true}):'',
    p.text.reference?run(' '+p.text.reference):'',
  ].join('');
  // El tamaño explícito evita que Word/LibreOffice sustituyan la métrica del
  // título y lo dividan en dos líneas cuando cabe en el A4 del modelo docente.
  const heading=paragraph(p.text.title,
    paraProps({align:'center',after:3,keepNext:true,topBorder:true,pageBreak:index>0||hasCover}),
    {bold:true,sizePt:Math.max(8,f.fontSizePt-1)});
  const source='<w:p>'+paraProps({align:'center',after:4,keepNext:true,bottomBorder:true})+
    sourceParts+'</w:p>';
  return heading+source+latin(p,f)+vocabulary(p,f)+questions(p,f);
}
function footerField(field:'PAGE'|'NUMPAGES'):string{
  return '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'+
    '<w:r><w:instrText xml:space="preserve"> '+field+' </w:instrText></w:r>'+
    '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'+
    '<w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';
}
function wordCover(cover:NotebookCoverV1):string{
  const title=paragraph(cover.title,paraProps({align:'center',after:20,
    topBorder:true,bottomBorder:true,keepNext:true}),{bold:true,sizePt:15});
  const note=cover.subtitle?paragraph(cover.subtitle,paraProps({align:'center',after:10}),
    {sizePt:12}):'';
  const course=cover.course?paragraph(cover.course,paraProps({align:'center',after:10}),
    {sizePt:11}):'';
  // Word-native drawing containing the same JPEG embedded in the saved edition.
  const cx=5_420_000,cy=3_300_000;
  const drawing='<w:p>'+paraProps({align:'center',after:70})+
    '<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"'+
    ' distT="0" distB="0" distL="0" distR="0">'+
    '<wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="1" name="Portada clásica"/>'+
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'+
    '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'+
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'+
    '<pic:nvPicPr><pic:cNvPr id="0" name="Foto de portada.jpg"/><pic:cNvPicPr/></pic:nvPicPr>'+
    '<pic:blipFill><a:blip r:embed="rIdCoverImage"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'+
    '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm>'+
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>'+
    '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
  const student=paragraph(cover.studentLabel,paraProps({topBorder:true,keepNext:true,after:5}));
  const group=paragraph(cover.groupLabel,paraProps({bottomBorder:true,after:0}));
  return title+note+course+drawing+student+group;
}
function wordDocument(edition:NotebookEditionV1):string{
  const f=edition.format;
  const body=(edition.cover?wordCover(edition.cover):'')+
    edition.placements.map((p,i)=>placementContent(p,i,f,Boolean(edition.cover))).join('');
  const margin=f.marginsPt;
  const sect='<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter1"/>'+
    '<w:pgSz w:w="11906" w:h="16838"/>'+
    '<w:pgMar'+attrs({
      'w:top':twips(margin.top),'w:right':twips(margin.right),
      'w:bottom':twips(margin.bottom),'w:left':twips(margin.left),
      // 1,25 cm desde el borde inferior hasta el pie de página (709 twips).
      'w:header':360,'w:footer':709,'w:gutter':0,
    })+'/>'+
    '<w:cols w:space="720"/><w:docGrid w:linePitch="360"/></w:sectPr>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:document xmlns:w="'+XML+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
    '<w:body>'+body+sect+'</w:body></w:document>';
}
function styles(f:PageFormatV1):string{
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:styles xmlns:w="'+XML+'"><w:docDefaults><w:rPrDefault><w:rPr>'+
    '<w:rFonts'+attrs({'w:ascii':f.fontFamily,'w:hAnsi':f.fontFamily,'w:eastAsia':f.fontFamily})+'/>'+
    '<w:sz w:val="'+Math.round(f.fontSizePt*2)+'"/>'+
    '</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr>'+
    '<w:spacing w:line="'+twips(f.fontSizePt*1.3)+'" w:lineRule="exact"/>'+
    '</w:pPr></w:pPrDefault></w:docDefaults>'+
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'+
    '</w:styles>';
}
function footer():string{
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:ftr xmlns:w="'+XML+'"><w:p>'+paraProps({align:'center'})+
    footerField('PAGE')+run(' | ')+footerField('NUMPAGES')+'</w:p></w:ftr>';
}
/** Devuelve bytes DOCX autónomos; no usa conexión, guarda archivos ni modifica la edición. */
export function createNotebookDocx(raw:NotebookEditionV1):Uint8Array{
  const edition=validateEdition(raw);
  if(!edition.placements.length)throw new Error('El cuaderno no contiene textos para exportar.');
  if(edition.placements.length>500)throw new Error('Demasiados textos para esta exportación.');
  const f=edition.format;
  const entries:{path:string;content:string|Uint8Array}[]=[
    {path:'[Content_Types].xml',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
      '<Default Extension="xml" ContentType="application/xml"/>'+
      (edition.cover?'<Default Extension="jpg" ContentType="image/jpeg"/>':'')+
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'+
      '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'+
      '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'+
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'+
      '</Types>'},
    {path:'_rels/.rels',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'+
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'+
      '</Relationships>'},
    {path:'word/_rels/document.xml.rels',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'+
      '<Relationship Id="rIdStyles1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
      '<Relationship Id="rIdSettings1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>'+
      (edition.cover?'<Relationship Id="rIdCoverImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/cover.jpg"/>':'')+
      '</Relationships>'},
    {path:'word/document.xml',content:wordDocument(edition)},
    {path:'word/styles.xml',content:styles(f)},
    {path:'word/settings.xml',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<w:settings xmlns:w="'+XML+'"><w:updateFields w:val="true"/>'+
      '<w:doNotExpandShiftReturn/></w:settings>'},
    {path:'word/footer1.xml',content:footer()},
    {path:'docProps/core.xml',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '+
      'xmlns:dc="http://purl.org/dc/elements/1.1/">'+
      '<dc:title>'+esc(edition.title)+'</dc:title><dc:creator>CuadernoTextosLatinos</dc:creator>'+
      '</cp:coreProperties>'},
  ];
  if(edition.cover){
    const encoded=edition.cover.imageDataUrl.slice('data:image/jpeg;base64,'.length);
    const binary=atob(encoded);
    const bytes=new Uint8Array(binary.length);
    for(let n=0;n<binary.length;n++)bytes[n]=binary.charCodeAt(n);
    entries.push({path:'word/media/cover.jpg',content:bytes});
  }
  return zipStore(entries);
}
export function notebookExportWarnings(edition:NotebookEditionV1):string[]{
  return checkEditionReadiness(edition).map(issue=>{
    const p=edition.placements.find(x=>x.id===issue.placementId);
    return (p?p.text.title+': ':'')+issue.detail;
  });
}
