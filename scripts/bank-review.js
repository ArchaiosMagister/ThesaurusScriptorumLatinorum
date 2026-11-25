import { reanchorGrammarSpan } from '../core/edition-operations.js';
import { rulesVersion } from './atl-bank-context.js';
import { fingerprintForMark } from '../core/edition-validation.js';

const prefix = 'atl-v1:cuaderno-banco-review-v1:';
const possessiveId = 'gram.pron.posesivo';
const normalizeKey = key => key.replace(/:gram\.pronombres$/u, ':' + possessiveId);

// Cache only the exact text's digest, not the teacher's decisions. A text
// edited in place or replaced by a new revision always receives its own key.
const reviewKeys = new WeakMap();
export function bankReviewKey(text) {
  const previous = reviewKeys.get(text);
  if (previous?.latin === text.latin && previous.id === text.id) return previous.promise;
  const { id, latin } = text;
  const promise = crypto.subtle.digest('SHA-256', new TextEncoder().encode(latin)).then(digest => {
    const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    return prefix + id + ':' + hash;
  });
  const entry = { id, latin, promise };
  reviewKeys.set(text, entry);
  // A transient hashing failure must not poison future reads.
  promise.catch(() => { if (reviewKeys.get(text) === entry) reviewKeys.delete(text); });
  return promise;
}

export const proposalKeyFor = proposal => [proposal.start, proposal.end, proposal.tagId].join(':');

export function readBankReview(key, latin, storage = localStorage) {
  try {
    const record = JSON.parse(storage.getItem(key) ?? 'null');
    const rejected = Array.isArray(record?.rejected) ? record.rejected.filter(value => typeof value === 'string').map(normalizeKey) : [];
    const corrected = Array.isArray(record?.corrected) ? record.corrected.filter(row =>
      Array.isArray(row) && row.length === 2 && row.every(value => typeof value === 'string')).map(([key, id]) => [normalizeKey(key), id]) : [];
    const pending = Array.isArray(record?.pending) ? record.pending.filter(proposal =>
      proposal && Number.isInteger(proposal.start) && Number.isInteger(proposal.end) &&
      proposal.start >= 0 && proposal.end > proposal.start && proposal.end <= latin.length &&
      typeof proposal.tagId === 'string' && Array.isArray(proposal.evidence) &&
      proposal.evidence.every(value => typeof value === 'string') && Array.isArray(proposal.alternatives) &&
      proposal.alternatives.every(value => typeof value === 'string')).map(proposal =>
        proposal.tagId === 'gram.pronombres' ? { ...proposal, tagId: possessiveId } : proposal) : [];
    return { rejected, corrected, pending, version: record?.version };
  } catch {
    return { rejected: [], corrected: [], pending: [] };
  }
}

export function visibleBankAnalysis(text, review, catalogue, isRejected) {
  if (review.version !== rulesVersion) return { automatic: [], pending: [], current: false };
  const recorded = new Set(review.corrected.map(([key]) => key));
  const rejected = new Set(review.rejected);
  const allowed = new Set(catalogue.map(tag => tag.id));
  const rows = review.pending.filter(proposal =>
    allowed.has(proposal.tagId) && !text.tagIds.includes(proposal.tagId) &&
    !recorded.has(proposalKeyFor(proposal)) && !isRejected(proposal, rejected, catalogue));
  return {
    current: true,
    automatic: [...new Set(rows.filter(row => row.state === 'automatic').map(row => row.tagId))],
    pending: [...new Set(rows.filter(row => row.state !== 'automatic').map(row => row.tagId))]
  };
}

