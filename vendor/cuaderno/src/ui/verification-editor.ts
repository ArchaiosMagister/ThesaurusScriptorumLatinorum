import type { CorpusV1 } from '../core/model.js';

export const VERIFICATION_TEXT_ID = 'fase1.verificacion';

/** Recupera exclusivamente el texto de prueba, sin modificar el corpus. */
export function getStoredVerificationText(corpus: CorpusV1): string | null {
  return corpus.texts.find((entry) => entry.id === VERIFICATION_TEXT_ID)?.latin ?? null;
}

/**
 * Sincroniza la zona editable cuando se carga o restaura el corpus.
 * El ejemplo precargado en el HTML solo se conserva en el primer inicio vacío.
 */
export function syncVerificationEditor(
  corpus: CorpusV1,
  editor: Pick<HTMLTextAreaElement, 'value'>,
  options: { keepExampleIfMissing?: boolean } = {},
): boolean {
  const saved = getStoredVerificationText(corpus);
  if (saved !== null) {
    editor.value = saved;
    return true;
  }
  if (!options.keepExampleIfMissing) editor.value = '';
  return false;
}
