/** Prioriza las formas no empleadas en otras preguntas del cuaderno.
 * No descarta las formas ya utilizadas: solo se consultan después de agotar
 * las nuevas, y únicamente si el número de preguntas lo exige.
 * Conserva la posición exacta de cada forma en el pasaje latino.
 */
export function morphologyOccurrencesFreshFirst<T extends {key:string}>(
  occurrences:readonly T[],used:ReadonlySet<string>,
):T[]{
  return [
    ...occurrences.filter(item=>!used.has(item.key)),
    ...occurrences.filter(item=>used.has(item.key)),
  ];
}
