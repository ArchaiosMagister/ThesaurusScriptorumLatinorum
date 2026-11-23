# PR #9 · Integración de bancos docentes de GeneradorExamenes

**Estado:** PR independiente de revisión, sin fusionar ni publicar. La integración es exclusivamente académica y offline; no modifica `CorpusV1`, no migra trabajos y no conecta todavía la interfaz del cuaderno.

## Criterio rector: distinguir elegibilidad docente de certificación filológica externa

Se corrige la clasificación inicial, demasiado restrictiva: el motor debe respetar el **derecho a sorteo** que la aplicación fuente ya reconoce, sin inferir que cada relación etimológica o significado orientativo tiene una certificación externa individual.

- **Elegibilidad docente:** la ficha existe en el repertorio de ejercicios y ha pasado las reglas y exclusiones de selección que aplica GeneradorExamenes.
- **Verificación individual externa:** un dato concreto (forma y análisis) se ha cotejado individualmente con una referencia explícita. Esta evidencia NO se infiere de la elegibilidad.
- **Advertencias conservadas:** `meaningStatus`, `tipoTransmision`, normas `N01–N20`, enlaces, enunciado de la base y estado original se conservan con la ficha en el informe `teacherAuditRecord`, sin copiar respuestas al documento del alumno.

`AcademicBankRecordV1.status: 'verified'` es el estado **operativo de elegibilidad** del banco actual. En las fichas docentes de léxico no debe interpretarse como certificación filológica universal. El informe de auditoría aporta, por separado, `teacherEligible`, `individuallyExternallyVerified` y `semanticReviewRequired`.

## Fuentes congeladas y trazabilidad

El snapshot offline `src/data/teacher-academic-snapshot.ts` deriva de cinco JSON de `ArchaiosMagister/GeneradorExamenes`, rama `main`, consultados el 15/11/2026. Cada fichero conserva en `sources` su SHA de blob de Git; cada candidato conserva `EvidenceV1.provider`, `recordId` y `bankRevision`. No se sincroniza automáticamente desde la aplicación original. Las decisiones de exclusión se cotejaron además con `data/fonetica/decisiones-docentes.json` y `data/fonetica/criterios-docentes.mjs`.

| Banco | Registros | Elegibles en el banco fuente | Reserva que se conserva |
| --- | ---: | ---: | --- |
| Modificación preverbial | 882 derivados de 120 fichas | **882**, bajo clave de base correcta | 25 derivados de bases homónimas (*sero*, *volo*) exigen enunciado completo; nunca se mezclan las dos fichas |
| Evolución fonética | 655 étimos | **655**, con `APTO_PROPUESTO` y filtros de normas | `APTO_PROPUESTO` significa *apto para selección docente*, no cadena etimológica íntegramente certificada; excluir `REVISAR`, `EXCLUIDA` y decisiones expresas |
| Prefijos | 286 palabras | **286** | 285 pistas semánticas orientativas; **no bloquean las palabras**. *Antifaz* conserva su revisión singular |
| Latinismos | 87 expresiones | **87** | Definiciones del repertorio docente, no respuestas deducidas automáticamente |
| Morfología | 55 registros latinos `verified-overrides.singleForms` | **55**, solo forma y lectura documentadas | 47 superficies distintas; algunas admiten más de un análisis |
| **Total** | **1965** | **1965 con sus condiciones** | Las reservas y restricciones siguen vigentes; no equivale a 1965 verificaciones externas independientes |

El total de 1965 procede de filas o relaciones, no de 1965 lemas únicos. Los registros previamente pendientes de revisión de los que habla el README fonético **no están incluidos** en las 655 fichas del banco general actual; no se incorporan por esta PR.

## Reglas de selección implementadas

### A. Modificación preverbial

