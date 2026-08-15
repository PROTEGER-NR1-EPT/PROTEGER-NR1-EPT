#!/usr/bin/env bash
set -e

echo "==> Configurando ambiente do PROTEGER-NR1 EPT..."

# --- Backend (Python/Flask) ---
if [ -f "backend/requirements.txt" ]; then
  echo "==> Instalando dependências do backend..."
  pip install -r backend/requirements.txt
else
  echo "!! backend/requirements.txt não encontrado, pulando instalação do backend."
fi

if [ -f "backend/.env.example" ] && [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  echo "==> Criado backend/.env a partir do .env.example"
fi

# --- Frontend (React/Vite) ---
if [ -f "frontend/package.json" ]; then
  echo "==> Instalando dependências do frontend..."
  (cd frontend && npm install)
else
  echo "!! frontend/package.json não encontrado, pulando instalação do frontend."
fi

if [ -f "frontend/.env.example" ] && [ ! -f "frontend/.env" ]; then
  cp frontend/.env.example frontend/.env
  echo "==> Criado frontend/.env a partir do .env.example"
fi

echo "==> Ambiente pronto! Bancos locais disponíveis: anonimo_db, auth_db, memoria_db (porta 5432)"
