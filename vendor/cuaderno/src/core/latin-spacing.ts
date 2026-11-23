/** Interlineado editorial compatible con Word.
 * El modelo V1 conserva lineSpacingPt como altura de línea exacta, de modo que
 * los cuadernos antiguos y las copias JSON siguen siendo compatibles.
 * El control para el usuario expresa la holgura AÑADIDA al interlineado normal.
 */
export const DEFAULT_EXTRA_LATIN_SPACING_PT=3;
export function latinNaturalLineHeightPt(fontSizePt:number):number{
  return Number((fontSizePt*1.2).toFixed(2));
}
export function exactLatinLineHeightPt(fontSizePt:number,extraPt:number):number{
  return Number((latinNaturalLineHeightPt(fontSizePt)+extraPt).toFixed(2));
}
export function extraLatinSpacingPt(fontSizePt:number,exactPt:number):number{
  return Number(Math.max(0,exactPt-latinNaturalLineHeightPt(fontSizePt)).toFixed(2));
}
