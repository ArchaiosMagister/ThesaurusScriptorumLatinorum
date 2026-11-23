# Etiquetado con Collatinus en el cuaderno experimental

Desde «Etiquetas gramaticales» del cuaderno abierto, «Analizar etiquetas con Collatinus» muestra candidaturas por posición del fragmento. Cada candidatura presenta el lema y el análisis que la motivan, otras lecturas devueltas por el motor y, cuando corresponde, una advertencia de revisión sintáctica. Se puede confirmar una etiqueta, cambiarla antes de aceptar, seleccionar varias o descartar una propuesta. Las confirmaciones se guardan como etiquetas de fragmento con procedencia. Los descartes y las correcciones de lectura se guardan con el cuaderno y viajan en las copias JSON. Si cambia el texto, se conservan las decisiones cuyo fragmento mantiene un anclaje inequívoco. Las decisiones con un anclaje dudoso quedan en revisión y dejan de aplicarse al reanálisis.

## Fuentes y reglas

Se usa la copia ya empaquetada de `motor.js`, `shim.js` y los datos fijados en `scripts/build-library.mjs`. El código del motor se identifica como GNU GPL v3. Las procedencias que acompañan a la biblioteca figuran en `reference/examinator2/FUENTES.md`. Esta etapa no incorpora código ni diccionarios externos.

- Los candidatos del motor aportan posición, lema, categoría léxica, análisis morfológicos y la opción preferida por su modelo contextual. La ambigüedad se conserva cuando la lectura alternativa sustenta una etiqueta distinta.
- Los análisis verbales explícitos permiten proponer infinitivos por tiempo y voz, pasiva, subjuntivo y participios de presente activo, perfecto pasivo, perfecto deponente y futuro activo. El paradigma léxico ayuda a distinguir los deponentes.
- La categoría pronominal y la indicación léxica se usan para relativo, ipse, idem, hic, iste e ille.
- Participio y sum adyacentes, agrupados por el motor, permiten proponer la pasiva perifrástica si concuerdan en número, o infinitivos perifrásticos de perfecto pasivo y futuro activo si el auxiliar se analiza como infinitivo. Hay formas ausentes del análisis, como iri en el pasaje de contraste, para las que no se generan candidaturas.
- Se propone una oración con ut o condicional si el análisis contextual selecciona la conjunción y hay un verbo finito cercano dentro del límite de la cláusula. La propuesta no decide el valor sintáctico de ut.

Las oraciones de relativo e infinitivo, ablativo absoluto, participio concertado, complemento agente y los once valores complejos del Grupo C se mantienen manuales. La clasificación del relativo de enlace exige evidencia discursiva. Las lecturas de cum, ut y ne necesitan desambiguación sintáctica. Los casos nominales necesitan concordancia y pruebas de función para sostener una propuesta. Gerundio, gerundivo e interrogativa indirecta son exclusivamente manuales por decisión docente.

La carga se difiere hasta el primer uso de Collatinus o del vocabulario. El adaptador actual cede al navegador antes de calcular y usa el hilo principal. En WebKit para macOS, un pasaje de 4.046 caracteres produjo 110 candidaturas en unos 0,34 segundos con el motor cargado. La prueba de recarga con el servidor desconectado comprueba que el cuaderno y Collatinus arrancan desde la caché experimental. Queda por verificar la instalación como app y el funcionamiento sin conexión en Safari en dispositivos físicos.

## Reproducción local

Ejecutar `npm run check` y después `node tests/collatinus-grammar-integration.mjs`. La segunda prueba carga el artefacto compilado con Node y verifica análisis de homógrafos, pasivas perifrásticas, deponentes e infinitivos con datos reales. La revisión interactiva requiere Playwright/WebKit y las bibliotecas del sistema que indique Playwright.
