import { nationalMorphologyMarks } from './pau-national-parser.js';

export const teacherTxtTemplate = [
  '# Escribe el pasaje en Texto. Los apartados vacíos se completan con los bancos de la aplicación.',
  '# Separa los elementos con comas. Para las bases preverbiales, usa el formato x (3), y (2).',
  'Título:', 'Autor:', 'Obra:', 'Texto:', '', 'Morfología:',
  'Modificación preverbial:', 'Evolución fonética:', 'Prefijos:', 'Latinismos:', ''
].join('\n');

const labels = {
  título:'title', autor:'author', obra:'work', texto:'latin', morfología:'morphology',
  'modificación preverbial':'preverb', 'evolución fonética':'phonetics', prefijos:'prefix', latinismos:'latinism'
};
const fields = Object.keys(labels).join('|');
const heading = new RegExp('^\\s*('+fields+')\\s*:\\s*(.*)$','iu');

function values(section, label) {
  if (/^a\s*,\s*b\s*,\s*c\s*,\s*d$/iu.test(section)) return [];
  const list=section ? section.split(/[,;\n]/u).map(value=>value.trim()) : [];
  if (list.some(value=>!value) || list.length>4)
    throw Error(label+': escribe entre uno y cuatro elementos separados por comas, o deja el apartado vacío.');
  return list;
}

export function parseTeacherTxt(content, filename='') {
  const parts=new Map();
  let key;
  for (const line of content.replace(/^\uFEFF/u,'').replace(/\r\n?/gu,'\n').split('\n')) {
    const label=line.match(heading);
    if (label) {
      key=labels[label[1].toLocaleLowerCase('es')];
      if (parts.has(key)) throw Error('El apartado «'+label[1]+'» aparece dos veces.');
      parts.set(key,[label[2]]);
    } else if (key) parts.get(key).push(line);
    else if (line.trim() && !/^\s*#/u.test(line)) throw Error('El archivo debe comenzar por un campo de la plantilla.');
  }
  const get=name=>parts.get(name)?.join('\n').trim()??'';
  const latin=get('latin');
  if (!latin) throw Error('Completa el campo «Texto» con el pasaje latino.');
  const forms=values(get('morphology'),'Morfología');
  const {underlines,warnings}=nationalMorphologyMarks(latin,forms);
  if (warnings.length) throw Error(warnings.join('. ')+'.');
  const preverb=/^x\s*\(3\)\s*,\s*y\s*\(2\)$/iu.test(get('preverb'))?'':get('preverb');
  const bases=preverb?preverb.split(/[,;\n]/u).map(value=>value.trim().match(/^([\p{L}\p{M}]+(?: [\p{L}\p{M}]+)*)\s*\(([23])\)$/u)):[];
  if (preverb && (bases.length!==2 || !bases.every(Boolean) || bases[0][2]===bases[1][2]))
    throw Error('Modificación preverbial: indica dos bases y marca una con (3) y la otra con (2).');
  const preverbBases=preverb?bases.sort((a,b)=>Number(b[2])-Number(a[2])).map(base=>base[1]):null;
  return {
    title:get('title')||filename.replace(/\.txt$/iu,'').trim()||'Texto de latín',
    author:get('author')||null,work:get('work')||null,reference:null,latin,underlines,
    vocabulary:[],lexical:{preverb:[],phonetics:values(get('phonetics'),'Evolución fonética'),
      prefix:values(get('prefix'),'Prefijos'),latinism:values(get('latinism'),'Latinismos')},
    preverbBases,warnings:[],textTemplate:true
  };
}

export async function readTeacherTxt(file) {
  if (file.size>512*1024) throw Error('El TXT supera el límite de 512 KiB.');
  return parseTeacherTxt(new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()),file.name);
}

export function downloadTeacherTxtTemplate() {
  const url=URL.createObjectURL(new Blob([teacherTxtTemplate],{type:'text/plain;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;
  link.download='plantilla-importar-latin.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
