import { validateVocabularyEntry } from './edition-validation.js';
import { InvalidCorpusError } from './errors.js';
import {
  CURRENT_SCHEMA_VERSION,
  type CorpusV1,
  type GrammarTag,
  type LatinText,
  type Notebook,
  type TextSource,
} from './model.js';

import type {ParsedTeacherDocx} from './docx-import.js';

type RecordValue = Record<string, unknown>;

function invalid(path: string, detail: string): never {
  throw new InvalidCorpusError(`${path}: ${detail}`);
}

function record(value: unknown, path: string, keys: readonly string[], optional: readonly string[] = []): RecordValue {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return invalid(path, 'se esperaba un objeto');
  }
  const item = value as RecordValue;
  for (const key of Object.keys(item)) {
    if (!keys.includes(key) && !optional.includes(key)) invalid(`${path}.${key}`, 'campo desconocido');
  }
  for (const key of keys) {
    if (!optional.includes(key) && !Object.hasOwn(item, key)) invalid(`${path}.${key}`, 'campo obligatorio ausente');
  }
  return item;
}

function nonBlank(value: unknown, path: string, max: number): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) {
    return invalid(path, `se esperaba texto no vacío de hasta ${max} caracteres`);
  }
  return value;
}

function nullableText(value: unknown, path: string): string | null {
  return value === null ? null : nonBlank(value, path, 250);
}

function identifier(value: unknown, path: string): string {
  const id = nonBlank(value, path, 120);
  if (id !== id.trim() || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(id)) {
    return invalid(path, 'identificador inválido (usar letras ASCII, cifras, puntos, guiones o dos puntos)');
  }
  return id;
}

function timestamp(value: unknown, path: string): string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    return invalid(path, 'se esperaba una fecha UTC ISO 8601 válida');
  }
  return value;
}

function stringIds(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) return invalid(path, 'se esperaba una lista');
  const result = value.map((entry: unknown, index: number) => identifier(entry, `${path}[${index}]`));
  if (new Set(result).size !== result.length) invalid(path, 'hay referencias repetidas');
  return result;
}

function source(value: unknown, path: string): TextSource {
  const data = record(value, path, ['author', 'work', 'reference']);
  return {
    author: nullableText(data.author, `${path}.author`),
    work: nullableText(data.work, `${path}.work`),
    reference: nullableText(data.reference, `${path}.reference`),
  };
}


/** Guarda sólo el resultado OOXML reconocido; rechaza marcas corruptas y campos ajenos.
 * El contenido original importado viaja con la fuente en los respaldos del banco. */
function teacherDocx(value:unknown,path:string,latin:string):ParsedTeacherDocx {
  const x=record(value,path,['title','author','work','reference','latin','underlines',
    'vocabulary','lexical','preverbBases','warnings']);
  const rawLatin=nonBlank(x.latin,path+'.latin',200_000);
  if(rawLatin!==latin)invalid(path+'.latin','el DOCX no coincide con el pasaje');
  const meta=source({author:x.author,work:x.work,reference:x.reference},path+'.source');
  const title=nonBlank(x.title,path+'.title',250);
  if(!Array.isArray(x.underlines)||x.underlines.length>3000)
    invalid(path+'.underlines','lista de subrayados inválida');
  const underlines=x.underlines.map((entry:unknown,i:number)=>{
    const p=path+'.underlines['+i+']';
    const row=record(entry,p,['startUtf16','endUtf16','exact']);
    const start=row.startUtf16,end=row.endUtf16,exact=row.exact;
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||
      (start as number)<0||(end as number)<=(start as number)||(end as number)>latin.length||
      typeof exact!=='string'||exact!==latin.slice(start as number,end as number))
      invalid(p,'anclaje de subrayado incompatible con el latín');
    return {startUtf16:start as number,endUtf16:end as number,exact:exact as string};
  });
  if(!Array.isArray(x.vocabulary)||x.vocabulary.length>3000)
    invalid(path+'.vocabulary','lista de vocabulario inválida');
  const vocabulary=x.vocabulary.map((entry:unknown,i:number)=>{
    const p=path+'.vocabulary['+i+']',row=record(entry,p,['headword','meaning']);
    const headword=nonBlank(row.headword,p+'.headword',500);
    const meaning=row.meaning===null?null:nonBlank(row.meaning,p+'.meaning',2000);
    return {headword,meaning};
  });
  const lexical=record(x.lexical,path+'.lexical',['preverb','phonetics','prefix','latinism']);
  const parts={} as ParsedTeacherDocx['lexical'];
  for(const kind of ['preverb','phonetics','prefix','latinism'] as const){
    const list=lexical[kind];
    if(!Array.isArray(list)||list.length>3000)invalid(path+'.lexical.'+kind,'lista inválida');
    parts[kind]=list.map((item:unknown,i:number)=>nonBlank(item,path+'.lexical.'+kind+'['+i+']',500));
  }
  let preverbBases:ParsedTeacherDocx['preverbBases']=null;
  if(x.preverbBases!==null){
    if(!Array.isArray(x.preverbBases)||x.preverbBases.length!==2)
      invalid(path+'.preverbBases','se necesitan exactamente dos bases');
    preverbBases=[
      nonBlank(x.preverbBases[0],path+'.preverbBases[0]',500),
      nonBlank(x.preverbBases[1],path+'.preverbBases[1]',500),
    ];
  }
  if(!Array.isArray(x.warnings)||x.warnings.length>100)
    invalid(path+'.warnings','avisos inválidos');
  const warnings=x.warnings.map((item:unknown,i:number)=>nonBlank(item,path+'.warnings['+i+']',2000));
  return {title,...meta,latin:rawLatin,underlines,vocabulary,lexical:parts,preverbBases,warnings};
}