export async function bankAnalysisIndex(texts, catalogue, isRejected) {
  const stored = new Set(Object.keys(localStorage).filter(key => key.startsWith(prefix))
    .map(key => key.slice(prefix.length, -65)));
  const candidates = texts.filter(text => stored.has(text.id));
  const rows = new Map();
  // Bound simultaneous digest work and yield between batches on large banks.
  for (let offset = 0; offset < candidates.length; offset += 32) {
    const batch = await Promise.all(candidates.slice(offset, offset + 32).map(async text => [
      text.id, visibleBankAnalysis(text, readBankReview(await bankReviewKey(text), text.latin), catalogue, isRejected)
    ]));
    for (const [id, result] of batch) rows.set(id, result);
    if (offset + 32 < candidates.length) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return rows;
}

export async function analyzeBankText(text, analyze, classify, isCurrent) {
  const key = await bankReviewKey(text);
  const old = readBankReview(key, text.latin);
  if (old.version === rulesVersion) return old;
  const tokens = await analyze(text.latin);
  if (!isCurrent()) return;
  const latest = readBankReview(key, text.latin);
  if (latest.version === rulesVersion) return latest;
  const pending = classify(text.latin, tokens);
  // Preserve anchors for decisions even if the new rules yield no matching result.
  const known = new Set(pending.map(proposalKeyFor));
  const decisions = new Set([...latest.rejected, ...latest.corrected.map(([key]) => key)]);
  for (const proposal of latest.pending) {
    const key = proposalKeyFor(proposal);
    if (decisions.has(key) && !known.has(key)) pending.push(proposal);
  }
  const result = { ...latest, pending, version: rulesVersion };
  localStorage.setItem(key, JSON.stringify(result));
  return result;
}

// The destination may already have a review (e.g. when restoring earlier Latin).
// Its decisions have priority for that exact text; only add unambiguous anchors.
export function mergeCarriedReview(existing, carried) {
  const rejected = new Set(existing.rejected);
  const corrected = new Map(existing.corrected);
  const pending = new Map(existing.pending.map(row => [proposalKeyFor(row), row]));
  for (const key of carried.rejected) if (!corrected.has(key)) rejected.add(key);
  for (const [key, tag] of carried.corrected) if (!rejected.has(key) && !corrected.has(key)) corrected.set(key, tag);
  for (const row of carried.pending) if (!pending.has(proposalKeyFor(row))) pending.set(proposalKeyFor(row), row);
  return {...existing, rejected:[...rejected], corrected:[...corrected], pending:[...pending.values()]};
}

export async function carryBankReview(previous, next, storage = localStorage) {
  const before = readBankReview(await bankReviewKey(previous), previous.latin, storage);
  if (!before.corrected.length && !before.pending.length && !before.rejected.length) return 0;
  const key = await bankReviewKey(next);
  if (previous.latin === next.latin) {
    if (previous.id !== next.id) {
      const existing = readBankReview(key, next.latin, storage);
      const merged = mergeCarriedReview(existing, before);
      if (existing.version === undefined && before.version !== undefined) merged.version = before.version;
      storage.setItem(key, JSON.stringify(merged));
    }
    return 0;
  }

  // Reuse the notebook's conservative anchor rules. Unreviewed analysis belongs to the old text.
  const accepted = new Map(before.corrected);
  const dismissed = new Set(before.rejected);
  const rejected = [];
  const pending = [];
  const corrected = [];
  let reviewRequired = 0;
  for (const proposal of before.pending) {
    const tag = accepted.get(proposalKeyFor(proposal));
    const wasRejected = dismissed.has(proposalKeyFor(proposal));
    if (!wasRejected && !tag) continue;
    const { start, end } = proposal;
    const anchor = reanchorGrammarSpan({
      startUtf16: start, endUtf16: end, exact: previous.latin.slice(start, end),
      textFingerprint: fingerprintForMark(previous.latin, start, end), reviewRequired: false
    }, previous.latin, next.latin);
    if (anchor.reviewRequired) { reviewRequired++; continue; }
    const moved = { ...proposal, start: anchor.startUtf16, end: anchor.endUtf16 };
    pending.push(moved);
    if (wasRejected) rejected.push(proposalKeyFor(moved));
    if (tag) corrected.push([proposalKeyFor(moved), tag]);
  }
  if (corrected.length || rejected.length) {
    const existing = readBankReview(key, next.latin, storage);
    storage.setItem(key, JSON.stringify(mergeCarriedReview(existing, { pending, corrected, rejected })));
  }
  return reviewRequired;
}
