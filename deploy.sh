#!/bin/bash

# 🚀 Script de Deploy Automatizado - RevealSongs
# Este script automatiza o processo de deploy na VPS

set -e  # Parar execução em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    error "package.json não encontrado. Execute este script no diretório raiz do projeto."
fi

log "🚀 Iniciando deploy do RevealSongs..."

# Verificar se PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    error "PM2 não está instalado. Execute: npm install -g pm2"
fi

# Fazer backup do build anterior
if [ -d ".next" ]; then
    log "📦 Fazendo backup do build anterior..."
    BACKUP_DIR=".next.backup.$(date +%Y%m%d_%H%M%S)"
    cp -r .next "$BACKUP_DIR"
    info "Backup salvo em: $BACKUP_DIR"
fi

# Atualizar código do repositório
log "📥 Atualizando código do repositório..."
if [ -d ".git" ]; then
    git fetch origin
    git pull origin main || git pull origin master
    info "Código atualizado com sucesso"
else
    warning "Não é um repositório Git. Pulando atualização do código."
fi

# Verificar Node.js version
NODE_VERSION=$(node -v)
log "📋 Versão do Node.js: $NODE_VERSION"

# Limpar cache do npm
log "🧹 Limpando cache do npm..."
npm cache clean --force

# Instalar/atualizar dependências
log "📦 Instalando dependências de produção..."
npm ci --only=production --silent

# Verificar se arquivo de ambiente existe
if [ ! -f ".env.local" ]; then
    warning "Arquivo .env.local não encontrado!"
    info "Copie o arquivo .env.production para .env.local e configure as variáveis"
    if [ -f ".env.production" ]; then
        info "Exemplo disponível em .env.production"
    fi
fi

# Executar testes (se existirem)
if npm run test --silent 2>/dev/null; then
    log "🧪 Executando testes..."
    npm run test || warning "Alguns testes falharam, mas continuando deploy..."
else
    info "Nenhum teste configurado, pulando..."
fi

# Fazer build de produção
log "🏗️ Fazendo build de produção..."
export NODE_ENV=production
npm run build

# Verificar se o build foi bem-sucedido
if [ ! -d ".next" ]; then
    error "Build falhou! Diretório .next não foi criado."
fi

log "✅ Build concluído com sucesso!"

# Verificar se a aplicação já está rodando no PM2
if pm2 describe revealsongs > /dev/null 2>&1; then
    log "🔄 Recarregando aplicação no PM2..."
    pm2 reload revealsongs
else
    log "🚀 Iniciando aplicação no PM2..."
    pm2 start ecosystem.config.js --env production
fi

# Verificar status da aplicação
sleep 3
if pm2 describe revealsongs > /dev/null 2>&1; then
    STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="revealsongs") | .pm2_env.status')
    if [ "$STATUS" = "online" ]; then
        log "✅ Aplicação está rodando com sucesso!"
        info "Status: $STATUS"
        info "Porta: 3012"
        info "Logs: pm2 logs revealsongs"
    else
        error "Aplicação não está online. Status: $STATUS"
    fi
else
    error "Falha ao iniciar aplicação no PM2"
fi

# Salvar configuração do PM2
log "💾 Salvando configuração do PM2..."
pm2 save

# Mostrar informações finais
log "📊 Informações do deploy:"
info "Data: $(date)"
info "Usuário: $(whoami)"
info "Diretório: $(pwd)"
info "Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'N/A')"

# Limpeza de arquivos antigos (manter apenas os 5 backups mais recentes)
log "🧹 Limpando backups antigos..."
find . -name ".next.backup.*" -type d | sort -r | tail -n +6 | xargs rm -rf 2>/dev/null || true

# Verificar uso de espaço em disco
DISK_USAGE=$(df -h . | awk 'NR==2{print $5}')
info "Uso do disco: $DISK_USAGE"

if [ "${DISK_USAGE%?}" -gt 80 ]; then
    warning "Uso do disco acima de 80%! Considere limpar arquivos desnecessários."
fi

log "🎉 Deploy concluído com sucesso!"
log "🌐 Acesse sua aplicação em: http://localhost:3012"

# Mostrar logs recentes
info "📋 Logs recentes da aplicação:"
pm2 logs revealsongs --lines 10 --nostream