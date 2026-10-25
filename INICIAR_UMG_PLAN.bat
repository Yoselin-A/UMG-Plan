@echo off
setlocal
cd /d "%~dp0"
echo ===============================================
echo       UMG PLAN - VERIFICACION Y ARRANQUE
echo ===============================================
echo.
call npm run verificar
if errorlevel 1 (
  echo.
  echo Verifica que hayas descomprimido TODOS los archivos.
  pause
  exit /b 1
)
if not exist "node_modules\.bin\vite.cmd" (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm run dev
pause
