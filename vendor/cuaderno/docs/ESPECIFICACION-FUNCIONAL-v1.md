# CuadernoTextosLatinos

Especificación funcional consolidada · versión 1.0 · 15 de noviembre de 2026

> Estado: especificación CERRADA a nivel de requisitos y contratos, pendiente de implementación y pruebas. No es certificación de que el software ya incorpore estas funciones.


## 1. Decisiones cerradas (línea base)

| ID | Decisión aprobada / criterio fijo |

| --- | --- |

| F-01 | Se conserva la interfaz del prototipo v0.1: configuración a la izquierda y vista previa tipo hoja a la derecha; adaptación mediante pestañas en iPad vertical. |

| F-02 | La plantilla docente acreditada por el PDF tiene cuatro preguntas y suma exactamente **8 puntos por texto**: 4 + 1 + 1 + 2; sin conversión automática a 10. |

| F-03 | La pregunta 4 se formula «Elige dos de estas cuatro preguntas (2p.):» porque ofrece a), b), c) y d). El enunciado se adapta a N de M si se habilita otro número de apartados. |

| F-04 | Navegación del cuaderno: Anterior, Siguiente, posición X de N, selector directo y «Ver cuaderno completo». |

| F-05 | Regeneración por palabra, subapartado o pregunta bajo control explícito, sin alterar elementos no incluidos en la operación. |

| F-06 | Guardado automático transaccional, historial y deshacer; menús, hoja y exportación reflejan un único modelo semántico. |

| F-07 | Se mantiene estable la publicación de fase 2 y no se inicia aún el motor real ni el etiquetado automático. |



> El estado «cerrada» significa que estos requisitos ya pueden convertirse en contratos y pruebas de aceptación, no que estén construidos o desplegados.


## 2. Alcance, fuentes y límites

**Finalidad:** crear cuadernos con una secuencia ordenada de textos latinos y ejercicios, conservando las decisiones del docente, la procedencia filológica y el aspecto del modelo de clase.

| Fuente comprobada | Requisito que fundamenta |

| --- | --- |

| PDF adjunto «texto ejemplo formato.pdf», 1 página A4 | Encabezado centrado, texto latino en cursiva, formas subrayadas, caja de vocabulario, cuatro preguntas, apartados a.–d., pie «1 \| 1» y puntuación 8. |

| Examinator2: js/library.js y js/exam.js | Catálogo, filtros, selección nativa de fragmentos, referencia, menús de texto, vocabulario, morfología y apartado de elección. |

| GeneradorExamenes: index.html y README | Disposición editor/vista previa, controles por pregunta, edición sobre la hoja, regeneración individual, ajustes visuales, borradores y exportación. |

| CuadernoTextosLatinos, fase 2 publicada | Biblioteca precargada de César, Eutropio y Nepote, selección de texto y corpus IndexedDB existente. |

| Prototipo autónomo v0.1 y especificación preliminar v0.1 | Disposición de cinco menús y maquetación A4 ya valorada favorablemente. |



**Incluye:** edición de texto, banco y cuadernos, configuración de cuatro tipos de pregunta, palabras señaladas, vocabulario, navegación, vista por texto y global, formato, guardado, historial, validación y contratos de exportación futura.

**No afirma ni implementa todavía:** motor académico real, conexión automática a bancos de GeneradorExamenes, etiquetado gramatical automático, sincronización entre dispositivos, solucionarios, Word/PDF operativo ni integración con IA.

> Solo se dispone de un modelo físico de texto en el PDF adjunto. No se atribuyen a ese documento otros modelos de examen o configuraciones no mostradas.


## 3. Estructura y navegación de la interfaz


### 3.1. Distribución principal
- **Escritorio / iPad apaisado:** panel de menús a la izquierda, papel A4 desplazable a la derecha. La barra superior presenta nombre del cuaderno, estado de guardado y acciones de navegación.
- **iPad vertical y pantallas estrechas:** pestañas «Configurar» y «Vista previa»; el cambio de pestaña no recrea ni modifica preguntas ni pierde borradores. Controles táctiles de tamaño suficiente y zoom de previsualización sin alterar el documento.
- **Menús principales:** Texto, Preguntas, Vocabulario, Formato y Cuaderno. Los apartados se pueden contraer. Biblioteca/Mis textos reutilizan el buscador ya existente, en lugar de duplicarlo.
- **Barra de navegación siempre accesible:** «Anterior», «Siguiente», «Texto X de N», selector directo por título/referencia y «Ver cuaderno completo». Primer/último botón inhabilitado en los extremos.


