# Arquitectura técnica — fase 2

La fase 2 conserva el **corpus persistido v1** (textos, etiquetas y cuadernos), de forma que las copias de fase 1 no necesitan migración. Los textos añadidos desde la biblioteca son nuevos registros del banco propio y llevan el autor, la obra y la referencia.

## Módulos

- `src/core/model.ts` y `validation.ts`: contratos y validación del corpus v1.
- `src/core/editor-operations.ts`: operaciones puras y verificadas para textos y cuadernos.
- `src/core/library.ts`: contratos del catálogo, búsqueda y selección de pasajes.
- `src/ui/library-app.ts`: selector lateral, lector táctil, editor y cuadernos.
- `src/storage/indexeddb-corpus-repository.ts`: persistencia local de la fase 1, con control de revisión.
- `src/core/backup.ts`: copias JSON con validación y comprobación SHA-256, sin alterar el formato v1.
- `scripts/build-library.mjs`: conversión de fuentes públicas/editoriales fijadas a archivos estáticos en `dist/library`.
- `scripts/build-sw.mjs`: generación de Service Worker que precachea el app shell y las obras.
- `tests/e2e`: recorridos completos de navegación y recuperación en WebKit.
- `.github/workflows/ci.yml`: comprobación obligatoria `calidad` antes de fusionar.
- `.github/workflows/deploy-pages.yml`: publicación desde `main` solo con compilación válida.

## Decisiones

El trabajo del docente **no se envía a un backend**. Los textos del corpus propio se guardan en IndexedDB con IDs estables y validación referencial. El lector usa fragmentos de las obras preinstaladas; seleccionar un fragmento lo copia al corpus propio, no modifica la fuente.

Los cuadernos usan `textIds` y pueden referenciar un mismo texto en cuadernos diferentes, sin duplicarlo. Borrar un texto requiere confirmación y retira sus referencias para no dejar registros corruptos. El sistema de etiquetas gramaticales y los documentos Word/PDF se implementarán en fases posteriores.

La biblioteca estática y el corpus personal tienen ciclos de vida distintos: una actualización de los textos bibliográficos no sobrescribe el corpus del docente. El Service Worker ofrece lectura offline una vez instalada la caché. Safari puede eliminar almacenamiento; las copias externas siguen siendo necesarias.

## Fuera de alcance

Consulta directa de autores adicionales en internet, generación de preguntas, lematización, IA, sincronización de varios dispositivos, cuentas y publicación de textos privados. Estas ampliaciones no deben entrar en la fase 2 sin requisitos y pruebas propios.
