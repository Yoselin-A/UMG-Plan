# Guía de pruebas — UMG Plan SP-II

**Demo local:** usuarios `admin`, `coordinador`, `docente1`, `docente2`; contraseña inicial `Demo2026!`.

1. Como `admin`, entrar a **Mantenimientos SP-II**. Crear una modalidad de prueba, abrir su detalle, editar la descripción, inactivarla/activarla y eliminarla. Comprobar que una sede asociada a carrera no se pueda eliminar.
2. En el grupo **Institución y oferta**, verificar Universidad Mariano Gálvez, Villa Nueva, Portales y las carreras; datos de Villa Nueva marcados como demostración.
3. En **Control académico y pensum**, revisar `Cursos por plan de estudio`, historial de laboratorio, inscritos y disponibilidad docente. No eliminar cursos ya usados en propuestas.
4. En **Modelo de datos**, comprobar inventario de 45 tablas conceptuales y la leyenda de relación con frontend. En **Integridad**, confirmar cero referencias huérfanas; descargar exportación JSON conceptual.
5. En **Catálogos > Planes de estudio**, seleccionar institución, centro, carrera y modalidad existentes. Intentar una sede o carrera que no exista: el guardado debe impedir relaciones inválidas.
6. Como `coordinador`, abrir `PL-2026-002`. Comprobar dos secciones y ocho asignaciones. Probar R1 (quinta clase del profesor), R2 (dos cursos con el mismo docente y sección) y R3 (cruce de horario); todos deben bloquearse.
7. En **Disponibilidad docente**, consultar bloques registrados. La revisión formal se mantiene en **Revisión docente**.
8. Enviar el plan a revisión; como `docente1`, revisar clases, responder y conversar en chat. En **Mi disponibilidad**, agregar y editar un bloque.
9. Como coordinador, comprobar notificaciones y que no se consolide con respuestas pendientes. Confirmar las ocho asignaciones con los ocho docentes de demostración y consolidar.
10. Generar PDF consolidado para Director. Registrar una decisión externa de prueba, identificando nombre, fecha y evidencia. Generar PDF final y comprobar encabezados, columnas, lab, salón y autoridades.
11. En **Auditoría**, exportar un respaldo JSON integral. Cambiar un registro; importarlo de vuelta solo cuando sea seguro restablecerlo. Probar modo claro y oscuro.
12. Probar recuperación de contraseña solo como demostración local. La pantalla advierte que el código no es un mecanismo seguro de recuperación real.

Para compilar localmente: `npm install`, `npm run dev`, `npm test`, `npm run build`.
