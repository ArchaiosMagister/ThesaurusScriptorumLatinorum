# Importación de textos docentes desde Word — 18/11/2026

## Reglas confirmadas
1. Leer únicamente Word `.docx` en el navegador (sin servidor ni dependencias externas). Los originales Pages se convierten antes a DOCX.
2. Recuperar título, autor, obra, referencia, texto latino, subrayados reales y entradas de vocabulario con glosas.
3. A, B, C, D, guiones y vacíos no son términos académicos, ni lemas de vocabulario: no se copian a la edición.
4. Generar los huecos mediante los bancos verificados existentes, con preservación de los términos importados y sin repeticiones mientras haya alternativas. Si el banco no dispone de candidatos elegibles, no inventar.
5. Añadir siempre el apartado de latinismos cuando el Word no lo tenga.
6. Usar los enunciados y puntuaciones oficiales de la aplicación, no los textos ni el recuento obsoletos del Word («dos de estas tres»).
7. Conservar los datos originales importados en casillas manuales bloqueadas para evitar sustituciones automáticas. Revisar antes de aceptar la importación.
8. Sin solucionarios ni modificaciones de cuadernos anteriores; cada DOCX crea una nueva aparición de origen manual dentro del cuaderno activo.

## Cinco casos docentes inspeccionados
| Documento | Título/autor | Vocabulario real | Subrayados en DOCX | Léxico |
| --- | --- | ---: | ---: | --- |
| Eutropio, *Breviarium* III 1 | Los romanos envían legados… | 6 | 4 | Tres apartados con A–D |
| Nepote, *Alcibíades* 10 | Quieren asesinar a Alcibíades… | 3 | 4 | Tres apartados con A–D |
| Cicerón, *In Catilinam* III 6 | Pontino y Flaco… | 3 | 0 | Evolución 4 reales; prefijos 4 reales |
| Salustio, *Bellum Catilinæ* LXI 4–5 | Se encuentra el cuerpo… | 0 (A–D) | 4 | Tres apartados con A–D |
| Julio César, *De bello civili* I 37 | Los marselleses… | 4 | 4 | Dos bases preverbiales reales; demás A–D |

Nota: «0 subrayados» de Cicerón se refiere a estilos de subrayado en el DOCX recibido. En ese caso la app conserva los que pueda proponer de forma académicamente verificable. En los demás, respeta los subrayados del original.

## Criterios de seguridad
- El importador lee `word/document.xml` de un ZIP DOCX comprimido en el propio navegador mediante `DecompressionStream('deflate-raw')`, disponible desde Safari/iPadOS 16.4.
- Límites de tamaño y comprobación de estructura; no se importan macros, imágenes ni scripts.
- La importación se revisa antes de confirmar; cambiar el texto latino durante la revisión exige volver a seleccionar el archivo para no desanclar los subrayados.
- Las entradas con glosas se respetan; los huecos del vocabulario se convierten en propuestas revisables y no se les inventan significados.
- Previsualización y edición posteriores permanecen vinculadas al formato A4 existente.

## Estado
Implementación en rama experimental de PR #28. Sin fusión ni publicación estable. Falta evaluación táctil física en Safari/Pages por el docente.
