# CuadernoTextosLatinos

Arquitectura de datos y contratos operativos · versión 1.0 · 15 de noviembre de 2026

> Estado: especificación CERRADA a nivel de requisitos y contratos, pendiente de implementación y pruebas. No es certificación de que el software ya incorpore estas funciones.


## 1. Decisión arquitectónica principal

Se adopta un **nuevo agregado editorial de cuaderno** separado del `CorpusV1` existente, con una sola copia canónica del contenido para edición, menú, vista previa y exportación. La base de textos de fase 2 se conserva como fuente; añadir un texto al cuaderno produce una **aparición editorial con instantánea editable**.

La nueva entidad propuesta se denomina `NotebookEditionV1` (versión lógica 1 del subsistema editorial). **No se rebautiza ni modifica silenciosamente `CorpusV1`:** su `schemaVersion: 1` y el formato de copia `backupVersion: 1` se mantienen disponibles.

| Decisión | Consecuencia verificable |

| --- | --- |

| A-01 / Aggregate root | Una `NotebookEditionV1` es la unidad de guardado, validación, historial y exportación. Sus `placements` son ordenados y tienen IDs distintos de los textos originales. |

| A-02 / Fuente única | La vista previa no se almacena como HTML: se deriva del agregado. Menú y hoja escriben comandos sobre las mismas propiedades. |

| A-03 / Persistencia | Se crea una base **independiente** `cuaderno-textos-latinos-workspace` versión 1 con stores `corpus`, `editions`, `history` y `meta`; la base antigua permanece íntegra y en su versión 1. |

| A-04 / Migración segura | Se copia `CorpusV1` y se convierten sus cuadernos en ediciones en la nueva base por migración explícita, sin modificar la base de datos original. |

| A-05 / Undo | Un commit de edición y su evento de historial forman parte de una misma transacción IndexedDB. |

| A-06 / Regeneración | La operación identifica un único objetivo, propone/coteja antes y solo sustituye su subárbol autorizado. |

| A-07 / Compatibilidad | Las copias antiguas son importables por procedimiento específico; restaurar una copia v1 no puede borrar silenciosamente ediciones v2. |




## 2. Estado real de partida y separación de responsabilidades

**Comprobado en `main`:** `CorpusV1` tiene `schemaVersion`, `texts`, `tags`, `notebooks`; cada `LatinText` contiene `id`, `title`, `latin`, `source`, `tagIds`, fechas. Cada `Notebook` contiene `id`, `title`, `textIds`, con orden único. No hay preguntas ni vocabulario en ese contrato.

`IndexedDbCorpusRepository` utiliza la base `cuaderno-textos-latinos`, `DATABASE_VERSION=1`, store `corpus`, clave `current` y control optimista por `revision`. La exportación actual usa `backupVersion=1` y SHA-256 del corpus validado, con límite de 32 MiB.

| Subsistema | Responsabilidad única | Regla de dependencia |

| --- | --- | --- |

| Corpus | Textos base propios, etiquetas existentes, catálogo y metadatos filológicos. | No almacena preguntas ni vistas previas. |

| Ediciones | Orden del cuaderno, aparición editable, preguntas, vocabulario, formato, reglas de presentación. | Puede referenciar un origen del Corpus, pero no lo modifica al editar la aparición. |

| Historial | Comandos confirmados y sus parches inversos. | Se graba transaccionalmente con la edición. |

| Render | Árbol semántico de impresión y adaptadores HTML/Word/PDF. | Función pura; no escribe en IndexedDB. |

| Motor académico | Selección/validación de candidatos desde proveedores verificados. | No actualiza el agregado hasta recibir confirmación de comando. |




## 3. Modelo de dominio canónico


### 3.1. Raíz, apariciones y procedencia

