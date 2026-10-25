# Ampliación de datos y búsqueda (2026-10-24)

**Base:** UMGPlan-Corregido-Archivos-Completos. Se conserva el diseño Figma y el guardado local.

## Nuevos datos

Universidad UMG, 6 sedes (Villa Nueva, Portales y 4 sedes ficticias claramente señaladas), 14 carreras, 6 modalidades, 14 planes de estudio, 10 ciclos, 38 períodos, 20 salones, 111 horarios (lunes a domingo), 156 cursos, 54 docentes, 38 referencias de inscritos, 6 planificaciones de prueba y 13 asignaciones.

**Importante:** la existencia de carreras, sedes y bloques en este catálogo NO confirma su vigencia institucional. Los programas distintos al plan ISC de referencia son demostrativos; hay 25 cursos y 28 docentes históricos de Portales 2025. Las cuentas de usuario y contraseñas de prueba no representan cuentas reales.

## Buscar por todos los datos

- En **Mantenimientos del Sistema**, la búsqueda de inicio encuentra tanto nombres de tablas como contenidos: universidad, sede, carrera, docentes, correos, códigos, horarios, etc. Selecciona Gestionar para consultar el detalle de la tabla.
- En **Catálogos**, busca por todos los campos, incluso los que no se ven inicialmente. Por ejemplo, en Cursos puedes buscar «Administración», «2026», «Villa Nueva», «ISC», «sistemas» o un código.
- En las tablas, utiliza «Buscar en todos los campos» para cruzar datos relacionados. La búsqueda ignora mayúsculas/minúsculas y tildes. El selector de columna restringe a una columna concreta.
- El botón «PDF tabla» exporta el conjunto filtrado que estás visualizando.

## ¿Cómo aparecen los registros nuevos si ya tengo datos locales?

Sin necesidad de borrar el navegador: se incorporan en el primer inicio de esta versión (`schemaVersion: 7`) y los datos anteriores permanecen. Si importas un JSON antiguo, el normalizador incorporará las relaciones faltantes y aplicará la ampliación de semilla. **Antes de actualizar, exporta tu respaldo JSON.**

## Horarios

Se conservan los bloques originales del sábado y los anteriores de lunes a viernes. Se incorporan franjas de mañana, tarde y noche durante la semana y sábado, y bloques de domingo desde las 07:00 hasta las 20:00. El catálogo permite crear otros intervalos si el Coordinador/Administrador los necesita.
