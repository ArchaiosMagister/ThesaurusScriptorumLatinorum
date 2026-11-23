import type { LibraryWork } from '../core/library.js';

/** Selección real de caracteres, compatible con ratón, teclado y tiradores de iOS. */
export interface ReaderFragment {
  latin: string;
  reference: string;
  wordCount: number;
  startLine: number;
  endLine: number;
}

function textSpan(node: Node): HTMLElement | null {
  const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
  return element?.closest<HTMLElement>('.reader-latin') ?? null;
}

function charsUntil(span: HTMLElement, node: Node, offset: number): number {
  const before = span.ownerDocument.createRange();
  before.selectNodeContents(span);
  before.setEnd(node, offset);
  return before.toString().length;
}

export function readReaderSelection(
  work: LibraryWork, reader: HTMLElement, selection: Selection | null,
): ReaderFragment | null {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const startSpan = textSpan(range.startContainer);
  const endSpan = textSpan(range.endContainer);
  if (!startSpan || !endSpan || !reader.contains(startSpan) || !reader.contains(endSpan)) return null;
  const startRow = startSpan.closest<HTMLElement>('.reader-line');
  const endRow = endSpan.closest<HTMLElement>('.reader-line');
  if (!startRow || !endRow) return null;
  const a = Number(startRow.dataset.index);
  const b = Number(endRow.dataset.index);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < a || b >= work.lines.length) return null;
  const startPos = charsUntil(startSpan, range.startContainer, range.startOffset);
  const endPos = charsUntil(endSpan, range.endContainer, range.endOffset);
  if (a === b && startPos >= endPos) return null;
  const parts = work.lines.slice(a, b + 1).map((line, index, arr) => {
    if (arr.length === 1) return line.t.slice(startPos, endPos);
    if (index === 0) return line.t.slice(startPos);
    if (index === arr.length - 1) return line.t.slice(0, endPos);
    return line.t;
  });
  // Las citas del margen nunca se incluyen; la ortografía, macrones y puntuación sí.
  const latin = parts.map((part) => part.trim()).filter(Boolean).join(' ').replace(/[ \t\r\n]+/g, ' ').trim();
  if (!latin || latin.length > 200_000) return null;
  const first = work.lines[a]!.c;
  const last = work.lines[b]!.c;
  return {
    latin, reference: first === last ? first : first + '–' + last,
    wordCount: latin.split(/\s+/u).length,
    startLine: a, endLine: b,
  };
}
