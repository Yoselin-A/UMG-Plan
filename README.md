# UMG Plan — frontend + backend con SQL Server

Backend implementado y conectado a la copia local **UMGPlan_Dev**. Consulta [docs/BACKEND.md](docs/BACKEND.md) para configuración, acceso, API, mapeo y pruebas.

Inicio: `npm run setup` y `npm run dev`. Acceso inicial en `ACCESO_LOCAL.txt` (privado y excluido de Git).

No se han creado commits ni se han subido cambios.

---

Los apartados siguientes son la documentación original del frontend y se conservan como antecedentes. Sus afirmaciones sobre localStorage, usuarios demo y backend futuro no describen la versión actual.

# UMG Plan 4.2 — Solicitudes de contraseña y roles dinámicos

**Nuevo:** en la pantalla de acceso, «¿Olvidaste tu contraseña? Solicitar cambio» abre un modal con contraseña propuesta y confirmación. El Administrador principal debe revisarla en **Solicitudes de contraseña**, desde su panel o el menú. También se puede solicitar el cambio desde Ajustes. El cambio **no** se aplica antes de la autorización.

**Roles:** desde Roles y permisos, el Administrador puede crear un rol nuevo, elegir un perfil base (Administrador, Coordinador o Docente) y marcar rutas permitidas. Luego lo asigna en Usuarios. Los tres roles esenciales no pueden borrarse; los roles personalizados con cuentas asociadas tampoco. Los permisos deberán validarse de nuevo en el backend futuro.

**Correos:** botón «Completar @miumg.edu.gt» en Usuarios, Profesores y mantenimientos que solicitan correo.

**AVISO DE SEGURIDAD:** autenticación, solicitud y permisos se simulan con datos del mismo navegador. No hay envío real de correo, ni comprobación de identidad desde servidor, ni seguridad suficiente para producción. El Administrador debe verificar la identidad antes de aprobar. No cargues credenciales reales.

Consulta `docs/GUIA_CAMBIO_CONTRASENA_Y_ROLES.md` para instrucciones de prueba.

---

# UMG Plan — Frontend completo con Mantenimientos 2.0 (entrega local)

Esta entrega conserva el **diseño de Figma del ZIP UMGPlan-Prototipo(2)** —menú lateral, encabezado compacto, tarjetas azules, logotipo y diseño claro/oscuro—, y adapta el contenido al flujo SP-II del documento de planificación. Está implementada **solo como frontend** con `localStorage` para el desarrollo y las pruebas. **No conecta SQL Server ni restaura `SP_II(1).bak`.**

## Inicio rápido

Necesitas Node.js moderno (versión LTS compatible con Vite 6).

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Para ejecutar pruebas: `npm test`; para validar la compilación: `npm run build`.

## Usuarios de demostración

| Rol | Usuario | Contraseña |
|---|---|---|
| Administrador | `admin` | `Demo2026!` |
| Coordinador | `coordinador` | `Demo2026!` |
| Docentes de prueba | `docente1` a `docente8` | `Demo2026!` |

El Director **no ingresa al sistema**: revisa externamente el PDF y su resolución es registrada por el Coordinador.

## Módulos

**Administrador:** Catálogos generales (Profesores, Cursos, Planes, Ciclos, Períodos, Salones y Horarios), Mantenimientos SP-II (Institución, Centros, Carreras, Modalidades, Autoridades, relación pensum/curso, historial de laboratorio, inscritos, disponibilidad y horario de coordinación), Usuarios y roles, Auditoría, estadísticas y reportes. Los mantenimientos permiten crear, ver, editar, activar/inactivar y eliminar con restricciones de referencias.

**Coordinador:** Propuestas y secciones, inscritos/cupos, asignación de cursos-profesores-horarios-salones con R1-R3, consulta de disponibilidad docente, revisión docente, chat, correcciones, consolidación, PDF para Director, registro de resolución externa y reporte final autorizado.

**Docente:** Mis asignaciones, confirmación o inconvenientes, mis horarios de disponibilidad, chat con Coordinación, notificaciones y ajustes.

**Transversales:** logotipo en la pestaña, modo claro/oscuro, datos de ejemplo diferenciados de referencias históricas Portales 2025, historial de acciones, respaldos JSON y solicitudes de cambio de contraseña con **aprobación del Administrador (solo demostración local)**.

## Persistencia y precauciones

- `localStorage` conserva datos en el mismo navegador y origen. No sincroniza diferentes equipos y **no constituye seguridad real**.
- Si usaste una versión anterior en el mismo navegador y puerto, se intentan conservar sus registros. Las nuevas colecciones se añaden sin sobrescribir las existentes. Puedes exportar un respaldo en **Auditoría** antes de actualizar.
- Si quieres ver las tablas demo nuevas cuando el navegador conserva datos de versiones previas, usa **Auditoría > Restablecer datos de ejemplo** tras exportar un respaldo, ya que este botón elimina los cambios locales.
- Las 45 tablas mostradas en el modelo son **conceptuales a partir del documento**. Algunas son catálogos de estados/historiales técnicos que deberán gestionarse en backend.
- Los registros históricos del formato Portales 2025 son referencias; los registros y autoridades Villa Nueva son **demostrativos** y deben revisarse antes de usarse oficialmente.
- No cargar datos personales ni credenciales reales en una demo pública.

## Integración posterior con SQL Server

