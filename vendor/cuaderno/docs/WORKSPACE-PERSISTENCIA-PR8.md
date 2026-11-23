# PR técnica 2 — Persistencia editorial, migración e historial

**Estado:** módulo independiente probado en aislamiento; todavía no conectado a la interfaz de CuadernoTextosLatinos ni ejecutado sobre las bases reales de un docente. **No se migra automáticamente nada al instalar o cargar la aplicación.**

## Qué se introduce

La base independiente `cuaderno-textos-latinos-workspace` usa **versión IndexedDB 1** y cuatro stores (`corpus`, `editions`, `history`, `meta`). No se cambia ni la versión ni el esquema de la base histórica `cuaderno-textos-latinos` y las copias JSON `backupVersion:1` siguen siendo compatibles.

| Store | Clave | Contenido |
| --- | --- | --- |
| `corpus` | `current` | Copia de `CorpusV1` con revisión CAS; no es un alias ni una escritura en la base histórica. |
| `editions` | `editionId` | Edición canónica `NotebookEditionV1` y revisión independiente. |
| `history` | `[editionId, revisionAfter]` | Evento `OperationEventV1` con estado antes/después y origen, en la misma transacción que el cambio. |
| `meta` | `workspace-revision`, `migration-legacy-v1` | Epoch CAS global, procedencia y mapa de IDs de migración. |

### Métodos principales

- `WorkspaceRepository.snapshot()` lee los cuatro stores bajo **una transacción readonly** coherente; valida relaciones y la cadena del historial antes de devolver datos.
- `loadEdition`, `listEditions`, `loadCorpus` y `history` son consultas que no escriben.
- `commitEdition(id,expectedRevision,mutation,update)` valida la revisión, aplica un cambio puro a una copia validada, y confirma edición + evento + epoch en una sola transacción. Las funciones `update` **no pueden devolver promesas**: no se hacen esperas de red dentro de una transacción IndexedDB.
- `undoLast(id,expectedRevision,at)` registra otra transacción de deshacer sin borrar la historia; la operación vuelve al estado anterior del último evento elegible. No permite deshacer la creación inicial con `before:null` (habrá una operación editorial de papelera más adelante). El historial no se compacta ni se purga; se prueban **25 deshacer** incluso entre instancias y recargas.
- `saveCorpus` tiene CAS propio, sin modificar `CorpusV1` histórico. `workspace-revision` aumenta con cada escritura confirmada, incluso de otra edición.

**Errores:** revisiones antiguas producen `WorkspaceConflictError`; documentos inválidos, cadenas de eventos inconsistentes, cuotas y operaciones imposibles cancelan íntegramente la transacción. También se prueba la reversión cuando `history.add` falla **después** de que `editions.put` se haya encolado, así como el rechazo de una revisión global borrada o incoherente. No hay sobrescritura silenciosa ni vaciado automático de tablas. La guarda de `before/after` completos favorece la recuperación y verificabilidad, pero puede elevar el consumo de cuota con cuadernos extensos; se conservarán todos los eventos hasta diseñar una política docente explícita de archivo y compactación.

## Migración desde la aplicación histórica (nunca implícita)

1. `prepareLegacyMigration(legacyRepository)` lee el corpus actual y devuelve inventario, revisión exacta, huella SHA-256 y **copia JSON v1 completa**. `prepareLegacyBackupImport(json)` prepara un archivo v1 verificado como alternativa sin acceder a otra base de datos.
2. La UI futura obliga a **ofrecer la descarga externa del JSON anterior**. El código exige `legacyBackupExported:true` y `confirmCreateWorkspace:true` para continuar, aunque la capa de dominio no puede comprobar físicamente que Safari haya guardado el archivo.
3. `executeLegacyMigration` verifica de nuevo la copia y la revisión de `CorpusV1` si la fuente es la base antigua, y construye IDs deterministas mediante SHA-256 para cuadernos, apariciones y preguntas. Se conservan orden, texto latino, tildes/macrones, citas y etiquetas; se deja sin rellenar el análisis filológico no disponible.
4. `installLegacy` comprueba en una sola transacción que los cuatro stores estén sin contenido editorial. Crea corpus, ediciones, marca e índice de IDs **solo en workspace**, o reconoce un reintento idéntico sin duplicar nada.
5. Si el corpus original cambia tras el preflight y antes del commit se rechaza la migración. Si cambia en la estrecha ventana entre el último cotejo y el commit, el resultado expone `sourceChangedAfterCommit:true`; deberá mostrarse una advertencia y facilitar una conciliación explícita posterior. **No existe transacción atómica entre las dos bases distintas**: se conserva la fuente sin escribir, y no se promete una sincronización bidireccional imposible.
6. Si ya existe cualquier cuaderno o corpus editable en workspace no se reemplaza para migrar; una migración distinta exige resolución manual. La antigua versión podrá seguir abriendo su base original, sin ver cambios realizados exclusivamente en workspace.