### 3.2. Reglas al desplazarse entre textos
- Se navega por el **orden de apariciones del cuaderno**, no por el orden alfabético del banco. Cada aparición posee su propio identificador y sus preguntas independientes.
- Al pulsar Anterior/Siguiente o cambiar el selector, el texto, los menús y la vista previa cambian como una sola operación. Se mantiene el texto actualmente seleccionado en memoria hasta confirmar el guardado.
- Los cambios pendientes se confirman en una transacción antes del cambio de texto, o el navegador muestra un bloqueo recuperable; nunca se descartan silenciosamente. Si el guardado falla, el borrador sigue disponible.
- «Ver cuaderno completo» muestra todas las apariciones y sus páginas consecutivamente, sin cambiar el texto activo ni regenerar contenidos; al volver se recupera la posición anterior.
- Reordenar textos cambia su secuencia editorial y la navegación, **no** sus IDs, preguntas, títulos ni configuraciones; el selector se actualiza de manera estable.


## 4. Formato del texto y del cuaderno


### 4.1. Plantilla docente base
- Papel A4; título del texto centrado en negrita; segunda línea centrada «Autor, *obra* referencia», con el título de la obra en cursiva y reglas horizontales de separación del encabezado.
- Texto latino en cursiva, Palatino/Palatino Linotype como tipografía base y tamaño inicial 10,5 pt; márgenes e interlineado configurables. Los tramos editoriales entre corchetes pueden ir en redonda cuando se indiquen.
- Los términos escogidos para análisis morfológico aparecen **subrayados solo en las apariciones seleccionadas**; la copia del texto conserva macrones, letras y puntuación originales.
- Recuadro «Vocabulario», título centrado, entradas por línea; lema/enunciado en cursiva y significado en redonda. Orden inicial alfabético, con posibilidad de edición y orden manual cuando se implemente.
- Preguntas debajo del vocabulario, numeradas 1–4 según las activadas y con apartados a., b., c., d. La puntuación se muestra junto al enunciado cuando está activada esa opción.
- Pie de página en el formato «página | total» para el documento completo. Los saltos de página no dividen la cabecera del texto ni dejan una pregunta huérfana del primer elemento.

> La coincidencia métrica con Word/Pages y con el PDF original se considera un **criterio de verificación futura**, no una paridad ya demostrada.


### 4.2. Ajustes visuales

| Nivel | Controles | Restricción |

| --- | --- | --- |

| Cuaderno | Papel A4, fuente, tamaño, márgenes, interlineado, pie, separación entre textos, paginación. | Se aplica como estilo base a todas las apariciones; modifica el renderizado, no el contenido académico. |

| Texto | Título, autor/obra/cita, separación previa/posterior y excepciones tipográficas puntuales. | No cambia otros textos. |

| Pregunta | Espacio antes y después del enunciado, espacio interno entre subpreguntas, visibilidad de puntos. | No modifica ni regenera palabras. |

| Vista previa | Zoom, ajustar a ancho y modo texto/cuaderno completo. | Es estado de interfaz, no datos de exportación. |




## 5. Preguntas y puntuación (modelo de referencia)

| Orden | Enunciado inicial | Puntos | Comportamiento |

| --- | --- | --- | --- |

| 1 | Traducción del texto. | 4 | Texto editable, activable y sin solucionario en el cuaderno. |

| 2 | Análisis sintáctico del texto. | 1 | Enunciado editable; no se genera una solución automática. |

| 3 | Análisis morfológico de las palabras subrayadas. | 1 | Seleccionar las apariciones concretas del texto; sustituir una sin tocar las demás. |

| 4 | Elige dos de estas cuatro preguntas: | 2 | Cuatro apartados configurables; puntuación única de 2p. para la pregunta, no por apartado. |



**Total obligatorio de esta plantilla: 8 puntos por texto.** La aplicación mostrará siempre el total y detectará cualquier desviación de 8. Nunca modificará otras puntuaciones para compensarla; exigirá corregir la suma antes de marcar el texto como listo para exportar.

