# Probar Cuaderno de textos latinos en un Mac

Esta copia procede de la rama `feat/redisenio-examinator2-navegacion` de la PR #14. **No publica ni fusiona** los cambios ni modifica la versión de GitHub Pages.

1. Descarga el ZIP de esta rama y descomprímelo en tu Mac.
2. Instala **Node.js 22 o posterior** desde https://nodejs.org/en/download si aún no lo tienes. Es gratuito. Para comprobarlo, abre Terminal y escribe `node -v`.
3. Haz doble clic en **Abrir en Mac.command** (si macOS lo bloquea, haz clic con el botón derecho o Control-clic y selecciona **Abrir**, siguiendo las indicaciones del sistema).
4. En la primera apertura, la aplicación descarga las dependencias y los textos del corpus y los compila: necesitarás conexión a internet. Después podrás abrirla localmente sin descargar otra vez.
5. Se abrirá en tu navegador en http://127.0.0.1:4179/CuadernoTextosLatinos/. **Mantén abierta la ventana de Terminal** mientras uses la aplicación. Al terminar, ciérrala con Ctrl+C.

## Alternativa en Terminal

Abre Terminal, escribe `cd ` (con un espacio), arrastra la carpeta descomprimida desde Finder a Terminal y pulsa Intro. Después ejecuta:

```bash
bash "Abrir en Mac.command"
```

## Seguridad y datos

- El servidor escucha **solo en tu propio Mac**, en `127.0.0.1:4179`. No se publica en internet ni sustituye la versión estable.
- Los textos y cuadernos creados se almacenan en IndexedDB del navegador, no en la carpeta del ZIP. Utiliza siempre el **mismo navegador y URL** para recuperar tus datos locales.
- Haz copias de seguridad JSON desde la aplicación antes de modificar, borrar o restaurar datos. No existe sincronización automática entre navegadores ni dispositivos.
- Si prefieres volver a empezar sin perder la copia anterior, guarda el proyecto en otra carpeta, pero recuerda que usar la misma dirección de navegador puede reutilizar los datos de esa dirección.

**Nota:** Esta descarga contiene **código fuente** más el lanzador. El lanzador compila la aplicación en el Mac la primera vez; no es un instalador `.app` firmado.
