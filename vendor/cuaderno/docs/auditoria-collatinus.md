# Collatinus: auditoría previa a la integración

Fecha: 17 de noviembre de 2026.

## Estado del código

- **Examinator2 es de solo lectura para este proyecto.** Su `js/motor.js` empaqueta los módulos `engine/lat.js`, `engine/engine.js` y `engine/vendor/latin.js`; el primero carga modelos y léxicos mediante `fs.readFileSync` y el segundo utiliza `worker_threads` de Node.
- El núcleo adaptado desde Collatinus 11 y el motor de Examinator2 indican **GNU GPL v3** en sus encabezados. La documentación de Collatinus también indica GPL v3: <https://github.com/biblissima/collatinus>.
- Los datos esperados por `engine/lat.js` son `data/latin/modeles.txt`, `lexique.txt`, `extra.json`, `regimen.txt` y `tags.txt`; **no están presentes** en el repositorio público de Examinator2 revisado el 17-11-2026. No puede afirmarse una adaptación reproducible simplemente copiando `js/motor.js`.
- **CuadernoTextosLatinos** es una PWA estática que se compila para navegador y debe funcionar sin servicio de pago; por ello no puede ejecutar módulos dependientes de `worker_threads` o acceso a `fs`.

## Decisión de seguridad y filología

**No se copia ni distribuye el motor GPL ni se incorporan diccionarios sin identificar claramente su procedencia y sus condiciones.** Esta decisión evita introducir un lematizador incompleto, romper el funcionamiento sin conexión o incumplir licencias.

Mientras tanto, la aplicación continúa utilizando el banco docente verificado y el módulo `src/core/vocabulary-suggestions.ts`, que distingue formas documentadas, ambiguas y no resueltas. No inventa acepciones. La corrección manual del docente sigue teniendo prioridad y las entradas bloqueadas se preservan.

## Trabajo pendiente para una integración real

1. Identificar la versión exacta del léxico y modelos compatibles, procedencia, derechos, tamaños y posibilidad de distribución de código/datos GPL.
2. Portar o aislar el análisis contextual en un **Web Worker** sin Node, con carga diferida y política offline, para no bloquear Safari/iPad.
3. Construir un adaptador que proponga `surface`, `lemma`, `headword`, traducción y nota conservando la procedencia; introducir candidatos ambiguos con revisión obligatoria.
4. Resolver conflictos a favor de ediciones manuales existentes; jamás sobreescribir `locked` ni regenerar otras preguntas.
5. Cubrir homógrafos y locuciones como `venit`, `cum`, `quod` y tiempos pasivos perifrásticos; verificar corpus reales y licencia antes de publicar.

**Estado:** no integrado. El flujo de consulta y edición de vocabulario ya existente permanece operativo; cualquier afirmación de análisis completo de Collatinus sería prematura.

## Referencias verificables

- [Motor de Examinator2](https://github.com/ArchaiosMagister/examinator2/blob/main/js/motor.js).
- [Adaptación docente de vocabulario de Examinator2](https://github.com/ArchaiosMagister/examinator2/blob/main/js/vocabulario.js).
- [Fuentes oficiales de Collatinus](https://github.com/biblissima/collatinus).
- [Documentación de Collatinus en Biblissima](https://outils.biblissima.fr/en/collatinus/).
