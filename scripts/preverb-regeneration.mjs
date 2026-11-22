export function varyPreverbSelection(source) {
  return source
    .replace('usedBaseKeys = []) {', 'usedBaseKeys = [], varyPassage = false) {')
    .replace('const freshPassage = passage.find(x => !alreadyUsed.has(x.base.key));',
      `const eligiblePassage = passage.filter(x => !alreadyUsed.has(x.base.key));
        const freshPassage = varyPassage && eligiblePassage.length > 1
            ? eligiblePassage[Math.floor(random() * eligiblePassage.length)] : eligiblePassage[0];`);
}

export function varyPreverbControls(source) {
  return source
    .replace('function preverbBasesFor(o, p) {', 'function preverbBasesFor(o, p, regenerate = false) {')
    .replace("(!manuallySelectedBases.has(o.id) && baseUsageSignatures.get(o.id) !== signature)",
      "(!manuallySelectedBases.has(o.id) && (regenerate || baseUsageSignatures.get(o.id) !== signature))")
    .replace('p.text.latin, Math.random, used);',
      'p.text.latin, Math.random, regenerate ? [...used, ...preverbKeys(o)] : used, regenerate);')
    .replace('            const f = fieldsFor(o, p);\n            const plan = service().engine.prepareSubquestion',
      "            if (autoApply && o.kind === 'preverb') preverbBasesFor(o, p, true);\n            const f = fieldsFor(o, p);\n            const plan = service().engine.prepareSubquestion")
    .replace('            for (const o of q.options.filter(x => x.enabled)) {\n                const f = fieldsFor(o, p);',
      "            for (const o of q.options.filter(x => x.enabled)) {\n                if (autoApply && o.kind === 'preverb') preverbBasesFor(o, p, true);\n                const f = fieldsFor(o, p);");
}
