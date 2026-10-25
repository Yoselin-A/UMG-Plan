# Datos de ejemplo de UMG Plan — octubre 2026

Estos archivos **no son exportaciones de `SP_II.bak`**, ni listados oficiales ni matrículas institucionales. Son datos coherentes para probar el **frontend local**, compuestos por:

- Referencias del documento de planificación SP-II: Universidad Mariano Gálvez, Centros Universitarios Villa Nueva y Portales.
- Información de cursos y nombres de docentes tal como aparecen en el horario **histórico de Portales, segundo semestre 2025**, siempre marcada como referencia histórica.
- Registros **ficticios** para ilustrar más sedes, carreras, modalidades, períodos, aulas, docentes, cursos e inscritos. Las cuatro sedes añadidas están nombradas explícitamente «Sede de prueba ... (no oficial)».
- Horarios hipotéticos de lunes a domingo, mañana, tarde y noche. Que aparezcan en el catálogo no significa que correspondan a jornadas reales aprobadas por la UMG.

## Contenido

- `UMGPlan_Datos_Prueba_Para_Importar.json`: todas las colecciones del frontend con identificadores y relaciones, sin contraseñas. Es apto para importar desde **Auditoría / Respaldos** cuando sea necesario restablecer el conjunto de prueba; primero guarda tu respaldo.
- `INVENTARIO_Y_PROCEDENCIA.json`: cantidad y procedencia de cada conjunto.

## Para conectarlo posteriormente a SQL Server

No ejecutes este JSON directamente como T-SQL. Restaura el backup en un entorno de pruebas, revisa las PK/FK reales y crea la capa API Node/Express que transforme `id`, `planId`, `teacherId`, etc. a las claves de las tablas reales. Nunca coloques una contraseña de SQL Server en el frontend. Respeta las reglas R1-R3 y permisos en el backend; `localStorage` no ofrece seguridad ni sincronización entre computadores.

## No sobrescribir cambios previos

La migración a `schemaVersion: 7` añade los registros nuevos **una sola vez** y mantiene los registros locales que ya hayas editado. Si deseas reemplazar todos los datos, exporta antes un respaldo JSON y utiliza la opción de restaurar la demostración.
