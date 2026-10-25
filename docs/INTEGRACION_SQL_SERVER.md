# UMG Plan — Preparación para integración con SP_II.bak

## Estado comprobado

El archivo `SP_II(1).bak` se identificó como respaldo de Microsoft SQL Server. **No fue restaurado ni se verificaron sus columnas, tipos, claves primarias, claves foráneas ni los registros internos**. Por eso el frontend sigue trabajando en `localStorage`. El mapa de 45 tablas de `src/lib/relationalModel.mjs` está basado en **SP - Sistema de Planificacion.pdf, páginas 79 a 85**, y no debe presentarse como una extracción exacta del esquema físico.

## Qué está preparado

- `src/lib/maintenance.mjs`: 12 mantenimientos complementarios con formularios y control de referencias; en `Catálogos` existen los mantenimientos de profesores, cursos, planes, ciclos, períodos, salones y horarios.
- `src/lib/relationalModel.mjs`: inventario de 45 tablas documentadas, exportación de datos conceptuales e inspección local de referencias.
- `src/lib/repository.mjs`: adaptador de almacenamiento local y contrato **de ejemplo** para futura API REST. No hay API conectada.
- `Mantenimientos SP-II > Modelo de datos`: permite ver las tablas y qué entidades tienen datos locales.
- `Mantenimientos SP-II > Integridad y exportación`: descarga `UMGPlan-modelo-conceptual-*.json`. No es un respaldo SQL ni un script ejecutable contra SQL Server.
- `sql/01_INSPECCIONAR_SP_II_SOLO_LECTURA.sql`: consultas que identifican el esquema **real** una vez restaurado el .bak en SQL Server Management Studio.

## Procedimiento seguro para conectar una base futura

1. Hacer copia del respaldo original y restaurar **otra copia** en SQL Server de desarrollo.
2. Ejecutar `sql/01_INSPECCIONAR_SP_II_SOLO_LECTURA.sql` y conservar los resultados de columnas, claves y relaciones. Contrastar las 45 entidades documentadas con las tablas físicas que realmente existan.
3. Definir un mapeo explícito: `ID local` → `clave SQL`, tipo de columna, campo obligatorio, estado lógico, FKs y comportamiento de eliminación. No importar JSON directamente.
4. Desarrollar un backend Node.js/Express con driver SQL Server; mantener credenciales **solo en variables de entorno del servidor**, nunca en Vite/React.
5. Crear API REST con filtros por rol y autorización del servidor. Esenciales: `/auth/login`, `/catalogos/*`, `/planificaciones`, `/planificaciones/:id/secciones`, `/asignaciones`, `/revisiones`, `/mensajes`, `/notificaciones`, `/reportes` y `/autorizaciones`.
6. Implementar R1, R2 y R3 **también en el backend**, antes de insertar o actualizar asignaciones, usando transacciones y comprobación de concurrencia para evitar choques simultáneos.
7. Mantener historial/versión del PDF remitido al Director. Registrar **quién decidió** y **quién digitó** la resolución. El Director participa externamente, según el documento.
8. Implementar contraseñas hasheadas (Argon2id/bcrypt), cookies seguras, HTTPS, recuperación por correo verificado, sesiones, auditoría y controles de acceso reales. La autenticación y recuperación local del prototipo **no son aptas para producción**.
9. Sustituir progresivamente el adaptador `localRepository` por llamadas REST. Es trabajo de integración: no basta con cambiar una variable de conexión.
10. Realizar pruebas de integración con datos de copia y conciliación de registros, versiones, FKs y reportes antes de pasar a producción.

## Mapeo lógico de los grupos principales

| Colección frontend | Tabla conceptual SP-II | Relación principal |
|---|---|---|
| `users` | usuario | rol y profesor relacionado |
| `teachers` | profesor | usuarios, asignaciones |
| `institutions` | institucion | centros |
| `centers` | centro_universitario | institución |
| `careers` | carrera | centro |
| `modalities` | modalidad | planes |
| `studyPlans` | plan_estudio | carrera, modalidad, centro |
| `curriculum` | plan_estudio_curso | plan, curso y ciclo |
| `costHistory` | historial_costo_curso | curso y vigencia |
| `enrollments` | inscrito_historico | plan, período y ciclo |
| `slots` | horario | día/inicio/fin |
| `rooms` | salon | cupos |
| `sections` | seccion + planificacion_seccion | período, ciclo, plan |
| `plannings` | planificacion_semestral | plan y período |
| `assignments` | planificacion_detalle | sección, curso, docente, horario y salón |
| `availability` | disponibilidad_docente | profesor, período y bloque |
| `reviews` | revision_docente / observacion_docente | asignación y profesor |
| `planningAuthorities` | planificacion_autoridad | planificación y autoridad |
| `reports` | reporte_generado | versión inmutable de planificación |
| `authorizations` | autorizacion / evidencia_autorizacion | PDF remitido y resolución externa |
| `notifications` | notificacion | usuario destinatario |
| `audit` | bitacora_auditoria | autor, fecha y acción |

Las tablas de sesión, tipos de estado, acceso a reportes, permisos y bitácoras adicionales se incluyen en el inventario conceptual. En producción deberán tener persistencia propia del servidor.

## Chat

El chat es una **ampliación** del documento original. Actualmente los mensajes se almacenan localmente en `messages`. Al integrar SQL Server, crear un módulo de conversaciones/mensajes (con migración propia y autorización por docente/planificación) después de comparar el esquema real; no asumir que las tablas ya existen en el respaldo.

## Protección de archivos

Nunca subir el `.bak`, `.env` con credenciales, exportaciones reales de estudiantes/profesores ni secretos a un repositorio público.
