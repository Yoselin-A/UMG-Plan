# Comprobaciones técnicas — UMG Plan frontend local

- Archivos JS/JSX/MJS analizados mediante parser TypeScript: sin errores sintácticos detectados.
- Importaciones relativas verificadas contra archivos existentes: sin rutas faltantes.
- Pruebas unitarias `npm test`: 54 de 54 aprobadas, incluidas comprobaciones de catálogos, autorizaciones, referencias, correos demo y PDFs.
- PDF de tabla probado (A4 horizontal) y verificado mediante `pdfinfo` y renderización PNG.
- Chat: comprobación estática de ausencia de controles de edición y eliminación.
- **No se pudo ejecutar `npm run build` en este contenedor**: `npm install` agotó el tiempo de espera sin descargar paquetes. Es necesario ejecutar `npm install`, `npm test` y `npm run build` en el equipo del usuario para completar la verificación de ejecución con Vite.
- No se conectó ni modificó SQL Server.
- Los permisos de frontend no sustituyen controles de seguridad del servidor.
