# UMG Plan — Versión corregida (archivos completos)

Este paquete contiene todos los archivos del frontend React + Vite, incluidos los cuatro que el proyecto UMGPlan2 no pudo importar (`Maintenance.jsx`, `AdvancedUI.jsx`, `repository.mjs`, `logoData.js`).

## Instalación recomendada (Windows)

1. **Detén el servidor anterior** con `Ctrl + C` en VS Code.
2. **NO copies archivos sobre `UMGPlan2`.** Extrae este ZIP completo en una carpeta NUEVA, por ejemplo `C:\Proyectos\UMGPlan-CORREGIDO`.
3. Abre **la carpeta que contiene `package.json`** en VS Code. No abras únicamente `src`.
4. Abre una terminal en esa carpeta y ejecuta:

```powershell
npm install
npm run verificar
npm run dev
```

5. Abre `http://localhost:5173/`.

`npm run verificar` se ejecuta también automáticamente antes de `npm run dev` y `npm run build`. Si hay archivos faltantes, muestra su nombre antes de iniciar Vite.

Si vas a ejecutar dos versiones, detén la anterior para evitar que Vite utilice otro puerto. Si el navegador conserva datos del sitio en `localStorage`, haz primero un respaldo JSON desde la versión que funcione. **No borres los datos del sitio** por este error: no lo requiere.

## Comprobaciones

- Se comprobó el contenido del ZIP: los módulos críticos están incluidos.
- `npm run verificar` comprueba la existencia de todas las importaciones locales.
- `npm test` ejecuta las pruebas de lógica del proyecto.
- Recomendación: ejecutar `npm run build` después de `npm install` para confirmar la compilación final en tu equipo.

Este frontend guarda datos en `localStorage` sin conectarse aún a SQL Server. Las contraseñas demo y la recuperación local no están listas para producción pública.

## Si el error persiste

En VS Code, ejecuta:

```powershell
Get-Location
Test-Path .\src\pages\Maintenance.jsx
Test-Path .\src\components\AdvancedUI.jsx
Test-Path .\src\lib\repository.mjs
Test-Path .\src\lib\logoData.js
```

Las cuatro comprobaciones deben devolver `True`. Si alguna es `False`, estás en la carpeta incorrecta o la extracción no fue completa.
