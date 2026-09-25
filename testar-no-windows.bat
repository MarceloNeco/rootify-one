@echo off
rem Abre o RootifyONE num endereco http://localhost, que libera a criptografia do navegador.
cd /d "%~dp0"
start "" http://localhost:8098/index.html
python -m http.server 8098 2>nul || py -m http.server 8098 2>nul || node servidor-teste.js
pause
