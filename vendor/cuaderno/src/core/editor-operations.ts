import type { CorpusV1, LatinText, Notebook } from './model.js';
import { validateCorpus } from './validation.js';
import type { ParsedTeacherDocx } from './docx-import.js';

export interface TextDraft {
  id?: string;
  title: string;
  latin: string;
  author: string;
  work: string;
  reference: string;
  notes?: string;
  reviewed?: boolean;
  vocabulary?: NonNullable<LatinText['vocabulary']>;
}
/**
 * Una importación DOCX con el mismo pasaje y cita puede contener preguntas,
 * subrayados o glosario distintos. No sustituir nunca esos datos sin aviso.
 * La variante se almacena como fuente independiente; la anterior se conserva.
 */
export function requiresDistinctDocxSource(
  existing: Pick<LatinText, 'teacherDocx'> | null | undefined,
  incoming: ParsedTeacherDocx | undefined,
): boolean {
  return Boolean(existing?.teacherDocx && incoming
    && JSON.stringify(existing.teacherDocx) !== JSON.stringify(incoming));
}

const nullText = (value: string): string | null => value.trim() || null;

export function retainNotebookText(corpus: CorpusV1, text: LatinText): CorpusV1 {
  const affected = corpus.notebooks.filter(book => book.textIds.includes(text.id)
    && !book.retainedTexts?.some(item => item.textId === text.id));
  if (!affected.length) return corpus;
  const revisions = corpus.textRevisions ?? [];
  const revision = revisions.find(item => JSON.stringify(item.text) === JSON.stringify(text))
    ?? { id: 'rev.' + crypto.randomUUID(), text };
  const ids = new Set(affected.map(book => book.id));
  return {
    ...corpus,
    textRevisions: revisions.includes(revision) ? revisions : [...revisions, revision],
    notebooks: corpus.notebooks.map(book => ids.has(book.id) ? {
      ...book, retainedTexts: [...(book.retainedTexts ?? []), { textId: text.id, revisionId: revision.id }],
    } : book),
  };
}

export function notebookTexts(corpus: CorpusV1, notebook: Notebook): LatinText[] {
  const live = new Map(corpus.texts.map(text => [text.id, text]));
  const revisions = new Map(corpus.textRevisions?.map(item => [item.id, item.text]));
  for (const item of notebook.retainedTexts ?? []) live.set(item.textId, revisions.get(item.revisionId)!);
  return notebook.textIds.map(id => live.get(id)!);
}

export function upsertText(corpus: CorpusV1, draft: TextDraft, id: string, now: string): CorpusV1 {
  const previous = corpus.texts.find((entry) => entry.id === (draft.id || id));
  const notes = draft.notes === undefined ? previous?.notes : draft.notes.trim() || undefined;
  const vocabulary = draft.vocabulary ?? previous?.vocabulary;
  const reviewed = draft.reviewed ?? (previous?.latin === draft.latin.trim() ? previous.reviewed : undefined);
  const entry: LatinText = {
    id: previous?.id ?? id,
    title: draft.title.trim(),
    latin: draft.latin.trim(),
    source: {
      author: nullText(draft.author),
      work: nullText(draft.work),
      reference: nullText(draft.reference),
    },
    tagIds: previous?.tagIds ?? [],
    ...(notes && { notes }),
    ...(reviewed !== undefined && { reviewed }),
    ...(vocabulary?.length && { vocabulary }),
    createdAt: previous?.createdAt ?? now,
    updatedAt: previous && now < previous.createdAt ? previous.createdAt : now,
    ...(previous?.teacherDocx && previous.latin===draft.latin.trim()
      ? {teacherDocx:previous.teacherDocx} : {}),
  };
  const contentChanged = previous && (previous.title !== entry.title || previous.latin !== entry.latin
    || JSON.stringify(previous.source) !== JSON.stringify(entry.source)
    || previous.reviewed !== entry.reviewed || previous.notes !== entry.notes || JSON.stringify(previous.vocabulary) !== JSON.stringify(entry.vocabulary));
  const next = { ...(contentChanged ? retainNotebookText(corpus, previous) : corpus), texts: previous
    ? corpus.texts.map((item) => item.id === previous.id ? entry : item)
    : [...corpus.texts, entry],
  };
  return validateCorpus(next);
}

export function deleteText(corpus: CorpusV1, textId: string): CorpusV1 {
  const previous = corpus.texts.find(item => item.id === textId);
  if (!previous) return validateCorpus(corpus);
  return validateCorpus({
    ...retainNotebookText(corpus, previous),
    texts: corpus.texts.filter(item => item.id !== textId),
  });
}

export function upsertNotebook(corpus: CorpusV1, name: string, id: string): CorpusV1 {
  const next: CorpusV1 = {
    ...corpus,
    notebooks: [...corpus.notebooks, { id, title: name.trim(), textIds: [] }],
  };
  return validateCorpus(next);
}

export function renameNotebook(corpus: CorpusV1, id: string, title: string): CorpusV1 {
  const next: CorpusV1 = {
    ...corpus,
    notebooks: corpus.notebooks.map((book) => book.id === id ? { ...book, title: title.trim() } : book),
  };
  return validateCorpus(next);
}

function removeUnusedRevisions(corpus: CorpusV1): CorpusV1 {
  if (!corpus.textRevisions) return corpus;
  const used = new Set(corpus.notebooks.flatMap(book => (book.retainedTexts ?? []).map(item => item.revisionId)));
  return { ...corpus, textRevisions: corpus.textRevisions.filter(item => used.has(item.id)) };
}

export function removeNotebook(corpus: CorpusV1, notebookId: string): CorpusV1 {
  return validateCorpus(removeUnusedRevisions({
    ...corpus,
    notebooks: corpus.notebooks.filter((book) => book.id !== notebookId),
  }));
}

/** Añade sin duplicar ni modificar el texto original: el orden de la lista es editorial. */
export function addTextToNotebook(corpus: CorpusV1, notebookId: string, textId: string): CorpusV1 {
  const next = {
    ...corpus,
    notebooks: corpus.notebooks.map((book) => book.id === notebookId && !book.textIds.includes(textId)
      ? { ...book, textIds: [...book.textIds, textId] }
      : book),
  };
  return validateCorpus(next);
}

export function removeTextFromNotebook(corpus: CorpusV1, notebookId: string, textId: string): CorpusV1 {
  const next = {
    ...corpus,
    notebooks: corpus.notebooks.map((book) => book.id === notebookId
      ? {
        ...book,
        textIds: book.textIds.filter(id => id !== textId),
        ...(book.retainedTexts && { retainedTexts: book.retainedTexts.filter(item => item.textId !== textId) }),
      }
      : book),
  };
  return validateCorpus(removeUnusedRevisions(next));
}

export function moveTextInNotebook(corpus: CorpusV1, notebookId: string, textId: string, by: -1 | 1): CorpusV1 {
  const next = {
    ...corpus,
    notebooks: corpus.notebooks.map((book): Notebook => {
      if (book.id !== notebookId) return book;
      const current = book.textIds.indexOf(textId);
      const destination = current + by;
      if (current < 0 || destination < 0 || destination >= book.textIds.length) return book;
      const ids = [...book.textIds];
      [ids[current], ids[destination]] = [ids[destination]!, ids[current]!];
      return { ...book, textIds: ids };
    }),
  };
  return validateCorpus(next);
}
