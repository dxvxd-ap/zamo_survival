@echo off
title Iniciar Croco Survival
echo ===================================================
echo     Iniciando servidor para Croco Survival
echo ===================================================
echo.
echo Abriendo http://localhost:8000 en tu navegador...
start http://localhost:8000
python -m http.server 8000
pause
