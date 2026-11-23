function one(source, expression, replacement, label) {
  let count = 0;
  const result = source.replace(expression, () => { count++; return replacement; });
  if (count !== 1) throw new Error('Punto preverbial modificado o ambiguo: ' + label + ' (' + count + ')');
  return result;
}

function inFunction(source, start, end, change) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error('No se encuentran los límites de ' + start);
  return source.slice(0, a) + change(source.slice(a, b)) + source.slice(b);
}

/** Alterna también entre distintas bases inequívocas presentes en el pasaje. */
export function varyPreverbSelection(source) {
  source = one(source,
    /usedBaseKeys\s*=\s*\[\]\)\s*\{/u,
    'usedBaseKeys = [], varyPassage = false) {', 'parámetros de selección');
  source = one(source,
    /const\s+freshPassage\s*=\s*passage\.find\(x\s*=>\s*!alreadyUsed\.has\(x\.base\.key\)\);/u,
    'const eligiblePassage = passage.filter(x => !alreadyUsed.has(x.base.key));\n' +
    '        const freshPassage = varyPassage && eligiblePassage.length > 1\n' +
    '          ? eligiblePassage[Math.floor(random() * eligiblePassage.length)] : eligiblePassage[0];',
    'sorteo entre bases del pasaje');
  return source;
}

/** La regeneración explícita no debe reutilizar las bases ya usadas en este apartado. */
export function varyPreverbControls(source) {
  source = one(source, /function\s+preverbBasesFor\(o,\s*p\)\s*\{/u,
    'function preverbBasesFor(o, p, regenerate = false) {', 'firma de preverbBasesFor');
  source = one(source,
    /\(!manuallySelectedBases\.has\(o\.id\)\s*&&\s*baseUsageSignatures\.get\(o\.id\)\s*!==\s*signature\)/u,
    '(!manuallySelectedBases.has(o.id) && (regenerate || baseUsageSignatures.get(o.id) !== signature))',
    'renovación de bases');
  source = one(source,
    /choosePreverbBases\(personalPreverbSnapshot\(academicTeacherSnapshotV1\),\s*p\.text\.latin,\s*Math\.random,\s*used\)/u,
    'choosePreverbBases(personalPreverbSnapshot(academicTeacherSnapshotV1), p.text.latin, Math.random, regenerate ? [...used, ...preverbKeys(o)] : used, regenerate)',
    'exclusión de bases actuales');
  const patch = segment => one(segment, /const\s+f\s*=\s*fieldsFor\(o,\s*p\);/u,
    "if (autoApply && o.kind === 'preverb') preverbBasesFor(o, p, true);\n      const f = fieldsFor(o, p);",
    'sorteo antes del plan');
  source = inFunction(source, 'function requestGroup(', 'function requestQuestion(', patch);
  source = inFunction(source, 'function requestQuestion(', 'function requestToken(', patch);
  return source;
}
