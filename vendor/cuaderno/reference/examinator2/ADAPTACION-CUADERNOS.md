# Base literal de Examinator2 — reconstrucción de CuadernoTextosLatinos

## Decisión

La aplicación de cuadernos no continuará imitándose mediante clases propias `exlib-*`. La referencia para rehacer la experiencia será el código **real** de `ArchaiosMagister/examinator2`, conservado en esta carpeta **sin ediciones**. Las adaptaciones posteriores se documentarán por separado, fuera de esta copia.

La copia no se carga ni se distribuye en la web existente: es una referencia técnica segura. No sustituye la aplicación, su base de datos ni el prototipo anterior; ninguna vista se activa todavía.

## Archivos originales incorporados

- `index.html`: estructura real con cabecera, editor, vista previa y biblioteca `#lib`.
- `styles.css`, `fonts.css`: estilos reales de Examinator2; dependencias de Gentium Book Plus.
- `js/util.js`, `js/render.js`, `js/exam.js`, `js/start.js`, `js/library.js`, `js/propose.js`, `js/lists.js`, `js/vocabulario.js`, `js/motor.js`, `js/shim.js`: comportamiento y motor originales.
- `FUENTES.md`: procedencia bibliográfica/licencias originales.

La fidelidad de cada archivo de texto se ha verificado comparando su **SHA de objeto Git (blob)** con la del mismo archivo en el repositorio original. Los archivos grandes de datos `js/datos.js` y `js/incluidos.js`, el empaquetado de escritorio, bibliotecas binarias y los archivos de fuente tipográfica **no se duplican aquí**: se reutilizarán mediante un adaptador de bancos/licencias y recursos de compilación apropiados. Esta copia no es por sí misma una aplicación ejecutable.

## Adaptación por capas (sin recrear la interfaz)

1. **Pantalla 1:1 de Examinator2**. Tomar `index.html` y `styles.css` originales como documento base de la interfaz completa —cabecera, panel izquierdo, vista previa derecha, biblioteca superpuesta—, y comprobarlos frente a Examinator2 antes de cualquier personalización. No montar `notebook-app.ts` como pantalla principal de esa ruta.
2. **Puente de aplicación, sin redibujar DOM**. Examinator2 invoca `M.call('catalog')`, `M.call('work')`, `M.call('download')`, `M.call('deleteTexts')`, `M.setTextFromLibrary` y `window.api.on`. El nuevo adaptador web implementará estos contratos con `library/catalog.json`, el catálogo Perseus, `DownloadedWorksRepository`, `CorpusRepository` y `WorkspaceRepository`. La vista conservará sus clases `lhead`, `lbody`, `lcat`, `lread`, `lrow`, `rtext`, `rl`, `rc` y `rx`, en lugar de los componentes `exlib-*`.
3. **Cuadernos, no exámenes**. Sustituir la persistencia del examen de Examinator2 por cuadernos: crear/abrir/guardar, añadir un pasaje a la edición activa y volver a ella, y generar preguntas **sin solucionarios**. Conservar identificadores, banco docente, preguntas, etiquetas, progreso y exportación actual. No insertar preguntas vacías cuando se cancela una búsqueda.
4. **Safari/iPad**. Conservar el aspecto original como referencia para una anchura de escritorio de 820 px; después aplicar solo los ajustes de interacción inevitables (selección de texto con el dedo, menú accesible y descarga de textos en IndexedDB) en una hoja CSS separada.
5. **Pruebas visuales y funcionales**. Añadir capturas comparables con Examinator2 y verificar dimensiones, colores, tipografías, nombres de controles y estados interactivos, no solo que las pruebas de programación pasen. Probar búsqueda, filtros, descargas, selección parcial, apertura de cuadernos, persistencia, copias JSON y Word/PDF.
6. **Publicación**. Desplegar solo en una ruta experimental nueva, con IndexedDB/caché independientes; conservar aplicación estable, `/prueba/` y `/prueba-examinator2/`. No integrar la nueva UI hasta aprobación de una prueba visual en iPad.

## Límites deliberados

- No se borrarán registros o archivos del usuario ni se harán migraciones destructivas.
- No se reutilizará el motor de preguntas de Examinator2 como si el cuaderno fuera un examen; se conservará el sistema académico específico de CuadernoTextosLatinos mediante un adaptador.
- No se activarán botones decorativos o sin función: las funciones del programa de escritorio que no correspondan al cuaderno se adaptarán expresamente y se probarán.
- La PR #25 existente es un prototipo alternativo; no es la base visual de la reconstrucción y seguirá sin fusionarse.
