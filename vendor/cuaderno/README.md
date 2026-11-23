# Cuaderno de textos latinos

**[Abrir el Cuaderno oficial](https://archaiosmagister.github.io/CuadernoTextosLatinos/)**

Selecciona pasajes de autores latinos, conserva textos propios y prepara cuadernos con preguntas, vocabulario y exportación Word/PDF. Collatinus propone análisis de morfología, vocabulario y etiquetas que el docente puede revisar.

La portada oficial abre la versión que antes se ofrecía como experimental. Los cuadernos de esa versión se abren en el mismo navegador y perfil donde se guardaron. Para acceder a los datos de la versión anterior, usa el [editor anterior](https://archaiosmagister.github.io/CuadernoTextosLatinos/cuaderno-clasico.html) o la [recuperación de la primera prueba](https://archaiosmagister.github.io/CuadernoTextosLatinos/recuperar-prueba/).

## Instalar como aplicación (PWA)

El Cuaderno oficial puede instalarse en el escritorio o en la pantalla de inicio del
móvil y conserva la biblioteca preparada para trabajar sin conexión.

- **Android y navegadores de escritorio compatibles:** usa «Instalar aplicación»
  cuando aparezca, o el menú de instalación del navegador.
- **iPhone/iPad con Safari:** «Compartir» → «Añadir a pantalla de inicio».
- Desde «Mis cuadernos» y desde el menú «Más» del editor puedes elegir
  **Buscar actualizaciones**. Si hay una versión nueva, el control cambia a
  **Aplicar actualización**: después de confirmar, el editor intenta guardar
  los cambios pendientes y solo entonces permite activar la nueva versión.
  Los formularios de importación o edición sin confirmar deben cerrarse o
  guardarse antes. En otras pestañas no se fuerza una recarga.

La instalación y la comprobación remota requieren HTTPS y conexión inicial.
Las actualizaciones del código no eliminan los datos de IndexedDB, pero es
conveniente mantener copias JSON de los cuadernos importantes.

## Biblioteca incluida sin conexión

La compilación distribuye en archivos estáticos **dos obras de Julio César, el Breviarium de Eutropio y veinticinco vidas de Cornelio Nepote**. Se parte de los textos que el docente ya había integrado en Examinator2 (César y Eutropio) y de la edición TEI de Perseus (Nepote). Se conservan la referencia editorial y la procedencia.

Para usarla sin conexión hay que abrir la web **una primera vez con internet**, esperar la indicación «Biblioteca preparada sin conexión» y mantener los datos del sitio. El Service Worker guarda la aplicación y todas las obras. **Safari puede eliminar caché o datos locales**: exporta copias JSON de tus textos personales y cuadernos.

Se podrá ampliar el catálogo de otros autores mediante consulta online en otra fase. No se usa una API de IA.

## Qué funciona

- Buscar por autor u obra desde la columna lateral.
- Filtrar autores y abrir una obra en el lector.
- Ir a un pasaje por referencia (p. ej. 1.1, 1.1.2).
- Seleccionar libremente palabras o fragmentos de longitud variable con ratón, teclado o los tiradores táctiles de Safari en iPad, sin limitarse a capítulos o párrafos. El botón de incorporación se activa al seleccionar; la referencia se conserva sin copiar números del margen.
- Incorporar un fragmento en «Mis textos».
- Crear, editar, guardar, buscar y eliminar textos propios.
- Crear y renombrar cuadernos, añadir y quitar textos, ordenar su contenido.
- Persistencia IndexedDB versionada y transaccional, con protección de conflictos.
- Copias JSON verificables con SHA-256 y restauración con vista previa.
- Comprobaciones unitarias y pruebas de navegador WebKit.

## Compilar y probar

Requisitos: Node.js 22 o superior, conexión a internet **en la compilación**.

1. `npm install`
2. `npm run check` (pruebas y compilación).
3. `npx playwright install --with-deps webkit` si se desean ejecutar E2E localmente.
4. `npm run test:e2e`

La compilación extrae obras de revisiones fijadas en `scripts/build-library.mjs` y genera `dist/library/`, además de la caché precargable `dist/service-worker.js`. GitHub Pages publica exclusivamente `dist/` después de pasar las pruebas.

## Documentación

- [Procedencia y condiciones de uso](docs/FUENTES-CORPUS.md)
- [Arquitectura](docs/ARQUITECTURA.md)
- [Persistencia y copias](docs/PERSISTENCIA.md)
- [Contrato del corpus v1](docs/ESQUEMA-v1.md)

Los documentos privados y los datos creados en el editor **no se envían a GitHub ni a servidores**; permanecen en el navegador. Las fuentes del catálogo ya son públicas.
