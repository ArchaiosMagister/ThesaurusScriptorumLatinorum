# Decisiones docentes 1A y 2A — cuadernos latinos

## 1A. Título didáctico automático
- Al seleccionar un fragmento en la biblioteca original de Examinator2 se propone «Texto 1», «Texto 2», «Texto 3»… **por cuaderno**, independiente del autor, obra, capítulo y título del corpus.
- Si se elimina una aparición, **no se renumeran** otras apariciones ni se cambian identificadores, vocabulario, preguntas o datos persistidos. El próximo número es mayor que cualquier «Texto N» vigente en ese cuaderno; nunca se repite un título automático existente.
- El título es editable en la pestaña «Texto»; en «Pegar texto latino» aparece sugerido pero puede sustituirse.
- Incluso cuando un fragmento ya existe en la biblioteca compartida o en otro cuaderno, se usa el título de la aparición nueva y no se modifica el registro fuente.
- Las fichas históricas y sus títulos personalizados se conservan sin migraciones destructivas.

## 2A. Fidelidad alta al PDF docente
Referente aportado: `texto ejemplo formato.pdf`, A4, una página.
- Cabecera centrada en **dos párrafos**: título didáctico y referencia «Julio César, *De bello Gallico* I 24». La obra va en cursiva; nunca se concatena al título.
- Tipografía Palatino Linotype por defecto (sustitución tipográfica posible), texto latino en cursiva, vocabulario independiente, sangrías y separación de preguntas según la plantilla.
- Márgenes iniciales: 2,5 cm arriba/abajo, 3 cm izquierda/derecha. Interlineado y fuente siguen siendo configurables.
- El modelo contiene cuatro alternativas a–d y el enunciado «dos de estas tres». Se mantiene la corrección pedagógica previa: «dos de estas **cuatro**» con cuatro alternativas. Total: 8 puntos.
- Se admite un margen razonable de diferencias entre Pages, Word, Safari y Chromium. No se promete identidad píxel a píxel ni numeración automática de Safari idéntica a Word.
- QA automatizada: A4, separación vertical de los dos párrafos del encabezado, posiciones X/Y de título, cita y texto, vocabulario y preguntas (tolerancia explícita), prevención de pérdidas y paginación de documentos largos. Además, pruebas de títulos independientes, exportación Word, bancos, selección, menús, guardado y WebKit iPad.
- Se mantiene la reserva de comprobación visual física en Pages y Safari de iPad con un documento real.

## Aislamiento
Trabajar en la PR #28 de prueba; no fusionar ni publicar en producción sin autorización. No modificar los motores de Examinator2, otros repositorios, datos de cuadernos existentes, el generador de preguntas ni el lematizador Collatinus.
