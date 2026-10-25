# Recuperación de acceso: flujo vigente de UMG Plan 4.2

El flujo anterior de mostrar un código de recuperación **se sustituyó** por una solicitud de cambio de contraseña revisada por el Administrador.

1. En login pulsa **¿Olvidaste tu contraseña? Solicitar cambio**.
2. Escribe usuario/correo, contraseña nueva y confirmación. Verifica los cinco requisitos y envía.
3. En la cuenta `admin`, abre **Solicitudes de contraseña** y revisa el detalle. Comprueba la identidad por un canal independiente, marca la confirmación y autoriza o deniega.
4. Si se autoriza, vuelve a iniciar sesión con la nueva contraseña; si se deniega, conserva la anterior.
5. Una segunda solicitud de la misma cuenta se bloquea mientras siga pendiente.

**Seguridad:** únicamente demostración con localStorage; los códigos/hash de la contraseña propuesta NO se envían por correo ni a servidor, y la solicitud no verifica la identidad del solicitante. Para producción se necesita backend seguro, hash robusto en servidor, políticas de acceso y notificaciones autenticadas.