```ts
type UUID = string; // ASCII estable, no reasignable
interface NotebookEditionV1 {
  editionSchemaVersion: 1;
  id: UUID; legacyNotebookId: string | null;
  title: string; locale: 'es';
  createdAt: string; updatedAt: string;
  format: PageFormatV1;
  placements: TextPlacementV1[]; // orden editorial canónico
}
interface TextPlacementV1 {
  id: UUID; source: SourceLinkV1;
  text: EditableTextV1; questions: QuestionV1[];
  vocabulary: VocabularyEntryV1[];
  grammaticalTagIds: string[];
  reviewFlags: ReviewFlagV1[];
}
interface SourceLinkV1 {
  kind: 'corpus' | 'library' | 'manual';
  sourceId: string | null; urn: string | null;
  importedAt: string; // el origen no se sobrescribe
}
interface EditableTextV1 {
  title: string; author: string | null;
  work: string | null; reference: string | null;
  latin: string; markup: TextMarkV1[];
}
interface TextMarkV1 {
  id: UUID; kind: 'morph-underline' | 'editorial-roman';
  startUtf16: number; endUtf16: number;
  exact: string; textFingerprint: string;
  reviewRequired: boolean;
}
```

**Regla de copia:** el catálogo y `CorpusV1` permanecen inmutables por efecto de editar una aparición. Dos apariciones del mismo origen pueden tener títulos, subrayados, preguntas y vocabularios distintos, con `id` propio. La **secuencia** es exclusivamente `placements[]`, nunca una segunda lista paralela de IDs.

`source.sourceId` apunta al texto del Corpus, si existe; `urn` identifica una obra del catálogo, si procede. Para texto manual ambos pueden ser nulos. La referencia bibliográfica visible se conserva en `text.author/work/reference`, aunque el origen desaparezca o cambie posteriormente.


### 3.2. Preguntas y puntuación

```ts
type QuestionKind = 'translation' | 'syntax' | 'morphology' | 'choice';
interface QuestionBaseV1 {
  id: UUID; kind: QuestionKind; enabled: boolean;
  statement: EditableFieldV1;
  pointsHundredths: number; // 400 + 100 + 100 + 200 = 800
  styleOverride: QuestionStyleV1 | null;
}
type QuestionV1 =
  | (QuestionBaseV1 & { kind: 'translation' | 'syntax' })
  | (QuestionBaseV1 & { kind: 'morphology'; words: MorphWordV1[] })
  | (QuestionBaseV1 & { kind: 'choice';
      requiredCount: number; options: ChoiceOptionV1[] });
interface ChoiceOptionV1 {
  id: UUID; kind: 'preverb' | 'phonetics' | 'prefix' | 'latinism';
  enabled: boolean; statement: EditableFieldV1;
  slots: QuestionWordSlotV1[];
}
interface EditableFieldV1 {
  value: string; origin: 'template' | 'generated' | 'manual';
  locked: boolean; lastEditAt: string | null;
}
```

Los puntos se almacenan en **centésimas enteras** (`pointsHundredths`) para evitar errores de coma flotante. La base es 800 por aparición; por defecto `400+100+100+200`. El reparto **no se reajusta** automáticamente. Un documento con suma distinta de 800 se guarda como borrador pero no puede declararse listo hasta corregirlo.

La numeración visible `1, 2, 3, 4` se calcula a partir de las preguntas activas y del orden del arreglo. Las letras a.–d. se derivan de las opciones habilitadas. La etiqueta de elección «Elige N de M» se calcula con `requiredCount` y número de opciones activas; no es un texto fijo que pueda quedar desincronizado.


### 3.3. Palabras, anclajes y vocabulario

```ts
interface MorphWordV1 {
  id: UUID; markId: UUID; surface: string; // aparición concreta
  lemmaId: string | null;
  analysis: string | null; provenance: EvidenceV1 | null;
  reviewState: 'verified' | 'needs-review' | 'manual';
  locked: boolean;
}
interface QuestionWordSlotV1 {
  id: UUID; value: string; proposedLemmaId: string | null;
  origin: 'generated' | 'manual'; locked: boolean;
  provenance: EvidenceV1 | null;
}
interface VocabularyEntryV1 {
  id: UUID; lemma: string; headword: string;
  meaning: string | null; note: string | null;
  included: boolean; order: number;
  provenance: EvidenceV1 | null;
  reviewState: 'verified' | 'needs-review' | 'manual';
  origin: 'generated' | 'manual'; locked: boolean;
}
interface EvidenceV1 {
  provider: string; recordId: string;
  bankRevision: string; decisionId: string | null;
}
interface ReviewFlagV1 { id: UUID; scopeId: UUID; reason: string; }
```

