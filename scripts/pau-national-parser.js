// Conservative first stage for non-Valencian PAU. No changes to the CV parser.
const clean = value => String(value ?? '').trim();
const fold = value => clean(value).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const key = value => fold(value).replace(/æ/g,'ae').replace(/œ/g,'oe');
const emptyLexical = () => ({preverb:[],phonetics:[],prefix:[],latinism:[]});
const word = /^[\p{L}\p{M}]+$/u;
const expression = /^[\p{L}\p{M}]+(?:[ -][\p{L}\p{M}]+)*$/u;
const questionNumber = /^(?:pregunta\s+)?\d+(?:[.)-]|\s*[:])\s*/iu;
const rowText = row => clean(typeof row === 'string' ? row : row?.text);

function category(heading) {
  const text = fold(heading);
  if (/\bmorfolog\w*\b.*\bsint[aá]ctic\w*\b/u.test(text)) return null;
  if (/\b(?:analiz\w*|analisis)\b.*\bmorfolog\w*|\bmorfolog\w*\b.*\b(?:formas|palabras)\b/u.test(text)) return 'morphology';
  if (/\b(?:evolucion|cambios|transformaciones)\b.*\bfonetic\w*|\bresultado patrimonial\b/u.test(text)) {
    if (/\b(?:catalan|valenciano|gallego|euskera|vasco|portugues|asturiano|frances|italiano)\b/u.test(text)) return null;
    return 'phonetics';
  }
  if (/\b(?:latinismos|locuciones latinas|expresiones latinas)\b/u.test(text) && /\b(?:signific\w*|explic\w*|emple\w*|utiliz\w*)\b/u.test(text)) return 'latinism';
  // Require an explicit prefix task, not generic etymology.
  if (/\bprefij\w*\b/u.test(text) && /\b(?:identific\w*|indic\w*|señal\w*|senal\w*|signific\w*)\b/u.test(text)) return 'prefix';
  if (/\bmodificacion preverbial\b/u.test(text)) return 'preverb';
  return null;
}

function list(text, kind) {
  const raw = clean(text).replace(/[.;]\s*$/u,'');
  if (!raw) return null;
  const terms = raw.split(/\s*[,;]\s*|\s+y\s+/u).map(x=>x.trim());
  const valid = kind === 'latinism' ? expression : word;
  // No attempt to mine arbitrary prose or infer missing exercise items.
  if (!terms.length || terms.some(term => !valid.test(term))) return null;
  return terms;
}

export function nationalMorphologyMarks(latin, forms) {
  const tokens = [...latin.matchAll(/[\p{L}\p{M}]+/gu)];
  const underlines = [], warnings = [], used = new Set();
  for (const form of forms) {
    const parts = key(form).split(/\s+/u);
    const hits = tokens.flatMap((token,index)=>{
      const sequence=tokens.slice(index,index+parts.length);
      if (sequence.length!==parts.length || !sequence.every((part,i)=>key(part[0])===parts[i])) return [];
      const end=sequence.at(-1);
      const exact=latin.slice(token.index,end.index+end[0].length);
      return key(exact).replace(/\s+/gu,' ')===parts.join(' ')?[{index:token.index,0:exact}]:[];
    });
    if (hits.length !== 1) {
      warnings.push(hits.length ? 'Ocurrencia morfológica ambigua: '+form : 'Forma morfológica no localizada: '+form);
      continue;
    }
    const hit = hits[0];
    if (used.has(hit.index)) continue;
    used.add(hit.index);
    underlines.push({startUtf16:hit.index,endUtf16:hit.index+hit[0].length,exact:hit[0]});
  }
  return {underlines:underlines.sort((a,b)=>a.startUtf16-b.startUtf16),warnings};
}

// Questions must already belong to one passage (or be explicitly shared).
// Only explicit colon-delimited lists are accepted at this stage.
export function recognizeNationalQuestions(latin, questions) {
  const lexical = emptyLexical(), forms = [], warnings = [], ignored = [], accepted = [];
  const bases = [];
  for (const raw of questions) {
    const text = rowText(raw).replace(questionNumber,'');
    const colon = text.indexOf(':');
    const heading = colon < 0 ? text : text.slice(0,colon);
    const kind = category(heading);
    if (!kind) { if(text) ignored.push(text); continue; }
    if (kind === 'morphology' && colon < 0 && /\bsubrayad\w*\b/u.test(fold(heading))) {
      warnings.push('Revisar subrayados originales: '+text); continue;
    }
    const terms = colon < 0 ? null : list(text.slice(colon+1),kind);
    if (!terms) { warnings.push('Lista no reconocida con seguridad: '+text); continue; }
    if (kind === 'morphology') forms.push(...terms);
    else if (kind === 'preverb') {
      // A base is not a completed compound: use the existing preverbBases field.
      if (!/\bbases?\b/u.test(fold(heading))) { warnings.push('Revisar bases preverbiales: '+text); continue; }
      bases.push(...terms);
    } else lexical[kind].push(...terms);
    accepted.push({kind,original:text,terms});
  }
  const marks = nationalMorphologyMarks(latin,forms);
  return {lexical,preverbBases:bases.length?bases:null,underlines:marks.underlines,
    warnings:[...warnings,...marks.warnings],ignored,accepted};
}

// Input blocks are separated by the layout/profile layer or confirmed by the
// teacher. In particular do not associate questions from another option.
export function prepareNationalPassage({latin,questions=[],title='',author='',work='',reference='',notes=''}={}) {
  if (typeof latin !== 'string' || !latin.trim()) throw Error('Falta el pasaje latino.');
  // Keep original wording, punctuation and offsets. Do not silently repair OCR.
  const recognized = recognizeNationalQuestions(latin,questions);
  const {ignored,accepted,...compatible} = recognized;
  return {doc:{title,author,work,reference,latin,vocabulary:[],...compatible},notes,
    review:{ignored,accepted}};
}

// Minimal explicit-boundary profile. Unrecognized layouts must go to manual
// passage selection; they are not treated as successfully imported exams.
export function parseExplicitNationalRows(pages) {
  const rows = pages.flat().map(rowText).filter(Boolean);
  const result = [];
  let block = null, option = '', pending = null;
  const flush = () => {
    if (!block) return;
    if (pending) block.questions.push(pending);
    pending = null;
    const latin = block.lines.join('\n');
    if (!latin.trim()) throw Error('Marcador de texto sin pasaje latino.');
    result.push({...prepareNationalPassage({latin,questions:block.questions}),option:block.option});
    block = null;
  };
  for (const text of rows) {
    const opt = /^(?:opci[oó]n|modelo|ejercicio)\s+([A-Z])\s*[:.]?$/iu.exec(text);
    if (opt) { flush(); option=opt[1].toUpperCase(); continue; }
    const start = /^texto latino\s*:\s*(.*)$/iu.exec(text);
    if (start) { flush(); block={option,lines:start[1]?[start[1]]:[],questions:[],inQuestions:false}; continue; }
    if (!block) continue;
    if (/^(?:preguntas|cuestiones)\s*[:.]?$/iu.test(text)) { block.inQuestions=true; continue; }
    if (questionNumber.test(text)) {
      block.inQuestions=true;
      if(pending) block.questions.push(pending);
      pending=text;
    } else if (block.inQuestions) {
      pending=pending?pending+' '+text:text;
    } else block.lines.push(text);
  }
  flush();
  if (!result.length) throw Error('Estructura no reconocida: selecciona los textos manualmente.');
  return result;
}
