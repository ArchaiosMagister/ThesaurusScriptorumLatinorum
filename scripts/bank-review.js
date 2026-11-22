import { reanchorGrammarSpan } from '../core/edition-operations.js';
import { fingerprintForMark } from '../core/edition-validation.js';

const prefix = 'atl-v1:cuaderno-banco-review-v1:';

export async function bankReviewKey(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text.latin));
  const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return prefix + text.id + ':' + hash;
}

export const proposalKeyFor = proposal => [proposal.start, proposal.end, proposal.tagId].join(':');

export function readBankReview(key, latin, storage = localStorage) {
  try {
    const record = JSON.parse(storage.getItem(key) ?? 'null');
    const rejected = Array.isArray(record?.rejected) ? record.rejected.filter(value => typeof value === 'string') : [];
    const corrected = Array.isArray(record?.corrected) ? record.corrected.filter(row =>
      Array.isArray(row) && row.length === 2 && row.every(value => typeof value === 'string')) : [];
    const pending = Array.isArray(record?.pending) ? record.pending.filter(proposal =>
      proposal && Number.isInteger(proposal.start) && Number.isInteger(proposal.end) &&
      proposal.start >= 0 && proposal.end > proposal.start && proposal.end <= latin.length &&
      typeof proposal.tagId === 'string' && Array.isArray(proposal.evidence) &&
      proposal.evidence.every(value => typeof value === 'string') && Array.isArray(proposal.alternatives) &&
      proposal.alternatives.every(value => typeof value === 'string')) : [];
    return { rejected, corrected, pending };
  } catch {
    return { rejected: [], corrected: [], pending: [] };
  }
}

export async function pendingBankTags(texts, catalogue, isRejected, storage = localStorage) {
  const analyzed = new Set(Object.keys(storage).filter(key => key.startsWith(prefix) && /:[a-f0-9]{64}$/u.test(key))
    .map(key => key.slice(prefix.length, -(64 + 1))));
  const allowed = new Set(catalogue.map(tag => tag.id));
  const selected = texts.filter(text => analyzed.has(text.id));
  const rows = await Promise.all(selected.map(async text => {
    const review = readBankReview(await bankReviewKey(text), text.latin, storage);
    const rejected = new Set(review.rejected);
    const confirmed = new Set(text.tagIds);
    const corrected = new Set(review.corrected.filter(([, tag]) => confirmed.has(tag)).map(([key]) => key));
    const tags = new Set(review.pending.filter(proposal =>
      allowed.has(proposal.tagId) && !confirmed.has(proposal.tagId) &&
      !corrected.has(proposalKeyFor(proposal)) && !isRejected(proposal, rejected, catalogue))
      .map(proposal => proposal.tagId));
    return [text.id, [...tags]];
  }));
  return new Map(rows);
}

export async function carryBankReview(previous, next, storage = localStorage) {
  const before = readBankReview(await bankReviewKey(previous), previous.latin, storage);
  if (!before.corrected.length && !before.pending.length && !before.rejected.length) return 0;
  const key = await bankReviewKey(next);
  if (previous.latin === next.latin) {
    if (previous.id !== next.id) storage.setItem(key, JSON.stringify(before));
    return 0;
  }

  // Reuse the notebook's conservative anchor rules. Unreviewed analysis belongs to the old text.
  const accepted = new Map(before.corrected);
  const pending = [];
  const corrected = [];
  let reviewRequired = 0;
  for (const proposal of before.pending) {
    const tag = accepted.get(proposalKeyFor(proposal));
    if (!tag || !next.tagIds.includes(tag)) continue;
    const { start, end } = proposal;
    const anchor = reanchorGrammarSpan({
      startUtf16: start, endUtf16: end, exact: previous.latin.slice(start, end),
      textFingerprint: fingerprintForMark(previous.latin, start, end), reviewRequired: false
    }, previous.latin, next.latin);
    if (anchor.reviewRequired) { reviewRequired++; continue; }
    const moved = { ...proposal, start: anchor.startUtf16, end: anchor.endUtf16 };
    pending.push(moved);
    corrected.push([proposalKeyFor(moved), tag]);
  }
  if (corrected.length) storage.setItem(key, JSON.stringify({ pending, corrected, rejected: [] }));
  return reviewRequired;
}
