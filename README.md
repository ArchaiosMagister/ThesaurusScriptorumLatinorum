# Thesaurus Scriptorum Latinorum

Aplicación docente con tres secciones. **Banco de textos** reúne el catálogo y las acciones de CuadernoTextosLatinos para pegar un pasaje, importar Word, consultar la biblioteca latina y auditar duplicados. **Cuadernos** abre el editor de cuadernos, donde se pueden seleccionar fuentes al preparar un documento. Ambas pestañas comparten un motor y el mismo banco. **Examinator** abre el editor de exámenes en su propio motor.

## Compilar y probar

Se necesitan Node.js 22 o superior y npm. Las fuentes de los dos motores están incorporadas en `vendor/`: la compilación normal no clona los repositorios antiguos. npm necesita acceso al registro de paquetes si las dependencias no están en la caché.

```sh
npm install
npm test
npm run build
npx playwright install webkit
npm run test:webkit
```

Para abrir la aplicación usa `node scripts/serve.mjs` y entra en <http://127.0.0.1:8123/ThesaurusScriptorumLatinorum/>. La compilación se genera en `dist/` y usa rutas relativas compatibles con el subdirectorio de GitHub Pages. El flujo de validación compila y prueba el código. El flujo de publicación genera `dist/` y lo despliega en GitHub Pages al actualizar `main`.

## Motores y procedencia

El archivo `upstream.json` documenta los commits de origen; `vendor/manifest.json` registra las huellas SHA-256 de todos sus archivos. **La compilación sólo utiliza copias incorporadas** en `vendor/cuaderno` y `vendor/examinator` y comprueba su integridad antes de construir. No necesita acceso ni permisos sobre CuadernoTextosLatinos o examinator2. Conserva sus plantillas, motores, estilos, fuentes y formatos de intercambio. El adaptador modifica las copias generadas para asignar nombres de almacenamiento propios e integrar las vistas. El clásico y el cuaderno usan los repositorios de datos del mismo módulo. Examinator conserva su almacenamiento de exámenes independiente.

- [CuadernoTextosLatinos y revisiones del corpus](vendor/cuaderno/docs/FUENTES-CORPUS.md)
- [Fuentes y licencias de recursos de Examinator](vendor/examinator/FUENTES.md)

Los datos de Collatinus y los textos incluidos de César y Eutropio se leen de `vendor/examinator/js`. Las 25 vidas de Cornelio Nepote se compilan desde `vendor/cuaderno/library-sources/nepote`, que conserva los XML TEI de Perseus y su atribución. Las demás obras del catálogo de Perseus se consultan al seleccionarlas.

Para mantener los motores, edita los ficheros de `vendor/cuaderno` o `vendor/examinator` y ejecuta `npm run vendor:seal` para actualizar sus huellas. Comprueba los cambios con `npm test`, `npm run build` y `npm run test:webkit`. El comando histórico `npm run vendor` reemplaza las instantáneas completas y eliminaría los cambios locales. Resérvalo para recuperar las fuentes históricas en una copia de trabajo aparte.

## Alcance de la rama

El Banco de textos combina la búsqueda con filtros por autor, obra y etiquetas gramaticales confirmadas. En **Etiquetas gramaticales**, **Incluir propuestas pendientes de Collatinus** amplía la búsqueda a los análisis de la versión actual del pasaje. Las propuestas se marcan como pendientes y se confirman o descartan en **Etiquetar**. El lector recorre los resultados filtrados y ordenados. Examinator puede copiar un pasaje del banco y conserva su acceso a Perseus. La cabecera general ofrece la actualización de la aplicación.

En **Cuadernos**, abre un cuaderno y pulsa **Banco propio** para añadir uno o varios pasajes. **Importar Word** desde el cuaderno guarda primero una ficha reutilizable y vincula su copia editorial. Desde el menú **Texto**, **Actualizar desde el banco** permite copiar el latín y la referencia actuales conservando el título docente, las preguntas, el vocabulario y las etiquetas. El editor señala las marcas afectadas para revisión. Si la nueva longitud impide conservar algún subrayado, la actualización se detiene para que puedas revisar la marca antes de aplicarla.