function text(value: unknown, path: string): LatinText {
  const data = record(value, path, [
    'id', 'title', 'latin', 'source', 'tagIds', 'createdAt', 'updatedAt',
  ], ['notes', 'vocabulary', 'reviewed', 'teacherDocx']);
  const createdAt = timestamp(data.createdAt, `${path}.createdAt`);
  const updatedAt = timestamp(data.updatedAt, `${path}.updatedAt`);
  if (updatedAt < createdAt) invalid(path, 'updatedAt es anterior a createdAt');
  if (Object.hasOwn(data, 'reviewed') && typeof data.reviewed !== 'boolean') {
    invalid(`${path}.reviewed`, 'se esperaba un estado de revisión');
  }
  const vocabulary = Object.hasOwn(data, 'vocabulary')
    ? entries(data.vocabulary, `${path}.vocabulary`, validateVocabularyEntry) : undefined;
  if (vocabulary) {
    if (vocabulary.length > 4000) invalid(path, 'demasiadas entradas de vocabulario');
    uniqueIds(vocabulary, `${path}.vocabulary`);
    if (new Set(vocabulary.map(entry => entry.order)).size !== vocabulary.length) {
      invalid(`${path}.vocabulary`, 'orden repetido');
    }
  }
  return {
    id: identifier(data.id, `${path}.id`),
    title: nonBlank(data.title, `${path}.title`, 250),
    latin: nonBlank(data.latin, `${path}.latin`, 200_000),
    source: source(data.source, `${path}.source`),
    tagIds: stringIds(data.tagIds, `${path}.tagIds`),
    createdAt,
    updatedAt,
    ...(Object.hasOwn(data, 'notes') && { notes: nonBlank(data.notes, `${path}.notes`, 20_000) }),
    ...(vocabulary && { vocabulary }),
    ...(typeof data.reviewed === 'boolean' && { reviewed: data.reviewed }),
    ...(data.teacherDocx === undefined?{}:{teacherDocx:teacherDocx(data.teacherDocx, path+'.teacherDocx',
      nonBlank(data.latin, path+'.latin', 200_000))}),
  };
}

function tag(value: unknown, path: string): GrammarTag {
  const data = record(value, path, ['id', 'label', 'kind', 'parentId']);
  if (data.kind !== 'catalogue' && data.kind !== 'custom') {
    invalid(`${path}.kind`, 'tipo de etiqueta no válido');
  }
  return {
    id: identifier(data.id, `${path}.id`),
    label: nonBlank(data.label, `${path}.label`, 160),
    kind: data.kind as GrammarTag['kind'],
    parentId: data.parentId === null ? null : identifier(data.parentId, `${path}.parentId`),
  };
}

