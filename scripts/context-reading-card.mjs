import { requiredPatches as patches } from './required-patch.mjs';

export function integrateNotebookContextCard(source) {
  return patches(source, [
    ['export function attachLatinReadingCards(root, analyze, underline = null) {',
      `import { selectedTokens } from '../../shared/latin-context-academic.js';
let contextReader;
export function consultNotebookSelection(field, analyze, latin, range, point) {
    contextReader?.();
    const reader = attachLatinReadingCards(field, analyze, null, false);
    contextReader = reader;
    reader.consult({ paragraph: field, ...range, latin, word: latin.slice(range.start, range.end),
        rect: new DOMRect(point.x, point.y, 0, 0), manual: true });
}
export function attachLatinReadingCards(root, analyze, underline = null, interactive = true) {`],
    ["        const latin = hit.paragraph.textContent ?? '';", "        const latin = hit.latin ?? hit.paragraph.textContent ?? '';"],
    ["    function fill(card, token, rect) {\n        card.querySelector('.edition-lexical-card-body')?.remove();",
      `    function fill(card, token, rect, append = false) {
        if (!append) card.querySelector('.edition-lexical-card-body')?.remove();`],
    ["        const body = el('div', 'edition-lexical-card-body');", `        const body = el('div', 'edition-lexical-card-body');
        if (append && token) body.append(el('strong', 'edition-lexical-card-form', token.w));`],
    ["            const token = result.find(t => t.s === hit.start && t.e === hit.end && t.w === hit.word) ?? null;\n            fill(card, token, hit.rect);",
      `            if (hit.manual) {
                const current = hit.paragraph.value ?? hit.paragraph.textContent;
                if (!hit.paragraph.isConnected || current !== latin) { close(); return; }
                let tokens = selectedTokens(result, latin, hit);
                if (!tokens.length && hit.word.trim() !== latin.trim()) tokens = await analyze(hit.word);
                if (req !== latest || !card.isConnected || !hit.paragraph.isConnected ||
                    (hit.paragraph.value ?? hit.paragraph.textContent) !== latin) return;
                card.querySelector('.edition-lexical-card-body')?.remove();
                if (tokens.length > 1) tokens.forEach(token => fill(card, token, hit.rect, true));
                else fill(card, tokens[0] ?? null, hit.rect);
            } else {
                const token = result.find(t => t.s === hit.start && t.e === hit.end && t.w === hit.word) ?? null;
                fill(card, token, hit.rect);
            }`],
    ["    root.addEventListener('pointermove', move);", "    if (interactive) {\n    root.addEventListener('pointermove', move);"],
    ["    document.addEventListener('pointerdown', outside);", "    }\n    document.addEventListener('pointerdown', outside);"],
    ["    return () => {\n        cancelHover();", "    const dispose = () => {\n        cancelHover();"],
    ["        document.removeEventListener('keydown', escape);\n    };", "        document.removeEventListener('keydown', escape);\n    };\n    dispose.consult = show;\n    return dispose;"]
  ], 'Consulta contextual de Collatinus en Banco y Cuaderno');
}

export function integrateExamContextCard(source) {
  return patches(source, [
    ["  function tokenAt(tokens, hit) {", `  async function tokensForSelection(field, latin, range, literature) {
    const exam = M.S;
    const raw = literature ? exam.literatura?.texto : exam.texto;
    const tokens = !literature && raw === exam.textAnalyzed ? exam.tokens : await analyzed(raw);
    if (field instanceof HTMLTextAreaElement)
      return tokens.filter(token => token.s >= range.start && token.e <= range.end &&
        latin.slice(token.s, token.e) === token.w);
    return wordList(latin).map((word, ordinal) => ({ ...word, ordinal })).filter(word => word.start >= range.start && word.end <= range.end)
      .map(word => tokenAt(tokens, word)).filter(Boolean);
  }
  function tokenAt(tokens, hit) {`],
    ["  function render(card, token, hit) {\n    card.querySelector('.ex-latin-card-body')?.remove();",
      "  function render(card, token, hit, append) {\n    if (!append) card.querySelector('.ex-latin-card-body')?.remove();"],
    ["    const body = node('div', 'ex-latin-card-body');",
      "    const body = node('div', 'ex-latin-card-body');\n    if (append && token) body.append(node('strong', '', token.w));"],
    ["      const token = await tokenFor(hit, exam);", `      let tokens = hit.manual ? await tokensForSelection(hit.paragraph, hit.latin, hit, hit.literature) :
        [await tokenFor(hit, exam)];
      if (hit.manual && !tokens.length && hit.word.trim() !== hit.latin.trim()) tokens = await analyzed(hit.word);`],
    ["          !sheet.contains(hit.paragraph) || hit.paragraph.textContent !== hit.latin ||",
      "          !hit.paragraph.isConnected || (hit.paragraph.value ?? hit.paragraph.textContent) !== hit.latin ||"],
    ["      render(card, token, hit);",
      "      card.querySelector('.ex-latin-card-body')?.remove();\n      if (tokens.length > 1) tokens.forEach(token => render(card, token, hit, true));\n      else render(card, tokens[0], hit);"],
    ["  M.LatinReader = { reset };", `  M.LatinReader = { reset, tokensForSelection,
    consult(field, latin, range, point, literature) {
      return show({ paragraph: field, latin, ...range, word: latin.slice(range.start, range.end),
        rect: new DOMRect(point.x, point.y, 0, 0), literature, manual: true });
    }
  };`]
  ], 'Consulta contextual de Collatinus en Examinator');
}
