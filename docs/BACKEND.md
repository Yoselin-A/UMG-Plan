# Backend UMG Plan — entrega local

Implementado en Node.js/Express con SQL Server y autenticación de Windows. El frontend React utiliza `/api/v1`; ya no guarda cuentas, sesiones ni datos académicos en localStorage. Solo las preferencias visuales permanecen en el navegador.

## Ubicación e inicio en Visual Studio Code

Abre la carpeta `C:\Users\hasen\OneDrive\Documents\Hugo\UMGPlan`.

```powershell
npm install
npm run setup
npm run dev
```

Frontend: http://localhost:5173. API: http://localhost:3001/api/v1/health.

`npm run setup` es idempotente: crea las tablas auxiliares, importa el respaldo restaurado una sola vez y crea el primer administrador si no existe. Guarda su contraseña aleatoria en `ACCESO_LOCAL.txt`, excluido de Git. No restablece contraseñas existentes. No se utilizan las contraseñas del prototipo `Demo2026!`.

Para ejecutar la versión compilada: `npm run build`, después `npm start`, y abrir http://localhost:3001. No ejecutes `npm start` y `npm run dev` simultáneamente: ambos utilizan el puerto 3001. Detén el proceso anterior con Ctrl+C.

En VS Code: **Terminal > Ejecutar tarea > UMG Plan: iniciar frontend y backend**. F5 inicia el servidor con depuración usando la versión compilada. Puedes colocar puntos de interrupción en `server/`.

## Base restaurada

Se restauró `C:\Backups\SP_II.bak` como **UMGPlan_Dev**, con archivos físicos independientes. No se sobrescribió la base original `SP_II` ni se modificó el respaldo. Se verificaron las 45 tablas de negocio; además existe `sysdiagrams`. El respaldo contiene 10 registros de demostración por tabla y hashes de contraseña de ejemplo que no son credenciales utilizables.

La conexión local usa ODBC Driver 17 y la identidad Windows del usuario que ejecuta Node. Para otra instalación, copia `.env.example` a `.env` y ajusta `SQL_CONNECTION_STRING`. No crees variables `VITE_*` con datos de acceso SQL. El servicio SQL Server debe estar iniciado y la cuenta Windows necesita permisos sobre la copia de desarrollo. No se cambió la configuración de las instancias instaladas.

Las cuentas del respaldo se conservan. Sus roles se clasifican según el nombre del rol original; en este respaldo se denominan “Coordinador docente DEMO”. Revisa y corrige el rol y la vinculación con profesor desde Usuarios antes de habilitar una cuenta. Los correos `example.com` proceden del respaldo; las cuentas nuevas requieren `@miumg.edu.gt`.

Para habilitar una cuenta nueva o restaurada: crear/verificarla desde Usuarios, solicitar una contraseña desde la pantalla de acceso y aprobar la solicitud desde **Solicitudes de contraseña** usando el administrador. No se envían correos. El administrador debe verificar la identidad del solicitante por un canal independiente.

## Persistencia y mapeo físico

`server/mapping.mjs` documenta las correspondencias de columnas reales. `server/store.mjs` aplica los cambios a las tablas `dbo` dentro de una transacción serializable. Por ejemplo: cursos → `curso` y `plan_estudio_curso`; secciones → `seccion` y `planificacion_seccion`; asignaciones → `planificacion_detalle`; revisiones → `revision_docente` y `observacion_docente`; resoluciones → `autorizacion` y `evidencia_autorizacion`; auditoría → `bitacora_auditoria`.

El esquema `app` complementa el respaldo sin cambiar las columnas existentes:

| Tabla | Uso |
|---|---|
| `Entity` | Identificadores de la interfaz, proyección de lectura y atributos que no existen en el esquema original; mensajes y solicitudes de contraseña |
| `Version` | Versión global para impedir sobrescrituras entre sesiones |
| `Credential` | Contraseñas scrypt con sal aleatoria |
| `Session` | Hash del token de sesión, token CSRF y caducidad de 8 horas |
| `PendingPassword` | Hash privado de la contraseña propuesta mientras se resuelve la solicitud |
| `Migration` | Correcciones idempotentes de la importación |

