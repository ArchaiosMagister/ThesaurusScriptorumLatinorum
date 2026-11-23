# Fuentes literarias incorporadas en la fase 2

Se distingue entre las **obras de la Antigüedad**, sus **ediciones digitales** y la **presentación y transformación técnica**. Los textos se distribuyen con referencias de procedencia. No se incorporan traducciones modernas.

## Julio César

- `De bello Gallico`: Perseus Digital Library, T. Rice Holmes (1914), a través de [Examinator2](https://github.com/ArchaiosMagister/examinator2), revisión `4ca31b4b2852f6b3ac0dc28c3f6ff3f2ad15d4a8`.
- `De bello civili`: Perseus Digital Library, A. G. Peskett (1914), misma revisión de Examinator2.
- Archivos en la edición de Examinator2: `js/incluidos.js`. Proveniencia adicional en `FUENTES.md` del repositorio Examinator2.
- Los encabezados TEI de ambas obras señalan [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## Eutropio

- `Breviarium ab urbe condita`: texto latino de *The Latin Library*, incorporado previamente en Examinator2 del docente.
- Archivo: `js/datos.js`, registro `/app/data/incluidos/eutropio.json` en la revisión `4ca31b4b2852f6b3ac0dc28c3f6ff3f2ad15d4a8`.
- La fuente y la edición se muestran al consultar la obra. **No se atribuye una licencia CC BY-SA específica a The Latin Library** que no conste en sus materiales.

## Cornelio Nepote

- 25 vidas del conjunto `Vitae`, publicadas por Perseus Digital Library en formato TEI.
- Edición de Albert Fleckeisen y Karl Halm, Leipzig: Teubner, 1886.
- URL base: https://github.com/PerseusDL/canonical-latinLit
- Revisión fijada: `192fef80a2fd785a389e6584ca2315fd1f80a94e`.
- URN por vida: `urn:cts:latinLit:phi0588.abo001.perseus-lat2` a `phi0588.abo025.perseus-lat2`.
- Condiciones generales del conjunto Perseus: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), salvo indicación específica. Consultar las cabeceras TEI para cada edición.

## Transformaciones

La aplicación transforma TEI a líneas con cita (`capítulo.apartado`) y reutiliza los registros de citas ya convertidos de Examinator2. Se conservan el texto y la referencia de procedencia en los recursos estáticos. Las modificaciones de selección editorial del usuario afectan solo a las copias de su corpus local, no a la biblioteca de origen.

El catálogo está incluido en el artefacto estático de despliegue; **no se consulta la web externa al abrir los textos**. En un entorno de compilación se necesita internet para obtener las versiones originales fijadas. Si faltase una fuente, la compilación debe fallar; nunca se sustituye por texto inventado.