La puntuación global de un cuaderno completo es la suma aritmética de sus textos, sin renormalización (p. ej., siete textos con 8 puntos cada uno suman 56).


### 5.1. Apartados de la pregunta 4

| Apartado | Contenido ilustrado por el PDF | Menú / regeneración prevista |

| --- | --- | --- |

| a. | Modificación preverbial desde instruxit (3) y successerunt (2): cinco derivados. | Formas base y número objetivo; regenerar solo palabra concreta o solo apartado a. |

| b. | Evolución fonética: fabam, sermonem, stelam, transgressionem. | Cuatro étimos por defecto; editar y regenerar cada forma por separado. |

| c. | Prefijos: difundir, extraer, interdependencia, progenitor. | Cuatro términos; distinguir prefijo y significado aportado. |

| d. | Latinismos: addenda, alma mater, ex professo, peccata minuta. | Cuatro expresiones editables y regenerables por unidad. |



En la plantilla base se ofrecen los cuatro apartados y se eligen dos. Si el profesor desactiva uno, se recalcula «Elige 2 de 3»; con menos apartados activos que elecciones requeridas se muestra error y se bloquea la finalización. Desactivar nunca borra la configuración oculta.


### 5.2. Regeneración y revisión docente
- Un botón por **palabra**, otro por **subapartado** y otro por **pregunta completa** cuando ese nivel tenga sentido. Cada botón indica explícitamente el alcance de sustitución.
- Una regeneración de palabra no puede cambiar posiciones, vocabulario, otras palabras, otros apartados, preguntas, puntuación ni estilos. Los demás campos deben permanecer exactamente iguales.
- Los textos editados manualmente se bloquean contra sustitución implícita. Una regeneración de mayor alcance requiere seleccionar explícitamente cómo tratar los elementos protegidos.
- El motor **propone y valida antes de confirmar**; un banco incompleto, una ambigüedad morfológica o un error no puede provocar un resultado inventado ni pérdida de la versión anterior.
- Las regeneraciones confirmadas se registran en el historial y pueden deshacerse sin restaurar todo el cuaderno. No se regenera nada al navegar, cambiar zoom ni ajustar espacios.


## 6. Palabras, subrayados y vocabulario
- Los subrayados de la pregunta 3 identifican una **aparición**, no solo una forma: si un término se repite, solo se marca la ocurrencia seleccionada.
- Editar el texto latino vuelve a validar los anclajes de palabras. Si cambia el contexto de una aparición, se indica «Revisión necesaria»; no se reancla automáticamente a otra palabra homógrafa.
- El vocabulario se prepara a partir de los candidatos documentados o de entradas introducidas por el docente; cada lema conserva procedencia, acepción, inclusión, revisión y ediciones manuales.
- Las ambigüedades, lemas ausentes y traducciones no verificadas se señalan como pendientes. No se inventan enunciados ni significados. Se puede añadir una entrada manual sin romper el enlace a las propuestas automáticas.
- Los ajustes de cantidades vocálicas, categorías excluidas o vocabulario exigible serán configuraciones **explícitas** del motor cuando se integren bancos fiables; no se presupone que el repositorio ya los haya importado.
- Editar una entrada en el menú o en la vista previa modifica el mismo registro; el recuadro impreso conserva el orden y la forma escogidos.


## 7. Flujo de trabajo docente

1. Elegir o crear un cuaderno; establecer su título y formato común.

2. Buscar un fragmento en Biblioteca, seleccionarlo con ratón o dedo y añadirlo como aparición del cuaderno, o utilizar un texto propio del banco.

3. Ajustar título, autor, obra, cita y texto latino; verificar que la referencia es correcta.

4. Preparar las cuatro preguntas, elegir palabras de morfología, revisar los apartados y el vocabulario; marcar las ambigüedades para revisión.

5. Comprobar la vista del texto, avanzar con Siguiente/Anterior o saltar desde el selector; las modificaciones se conservan.

6. Reordenar y consultar el cuaderno completo; validar total de 8 puntos por texto, campos obligatorios, pendientes filológicos y maquetación.

7. Guardar una copia de seguridad externa. Solo cuando se implemente la exportación real, generar Word/PDF a partir del mismo documento canónico ya validado.