La proyección `app.Entity` se actualiza junto con las tablas originales. **Realiza las operaciones desde la aplicación**: las ediciones manuales en `dbo` después de la importación no se sincronizan automáticamente con la proyección. No elimines `app` para “refrescar” datos: perderías atributos y credenciales. Los campos sin equivalencia física —por ejemplo, la sede asociada a una carrera, las rutas de un rol, el código de planificación, el cupo histórico recomendado, los mensajes y las capturas de los reportes— se conservan en `app.Entity`. La sede inicial de cada carrera se infiere de su planificación existente.

Los registros PDF del respaldo contienen rutas, pero no los archivos PDF históricos. La interfaz ofrece una **referencia reconstruida con los datos restaurados**, identificada como tal. Los reportes creados desde esta versión guardan una captura inmutable generada por el servidor; el PDF se renderiza en el navegador a partir de esa captura. El campo `ruta_archivo` usa una referencia lógica `umgplan://report/...`, no una ruta de archivo físico.

Las claves foráneas originales impiden borrar registros con historial. En esos casos, inactiva el registro. No se borran ni se reinician datos de servidor desde la pantalla de auditoría. La exportación JSON es una copia de consulta, no un respaldo completo restaurable.

## API y permisos

| Método y ruta | Función |
|---|---|
| `GET /api/v1/health` | Comprobar conexión |
| `POST /api/v1/auth/login` | Usuario/correo y contraseña; devuelve cookie HttpOnly y token CSRF |
| `POST /api/v1/auth/logout` | Cerrar y eliminar la sesión |
| `GET /api/v1/session` | Datos filtrados por rol, usuario, versión y token CSRF |
| `POST /api/v1/changes` | Lote transaccional de altas/cambios/bajas; exige versión vigente |
| `POST /api/v1/password-requests` | Solicitud de contraseña pendiente; respuesta genérica |
| `POST /api/v1/password-requests/:id/decision` | Aprobar/denegar; solo Administrador principal |

Un cambio usa `{revision, action, changes:[{collection,id,op:'upsert',value}]}`; las bajas usan `op:'delete'` sin `value`. La interfaz construye estos lotes al guardar los formularios existentes. El servidor valida colecciones y campos, rol y rutas del rol personalizado, relaciones, docente propietario, coordinador responsable, estados de planificación, límite de cuatro cursos distintos por docente, cruces de horario, capacidad y disponibilidad para revisión. No ejecuta funciones ni código enviado por el navegador.

Los cambios requieren `X-CSRF-Token`, cookie válida y origen permitido. Un conflicto de versión devuelve 409 y exige recargar los datos. El backend genera la auditoría y las notificaciones. La aprobación de una contraseña invalida las sesiones de esa cuenta. Los hashes nunca se envían al frontend. Los intentos de acceso se registran en `bitacora_acceso`.

Al abrir o recargar la aplicación se muestra el login; no se recupera automáticamente la sesión del navegador. El cierre de sesión utiliza POST, limpia inmediatamente los datos visibles, revoca el token en SQL Server y expira la cookie. Las respuestas pendientes de consultas o guardados no vuelven a activar una sesión cerrada. Al iniciar sesión se sustituye también cualquier token anterior del mismo navegador.

El servicio escucha solamente en `127.0.0.1`. Esta entrega está configurada para desarrollo local. Una publicación requiere HTTPS, `COOKIE_SECURE=true`, orígenes explícitos, una identidad SQL con permisos mínimos y un mecanismo compartido de límites de acceso si se ejecutan varias instancias. No se ha publicado el sistema.

## Pruebas

```powershell
npm test
npm run build
npm run test:integration
npm audit
```