`TextMarkV1` utiliza offsets de código UTF-16 para coincidir con las APIs de selección del navegador; guarda además el texto exacto seleccionado y una huella de su contexto. Cada edición del texto invalida o revalida de forma determinista los anclajes: **nunca se desplazan automáticamente a otro homógrafo sin revisión**.

Los apartados de evolución fonética, prefijos, latinismos y modificación preverbial usan `QuestionWordSlotV1`, que no exige que sus formas aparezcan en el texto base. Sus IDs independientes permiten regeneración granular sin acoplar a las marcas morfológicas.

Los registros sin respaldo filológico conservan `reviewState = needs-review` y no se convierten en candidatos certificados. Las correcciones docentes manuales se distinguen de las generadas sin borrar la procedencia.


### 3.4. Formato y estado de interfaz

```ts
interface PageFormatV1 {
  paper: 'A4'; fontFamily: string; fontSizePt: number;
  marginsPt: { top: number; right: number; bottom: number; left: number };
  lineSpacingPt: number; questionGapPt: number;
  showPoints: boolean; pageFooter: 'page | total';
}
interface QuestionStyleV1 {
  beforePt: number; afterPt: number; subquestionGapPt: number;
}
interface EditorSession { // NO forma parte del cuaderno exportado
  activeEditionId: UUID; activePlacementId: UUID | null;
  mode: 'text' | 'whole-notebook'; activeMenu: string;
  previewZoom: number; scrollByPlacementId: Record<string, number>;
}
```

La configuración de zoom, pestaña y scroll se considera **estado efímero del usuario**, no parte del documento académico; el formato A4, tipografía y separaciones sí son persistentes. Las opciones de idioma distintas del español quedan fuera del contrato de esta primera plantilla.


## 4. Validación e invariantes del modelo

| Código | Invariante de dominio |

| --- | --- |

| INV-01 | IDs no vacíos, únicos y estables; toda referencia a `markId`, `scopeId`, origen o entidad existente es válida o queda explícitamente como procedencia histórica. |

| INV-02 | Cada cuaderno `placements[]` tiene un orden total sin duplicar IDs de aparición; se puede repetir origen con distinto ID. |

| INV-03 | Para plantilla base: tipos de pregunta esperados 1 traducción, 1 sintaxis, 1 morfología y 1 elección. Puntos = 800 para estado «listo». |

| INV-04 | Pregunta de elección: `0 < requiredCount <= count(options.enabled)`, con apartados únicos; puntúa una vez, no por subapartado. |

| INV-05 | Todo `TextMark` cumple 0 ≤ start < end ≤ longitud UTF-16, `latin.slice(start,end)===exact` o `reviewRequired=true` sin subrayado automático. |

| INV-06 | No se exporta un candidato `needs-review` como verificado ni se crea significado inexistente. |

| INV-07 | Los campos `locked/manual` no cambian sin comando/confirmación dirigida y registro explícito. |

| INV-08 | La revisión de un cuaderno aumenta exactamente una vez por transacción confirmada; la escritura fallida deja la revisión anterior intacta. |

| INV-09 | Menú, vista previa y Word se derivan de `NotebookEditionV1` sin almacenar HTML paralelo. |

| INV-10 | Los cambios de documento no destruyen `CorpusV1`, su backup, ni los datos ajenos al ámbito de la operación. |




## 5. Persistencia, concurrencia e historial


### 5.1. Almacenes y transacciones

La base **histórica** `cuaderno-textos-latinos`, versión 1, permanece íntegra, con el `CorpusV1` original y su repositorio publicado. Se crea una base **nueva** `cuaderno-textos-latinos-workspace`, versión 1, que será la única fuente de datos de la UI nueva tras migrar. Esta decisión evita que una reversión de código falle por intentar abrir una base antigua con una versión de IndexedDB inferior.

| Store en la nueva base workspace | Clave | Contenido y política |

| --- | --- | --- |

| `corpus` | `current` | Copia validada del `CorpusV1` del origen al migrar. Desde la activación, este registro es el banco canónico editable de la UI nueva, con CAS de revisión. |