## 8. Guardado, estados y protección de cambios
- Indicador legible de «Sin cambios», «Guardando…», «Guardado», «Error: cambios conservados» y «Conflicto entre pestañas». Un error nunca se representa como guardado correcto.
- Guardado automático agrupado tras breves periodos de edición; antes de pasar de texto, cerrar o exportar se fuerza la confirmación de los cambios pendientes. En el caso de cierre abrupto se conserva un borrador local recuperable siempre que el navegador lo permita.
- Las operaciones se registran con identificador estable, fecha, alcance y estado previo/nuevo; deshacer revierte solo el cambio elegido dentro de las restricciones de concurrencia.
- Eliminar un texto del cuaderno se realiza mediante retirada reversible o papelera, sin borrar el texto del banco de origen. Restaurar una copia presenta una vista previa y exige confirmar la sustitución.
- La publicación v0.3.1 y las copias v1 existentes no deben dejar de funcionar mientras se desarrolla el nuevo modelo editorial.


## 9. Criterios de aceptación verificables

| Código | Prueba imprescindible | Resultado exigido |

| --- | --- | --- |

| A-01 | Cambiar texto activo con Anterior/Siguiente/selector. | El contador y el panel muestran la misma aparición; orden estable; ninguna edición perdida. |

| A-02 | Ver cuaderno completo y regresar. | Todos los textos figuran en orden; no hay regeneración ni cambio de configuración. |

| A-03 | Subrayar una palabra repetida dos veces. | Solo se subraya el token cuyo anclaje fue elegido. |

| A-04 | Editar 4b y regenerar un término de 4a. | El texto exacto de 4b y todas las demás instancias permanecen idénticos. |

| A-05 | Desactivar 4d y restaurarlo. | Enunciado pasa a «2 de 3» y vuelve a «2 de 4»; su contenido no se borra. |

| A-06 | Modificar puntuación por debajo/encima de 8. | Se detecta la desviación; no se compensa automáticamente ni se marca listo. |

| A-07 | Editar un enunciado o vocabulario desde la hoja. | Menú y modelo guardado reflejan el mismo dato; sin duplicidades. |

| A-08 | Regeneración sin candidatos, ambigua o inválida. | No hay cambios persistidos; se informa de la causa; se conserva la versión previa. |

| A-09 | Cerrar, recargar, perder conexión o abrir otra pestaña. | Recuperación consistente, aviso de conflicto y ninguna sobrescritura silenciosa. |

| A-10 | Restaurar JSON v1 o v2. | Importación segura y previsualizada, con migración no destructiva; datos anteriores intactos hasta confirmar. |

| A-11 | Crear Word/PDF multipágina cuando exista exportador. | Sin pérdidas de cursivas/subrayados, puntuación, vocabulario, saltos ni pie de página. |

| A-12 | Uso táctil real en Safari de iPad. | Controles accesibles; menú y vista no se pisan; selección y edición confiables. |




## 10. Asuntos expresamente aplazados, no bloqueantes
- Etiquetado gramatical por construcciones y filtros combinados; la arquitectura reservará IDs y relaciones para incluir más adelante «complemento agente» separado de «voz pasiva» y etiquetas personalizadas.
- Incorporación de otros modelos docentes distintos de la única hoja aportada; requerirá nuevos ejemplos y decisión docente específica.
- Conexión con bancos de GeneradorExamenes y verificación filológica automática; requiere adaptador, procedencia y baterías curriculares independientes.
- Sincronización entre dispositivos, colaboraciones, API de inteligencia artificial y solvencia del espacio de almacenamiento a largo plazo; fuera de esta etapa.
- Ajuste exacto de las métricas Word/Pages, exportación, paginación y tipografía: no puede declararse aprobado sin pruebas comparativas de archivos reales.


## 11. Estado de cierre y orden posterior

**Quedan cerrados:** el alcance funcional, la plantilla de 8 puntos, la corrección «dos de cuatro», el modelo de navegación, la independencia de regeneración, la edición sobre una fuente única, la obligación de historial y las pruebas mínimas.

**Siguiente entrega lógica:** arquitectura ejecutable de persistencia y contratos + pruebas de migración en una rama separada; todavía sin interfaz pública ni motor académico real. A continuación, motor por módulos y adaptadores de bancos verificados; después visualizador/exportación y etiquetado.

> Esta especificación reemplaza la versión preliminar v0.1. El prototipo HTML sigue siendo maqueta de interacción, no un generador de exámenes válido.
