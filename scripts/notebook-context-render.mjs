import { requiredPatches as patches } from './required-patch.mjs';

export function integrateContextNotebookPreview(source) {
  return patches(source, [
    ["import { splitInlineItalics, splitLatinOmissions }", "import { markedLatinRuns } from '../core/atl-marked-latin.js';\nimport { splitInlineItalics }"],
    [/    const raw = p\.text\.latin, marks = \[\.\.\.p\.text\.markup\][\s\S]+?(?=    return paragraph;)/u, `    for (const run of markedLatinRuns(p.text.latin, p.text.markup)) {
        if (!run.roman && !run.underline && !run.review) {
            paragraph.append(document.createTextNode(run.text));
            continue;
        }
        const part = node('span', '', run.text);
        if (run.roman) part.classList.add('edition-roman');
        if (run.underline || run.review) part.classList.add('edition-underlined');
        if (run.review && !run.underline) {
            part.classList.add('edition-review');
            part.title = 'Revisión del anclaje necesaria';
        }
        paragraph.append(part);
    }
`]
  ], 'Subrayados superpuestos de Cuaderno en pantalla e impresión');
}

export function integrateContextNotebookWord(source) {
  return patches(source, [
    ["import { splitInlineItalics, splitLatinOmissions }", "import { markedLatinRuns } from '../core/atl-marked-latin.js';\nimport { splitInlineItalics }"],
    [/\/\*\* Corchetes y omisiones en redonda también en Word\. \*\/[\s\S]+?(?=    \/\/ Espacio posterior del pasaje)/u, `function latin(p, f) {
    const body = markedLatinRuns(p.text.latin, p.text.markup).map(part => run(part.text,
        { italic: !part.roman, underline: part.underline })).join('');
`]
  ], 'Subrayados superpuestos de Cuaderno en Word');
}
