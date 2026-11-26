const words = /\p{L}[\p{L}\p{M}]*/gu;
const omission = /\[\s*(?:…|\.{3})\s*\]/gu;
const ligatures = { ae: 'æ', Ae: 'Æ', AE: 'Æ', oe: 'œ', Oe: 'Œ', OE: 'Œ' };
const expanded = { æ: 'ae', Æ: 'AE', œ: 'oe', Œ: 'OE' };

export function wordAt(text, offset) {
  for (const match of text.matchAll(words)) {
    const start = match.index, end = start + match[0].length;
    if (offset >= start && offset <= end) return { start, end };
    if (start > offset) break;
  }
  return null;
}

function enclosingBrackets(text, start, end) {
  const left = text[start] === '[' && text[end - 1] === ']' ? start : start - 1;
  const right = left === start ? end - 1 : end;
  if (text[left] !== '[' || text[right] !== ']') return null;
  let depth = 0;
  for (let i = left + 1; i < right; i++) {
    if (text[i] === '[') depth++;
    if (text[i] === ']' && --depth < 0) return null;
  }
  return depth === 0 ? [left, right] : null;
}

function omit(text, start, end) {
  // Coalesce adjacent omissions while leaving line breaks and exterior
  // punctuation untouched. Only horizontal boundary spacing is adjusted.
  const left = text.slice(0, start), right = text.slice(end);
  const previous = [...left.matchAll(omission)].at(-1);
  const next = right.match(omission)?.[0];
  const joinsLeft = previous && /^[ \t]*$/u.test(left.slice(previous.index + previous[0].length));
  const joinsRight = next && /^[ \t]*$/u.test(right.slice(0, right.indexOf(next)));
  if (joinsLeft) start = previous.index + previous[0].length;
  else while (/[ \t]/u.test(text[start - 1] ?? '')) start--;
  if (joinsRight && joinsLeft) end += right.indexOf(next) + next.length;
  while (/[ \t]/u.test(text[end] ?? '')) end++;
  const before = text[start - 1] ?? '', after = text[end] ?? '';
  const head = before && !/[\s([{«“]/u.test(before) ? ' ' : '';
  const tail = after && !/[\s.,;:!?…\])}»”]/u.test(after) ? ' ' : '';
  if (joinsLeft) return [start, end, tail];
  if (joinsRight) return [start, end, head];
  return [start, end, head + '[…]' + tail];
}

export function validRange(text, { start, end }) {
  const splitsScalar = offset => /[\uD800-\uDBFF]/u.test(text[offset - 1] ?? '') &&
    /[\uDC00-\uDFFF]/u.test(text[offset] ?? '');
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) &&
    start >= 0 && end <= text.length && start < end && !splitsScalar(start) && !splitsScalar(end);
}

export function editorialChange(text, range, action, value = '') {
  if (!validRange(text, range)) return null;
  const { start, end } = range;
  const exact = text.slice(start, end);
  const brackets = enclosingBrackets(text, start, end);
  let edits;
  switch (action) {
    case 'omit': edits = [omit(text, start, end)]; break;
    case 'bracket': edits = brackets ? [] : [[start, start, '['], [end, end, ']']]; break;
    case 'unbracket': edits = brackets ? brackets.map(i => [i, i + 1, '']) : []; break;
    case 'replace': edits = [[start, end, value.replace(/\r\n?/gu, '\n')]]; break;
    case 'ligate':
    case 'expand': {
      const pattern = action === 'ligate' ? /ae|Ae|AE|oe|Oe|OE/gu : /[æÆœŒ]/gu;
      const forms = action === 'ligate' ? ligatures : expanded;
      edits = [...exact.matchAll(pattern)].map(m => {
        const position = start + m.index, end = position + m[0].length;
        let glyph = forms[m[0]];
        if (action === 'expand' && /^[A-Z]{2}$/u.test(glyph) && /^\p{Ll}$/u.test(text[end] ?? ''))
          glyph = glyph[0] + glyph[1].toLowerCase();
        return [position, end, glyph];
      });
      break;
    }
    default: return null;
  }
  edits = edits.filter(([a, b, insert]) => text.slice(a, b) !== insert);
  if (!edits.length) return null;
  const latin = applyEdits(text, edits);
  const selected = {
    start: mapOffset(start, edits, 'left'),
    end: mapOffset(end, edits, 'right')
  };
  return { text, latin, edits, range: selected, orthography: action === 'ligate' || action === 'expand' };
}

