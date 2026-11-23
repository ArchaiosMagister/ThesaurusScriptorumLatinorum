function replaceOnce(source, needle, replacement) {
  const count = typeof needle === 'string'
    ? source.split(needle).length - 1
    : [...source.matchAll(new RegExp(needle.source, needle.flags.includes('g') ? needle.flags : needle.flags + 'g'))].length;
  if (count !== 1)
    throw new Error('Revisar el punto de integración de la tarjeta Collatinus: ' + needle + ' (' + count + ')');
  return source.replace(needle, () => replacement);
}

/** La ficha edita a través del mismo sistema de preguntas y subrayados, sin guardar estado paralelo. */
export function integrateLatinReadingCard(source) {
  source = replaceOnce(source,
    'export function attachLatinReadingCards(root, analyze) {',
    'export function attachLatinReadingCards(root, analyze, underline = null) {');
  return replaceOnce(source, /head\(card,\s*hit\.word,\s*hit\.rect\);/u, "    head(card,hit.word,hit.rect);\n    if (underline && hit.paragraph.dataset.placementId) {\n      const placementId = hit.paragraph.dataset.placementId;\n      const marks = underline.state(placementId);\n      const alreadyMarked = marks.some(mark => mark.start === hit.start && mark.end === hit.end);\n      const actions = el('div','edition-lexical-actions');\n      if (alreadyMarked) {\n        actions.append(el('p','edition-lexical-note','Esta aparición ya está subrayada para análisis morfológico.'));\n      } else {\n        let replacement = null;\n        if (marks.length >= 4) {\n          actions.append(el('p','edition-lexical-note',\n            'Ya hay cuatro palabras subrayadas. Elige cuál quitar para incorporar ésta.'));\n          replacement = el('select','edition-lexical-replacement');\n          replacement.setAttribute('aria-label','Palabra subrayada que se sustituirá');\n          const placeholder = el('option','','Elige una palabra que quitar');\n          placeholder.value = '';\n          replacement.append(placeholder);\n          for (const mark of marks.filter(item => !item.locked)) {\n            const option = el('option','',mark.surface);\n            option.value = mark.id;\n            replacement.append(option);\n          }\n          actions.append(replacement);\n          if (replacement.options.length === 1)\n            actions.append(el('p','edition-lexical-note','Los cuatro subrayados están protegidos.'));\n        }\n        const add = el('button','edition-lexical-underline','Subrayar para análisis morfológico');\n        add.type = 'button';\n        add.disabled = Boolean(replacement);\n        replacement?.addEventListener('change',() => { add.disabled = !replacement.value; });\n        add.addEventListener('click', async () => {\n          if (add.disabled || (replacement && !replacement.value)) return;\n          add.disabled = true;\n          try {\n            await underline.apply({ placementId, start: hit.start, end: hit.end },\n              replacement?.value || undefined);\n          } finally {\n            if (add.isConnected) add.disabled = Boolean(replacement && !replacement.value);\n          }\n        });\n        actions.append(add);\n      }\n      card.append(actions);\n    }");
}

/** Al guardar se repintan menú y vista previa mediante bind.saved, sin modificar otras preguntas. */
export function integrateReadingCardPreview(source) {
  return replaceOnce(source,
    /disposeLatinReader\s*=\s*attachLatinReadingCards\(target,\s*options\.onAnalyzeMorphology\);/u,
    "      disposeLatinReader=attachLatinReadingCards(target,options.onAnalyzeMorphology,{\n        state: placementId => {\n          const placement = draft?.placements.find(item => item.id === placementId);\n          const words = placement?.questions.find(item => item.kind === 'morphology')?.words ?? [];\n          return words.map(word => {\n            const mark = placement.text.markup.find(item => item.id === word.markId);\n            return { id: word.id, surface: word.surface, locked: word.locked,\n              start: mark?.startUtf16, end: mark?.endUtf16 };\n          });\n        },\n        apply: (target, replaceId) => academics.markSelectedWord(target, replaceId),\n      });");
}