| `editions` | `editionId` | `{ key, revision, edition: NotebookEditionV1 }`. Fuente canónica del nuevo editor; escritura CAS por edición. |

| `history` | `editionId:sequence` | Eventos de cambios con parche directo/inverso, antiguo/nuevo hash, fecha y origen; misma transacción que `editions`. |

| `meta` | clave de migración | Marca de migración de `CorpusV1`, versión, revisión de origen y mapa de IDs. Se escribe solo tras validar la conversión. |



Cada mutación editorial crea una transacción `readwrite` **dentro de la nueva base**, que abarca `editions` y `history`; verifica `expectedRevision`, valida el agregado nuevo y escribe documento + evento. Las operaciones que afecten también al banco podrán abarcar `corpus` en la misma transacción de esa base. En conflicto se cancela todo; el borrador se conserva.

Tras migrar, los cambios en los textos base se guardan en el store `corpus` de la base nueva y ya no en la base histórica. **No existen dos fuentes activas de cuadernos para la nueva UI**: los `CorpusV1.notebooks` copiados quedan como referencia histórica; `editions.placements[]` es el único orden editable. La aplicación antigua, si se utiliza para volver atrás, solo verá el estado previo de la base antigua; esto se explica al usuario.


### 5.2. Historial y deshacer

Todo cambio significativo (texto, pregunta, slot, vocabulario, orden, formato, eliminación) registra `OperationEventV1` con ID, destino, `before`, `after`, revisión y timestamp. La operación inversa se aplica como una **nueva transacción** y no mediante borrado retrospectivo de eventos. No se garantiza deshacer tras borrar los datos de Safari.

El contrato mínimo de la primera entrega será **deshacer al menos 20 operaciones confirmadas por cuaderno a través de recargas de página**; ninguna depuración del historial se realiza sin ofrecer copia previa y explicar el alcance. Borrar una aparición usa retirada reversible o papelera, no eliminación física inmediata.


## 6. Contrato de comandos: edición, navegación y regeneración

```ts
type CommandV1 =
  | { kind: 'edit-field'; editionId: UUID; placementId: UUID;
      entityId: UUID; field: string; value: unknown }
  | { kind: 'set-active'; placementId: UUID } // solo EditorSession
  | { kind: 'move-placement'; editionId: UUID; placementId: UUID;
      toIndex: number }
  | { kind: 'toggle-option'; editionId: UUID; placementId: UUID;
      optionId: UUID; enabled: boolean }
  | { kind: 'regenerate'; editionId: UUID; placementId: UUID;
      target: 'word' | 'subquestion' | 'question'; targetId: UUID;
      expectedRevision: number; candidateId: string }
  | { kind: 'undo'; editionId: UUID; eventId: UUID;
      expectedRevision: number };
```

`set-active` no genera ningún evento del cuaderno ni modifica las preguntas: solo cambia la sesión de la UI. El cambio de contexto exige vaciar la cola de guardado anterior o conservar íntegro un borrador pendiente, pero nunca sobreescribir contenidos del nuevo contexto.

**Secuencia regeneración:** 1) se fija destino e ID; 2) se solicita un candidato al proveedor; 3) se verifica fuente, temario, unicidad y límites; 4) se calcula un diff acotado; 5) si hay bloqueo manual se pide permiso; 6) CAS sobre la edición; 7) se graba evento inverso; 8) se deriva de nuevo la vista. Si cualquier paso falla antes del commit, el estado no cambia.

Regenerar todo un apartado o toda una pregunta es una operación **separada y explícita**, no la consecuencia de aumentar o disminuir el número de slots. Las actualizaciones masivas no reescriben IDs ajenos ni los campos protegidos por defecto.


## 7. Flujo editorial único para vista y exportación

La aplicación construirá `RenderedNotebookV1 = project(NotebookEditionV1)`, un árbol de presentación con páginas semánticas, párrafos, fragmentos tipográficos, preguntas, opciones, caja de vocabulario y pie. No se persiste por separado ni como HTML, ni como Word.