Las pruebas de integración crean una base **temporal e independiente** `UMGPlan_Test_<GUID>` a partir del respaldo y la eliminan al finalizar. Nunca usan UMGPlan_Dev como destino de pruebas. Requieren permisos locales para restaurar y eliminar esa copia. El archivo de prueba rechaza conexiones cuyo nombre no empiece por `UMGPlan_Test_`.

Se prueban acceso, cookies y CSRF, rechazo de origen ajeno, permisos, intento de escalamiento de rol, guardado real en SQL, reversión ante errores, conflictos de versión, revisión docente, consolidación, autorización externa, reportes, chat, disponibilidad y cierre de sesión. Los tests anteriores de datos demostrativos se conservan como pruebas unitarias; sus datos no se importan automáticamente al servidor.

Para un respaldo completo, usa **SQL Server Management Studio > UMGPlan_Dev > Tareas > Copia de seguridad** y guarda todas sus tablas, incluido el esquema `app`. Restaura en otra base con nombre y archivos distintos; no utilices REPLACE sobre la base original.

## Catálogo del pénsum 5090 de 2014

`datos/pensum-5090-2014.json` contiene los 50 cursos transcritos del PDF aportado, con códigos de tres dígitos, nombres y ciclos. Se cotejaron las 50 filas con el documento; hay 10 ciclos de cinco cursos.

`npm run importar:pensum` carga el catálogo en UMGPlan_Dev de forma transaccional; también admite las bases temporales de pruebas. Conserva inactivos los cursos y relaciones de pensum anteriores, sin modificar asignaciones, autorizaciones ni capturas históricas de reportes. Guarda una exportación anterior en `.local/pensum/` y registra la operación en auditoría. La repetición no duplica cursos ni relaciones. Es una operación explícita: no se ejecuta automáticamente al iniciar el servidor ni al ejecutar setup.

Se crea el plan `5090-2014`, vinculado a la carrera 5090, Universidad Mariano Gálvez, Villa Nueva, jornada Diario matutina. Los diez ciclos existentes se reutilizan con sus nombres académicos. La migración 3 elimina los créditos y prerrequisitos previamente guardados en `app.Entity`; el esquema original no tiene columnas para esos campos.

El catálogo muestra Activos por defecto. Usa Inactivos o Todos los estados para consultar los anteriores. El PDF es informativo y no indica laboratorios ni precios; la carga no asigna costos y deja la configuración de laboratorio sin activar para su revisión administrativa.

En los datos de Gestión académica también se agregó `0813-2024`, Ingeniería en Agronomía, Coatepeque, plan mixto, basado en una copia informativa del pénsum disponible en https://es.scribd.com/document/709909971/Pensum-0813-2024. Es una fuente de terceros: su vigencia y autenticidad deben confirmarse con UMG. Los diez planes de demostración quedan inactivos para conservar sus relaciones históricas; pueden ocultarse con el filtro Activos. El catálogo completo nacional sigue pendiente de consulta y validación.

Se agregaron otros seis planes de referencia mediante `node scripts/actualizar-planes-referencia.mjs`. Los datos y enlaces a sus copias informativas se encuentran en `datos/planes-referencia-umg.json`; su vigencia y autenticidad requieren confirmación con UMG. Los seis planes nuevos y el 0813-2024 no incluyen cursos cargados. La tabla de planes muestra inicialmente los activos y conserva la opción de consultar los inactivos.

## Git y documentos anteriores

No se crearon commits ni se subieron cambios. `ACCESO_LOCAL.txt`, `.env`, dependencias, archivos SQL físicos y respaldos están excluidos de Git. Los documentos originales del ZIP que describen un frontend local se conservan como antecedentes; esta guía y el README principal describen la versión actual.

Los planes guardan la modalidad y la jornada por separado. La columna SQL `plan_estudio.jornada` conserva la jornada; la modalidad sigue relacionada con `modalidad`. La migración conserva las jornadas anteriores y utiliza «No especificada» cuando no consta la modalidad. Los reportes históricos conservan sus datos originales.