export function applyEdits(text, edits) {
  let result = '', cursor = 0;
  for (const [start, end, value] of edits) {
    result += text.slice(cursor, start) + value;
    cursor = end;
  }
  return result + text.slice(cursor);
}

function mapOffset(offset, edits, affinity) {
  let delta = 0;
  for (const [start, end, insert] of edits) {
    if (offset < start || (offset === start && affinity === 'left')) break;
    if (offset < end) return start + delta + (affinity === 'right' ? insert.length : 0);
    delta += insert.length - (end - start);
  }
  return offset + delta;
}

export function mapRange(range, change, { preserveContent = false, token = false } = {}) {
  const { start, end } = range;
  for (const [a, b] of change.edits) {
    if (a === b || a >= end || b <= start) continue;
    if (!change.orthography || !preserveContent || a < start || b > end) return null;
  }
  // A replacement beginning at the anchor's start belongs inside it only
  // for equivalent orthography. Insertions on either edge belong outside.
  const startAffinity = change.edits.some(([a, b]) => a === start && a < b && change.orthography) ? 'left' : 'right';
  const next = { start: mapOffset(start, change.edits, startAffinity), end: mapOffset(end, change.edits, 'left') };
  if (next.start >= next.end) return null;
  if (token && !fullWords(change.latin, next)) return null;
  return next;
}

export function completeLatinSelection(text, { start, end }) {
  const joinsWord = offset => /[\p{L}\p{M}]$/u.test(text.slice(Math.max(0, offset - 2), offset)) &&
    /^[\p{L}\p{M}]/u.test(text.slice(offset));
  return !joinsWord(start) && !joinsWord(end);
}

export function fullWords(text, { start, end }) {
  const fragment = text.slice(start, end);
  const found = [...fragment.matchAll(words)];
  if (!found.length || found[0].index !== 0 || found.at(-1).index + found.at(-1)[0].length !== fragment.length ||
      /[\p{L}\p{M}]$/u.test(text.slice(0, start)) || /^[\p{L}\p{M}]/u.test(text.slice(end))) return false;
  return found.slice(1).every((m, i) => /^\s+$/u.test(fragment.slice(found[i].index + found[i][0].length, m.index)));
}

export function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

export function subtractRange(range, removed) {
  if (!overlaps(range, removed)) return [range];
  return [
    ...(range.start < removed.start ? [{ start: range.start, end: removed.start }] : []),
    ...(range.end > removed.end ? [{ start: removed.end, end: range.end }] : [])
  ];
}

export function unmarkedRanges(range, marks) {
  return marks.reduce((ranges, mark) => ranges.flatMap(part => subtractRange(part, mark)), [range]);
}

export function readRange(mark) {
  return { start: mark.startUtf16, end: mark.endUtf16 };
}

export function span(text, { start, end }) {
  return { startUtf16: start, endUtf16: end, exact: text.slice(start, end) };
}

export function normalizeUnderlines(value, text) {
  if (!Array.isArray(value) || value.length > 3000) return null;
  const result = [];
  for (const mark of value) {
    const start = mark?.startUtf16, end = mark?.endUtf16;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 ||
        end > text.length || start >= end || mark.exact !== text.slice(start, end)) return null;
    result.push(span(text, { start, end }));
  }
  return result;
}

export function changeUnderlines(text, marks, range, action) {
  const active = marks.map(readRange);
  if (action === 'underline') return [...marks, ...unmarkedRanges(range, active).map(part => span(text, part))];
  return active.flatMap(part => subtractRange(part, range)).map(part => span(text, part));
}