En **Examinator**, pulsa **Banco de textos…** en el apartado **Texto** para incorporar una copia del pasaje. El examen conserva el identificador y la fecha de revisión de la ficha en el archivo `.examen`. **Actualizar desde el banco** copia el latín y la referencia tras confirmarlo y conserva el título docente. Si cambia el latín, Examinator vuelve a analizarlo con su motor habitual. Los exámenes anteriores pueden abrirse con **Abrir…**, incluidos los archivos que nunca se vincularon al banco.

**Listas académicas**, en la cabecera común, edita los repertorios personales para nuevos ejercicios en ambos motores. Los cuatro repertorios de fábrica se compilan en `modulos/academic/teacher-bank.js`, con rutas y SHA cotejados de GeneradorExamenes. En evolución fonética ambos motores seleccionan étimos a partir de todas sus normas. Examinator presenta las listas por fenómenos para editarlas y usa cada étimo una sola vez en el sorteo. Las entradas personales de fonética necesitan un fenómeno reconocido para participar en la generación.

**Ver usos anteriores**, en el lector del banco, consulta cuadernos y exámenes registrados en este navegador. Examinator registra los archivos al guardarlos o abrirlos y avisa antes de reutilizar un pasaje, con enlaces al documento y, cuando corresponda, a su posición. Los archivos que todavía no se han abierto en la aplicación quedan fuera del historial.

**Procedencia** distingue las fichas propias, las incorporadas desde la biblioteca latina y las antiguas cuya procedencia quedó sin registrar. **Uso** combina los vínculos a la ficha y las coincidencias textuales exactas para filtrar los pasajes usados. El lector muestra también las coincidencias parciales al consultar los usos anteriores.

## Copias, migración y modo sin conexión

**Copias de seguridad** descarga un JSON con versión y huella SHA-256. La vista previa muestra qué registros y preferencias se pueden recuperar. La restauración añade registros ausentes, conserva los idénticos y se detiene ante conflictos. Para recuperar dos estados con registros distintos bajo el mismo ID, conserva cada copia en un perfil de navegador distinto. Tras recuperar un archivo, la aplicación verifica los datos antes de recargar. El límite de la copia integral es de 128 MiB.

El mismo menú admite las copias globales v1 del banco histórico y las copias editoriales v2 de CuadernoTextosLatinos. Para una copia individual de cuaderno, usa **Cuadernos → Importar cuaderno**. Para un `.examen`, usa **Examinator → Abrir…**. Estas importaciones son explícitas y se hacen desde archivos exportados.

| Almacenamiento local | Contenido de la copia integral |
| --- | --- |
| IndexedDB del corpus histórico | Fichas, versiones conservadas y cuadernos históricos |
| IndexedDB del espacio editorial | Corpus, ediciones, historial, metadatos de revisión y migración |
| IndexedDB de Examinator y del adaptador Collatinus | Obras que guardaron sus sistemas de archivos locales |
| IndexedDB de la biblioteca de Cuadernos | Obras descargadas |
| IndexedDB del historial de exámenes | Última copia registrada de cada examen conocido |
| Preferencias locales | Examen activo, apariencia, maquetación, listas, vocabulario y revisión gramatical |

La configuración privada de sincronización, sus credenciales y los puntos de sincronización se gestionan en el navegador correspondiente. Los recursos estáticos se recuperan con la PWA.

**Instalar** usa el manifiesto general. Safari ofrece «Añadir a pantalla de inicio» desde Compartir. Examinator abre el editor sin cargar inicialmente las bibliotecas de exportación PDF (~946 KB sin comprimir) ni Word (JSZip, ~98 KB). El generador PDF se carga al solicitarlo en iPad o iPhone y JSZip cuando se exporta un DOCX; ambas bibliotecas permanecen incluidas en el paquete sin conexión. La portada inicia la navegación antes de esperar al registro del Service Worker.

