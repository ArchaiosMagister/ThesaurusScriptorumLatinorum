# Persistencia y recuperación (fase 1)

## IndexedDB

La implementación `IndexedDbCorpusRepository` utiliza la base `cuaderno-textos-latinos`, versión de IndexedDB 1 y el almacén `corpus`. Cada versión lógica del corpus es un registro único `current`, con `revision` y `corpus`.

Las escrituras se realizan en una transacción `readwrite`: se lee el registro, se valida la revisión esperada, y únicamente entonces se sustituye el corpus. La transacción se revierte si se produce un error. Un fallo de almacenamiento **no borra el corpus anterior**, y el control de revisión protege contra dos pestañas que guarden sobre la misma versión.

El modelo docente conserva `schemaVersion: 1`. No se inventa ni aplica una migración desde versiones anteriores porque no existía persistencia en la fase 0. Las versiones de archivo desconocidas se rechazan explícitamente. Cuando cambie el esquema se añadirán migraciones con sus pruebas y una estrategia de copia previa.

## Copias externas

La copia JSON tiene los siguientes campos:

- `format: "cuaderno-textos-latinos"`
- `backupVersion: 1`
- `exportedAt: UTC ISO 8601`
- `sha256: digest hexadecimal de SHA-256`
- `corpus: CorpusV1`

La huella se calcula sobre la serialización canónica del corpus después de validar sus relaciones. Se impone un máximo de 32 MiB para esta primera versión, que se revisará según los corpus reales. El hash **no prueba autenticidad ni evita ataques** deliberados.

Importar exige escoger un archivo, marcar expresamente el reemplazo y aceptar una segunda confirmación. El archivo se verifica antes de iniciar la transacción. No se conserva automáticamente una segunda copia de la revisión sustituida: **descarga antes una copia de los datos actuales**. No hay fusión automática de dos copias.

## Riesgos contemplados

- Caída o error de escritura: transacción atómica y rechazo; versión anterior intacta.
- Errores de referencia: se valida antes de guardar y también después de leer.
- Dos pestañas: bloqueo optimista por número de revisión, no reemplazo silencioso.
- Archivo corrupto: rechazo por formato, esquema o huella.
- Cambios de versión: rechazo explícito de versiones incompatibles.
- Navegación privada, borrado de datos de Safari, baja cuota o retirada del sitio: **no se garantizan datos persistentes** sin archivo externo.
- Duplicación entre dispositivos: no existe sincronización en esta fase.

## Comprobación manual en iPad

1. Abre la web publicada en Safari (en HTTPS, no desde un archivo local).
2. Pulsa **Guardar texto de prueba** y comprueba que Textos = 1 y Revisión = 1.
3. Recarga la página: el campo editable debe mostrar automáticamente el texto guardado (incluidos los macrones). Pulsa **Releer datos guardados** para volver a sincronizarlo.
4. Cambia el texto, vuelve a guardarlo y verifica que aumenta la revisión.
5. Pulsa **Exportar copia JSON** y revisa que aparece un archivo en Descargas/Archivos.
6. Cambia el texto otra vez. Selecciona la copia descargada, marca la confirmación y pulsa **Verificar y restaurar**.
7. Comprueba que reaparece el texto original **tanto en «Última prueba guardada» como en el campo editable**, y que la revisión aumenta.
8. Prueba importar un JSON ajeno o modificado y verifica que la app lo rechaza sin sustituir datos.

La UI no es una aplicación docente funcional. La página de comprobación puede retirarse cuando se incorpore el editor definitivo.

### Nota de interfaz tras restaurar

La zona editable se sincroniza con el contenido restaurado sólo después de una escritura confirmada. Si la copia no contiene el registro de prueba, la zona se vacía y se explica el motivo. Las importaciones erróneas o canceladas no modifican el borrador de la zona editable. Al exportar, se lee la copia más reciente, pero **no** se adopta su revisión en el editor: así no se elude el bloqueo de concurrencia entre pestañas.

## Comprobación de recuperación (v0.2.2)

- En la zona de ejemplo, pulsa **Guardar texto de prueba** antes de descargar una copia. El ejemplo visible inicialmente no cuenta como dato persistido.
- La exportación rechaza cambios sin guardar para evitar copias incompletas.
- Los nombres de archivo contienen fecha y hora, de modo que se pueden distinguir varias copias.
- Al elegir una copia JSON, la interfaz muestra primero su fecha y una vista previa del texto que contiene, sin modificar IndexedDB.
- Si indica **CERO textos**, ese JSON no puede restaurar el ejemplo que buscas: es una copia que se creó sin haber guardado previamente el texto.
- La restauración exige una casilla de confirmación explícita; no depende de un cuadro de diálogo que Safari pueda suprimir.
- Al restaurar, se vuelve a leer IndexedDB y se coteja el corpus grabado con el solicitado. Se muestra un mensaje claro de éxito o error.
- Las pruebas E2E utilizan WebKit mediante Playwright en CI para recorrer el guardado, descarga, vista previa, restauración y recarga. Estas pruebas no sustituyen la verificación en Safari del iPad.