## Copias de seguridad editoriales v2

La copia usa `format:'cuaderno-textos-latinos-workspace'`, `backupVersion:2`, fecha UTC, checksum SHA-256 y `snapshot` de los cuatro stores leído coherentemente. Se verifican el contrato, relaciones, revisión y correspondencia entre último evento y edición. SHA-256 **detecta alteración**, pero no demuestra autoría. Se rechazan archivos corruptos, v1 y versiones desconocidas; el archivo v1 dispone de la ruta independiente `prepareLegacyBackupImport`. El límite de 64 MiB para esta versión detiene explícitamente copias demasiado grandes **sin generar archivos parciales**; antes de ampliar el límite se medirá el comportamiento de Safari.

`prepareWorkspaceRestore` verifica el archivo que se quiere restaurar y produce **otra copia externa del estado actual**, acompañada de recuentos de cuadernos/textos/eventos y epoch esperado. `restoreWorkspaceBackup` requiere ambos consentimientos (`confirmReplace`, `safetyBackupExported`), verifica el backup de seguridad frente al estado todavía actual, coteja `workspace-revision` (CAS) y reemplaza los cuatro stores en **una sola transacción**. Después vuelve a leer y comprobar el estado. El repositorio histórico permanece intocable. La interfaz futura tendrá que forzar la descarga previa y explicar los datos que se van a sustituir.

## Fuera de alcance / límites reconocidos

- No se altera `CorpusV1`, IndexedDB v1, el lector de copias v1, la biblioteca offline, la PWA ni la web publicada.
- La UI todavía no llama estas APIs; **ningún cuaderno del usuario se ha migrado**.
- No hay sincronización entre dispositivos, servidor ni autenticación; Safari puede eliminar los datos del sitio. Las copias JSON externas seguirán siendo imprescindibles.
- La migración no puede capturar atómicamente dos bases de datos separadas; hay verificación antes y después y se expone la divergencia.
- Los estados completos `before` y `after` del historial consumen espacio. Si la cuota local se agota, la transacción falla sin descartar historial ni documento anterior. Un sistema de snapshots incrementales y poda con consentimiento se evaluará con datos docentes reales.
- Sin interfaz de papelera, se puede deshacer una eliminación editorial implementada como operación reversible. La PR 8 no introduce todavía el comando visual de retirar/restaurar apariciones.

## Pruebas exigidas antes de integrar

- Unitarias: creación, CAS por cuaderno, CAS del corpus, dos pestañas concurrentes, fallo de transacción, corrupción, versión futura, historial y 25 deshacer, aislamiento entre ediciones.
- Migración: vacíos y poblados, dos cuadernos con texto compartido, orden, huellas, doble ejecución, estado antiguo modificado, conflicto con workspace existente, IDs deterministas, backup v1 y límites del modelo.
- Copias v2: lectura congruente, SHA inválido, versión desconocida, preflight, confirmaciones, restauración, conflicto de epoch, lectura posterior y preservación del estado ante fallos.
- WebKit real: nuevos casos de commit, deshacer tras recargar, migración real entre dos bases IndexedDB aisladas, importación idempotente y backup/restauración v2 en el motor Safari.
- No regresiones: todas las pruebas anteriores, compilación y batería Playwright WebKit del lector, almacenamiento legacy y restauración v1.

**Criterio de integración:** PR verde en CI, sin fusión o despliegue hasta autorización explícita. Se añade este módulo a la rama `main` únicamente cuando el profesor lo indique; la UI actual no cambia.