**Preparar sin conexión** descarga las tres secciones; conviene esperar el aviso de que han quedado preparadas. Si se repite, reutiliza los recursos ya guardados, incluso después de una descarga interrumpida. Al instalar una actualización, el servicio reutiliza los archivos de bancos académicos, bibliotecas y fuentes que tengan idéntica huella SHA-256; solo descarga de nuevo los modificados. En la primera actualización desde una versión antigua sin huellas debe descargar el paquete completo una vez. **Actualizar** pide confirmación antes de activar la versión preparada y recargar. La compilación usa rutas relativas compatibles con el subdirectorio de GitHub Pages.

## Comprobación de la versión local

- Banco de textos. La lista agrupa por autor y obra por defecto y ordena las referencias numéricamente cuando es posible. Búsqueda, referencia, procedencia, uso y gramática se combinan con el lector. Las fichas permiten editar notas y vocabulario, incluidas las fichas del corpus editorial recuperado. Antes de confirmar una importación Word se pueden abrir coincidencias existentes.
- Cuadernos y Examinator. Cada aparición conserva su copia. La actualización explícita usa los editores y validadores de cada motor. Una corrección gramatical del banco conserva su anclaje cuando el fragmento sigue siendo inequívoco. Cuando el anclaje es dudoso, el editor pide revisarlo.
- Persistencia. Las pruebas cubren restauraciones globales, detección de copias alteradas, conflictos, recuperación de formatos antiguos y actualización de la PWA. La restauración integral protege contra sobrescrituras y se utiliza con un perfil vacío si hay conflictos.
- Alcance de la validación. WebKit se ha probado a tamaños de escritorio e iPad, con descarga Word y vista de impresión PDF. Quedan por comprobar la instalación y la impresión desde un iPad físico, la sincronización privada con una cuenta real y el entorno publicado. Los originales siguen fijados en las revisiones de `upstream.json`.

### Sincronización manual con Dropbox

En la [consola de aplicaciones de Dropbox](https://www.dropbox.com/developers/apps), registra una aplicación con acceso **App folder** y habilita `files.content.read` y `files.content.write`. Añade la URL exacta de retorno `https://archaiosmagister.github.io/ThesaurusScriptorumLatinorum/` con la barra final. En cada dispositivo, abre **Copias de seguridad → Sincronizar con Dropbox**, introduce la misma **App key** pública y autoriza la misma cuenta. Thesaurus usa OAuth con PKCE. La clave secreta no se usa. La vinculación se conserva al cerrar Thesaurus y se renueva al sincronizar. Quienes vincularon Dropbox antes de este cambio deben autorizar la aplicación una vez más. «Cerrar sesión de Dropbox» elimina la vinculación del dispositivo.

Pulsa **Sincronizar ahora** en la barra superior, primero en el dispositivo que contiene el banco y los cuadernos que quieres compartir. Luego sincroniza desde los otros dispositivos. El archivo privado de Dropbox incluye el banco con sus etiquetas, los cuadernos y los pasajes que figuran como utilizados en exámenes. El registro de uso conserva el título y la referencia del pasaje cuando está vinculada, y permite detectar usos también en exámenes que se guardaron sin enlazar al banco. Los archivos completos de examen y las preferencias quedan en su dispositivo.

Si solo una copia cambió desde la última sincronización, sus cambios se propagan automáticamente. Si ambas contienen cambios incompatibles o falta una referencia común para decidir, la aplicación abre el diálogo de Dropbox. Elige **Conservar versión de Dropbox** o **Conservar versión de este dispositivo** para los datos en conflicto. El banco y los cuadernos se eligen en conjunto. Los cambios independientes, como los usos de exámenes distintos, se combinan. Puedes cerrar el diálogo para dejar las dos copias intactas y exportar una copia de seguridad. Si alguna copia cambia antes de aplicar la elección, la aplicación vuelve a compararlas.

El [formato JSON de las copias parciales](docs/copias-parciales.md) incluye el flujo de ida y vuelta para revisar etiquetas gramaticales externamente.
