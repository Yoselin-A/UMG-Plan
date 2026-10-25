# Correspondencia entre entidades locales y esquema SP-II

Basado en `SP - Sistema de Planificacion.pdf`, sección «Diagrama Entidad-Relación» (páginas 78–95) y nombres identificables en `SP_II.bak`.

| Arreglo local | Tabla(s) del modelo de SQL Server | Tratamiento en esta versión |
| --- | --- | --- |
| `users` | `usuario`, `dato_usuario`, `rol` | Usuario, nombre, rol y estado; sesión y contraseña locales de demostración |
| `teachers` | `profesor` | Código, nombre, correo y estado |
| `studyPlans` | `institucion`, `centro_universitario`, `carrera`, `modalidad`, `plan_estudio` | Catálogo simplificado con los datos requeridos para generar encabezados |
| `cycles` | `ciclo` | Número, nombre y estado |
| `periods` | `periodo_academico` | Año, semestre, descripción y estado |
| `rooms` | `salon` | Código, capacidad y estado |
| `slots` | `horario` | Día, hora de inicio y fin |
| `courses` | `curso`, `plan_estudio_curso` | Curso, plan y ciclo; costo de laboratorio vinculado a curso en la demo |
| `enrollments` | `inscrito_historico` | Cantidad estimada para cálculo orientativo de secciones |
| `sections` | `seccion`, `planificacion_seccion` | Ciclo, cupo y sección perteneciente a una planificación |
| `plannings` | `planificacion_semestral`, `estado_planificacion` | Encabezado, período, plan y estado |
| `assignments` | `planificacion_detalle` | Curso + profesor + horario + salón + sección |
| `reviews` | `revision_docente`, `observacion_docente`, `estado_confirmacion` | Confirmación / inconveniente docente y observación |
| `authorizations` | `autorizacion`, `estado_autorizacion`, `evidencia_autorizacion` | Resolución externa emitida por el Director, registrada por Coordinación |
| `reports` | `reporte_generado` | PDF y snapshot de la versión generada |
| `messages` | **Extensión futura de chat** | Mensajes vinculados a docente y planificación |
| `notifications` | `notificacion`, `tipo_notificacion` | Alertas y estado de lectura locales |
| `audit` | `bitacora_auditoria`, `historial_planificacion` | Registro simplificado de cambios locales |

Esta correspondencia **no implica equivalencia columna a columna**. La base SQL Server deberá restaurarse y analizarse al programar el backend. Los registros del seed son ilustrativos. La función de exportación/importación JSON permite preservar el trabajo hecho sobre la interfaz local, no restaurar automáticamente el `.bak`.

## Reglas funcionales modeladas

- RF-01, RF-02: demostración de login y rutas por rol (no seguridad de servidor).
- RF-03 a RF-13: operaciones locales sobre usuarios, profesores y catálogos académicos; inscrito histórico, secciones, cupos.
- RF-14 a RF-23: propuesta, borradores, asignaciones, validaciones R1–R3, edición y previsualización.
- RF-24 a RF-32: envío docente, confirmación, inconvenientes, revalidación y consolidación.
- RF-33 a RF-41: PDF consolidado, registro de decisión externa, estados, reporte final.
- Añadidos solicitados por el equipo: chat docente, notificaciones locales, tema oscuro, respaldos JSON y eliminación controlada de registros.

## Para backend posterior

1. Crear API autenticada con roles y sesiones del lado servidor.
2. Migrar progresivamente los datos de `localStorage` a SQL Server (sin asumir que los IDs locales coinciden con IDs SQL).
3. Normalizar catálogo `plan_estudio_curso` y relaciones de instituciones/sedes/modalidades.
4. Validar R1, R2, R3, salones y cupos de forma transaccional en servidor para evitar condiciones de carrera.
5. Persistir chat, notificaciones y evidencias como datos auditables y seguros.
6. Versionar documentos y hacer backups institucionales.
