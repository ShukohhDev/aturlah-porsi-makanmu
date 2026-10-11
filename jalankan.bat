@echo off
title Aturlah Porsi Makanmu
cd /d "%~dp0"
echo Memulai server Aturlah Porsi Makanmu...
start http://localhost:3000
node server.js
pause
