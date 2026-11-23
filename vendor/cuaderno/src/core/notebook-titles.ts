/** Numeración didáctica independiente de la fuente literaria y del identificador.
 * Cada cuaderno lleva su propia secuencia; un título manual nunca se renombra.
 * Tras eliminar una aparición no se renumeran las restantes.
 */
export function nextNotebookTextTitle(
  placements: readonly {readonly text:{readonly title:string}}[],
):string {
  // Si el docente renombró un título automático, continúa la secuencia por
  // el número de apariciones; un título «Texto N» más alto reserva su número.
  let highest=placements.length;
  for(const placement of placements){
    const match=/^Texto\s+([1-9][0-9]*)$/iu.exec(placement.text.title.trim());
    if(!match)continue;
    const number=Number(match[1]);
    if(Number.isSafeInteger(number)&&number<Number.MAX_SAFE_INTEGER)
      highest=Math.max(highest,number);
  }
  return 'Texto '+(highest+1);
}
