import { splitLatinOmissions } from './edition-inline-formatting.js';

// The two existing mark kinds can overlap. Use one sequence for screen,
// native print and Word so a broad underline cannot hide a narrower mark.
export function markedLatinRuns(latin, marks) {
  const events = new Map();
  function interval(start, end, property) {
    for (const [at, delta] of [[start, 1], [end, -1]]) {
      if (!events.has(at)) events.set(at, [0, 0, 0]);
      events.get(at)[property] += delta;
    }
  }
  let offset = 0;
  for (const part of splitLatinOmissions(latin)) {
    if (part.roman) interval(offset, offset + part.text.length, 0);
    offset += part.text.length;
  }
  for (const mark of marks) {
    if (mark.kind === 'morph-underline') interval(mark.startUtf16, mark.endUtf16, mark.reviewRequired ? 2 : 1);
    else if (!mark.reviewRequired) interval(mark.startUtf16, mark.endUtf16, 0);
  }
  const active = [0, 0, 0], output = [];
  let start = 0;
  function append(end) {
    if (start >= end) return;
    const [roman, underline, review] = active.map(Boolean);
    const text = latin.slice(start, end);
    const previous = output.at(-1);
    if (previous?.roman === roman && previous.underline === underline && previous.review === review) previous.text += text;
    else output.push({ text, roman, underline, review });
    start = end;
  }
  for (const [end, delta] of [...events].sort(([a], [b]) => a - b)) {
    append(end);
    delta.forEach((value, index) => { active[index] += value; });
  }
  append(latin.length);
  return output;
}