`renderHtml(tree)` se usa para la vista previa editable; `renderDocx(tree)` y `renderPdf(tree)` serán adaptadores posteriores. Los cambios directos sobre la hoja se traducen a `edit-field` y actualizan el mismo modelo que el menú. La vista de cuaderno completo concatena todos los `placements[]` conservando su orden.
- Se controla la correspondencia de contenido mediante hashes/serialización semántica comunes entre menús, vista y salida Word. La paginación se verifica visualmente contra documentos reales; no se promete coincidencia absoluta entre Safari, Word y Pages sin auditoría.
- Se respetan cursivas del texto latino y del título de obra, subrayados de apariciones específicas, caja de vocabulario, puntos, numeración y pie de página. En la primera versión docente se utilizarán exactamente las cuatro preguntas y el total 8.


## 8. Migración desde CorpusV1 y compatibilidad

1. **Preflight:** validar completamente el registro `CorpusV1`, la revisión actual y el espacio disponible; ofrecer una exportación previa `backupVersion:1` sin modificar el contenido.

2. **Nueva base sin upgrade destructivo:** abrir `cuaderno-textos-latinos-workspace` en versión técnica 1 y crear `corpus`, `editions`, `history` y `meta` durante `onupgradeneeded`. No aumentar la versión ni alterar la base existente `cuaderno-textos-latinos`.

3. **Conversión explícita, repetible:** recorrer los cuadernos `CorpusV1.notebooks` y sus `textIds` en orden; crear una `NotebookEditionV1` por cuaderno, con una aparición e instantánea del texto por referencia, preguntas de plantilla y 8 puntos. Conservar `legacyNotebookId`.

4. **Commit único en la nueva base:** escribir la copia validada de `CorpusV1`, todas las ediciones, el marcador y el mapa de IDs en una transacción de `cuaderno-textos-latinos-workspace`. Si falla algo, no se marca migrado y no se altera la base original.

5. **Idempotencia y concurrencia:** reintentar el mismo `migrationMarker` no duplica apariciones. Se registra la revisión del corpus histórico utilizada y se vuelve a comprobar al terminar de prepararlo; si la aplicación antigua cambia después, se ofrece importación de diferencias controlada, nunca fusión silenciosa.

6. **Activación controlada:** la interfaz nueva lee únicamente la base workspace y gestiona los cuadernos mediante `editions`. El banco de textos nuevo es su `corpus` copiado; la base histórica se mantiene intacta para recuperación, sin sincronización bidireccional.

7. **Rollback realista:** la versión anterior puede reabrir su base original `cuaderno-textos-latinos` sin error de versión; las ediciones y textos creados solo en workspace **no aparecerán** en la interfaz antigua, pero no se eliminarán. Para recuperarlos se vuelve a activar la versión nueva o se importa su backup v2.

No se convierte `CorpusV1` en v2 agregándole campos desconocidos: su validador actual los rechaza y las copias v1 exigen exactamente los campos antiguos. La evolución consiste en una **copia de trabajo integral en base nueva**, validada, versionada e independiente del archivo original. Es la única base activa después de la migración.


## 9. Copias JSON y restauración segura

| Formato | Contenido / conducta |

| --- | --- |

| Copia antigua `backupVersion:1` | Se valida con el lector actual y se ofrece **importar como legado** o convertir a nuevas ediciones tras previsualización; nunca eliminar trabajos v2 silenciosamente. |

| Copia nueva `backupVersion:2` (por implementar) | Snapshot coherente de los stores de workspace en una lectura transaccional (`corpus`, `editions`, `history`, `meta`); esquema y revisiones verificables y SHA-256 del contenido canónico. |

| Restauración completa | Primero inspección, copia externa del estado actual y confirmación; commit atómico **dentro de la nueva base workspace** en `corpus`, `editions`, `history` y `meta`, seguido de lectura de verificación. La base antigua no se toca. |

| Corrupción o versión desconocida | Rechazar con mensaje recuperable y sin tocar el almacenamiento existente. |

| Dos pestañas | CAS y detección de conflicto. No basta abrir una copia para adoptar una revisión ajena. |



El límite de 32 MiB de las copias v1 se mantiene hasta implementar y medir el nuevo exportador; no se reutiliza ciegamente para cuadernos grandes. Las copias JSON siguen siendo locales; el hash detecta alteración accidental, **no** autentica al autor. Safari puede borrar IndexedDB o caché: el backup externo es obligatorio como medida docente.


