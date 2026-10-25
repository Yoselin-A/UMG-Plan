# Matriz de correspondencia de tablas — SP-II

**Origen:** Modelo conceptual del documento SP-II, páginas 79–85. **No verificado** contra la estructura física de `SP_II(1).bak`.

| Sección | Tabla conceptual SQL Server | Colección local / tratamiento | Mantenimiento |
|---|---|---|---|
| Acceso e identidad | `rol` | Derivada o no implementada directamente | Soporte/estado o pendiente de servidor |
| Acceso e identidad | `usuario` | `users` | Sí, Catálogos / Usuarios |
| Acceso e identidad | `dato_usuario` | Derivada o no implementada directamente | Soporte/estado o pendiente de servidor |
| Acceso e identidad | `estado_usuario` | Derivada o no implementada directamente | Soporte/estado o pendiente de servidor |
| Acceso e identidad | `sesion_usuario` | Derivada o no implementada directamente | Soporte/estado o pendiente de servidor |
| Acceso e identidad | `modulo_sistema` | Derivada o no implementada directamente | Soporte/estado o pendiente de servidor |
| Acceso e identidad | `permiso_rol_modulo` | Derivada o no implementada directamente | Soporte/estado o pendiente de servidor |
| Acceso e identidad | `bitacora_acceso` | Derivada o no implementada directamente | Soporte/estado o pendiente de servidor |
| Acceso e identidad | `tipo_accion_auditoria` | Derivada o no implementada directamente | Soporte/estado o pendiente de servidor |
| Acceso e identidad | `bitacora_auditoria` | `audit` | Automático |
| Acceso e identidad | `tipo_notificacion` | Derivada o no implementada directamente | Soporte/estado o pendiente de servidor |
| Acceso e identidad | `notificacion` | `notifications` | Automático |
| Personal académico | `profesor` | `teachers` | Sí, Catálogos / Usuarios |
| Personal académico | `disponibilidad_docente` | `availability` | Sí, Mantenimientos SP-II |
| Personal académico | `tipo_autoridad` | `authorityTypes` | Sí, Mantenimientos SP-II |
| Personal académico | `autoridad_institucional` | `authorities` | Sí, Mantenimientos SP-II |
| Personal académico | `planificacion_autoridad` | `planningAuthorities` | Sí, Mantenimientos SP-II |
| Personal académico | `horario_coordinacion` | `coordinationSlots` | Sí, Mantenimientos SP-II |
| Estructura académica | `institucion` | `institutions` | Sí, Mantenimientos SP-II |
| Estructura académica | `centro_universitario` | `centers` | Sí, Mantenimientos SP-II |
| Estructura académica | `carrera` | `careers` | Sí, Mantenimientos SP-II |
| Estructura académica | `modalidad` | `modalities` | Sí, Mantenimientos SP-II |
| Estructura académica | `plan_estudio` | `studyPlans` | Sí, Catálogos / Usuarios |
| Estructura académica | `ciclo` | `cycles` | Sí, Catálogos / Usuarios |
| Estructura académica | `curso` | `courses` | Sí, Catálogos / Usuarios |
| Estructura académica | `plan_estudio_curso` | `curriculum` | Sí, Mantenimientos SP-II |
| Estructura académica | `historial_costo_curso` | `costHistory` | Sí, Mantenimientos SP-II |
| Estructura académica | `periodo_academico` | `periods` | Sí, Catálogos / Usuarios |
| Estructura académica | `inscrito_historico` | `enrollments` | Sí, Mantenimientos SP-II |
| Estructura académica | `salon` | `rooms` | Sí, Catálogos / Usuarios |
| Estructura académica | `horario` | `slots` | Sí, Catálogos / Usuarios |
| Estructura académica | `seccion` | `sections` | Operación por rol |
| Planificación y revisión | `estado_planificacion` | Derivada o no implementada directamente | Soporte/estado o pendiente de servidor |
| Planificación y revisión | `planificacion_semestral` | `plannings` | Operación por rol |
| Planificación y revisión | `planificacion_seccion` | Derivada o no implementada directamente | Soporte/estado o pendiente de servidor |
| Planificación y revisión | `historial_planificacion` | Derivada o no implementada directamente | Soporte/estado o pendiente de servidor |
| Planificación y revisión | `planificacion_detalle` | `assignments` | Operación por rol |
| Planificación y revisión | `estado_confirmacion` | Derivada o no implementada directamente | Soporte/estado o pendiente de servidor |
| Planificación y revisión | `revision_docente` | `reviews` | Operación por rol |
| Planificación y revisión | `observacion_docente` | Derivada o no implementada directamente | Soporte/estado o pendiente de servidor |
| Autorización y reportes | `estado_autorizacion` | Derivada o no implementada directamente | Soporte/estado o pendiente de servidor |
| Autorización y reportes | `reporte_generado` | `reports` | Operación por rol |
| Autorización y reportes | `autorizacion` | `authorizations` | Operación por rol |
| Autorización y reportes | `evidencia_autorizacion` | Derivada o no implementada directamente | Soporte/estado o pendiente de servidor |
| Autorización y reportes | `acceso_reporte` | Derivada o no implementada directamente | Soporte/estado o pendiente de servidor |

**Nota:** las tablas de chat no figuran en el documento base; son una ampliación funcional, sin migración SQL definida todavía.
