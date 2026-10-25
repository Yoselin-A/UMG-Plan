# Guía para probar cambios de contraseña y roles (UMG Plan 4.2)

## 1. Solicitar una contraseña (sin ingresar)

1. Abre http://localhost:5173/login.
2. Pulsa **¿Olvidaste tu contraseña? Solicitar cambio**.
3. En el modal escribe `docente1` (o su correo) y una nueva contraseña de PRUEBA, por ejemplo `Temporal2026!`.
4. Introduce la misma contraseña en Confirmar. El indicador debe mostrar los cinco requisitos satisfechos.
5. Pulsa **Enviar solicitud**. **Todavía no cambia la contraseña.**
6. Repite el envío: el sistema debe informar que ya existe una solicitud pendiente.

## 2. Autorizar o denegar (Administrador)

1. Ingresa con `admin` / `Demo2026!`.
2. Abre **Solicitudes de contraseña** desde el menú o el aviso en el Panel Principal.
3. Pulsa el ojo de la solicitud. Aparecerá un modal con nombre, usuario, estado y fecha.
4. **Autorizar** abre otro modal. Marca la casilla de que verificaste la identidad y pulsa Sí, autorizar.
5. Cierra sesión e ingresa con la contraseña solicitada.
6. Para probar **Denegar**, crea otra solicitud de un usuario de prueba y elige Denegar. La contraseña anterior deberá seguir funcionando.

## 3. Solicitar estando dentro

Como `docente1`, `coordinador` o `admin`, entra a **Ajustes y perfil → Solicitar cambio de contraseña**. El flujo también queda pendiente de aprobación del Administrador principal.

## 4. Crear rol personalizado

1. Ingresa como Administrador → **Roles y permisos → Nuevo rol**.
2. Nombre: `Auxiliar de Coordinación`.
3. Perfil base: **Coordinador**. Desmarca los módulos que no podrá abrir, por ejemplo Autorizaciones.
4. Guarda. Abre **Usuarios**, registra un usuario de demostración con correo @miumg.edu.gt y elige el nuevo rol.
5. Inicia sesión con esa cuenta (su clave inicial es `Demo2026!`). Deben aparecer solo las rutas permitidas; una ruta no permitida debe redirigir a Inicio.
6. Un rol vinculado a cuentas no se elimina; reasigna primero sus usuarios.

## 5. Completar correo institucional

En **Usuarios, Profesores o mantenimientos de correo**, escribe solo `nombre.apellido` y pulsa **Completar @miumg.edu.gt**. Revisa el resultado y guarda.

## 6. Datos locales y futura base SQL Server

Esta versión es **solo frontend**. Los registros y solicitudes permanecen en localStorage del mismo origen/navegador; no funcionan entre equipos diferentes y no envían correos. Las cuentas y permisos locales NO protegen datos reales. El backend deberá autenticar, permitir solicitudes sin exponer claves ni usuarios, aprobar con permisos verificados, aplicar hashes lentos y salados, registrar auditoría segura y sincronizar con SQL Server.

Antes de actualizar desde una versión anterior, usa Auditoría → Exportar respaldo JSON; instala el nuevo código sin ejecutar una limpieza del almacenamiento del sitio.
