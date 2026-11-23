# Contrato del corpus — versión 1

```json
{
  "schemaVersion": 1,
  "texts": [],
  "tags": [],
  "notebooks": []
}
```

### Textos

Cada texto tiene `id`, `title`, `latin` (texto íntegro, sin transformación), `source` (`author`, `work`, `reference`, admiten `null`), `tagIds`, `createdAt` y `updatedAt` (UTC ISO 8601). El vocabulario y las preguntas **no están modelados todavía**.

### Etiquetas

Cada etiqueta tiene `id`, `label`, `kind` (`catalogue` o `custom`) y `parentId` (`null` o ID de otra etiqueta). Las etiquetas se asignan mediante `tagIds`; pueden coexistir varias por texto. El complemento agente es independiente de la voz pasiva. El catálogo gramatical y las etiquetas individuales no se precargan aún.

### Cuadernos

Cada cuaderno tiene `id`, `title` y `textIds`. El orden del array es el orden editorial y un mismo texto podrá aparecer en cuadernos diferentes. Ninguna referencia puede apuntar a un texto inexistente.

### Garantías de validación

- No se aceptan campos desconocidos, IDs repetidos, referencias rotas ni ciclos jerárquicos.
- No se normaliza ni se descarta el texto latino; se preservan macrones, puntuación y saltos de línea.
- Los archivos con versiones desconocidas se rechazan sin sustituir los datos.
- La serialización y deserialización constituyen contratos internos; **no existe todavía importación/exportación en la interfaz**.

### Cambios de esquema

Cualquier versión nueva debe añadir una migración explícita y pruebas de ida y vuelta. Debe preservarse el archivo original antes de una migración persistente, cuando se implemente el almacenamiento.
