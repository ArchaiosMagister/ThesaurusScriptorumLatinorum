# Rediseño de CuadernoTextosLatinos · línea de base y pruebas

Fecha: 2026-11-19. Decisiones docentes aprobadas: **1A**, **2A**, **3A**.

## Línea de base recuperable

- Punto de partida inmutable: `5276a3e4c90e535e11ba2c19a066ac029d9e269f`, cabecera experimental de la PR #61.
- El rediseño se desarrolla en la rama `codex/redisenio-cuadernos-fase0-1-20261119` y no modifica la rama `main` ni la cabecera de la PR #61.
- La PR de esta rama se dirigirá a `codex/mejoras-uso-docente` (cambios apilados). No fusionar la PR inicial ni publicar en Pages sin superar las pruebas y verificar la versión desplegada.
- Para recuperar la interfaz anterior, volver al commit base o cerrar la PR de rediseño; no se altera el esquema persistente en la primera fase.
- Una copia integral **real de los datos locales** debe descargarse desde cada navegador/perfil que contenga cuadernos antes de una migración: los datos IndexedDB no se guardan en GitHub y no pueden respaldarse remotamente sin acceso al navegador del usuario.

## Funcionalidad que no debe retroceder

- Apertura y restauración de cuadernos, copia individual/integral; protección de los históricos.
- Conservación de las apariciones de textos al retirarlos del banco; títulos, marcas, etiquetas, preguntas, vocabulario y fuentes aislados.
- Importación DOCX con selección múltiple y conservación de subrayados/vocabulario; biblioteca original inalterada.
- Revisión manual de etiquetas y propuestas Collatinus sin asignar automáticamente sintaxis dudosa.
- Formato común del cuaderno, vista previa A4 y exportación Word/PDF.
- Selección de léxico sin repeticiones evitables y auditoría previa.

## Fase 1 · criterios observables

1. La ruta `/examinator-cuadernos/` muestra inicialmente Mis cuadernos y Banco de textos propios, sin selector desplegable de cuadernos ni hoja A4 vacía.
2. Una tarjeta por cuaderno muestra título, cantidad de textos, modificación, Abrir y Hacer copia. Eliminar sólo para los cuadernos no históricos.
3. La eliminación requiere **una** confirmación, advierte que se recomienda una copia sin obligar a descargarla; cancelar conserva todos los datos. Las fuentes y demás cuadernos no se borran.
4. Las acciones Nuevo cuaderno y Restaurar copia se mantienen accesibles; la copia integral queda accesible pero no compite con las acciones principales.
5. El banco permanece visible en Inicio; durante la edición se accede a él mediante el botón Banco propio que abre el panel sin ocultar el editor por defecto.
6. Abrir y crear siguen conservando el editor de Examinator2, su biblioteca y controles completos.
7. Después de actualizar la página se muestra Inicio, incluso si había un cuaderno abierto en una sesión anterior.
8. La navegación de Inicio no produce desbordamiento horizontal en 390 px (iPhone) ni 820 px (iPad); los controles táctiles son alcanzables.

## Verificación obligatoria

`npm run check` y `npm run test:e2e` (WebKit) mediante CI, además de comprobaciones de funciones críticas, modo oscuro, lecturas de copias, borrado, restauración, navegación y renderización en tamaños móviles. Cualquier fallo bloquea la fusión/publicación. La comprobación final en dispositivos físicos corresponde a la validación docente posterior al despliegue experimental.
