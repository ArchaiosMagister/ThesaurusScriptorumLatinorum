# Copias parciales e intercambio filológico

Los archivos se descargan como JSON UTF-8 indentado desde **Copias de seguridad**. En el banco, **Gestionar selección → Exportar textos seleccionados** prepara la misma copia parcial del banco. La selección se conserva.

## Campos del formato

| Campo | Contenido |
| --- | --- |
| `format` | `administrator-textorum-latinorum-partial` |
| `version` | `1` |
| `type` | `bank`, `notebooks`, `templates` o `tag-exchange` |
| `scope` | `all`, `selected` o `filtered` |
| `exportedAt` | Fecha UTC ISO 8601 |
| `payload` | Datos originales del alcance elegido |
| `sha256` | SHA-256 del objeto con los seis campos anteriores, serializado en UTF-8 con las claves de cada objeto ordenadas y sin espacios de indentación. El orden de los elementos de las listas se conserva. |
| `proposals` | Lista editable de pares de identificadores y etiquetas. Existe en los archivos `tag-exchange`. |

En una copia del banco, `payload.corpus.texts` contiene fichas con `id`, `title`, `latin`, `source` (autor, obra, cita), `tagIds` confirmados y los campos presentes en la ficha, incluidos notas, procedencia, cursos, dificultad, Selectividad e información de importación Word o PAU. `payload.corpus.tags` incluye definiciones y antecedentes jerárquicos. Para el intercambio incluye el catálogo disponible en el momento de exportar. `payload.latinHashes` relaciona cada ID con el SHA-256 del latín original en UTF-8. `payload.reviews` lleva las decisiones guardadas para esos pasajes. Las copias de cuadernos llevan las ediciones, su historial verificable y las fichas y etiquetas referenciadas. `payload.templates` contiene pares `[identificador, plantilla]`.

## Ejemplo de revisión

1. Elige **Intercambio para revisión filológica**, selecciona el alcance y descarga el JSON.
2. Envía el archivo al asistente junto con esta instrucción. «Devuélveme el JSON completo. Edita únicamente los arrays `tagIds` de `proposals`. Usa los identificadores del catálogo incluido y conserva el resto del archivo, incluidos `payload`, `sha256` y los identificadores de las fichas».
3. Esta es una modificación de ejemplo dentro de `proposals`.

```json
[
  {
    "id": "doc.ejemplo",
    "tagIds": ["gram.ablativo.absoluto", "gram.cum.historico"]
  }
]
```

4. Carga el JSON en **Copias de seguridad → Recuperar**. Comprueba las altas, bajas, etiquetas conservadas e incidencias. Marca las propuestas que deseas aplicar y pulsa **Actualizar etiquetas de textos existentes**.

Los archivos firmados por su huella conservan su integridad. El intercambio admite cambios en las propuestas conservando la huella del contenido original. La aplicación compara el latín y las etiquetas de partida con la ficha local y revisa las decisiones previas. Las fichas borradas o modificadas y las propuestas con etiquetas incompatibles quedan excluidas de la actualización. Las etiquetas propias se mantienen por defecto. El cuadro permite autorizar su retirada expresa.

Las copias parciales del banco incorporan fichas nuevas. Una colisión de identificador o pasaje requiere revisión. Una copia de cuadernos puede actualizar una edición con historial verificablemente posterior. Las copias completas anteriores siguen usando su ruta de restauración y su propia huella de integridad.