Se conservan las parejas de base y derivados *atestiguados* del fichero `modificacion-preverbial-docente.json`. Una base sin homonimia se identifica por su lema, por ejemplo `mitto`. Para las bases homónimas, **la clave de selección es el enunciado docente completo**: `sero, -ere, -rui, sertum` frente a `sero, -ere, sevi, satum`, o `volo, -are, -avi, -atum` frente a `volo, velle, volui`. Buscar solo `sero` o `volo` no devuelve candidatos automáticamente. `teacherPreverbBases` proporciona `selectionKey` para que la futura interfaz lo aplique. No se inventan derivados ni se supone que una forma conjugada, como *instruxit*, equivale a una base concreta sin lematización contextual.

### B. Evolución fonética

Se admiten las fichas con `estado: APTO_PROPUESTO`, **normas no vacías y únicas N01–N20**, excluidas las prohibiciones docentes expresas. La lista de exclusiones de `criterios-docentes.mjs` y `decisiones-docentes.json` se incorpora como defensa adicional para impedir reactivaciones accidentales. En una futura versión del snapshot, las fichas con `REVISAR` quedan en revisión y las marcadas `EXCLUIDA` o coincidentes con una exclusión docente no se sortean.

La API `VerifiedAcademicBankV1.verified('phonetics', null, reglasSeleccionadas)` y las peticiones `previewSlot`, `prepareSubquestion` y `prepareChoiceQuestion` permiten **elegir exclusivamente étimos cuyas normas estén todas en el conjunto activado**. `[]` equivale a ninguna ley seleccionada y no propone nada. Si se omite el filtro, Latín II usa todo el repertorio N01–N20, dado que el cuaderno no se organiza por unidades. La confirmación CAS vuelve a verificar este filtro: no basta con introducir manualmente el ID de otra ficha. La regla `FIX_M` sigue siendo fija, no seleccionable y no se convierte en ley N03. Se conserva `tipoTransmision`, incluida `ADAPTACION_CULTA`.

### C. Prefijos

Las **286 palabras** se pueden sortear. `meaningStatus` conserva intacta la advertencia de revisión semántica en 285; esto obliga a no transformar `meaningHint` en una respuesta definitiva, pero **no impide plantear el ejercicio**. En el documento del alumno se presenta la palabra, no la glosa orientativa. La entrada *antifaz* mantiene su corrección del valor espacial frente a la falsa interpretación de oposición. Los filtros de elegibilidad de variantes valencianas se mantendrán si se incorpora esa modalidad en el futuro; no se trasplantan a un cuaderno exclusivamente castellano.

### D. Latinismos

Se conservan las 87 formas de la lista numerada, con la definición docente como metadato, sin mostrar automáticamente soluciones en la hoja de preguntas.

### E. Morfología

Solo se habilitan las 55 lecturas latinas individualizadas de `verified-overrides.singleForms`. El selector `AcademicMorphTokenSelectorV1` marca **la ocurrencia exacta en UTF-16** y exige escoger entre dos lecturas verificadas de un homógrafo. No se confunde la aprobación de un paradigma con la verificación individual de todas sus formas. La lematización contextual general es una etapa distinta.

## Aislamiento, persistencia y casos de prueba

Los menús nunca regenerarán palabras al navegar, editar puntuación o cambiar el zoom. La preparación de propuestas no escribe; la confirmación CAS actualiza solo el objetivo autorizado, un único evento histórico y la revisión global, o aborta íntegramente. Las palabras protegidas y las demás apariciones del cuaderno se conservan; el total de la plantilla es **8 puntos**.

Pruebas previstas en esta corrección: inventarios 882/655/286/87/55, rechazo de inclusiones externas prohibidas, homonimia preverbial con enunciados completos, separación de advertencia semántica y elegibilidad, filtro N01–N20 tanto en vista previa como en confirmación, rechazo de normas duplicadas, conservación de subapartados ajenos, recarga y deshacer en WebKit. Las baterías completas de CI y WebKit siguen siendo obligatorias.

**No se fusiona ni se publica esta PR sin nueva autorización docente.**
