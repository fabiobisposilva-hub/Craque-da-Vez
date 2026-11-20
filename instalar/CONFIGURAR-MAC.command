#!/bin/bash
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then
  echo "Falta instalar o Node.js. Vou abrir o site: baixe a versão LTS, instale e rode este arquivo de novo."
  open "https://nodejs.org/pt"
  read -p "Aperte ENTER para fechar."
  exit 1
fi
node instalar/configurar.mjs
