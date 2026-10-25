# UMG Plan — Guía de la interfaz de Mantenimientos y Roles (2026)

## 1. Abrir el sistema

Usa `npm install` y `npm run dev`, luego abre `http://localhost:5173`. El sistema no requiere conexión a SQL Server. Los datos se guardan en `localStorage` del navegador.

Cuentas demo: `admin`, `coordinador`, `docente1` a `docente8`. Contraseña de pruebas: `Demo2026!`. Son credenciales locales, no aptas para producción.

## 2. Mantenimiento del Sistema (rol Administrador)

1. Abre **Mantenimientos SP-II** en el menú lateral.
2. Consulta las tarjetas de métricas: tablas conceptuales, registros locales y grupos.
3. Usa **Todas las categorías** para filtrar por institución, personal, pensum y seguridad.
4. Haz clic en la tarjeta deseada (**Gestionar**) para ver sus registros.
5. En la tabla puedes buscar por campo, ordenar al pulsar una cabecera, filtrar por estado, cambiar página, activar/inactivar, ver, editar y eliminar.
6. Abre **Nuevo registro**; los formularios mostrarán los campos requeridos.
7. Si falta un valor en una relación, pulsa **+ Nuevo**; cuando la tabla sea parte de Mantenimientos aparecerá otro formulario. Algunas relaciones corresponden a otro módulo (Cursos, Usuarios o Profesores): desde allí se administran.
8. Pulsa **PDF tabla** para descargar los registros filtrados. Usa **PDF todas las tablas** en el encabezado para el inventario general de tablas con sus conteos.

**Nota:** las operaciones de eliminación se bloquean cuando el registro está referenciado por otros registros locales. No fuerces la eliminación de datos institucionales reales; primero resuelve las dependencias.

## 3. Roles y permisos

1. Accede a **Administración → Roles y permisos**.
2. Selecciona **Administrador**, **Coordinador de Carrera** o **Docente**.
3. Abre el detalle del rol en modal: descripción, responsabilidades y lista de permisos.
4. Puedes editar la **descripción** del rol y exportar la matriz a PDF.

Los permisos funcionales y los tres roles del proyecto SP-II no se modifican arbitrariamente desde el frontend local. Un backend deberá reforzar la seguridad en producción. El Director autoriza externamente y **no ingresa** al sistema.

## 4. Correos y períodos

Los nuevos usuarios y profesores exigen correo con dominio `@miumg.edu.gt`. En modo demo estos correos son **ficticios**; no los utilices para enviar mensajes. El login también permite ingresar usando el correo de la cuenta.

Los períodos pueden clasificarse como Semestral, Trimestral, Cuatrimestral, Interciclo, Anual o Personalizado, con número de período de 1 a 12. Una planificación guarda un `periodId`, independientemente del tipo de período.

## 5. Notificaciones, chats y menú

La campana muestra notificaciones con borde verde para confirmaciones, rojo para inconvenientes, gris para mensajes y azul para avisos generales. El historial de chat no permite editar ni borrar los mensajes. En escritorio, las **tres líneas** del encabezado ocultan o muestran la barra lateral. El modo oscuro se activa desde el icono de luna.

## 6. PDF y guardado local

Los reportes de planificación conservan el formato de hoja sábana institucional. Los PDFs de los catálogos son independientes: muestran nombre, fecha, usuario y registros.

Antes de actualizar el proyecto, abre **Auditoría → Descargar respaldo JSON**. Si accedes a `localhost:5173` desde otro navegador o dominio, los datos no se comparten.

## 7. Qué falta al conectar SQL Server

Esta versión **NO** usa el `.bak`, no incluye backend y no debe ponerse en internet con credenciales demo. La conexión posterior exige API REST, autenticación segura, autorización por rol en el servidor, SQL Server restaurado con relaciones verificadas, respaldos y pruebas de integración. Se incluye un script de inspección solo lectura para ayudar al equipo de backend.
