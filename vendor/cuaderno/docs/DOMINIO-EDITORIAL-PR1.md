# PR técnica 1 — dominio editorial y pruebas

**Estado:** módulo aislado; la web publicada no lo importa. No hay escrituras nuevas en IndexedDB, migración, generación de candidatos ni exportación.

**Fuentes de contrato:** `docs/ESPECIFICACION-FUNCIONAL-v1.md` y `docs/ARQUITECTURA-EDITORIAL-v1.md`, versión 1.0 aprobada el 15/11/2026.

## Contratos

- `src/core/edition-model.ts`: `NotebookEditionV1`, `TextPlacementV1`, `QuestionV1`, `MorphWordV1`, `QuestionWordSlotV1`, `VocabularyEntryV1`, anclajes UTF-16, procedencia académica, formato de página, sesión efímera y tipos de comando/evento futuros.
- `src/core/edition-validation.ts`: validación estricta de estructura, IDs únicos en el agregado, referencias de subrayados, evidencia de candidatos, coherencia de offsets, puntuaciones enteras, fechas y límites. Diferencia **borrador estructuralmente válido** de **edición lista**.
- `src/core/edition-factory.ts`: plantilla fiel al modelo: **4 + 1 + 1 + 2 = 8 puntos por texto**, cuatro apartados configurables a.–d., texto sin contenido filológico inventado. Copia del texto de `CorpusV1` sin editarlo.
- `src/core/edition-operations.ts`: operaciones puras de navegación, ordenación, edición manual y sustitución aislada por palabra, apartado y pregunta. Conserva IDs, bloqueos manuales y puntuación ajena al alcance de regeneración.
- `src/core/edition-domain.test.ts`: pruebas deterministas de invariantes, aislamiento entre apariciones, homógrafos, referencias, navegación (incluido cuaderno con 50 textos), límites de regeneración y cambios inválidos.

## Decisiones de seguridad

1. `CorpusV1` y su backup v1 no cambian. El agregado editorial se incorpora como contrato **nuevo**, sin conectar aún ninguna UI de producción.
2. Cada texto incorporado a un cuaderno es una **aparición independiente** con instantánea editable del texto y sus preguntas. Varias apariciones pueden compartir `sourceId` o `urn`.
3. Los campos numéricos de puntuación usan **centésimas enteras**. Una suma diferente de 800 es un borrador válido, pero no una edición lista; el sistema no redistribuye puntos.
4. Los apartados de elección derivan su encabezado del número de opciones activas usando marcadores `{required}` y `{offered}`, evitando frases desincronizadas.
5. Un texto con preguntas morfológicas sin palabras o apartados activos sin términos **no se certifica como listo** aunque sume 8. Ningún generador ficticio rellena los huecos.
6. Las marcas comprueban offsets UTF-16, texto exacto y huella de contexto; si cambia el texto, pasan a **revisión necesaria** y no se trasladan a otro homógrafo silenciosamente. **Protección adicional de revisión:** si la edición recorta por completo el intervalo de una marca y dejaría offsets fuera de la cadena, esta PR rechaza la operación *sin perder texto, marcas ni análisis*. El flujo futuro para retirar/reanclar explícitamente una marca antes de acortar el texto deberá diseñarse con historial en la PR técnica 2 o posterior.
7. Las incidencias de revisión `scopeId` solo pueden referirse a la misma edición o a entidades de su propia aparición, nunca a otro texto del cuaderno. Una regeneración no puede simular una palabra manual ni siquiera mediante confirmación de reemplazo; la confirmación autoriza sustituir por propuestas generadas identificadas.

8. Las regeneraciones puras requieren una propuesta con evidencia y no pueden fingir cambios manuales; el motor proveedor y su validación curricular están expresamente pendientes. Una sustitución de un elemento bloqueado exige política explícita.
9. La navegación solo modifica `EditorSessionV1`, que queda **fuera del cuaderno exportado**. Menú y vista previa futura deberán leer/escribir los mismos registros.

## No implementado en esta PR (bloqueo deliberado)

- **No existe una nueva base** `cuaderno-textos-latinos-workspace` todavía. La implementación transaccional, CAS de revisiones, historial y deshacer persistente pertenecen a la PR técnica 2.
- No se ha implementado migración o importación de backups v1/v2; tampoco rollback ni recuperación de sesiones pendientes. Se diseñarán y probarán en la PR técnica 2.
- No se ha incorporado motor filológico, selección de candidatos de bancos, exportación, vista previa ni nueva interfaz. Son PR posteriores.
- Las huellas de marca FNV-1a sirven para **detectar cambios en el contexto**, no son firmas criptográficas ni mecanismos de seguridad.

## Puertas de aceptación

- Pruebas `npm run typecheck` y `npm run test` sin errores.
- `npm run build` y pruebas E2E WebKit de fase 2 siguen pasando para descartar regresiones; ninguna ruta productiva depende del nuevo módulo.
- Revisión de la PR sin fusión ni despliegue hasta autorización docente.

### Notas sobre la preparación

Se han documentado referencias públicas y decisiones docentes. **No se presupone que un archivo `.md` sea por sí solo un código certificado:** las verificaciones de CI son el criterio técnico.