Lee `docs/INTEGRACION_SQL_SERVER.md`; contiene contratos de entidades y API, precauciones y orden de integración. En `sql/01_INSPECCIONAR_SP_II_SOLO_LECTURA.sql` está la consulta para inspeccionar las **columnas y claves reales** de la base restaurada. Los datos locales NO son datos recuperados del respaldo.

## Pruebas

`docs/GUIA_DE_PRUEBAS.md` describe el recorrido por rol y pruebas de integridad. Los tests de lógica se ejecutan con `npm test`.

## Archivos importantes

- `src/App.jsx`: diseño, navegación y roles.
- `src/pages/Maintenance.jsx`: mantenimiento de tablas importantes.
- `src/pages/Availability.jsx`: disponibilidad docente.
- `src/lib/maintenance.mjs`: validaciones de catálogos y restricciones de eliminación.
- `src/lib/relationalModel.mjs`: inventario de 45 tablas del documento y mapeo conceptual.
- `src/lib/repository.mjs`: adaptador local y **ejemplo** de contratos REST futuros.
- `src/lib/domain.mjs`: reglas académicas R1-R3.
- `src/lib/actions.js`: flujo de revisión y autorización externa.
- `src/lib/pdf.js`: PDF horizontal institucional con logo y vistos buenos.

**Estado técnico:** solo frontend para continuar desarrollo. Para producción son indispensables backend, acceso por roles en servidor, SQL Server restaurado/verificado, HTTPS, autenticación segura, respaldos y pruebas de integración.


## Novedades de la interfaz (octubre 2026)

- **Mantenimiento del Sistema**: tablero de métricas, categorías y tarjetas; acceso por **Gestionar** a cada tabla; búsqueda por cualquier columna, filtrado por estado, orden ascendente/descendente, paginación, acciones ver/editar/eliminar/inactivar/activar en modales y PDF de registros. **+ Nuevo** en los selects de relaciones abre un formulario de mantenimiento vinculado.
- **Roles y permisos** (`/roles`): perfiles **Administrador, Coordinador y Docente** con descripción y matriz de funciones, detalle modal, edición de la descripción local y PDF. La propuesta SP-II fija tres roles; cambiar privilegios reales deberá hacerse en el backend, nunca como una regla de seguridad client-side.
- **Catálogos y usuarios**: tablas filtrables y ordenables, modales detallados, PDF; correos nuevos obligatorios con `@miumg.edu.gt`. El inicio de sesión acepta nombre de usuario o correo de la cuenta.
- **Períodos**: número de período de 1 a 12 y tipo Semestral, Trimestral, Cuatrimestral, Interciclo, Anual o Personalizado. Las asignaciones continúan agrupadas por `periodId`.
- **Chat**: los mensajes de la conversación no admiten borrado ni edición, para preservar el historial del proceso docente.
- **Notificaciones**: borde **verde** para confirmaciones, **rojo** para inconvenientes/denegaciones, **gris** para mensajes de chat, y azul para informativas. El botón del menú de tres líneas ahora oculta el sidebar en escritorio.
- **Planes de estudio**: seleccionar la carrera desde el catálogo completa código, nombre, universidad y sede. Si falta una carrera, usa **+ Crear** para pasar al mantenimiento de datos relacionados.

## Qué significa «frontend listo»

Las operaciones funcionan localmente y la interfaz permite probar todo el proceso SP-II sin SQL Server. La integración REAL posterior requiere configurar un backend con sesiones seguras, permisos en servidor, correo de recuperación auténtico, validaciones transaccionales y mapeo de columnas real del respaldo `.bak`. **No se conectó ni modificó el respaldo SQL Server.**

### Precauciones sobre los datos
Los usuarios de prueba `admin`, `coordinador`, `docente1`... contienen **correos de ejemplo `@miumg.edu.gt` que no deben utilizarse para enviar mensajes reales**. Los nombres de autoridades y la planificación Villa Nueva 2026 son de demostración. Los docentes históricos 2025 conservan sus campos de correo vacíos porque el PDF fuente no proporciona ese dato.

### Actualizar sin perder datos
Antes de abrir esta versión en el mismo `localhost:5173`, desde **Auditoría** descarga un respaldo JSON. No hace falta borrar `localStorage`: el proyecto conserva las claves existentes, normaliza únicamente los correos de cuentas de demostración que estaban vacíos, y añade metadatos nuevos. Los datos personales guardados manualmente no se cambian automáticamente.

## Actualización 2026-10-24: más datos y búsqueda completa

La versión trae por defecto **6 sedes, 14 carreras, 14 planes, 38 períodos, 20 salones, 111 horarios (lunes a domingo), 156 cursos y 54 docentes**, mezclando referencias históricas **identificadas** y datos inventados de **demostración**. Solo el documento de Portales 2025 respalda los registros históricos; los catálogos ficticios no son oferta académica oficial. Véanse `datos/LEER_ANTES_DE_IMPORTAR.md` y `docs/CAMBIOS_DATOS_Y_BUSQUEDA_2026.md`.

Los filtros de las tablas buscan por todos los campos del registro y etiquetas de relaciones (centro, pensum, carrera, docente, etc.), con normalización de tildes. La búsqueda en la portada de Mantenimientos también encuentra resultados dentro de los registros.

Para regenerar el JSON inicial de prueba utiliza `npm run exportar-demo`. **No importa el JSON directamente a SQL Server** sin mapear las claves y validar el esquema físico.