## 10. Biblioteca offline y futuras etiquetas

La biblioteca estática de **28 obras y 3455 pasajes** procedentes de Julio César, Eutropio y Cornelio Nepote permanece independiente de `editions`. El Service Worker conserva los archivos de catálogo; las apariciones editadas no dependen de la disponibilidad futura del recurso de origen porque guardan su instantánea.

El esquema reserva `grammaticalTagIds` en cada aparición. La primera fase de etiquetado usará el catálogo `GrammarTag` ya previsto en `CorpusV1`, sin asignar etiquetas automáticamente ni inferir construcciones no verificadas. Se conservará complemento agente independiente de voz pasiva y opción de etiqueta personalizada.


## 11. Matriz de pruebas y puertas de integración

| Conjunto | Prueba representativa | Puerta de salida |

| --- | --- | --- |

| Migración | CorpusV1 con 0, 1 y muchos cuadernos; textos repetidos entre cuadernos; reintento y fallo al crear la base nueva. | Datos legacy intactos; ediciones correctas; idempotencia y rollback seguro. |

| Integridad | Anclajes de homógrafos, edición de texto base y eliminación reversible. | Nada se subraya en el lugar equivocado; no hay referencias corruptas. |

| Regeneración | Cambiar solo 4a, regenerar 4b, bloquear campo manual, cambiar número de slots. | Diff limitado al destino; instantáneas fuera de alcance idénticas. |

| Suma y numeración | Desactivar 4d, cambiar puntuación, elegir 2 de 3 y luego 2 de 4. | Enunciado coherente; 800 centésimas exigidas para estado listo. |

| Navegación | Anterior/Siguiente/selector, modo completo, 50 textos, cierre y recarga. | No hay pérdida de edición ni mezcla de preguntas entre apariciones. |

| Persistencia | Fallo de cuota, interrupción, dos pestañas, borrador con cambios. | Transacción abortada sin pérdida; conflicto visible. |

| Undo/backup | Deshacer tras recargar; importar copia antigua/nueva; archivo corrupto. | Se restauran los cambios esperados y nunca se borra silenciosamente v2. |

| Render | Texto con macrones, cursivas, subrayados, páginas largas y vocabulario. | Vista y Word tienen igualdad semántica; PDF/Pages revisados por comparación. |

| WebKit/iPad | Cambiar pestañas, editar dentro de hoja, zoom, selección táctil y modo offline. | Funcionamiento sin regresiones visuales o de eventos. |



En CI se exigirán pruebas unitarias de validadores y comandos, integración IndexedDB real, pruebas E2E WebKit y comparación de documentos de referencia en los módulos donde aplique. No se fusionará una rama que rompa la restauración de la fase 1 o la consulta de la biblioteca offline.


## 12. Plan técnico siguiente, sin publicación prematura

1. Crear **PR técnica 1: dominio y validadores** (`NotebookEditionV1`, comandos puros, total 800, referencias, anclajes y pruebas exhaustivas). Sin UI nueva.

2. Crear **PR técnica 2: almacenamiento y migración** (base workspace nueva y separada, CAS por edición, historial, importación legacy, pruebas de recuperación y rollback real). Sin tocar la aplicación pública.

3. Crear **PR técnica 3: proveedores y motor** (adaptadores a bancos verificados, candidatos auditables, regeneraciones atómicas, escenarios docentes).

4. Crear **PR técnica 4: interfaz definitiva y render semántico**, a partir del prototipo aprobado, navegación de cuadernos y edición bidireccional.

5. Crear **PR técnica 5: etiquetado y exportación**, con cotejo Word/PDF/Pages y auditoría filológica transversal antes de publicación estable.

**Recomendación definitiva:** empezar por PR técnica 1 (contratos + invariantes + pruebas, sin publicar). Esto proporciona una base verificable para todas las demás funcionalidades y reduce el riesgo de rehacer la persistencia o romper el cuaderno al regenerar.

> El modelo aquí descrito es una especificación técnica aprobada para construir; todavía no constituye código implementado ni una migración ejecutada. Ningún dato existente se ha modificado para redactar este documento.
