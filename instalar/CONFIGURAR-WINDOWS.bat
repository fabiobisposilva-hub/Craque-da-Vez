@echo off
chcp 65001 >nul
title Craque da Vez - configuracao
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Falta instalar o Node.js no computador.
  echo Vou abrir o site. Baixe a versao LTS, instale com Avancar-Avancar-Concluir
  echo e depois dê dois cliques neste arquivo de novo.
  start "" "https://nodejs.org/pt"
  pause
  exit /b 1
)
node instalar\configurar.mjs
