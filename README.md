# Administrator Textorum Latinorum

Aplicación docente con tres secciones. **Banco de textos** reúne el catálogo y las acciones de CuadernoTextosLatinos para pegar un pasaje, importar Word, consultar la biblioteca latina y auditar duplicados. **Cuadernos** abre el editor de cuadernos, donde se pueden seleccionar fuentes al preparar un documento. Ambas pestañas comparten un motor y el mismo banco. **Examinator** abre el editor de exámenes en su propio motor.

## Compilar y probar

Se necesitan Git, Node.js 22 o superior, npm e Internet para obtener los repositorios, las dependencias y las fuentes del corpus.

```sh
npm install
npm test
npm run build
npx playwright install webkit
npm run test:webkit
```

Para abrir la aplicación usa `node scripts/serve.mjs` y entra en <http://127.0.0.1:8123/AdministratorTextorumLatinorum/>. La compilación se genera en `dist/` y usa rutas relativas compatibles con el subdirectorio de GitHub Pages. El flujo de validación compila y prueba el código. El flujo de publicación genera `dist/` y lo despliega en GitHub Pages al actualizar `main`.

## Motores y procedencia

El archivo `upstream.json` fija el commit de cada repositorio. La compilación toma el código original en esas revisiones. Conserva sus plantillas, motores, estilos, fuentes y formatos de intercambio. El adaptador modifica las copias generadas para asignar nombres de almacenamiento propios e integrar las vistas. El clásico y el cuaderno usan los repositorios de datos del mismo módulo. Examinator conserva su almacenamiento de exámenes independiente.

- [CuadernoTextosLatinos y revisiones del corpus](https://github.com/ArchaiosMagister/CuadernoTextosLatinos/blob/fe722985b482c442fd94b854796b4d092bdebfed/docs/FUENTES-CORPUS.md)
- [Fuentes y licencias de recursos de Examinator](https://github.com/ArchaiosMagister/examinator2/blob/7fecd1c2c52d2c4d67d997393615d69643e7a28d/FUENTES.md)

Al actualizar un motor, cambia su revisión en `upstream.json`, revisa las claves de almacenamiento y ejecuta la compilación y las pruebas de los originales y de la aplicación integrada.

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

**Instalar** usa el manifiesto general. Safari ofrece «Añadir a pantalla de inicio» desde Compartir. **Preparar sin conexión** descarga las tres secciones; conviene esperar el aviso de que han quedado preparadas. El servicio general mantiene una caché por versión y **Actualizar** pide confirmación antes de activar una versión preparada y recargar. La compilación usa rutas relativas compatibles con el subdirectorio de GitHub Pages.

## Comprobación de la versión local

- Banco de textos. La lista agrupa por autor y obra por defecto y ordena las referencias numéricamente cuando es posible. Búsqueda, referencia, procedencia, uso y gramática se combinan con el lector. Las fichas permiten editar notas y vocabulario, incluidas las fichas del corpus editorial recuperado. Antes de confirmar una importación Word se pueden abrir coincidencias existentes.
- Cuadernos y Examinator. Cada aparición conserva su copia. La actualización explícita usa los editores y validadores de cada motor. Una corrección gramatical del banco conserva su anclaje cuando el fragmento sigue siendo inequívoco. Cuando el anclaje es dudoso, el editor pide revisarlo.
- Persistencia. Las pruebas cubren restauraciones globales, detección de copias alteradas, conflictos, recuperación de formatos antiguos y actualización de la PWA. La restauración integral protege contra sobrescrituras y se utiliza con un perfil vacío si hay conflictos.
- Alcance de la validación. WebKit se ha probado a tamaños de escritorio e iPad, con descarga Word y vista de impresión PDF. Quedan por comprobar la instalación y la impresión desde un iPad físico, la sincronización privada con una cuenta real y el entorno publicado. Los originales siguen fijados en las revisiones de `upstream.json`.
