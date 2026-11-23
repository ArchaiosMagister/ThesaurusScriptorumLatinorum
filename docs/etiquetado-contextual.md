# Etiquetado contextual del Banco

## I. Auditoría

El generador integrado de Cuadernos recorría todos los candidatos devueltos por Collatinus. Así podía convertir en una propuesta el subjuntivo de *suo* para *suas*, pese a haber seleccionado *suus*. El selector morfológico de Cuadernos ya utilizaba el par de lema y morfología de `sel`. El Banco aplica ese mismo criterio antes de llamar al generador de propuestas. Las lecturas completas siguen accesibles desde la ficha.

`sel` a veces procede de la primera lectura disponible. El trabajador ofrece además agrupaciones por cercanía. La selección aislada y las agrupaciones se usan como evidencia inicial.

## II. Clasificación

- Se verifica el lema, la morfología y la coincidencia exacta de los límites UTF-16 con el texto.
- Una forma verbal personal puede incorporarse cuando las lecturas coinciden en tiempo, modo y voz, aunque varíe el lema. *Venit* queda pendiente con presente y perfecto disponibles en la evidencia.
- En formas no personales y pronombres se exige coincidencia de las lecturas, con reglas adicionales de concordancia. *Suas copias* se resuelve por caso, género y número, incluso cuando el género del sustantivo figura en la entrada léxica. La lectura verbal queda en el desplegable.
- En *cum* se distingue el ablativo nominal adyacente del verbo personal adyacente cuando concuerdan con la selección. No se deduce de ahí un valor temporal, causal o concesivo.
- Para el tiempo compuesto se exige participio de perfecto nominativo, `sum` seleccionado, coincidencia de número, adyacencia y continuidad de oración. Las lecturas incompatibles conservan la revisión. Por ejemplo, *profectus est* admite también una lectura de *proficio*.
- La concordancia de un participio puede motivar una revisión sintáctica. La etiqueta de ablativo absoluto requiere una separación adicional por coma incluso para proponerse. Las formas participiales e infinitivas se registran por separado de las construcciones. Los valores de *ut*, el relativo de enlace y las decisiones existentes sobre gerundio y gerundivo siguen bajo revisión docente.

## III. Análisis progresivo

La ficha se guarda antes de analizarla. El Banco encola un texto cada vez y actualiza el resultado en la vista actual. La versión de reglas y el SHA-256 del latín determinan si se puede reutilizar el resultado guardado. Cuando cambia el latín, el trabajador existente reutiliza las oraciones idénticas dentro de su caché y se vuelven a verificar los desplazamientos y las etiquetas del conjunto. La cola invalida un resultado si el identificador o el latín de la ficha han cambiado durante el análisis.

## IV. Decisiones y copias

Las etiquetas docentes siguen en `tagIds`. Las automáticas y las pendientes se guardan por separado en el registro de revisión del Banco, incluido en las copias integrales. Dropbox transporta únicamente las decisiones docentes y sus anclajes. Los resultados de cálculo se pueden regenerar en cada dispositivo. Cada propuesta registra fuente, versión de reglas, fragmento y evidencia. Los descartes y las correcciones tienen precedencia por aparición. Al editar el latín se trasladan los anclajes inequívocos y los demás siguen en el historial de la revisión anterior.

## V. Verificación

Ejecutar `npm test`, `npm run build`, `node --test tests/bank-context.integration.mjs` y `npm run test:webkit`. La batería filológica usa los recursos y el trabajador compilados. WebKit verifica también el guardado, el filtrado, la revisión al editar y la creación de etiquetas con el servidor desconectado después de preparar la PWA.
