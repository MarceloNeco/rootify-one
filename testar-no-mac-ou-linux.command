#!/bin/bash
# Abre o RootifyONE num endereco http://localhost, que libera a criptografia do navegador.
cd "$(dirname "$0")"
( sleep 1; open "http://localhost:8098/index.html" 2>/dev/null || \
  xdg-open "http://localhost:8098/index.html" 2>/dev/null ) &
python3 -m http.server 8098 || node servidor-teste.js
