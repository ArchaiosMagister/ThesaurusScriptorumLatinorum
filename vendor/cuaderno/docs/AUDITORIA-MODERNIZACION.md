# Auditoría de modernización

Base examinada: `main` en `5d46663`. La revisión experimental que compila Pages es
`50b6db1e982305a313e556aab57ded525354e23c`. Las dos rutas usan identificadores de
IndexedDB distintos, aunque alojadas en el mismo sitio.

## Persistencia y relaciones

- `src/storage/indexeddb-corpus-repository.ts` guarda el corpus histórico en un
  registro con revisión. Los textos tienen ID, título, latín, cita y etiquetas.
  Los cuadernos históricos son listas ordenadas de IDs. Una edición del texto
  repercute en esas listas al consultarlas y el borrado actual quita sus
  referencias.
- `src/storage/workspace-repository.ts` guarda corpus editorial, ediciones e
  historial. Cada aparición editorial conserva el ID de origen y una copia con
  su latín, preguntas, vocabulario y anotaciones. Las ediciones preparadas no
  dependen de una consulta al banco para exportar. El editor simplificado
  también guarda borradores de textos en una edición de trabajo que se reutiliza
  al preparar cuadernos. No se debe convertir un borrador en fuente canónica
  sin comprobación y conservar las divergencias.
- Las escrituras usan revisión esperada. La transacción protege cada base por
  separado. Una operación en ambas bases requiere recuperación explícita si
  falla la segunda escritura. La variante experimental combina dos corpus y
  algunas acciones escriben en ambos de forma secuencial.
- Hay copias JSON v1 del corpus y v2 del espacio editorial. El flujo de
  recuperación valida la huella antes de reemplazar y comprueba después el
  contenido guardado. Las bases aisladas de Pages requieren identificar el
  origen correcto al exportar o restaurar. Un archivo v1 no incluye las
  personalizaciones almacenadas en ediciones.

## Biblioteca, exportación y conexión

- La portada estable abre Textos; elegir un registro abre o crea una aparición
  de trabajo. La interfaz clásica ya tiene un editor de fuente con operaciones
  de catálogo, texto propio, etiquetas manuales y vínculos a cuadernos antiguos.
  Es reutilizable desde un acceso principal.
- Word se construye localmente en `src/export/notebook-documents.ts`; PDF usa
  la vista imprimible del navegador. Las dos salidas consumen la edición.
  Al modificar el banco deben comprobarse las dos salidas de un cuaderno
  preparado antes del cambio.
- La interfaz clásica registra el service worker y el build empaqueta el
  catálogo. La portada estable no lo registra por sí sola. La navegación
  offline requiere una primera visita con recursos disponibles. Que IndexedDB
  funcione offline no garantiza la recarga de la aplicación o de una obra.
- El flujo de CI usa WebKit. Falta verificar descargas y diálogo de impresión en
  Safari de un iPad físico.

## Collatinus

La documentación anterior corresponde a main sin el adaptador. El despliegue
experimental ya lo carga de forma diferida. La inicialización carga datos,
shim y motor en orden y espera `warm`. Vocabulario y etiquetado solicitan
`analyze` por separado para el mismo latín, y la revisión vuelve a analizar
el pasaje entero. Son costes visibles en el código, medidos en un ensayo local con Node VM. La carga local de los cuatro
archivos duró 0,8 s y el calentamiento, 4,3 s. Un pasaje de César tardó
387 ms en la primera consulta y 94–114 ms en las tres repeticiones. Este
ensayo no reproduce la red ni Safari en iPad. El contrato de integración
del motor verificó 31 tokens y 22 propuestas en su corpus de prueba. La revisión del banco conserva descartes en memoria
durante el diálogo. La revisión editorial conserva decisiones por ancla.
Las lecturas dependen del contexto y los desplazamientos son UTF-16.
No se puede cortar arbitrariamente el texto sin comprobar la equivalencia
frente al análisis completo.

## Secuencia de implementación

1. Dar acceso directo desde la portada estable al editor de fuente, reutilizar
   su persistencia y añadir filtros bibliográficos. No crear otra base.
2. Acordar la ruta que se moderniza primero. Inventariar los dos corpus y las
   apariciones por ID. Conservar los borradores personalizados y las ediciones
   cerradas. Para los cuadernos históricos, representar explícitamente el
   contenido preservado antes de desvincular una fuente. Añadir copia y pruebas
   de restauración antes de introducir cualquier migración.
3. En la ruta acordada, compartir análisis de latín idéntico entre vocabulario
   y gramática. Versionar la caché por motor y léxico, y guardar las decisiones
   docentes por separado. Medir carga, calentamiento, análisis y renderizado.
   Aislar el cálculo en un worker una vez comprobada la compatibilidad del shim.
   Validar el análisis incremental con homógrafos y formas perifrásticas antes
   de reutilizar fragmentos tras una edición.
4. Añadir las nueve etiquetas combinadas por ocurrencia. Mantener los IDs
   históricos. Un conjunto de etiquetas de un pasaje no demuestra qué voz y
   tiempo corresponden a cada infinitivo. Las propuestas y decisiones se
   anclan al fragmento; la exclusión de pasiva y deponente opera sobre la
   misma forma, pues ambas pueden aparecer en un pasaje. Conservar la
   revisión docente para las construcciones ambiguas.
5. Verificar creación, edición y restauración con datos anteriores, CAS entre
   pestañas, Word, impresión PDF, revisión de etiquetas, caché offline y
   experiencia WebKit antes de fusionar. La detección de duplicados, portadas
   y sincronización tendrán cambios independientes.