function notebook(value: unknown, path: string): Notebook {
  const data = record(value, path, ['id', 'title', 'textIds'], ['retainedTexts']);
  return {
    id: identifier(data.id, `${path}.id`),
    title: nonBlank(data.title, `${path}.title`, 250),
    textIds: stringIds(data.textIds, `${path}.textIds`),
    ...(Object.hasOwn(data, 'retainedTexts') && {
      retainedTexts: entries(data.retainedTexts, `${path}.retainedTexts`, (value, itemPath) => {
        const item = record(value, itemPath, ['textId', 'revisionId']);
        return { textId: identifier(item.textId, itemPath), revisionId: identifier(item.revisionId, itemPath) };
      }),
    }),
  };
}

function entries<T>(value: unknown, path: string, parse: (item: unknown, itemPath: string) => T): T[] {
  if (!Array.isArray(value)) invalid(path, 'se esperaba una lista');
  return value.map((item, index) => parse(item, `${path}[${index}]`));
}

function uniqueIds(items: readonly { id: string }[], path: string): void {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) invalid(path, `identificador repetido: ${item.id}`);
    ids.add(item.id);
  }
}

function references(corpus: CorpusV1): void {
  const textIds = new Set(corpus.texts.map(({ id }) => id));
  const tagIds = new Set(corpus.tags.map(({ id }) => id));
  const revisions = new Map(corpus.textRevisions?.map(item => [item.id, item.text]));
  for (const entry of [...corpus.texts, ...revisions.values()]) {
    for (const id of entry.tagIds) {
      if (!tagIds.has(id)) invalid(`texts.${entry.id}.tagIds`, `etiqueta inexistente: ${id}`);
    }
  }
  for (const book of corpus.notebooks) {
    const retained = new Map(book.retainedTexts?.map(item => [item.textId, item.revisionId]));
    if (retained.size !== (book.retainedTexts?.length ?? 0)) invalid('retainedTexts', 'texto repetido');
    for (const [id, revisionId] of retained) {
      if (!book.textIds.includes(id) || revisions.get(revisionId)?.id !== id) {
        invalid(`notebooks.${book.id}.retainedTexts`, `versión incompatible: ${revisionId}`);
      }
    }
    for (const id of book.textIds) {
      if (!retained.has(id) && !textIds.has(id)) invalid(`notebooks.${book.id}.textIds`, `texto inexistente: ${id}`);
    }
  }
  const parents = new Map(corpus.tags.map(({ id, parentId }) => [id, parentId]));
  const state = new Map<string, 'visiting' | 'done'>();
  function visit(id: string): void {
    if (state.get(id) === 'visiting') invalid(`tags.${id}.parentId`, 'ciclo jerárquico');
    if (state.get(id) === 'done') return;
    state.set(id, 'visiting');
    const parent = parents.get(id);
    if (parent !== null && parent !== undefined) {
      if (!parents.has(parent)) invalid(`tags.${id}.parentId`, `etiqueta padre inexistente: ${parent}`);
      visit(parent);
    }
    state.set(id, 'done');
  }
  for (const id of tagIds) visit(id);
}

/** Rechaza los datos inválidos antes de guardarlos o de importarlos. */
export function validateCorpus(input: unknown): CorpusV1 {
  const data = record(input, 'corpus', ['schemaVersion', 'texts', 'tags', 'notebooks'], ['textRevisions']);
  if (data.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    invalid('corpus.schemaVersion', 'versión de esquema incompatible');
  }
  if (!Array.isArray(data.texts) || !Array.isArray(data.tags) || !Array.isArray(data.notebooks)) {
    invalid('corpus', 'texts, tags y notebooks deben ser listas');
  }
  const corpus: CorpusV1 = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    texts: (data.texts as unknown[]).map((entry, index) => text(entry, `texts[${index}]`)),
    tags: (data.tags as unknown[]).map((entry, index) => tag(entry, `tags[${index}]`)),
    notebooks: (data.notebooks as unknown[]).map((entry, index) => notebook(entry, `notebooks[${index}]`)),
  };
  if (Object.hasOwn(data, 'textRevisions')) {
    corpus.textRevisions = entries(data.textRevisions, 'textRevisions', (value, path) => {
      const item = record(value, path, ['id', 'text']);
      return { id: identifier(item.id, path), text: text(item.text, `${path}.text`) };
    });
    uniqueIds(corpus.textRevisions, 'textRevisions');
  }
  uniqueIds(corpus.texts, 'texts');
  uniqueIds(corpus.tags, 'tags');
  uniqueIds(corpus.notebooks, 'notebooks');
  references(corpus);
  return corpus;
}
