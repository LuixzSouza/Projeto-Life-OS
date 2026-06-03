@echo off
title Fechar Life OS
cd /d "%~dp0"
node "scripts\stop.mjs"
timeout /t 2 >nul
