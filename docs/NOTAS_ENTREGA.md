# Notas de entrega · UMG Plan

Edición local frontend de UMG Plan (React + Vite). Se han conservado estilo, logo, navegación y funcionalidades definidas en SP-II. No requiere SQL.

- Identidad visual inspirada en el prototipo de Figma aportado.
- CRUD de catálogos/usuarios/planificaciones/secciones/asignaciones, estados y dependencias.
- 10 ciclos; 6 períodos; 10 salones; 35 bloques horarios; 35 cursos; 36 docentes (mezcla de demostración y referencia histórica 2025, claramente identificados).
- Validación de reglas R1/R2/R3, salones y cupos.
- Revisión docente, chat vinculado a planificación, notificaciones locales.
- PDF horizontal con logotipo, horario tipo hoja sábana, costo de laboratorio, cuatro vistos buenos, versión y resolución.
- Respaldo JSON, tema claro/oscuro, auditoría local, permisos visuales por rol.
- Las credenciales `admin`, `coordinador`, `docente1` ... `docente8` usan contraseña inicial `Demo2026!`.

**Calidad comprobada:** 30 pruebas de dominio en Node aprobadas, parser JS/JSX sin errores, PDF de demostración abierto/renderizado, integridad ZIP comprobada. La compilación de Vite no pudo ejecutarse en el entorno de preparación por fallo de acceso al registro npm: realizar `npm install`, `npm run build`, y la prueba manual del navegador en el equipo de desarrollo.

**Límite:** no incorpora backend, DB, seguridad de producción ni sincronización entre equipos. Los datos de Villa Nueva son ficticios; los de Portales proceden del documento base histórico de 2025 y no implican vigencia institucional actual.
