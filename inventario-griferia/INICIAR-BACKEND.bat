@echo off
title RKA - Backend
cd /d "%~dp0backend"
echo Instalando dependencias (solo la primera vez)...
call npm install
echo.
echo Iniciando API RKA en http://localhost:3000
echo Frontend: http://localhost:3000/index.html
echo.
call npm start
pause
