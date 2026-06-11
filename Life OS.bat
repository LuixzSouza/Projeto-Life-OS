@echo off
title Life OS
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo  O Node.js nao foi encontrado. Instale em https://nodejs.org e tente de novo.
  echo.
  pause
  exit /b 1
)
node "scripts\launch.mjs" %*
if errorlevel 1 pause
