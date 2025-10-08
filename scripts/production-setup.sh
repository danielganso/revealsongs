#!/bin/bash

# 🔧 Script de Configuração Inicial para Produção - RevealSongs
# Execute este script apenas na primeira configuração da VPS

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Verificar se é root ou tem sudo
if [ "$EUID" -ne 0 ]; then
    if ! sudo -n true 2>/dev/null; then
        error "Este script precisa ser executado como root ou com sudo"
    fi
fi

log "🔧 Configurando ambiente de produção para RevealSongs..."

# Atualizar sistema
log "📦 Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
log "📋 Instalando dependências básicas..."
sudo apt install -y curl wget git build-essential software-properties-common

# Instalar Node.js 18+
log "📦 Instalando Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar versões
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
log "✅ Node.js instalado: $NODE_VERSION"
log "✅ NPM instalado: $NPM_VERSION"

# Instalar PM2 globalmente
log "🚀 Instalando PM2..."
sudo npm install -g pm2

# Instalar Nginx
log "🌐 Instalando Nginx..."
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Configurar firewall básico
log "🛡️ Configurando firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Criar diretório do projeto
log "📁 Criando diretório do projeto..."
sudo mkdir -p /var/www/revealsongs
sudo chown -R $USER:$USER /var/www/revealsongs

# Criar diretório de logs
log "📊 Configurando logs..."
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# Configurar logrotate para PM2
log "🔄 Configurando rotação de logs..."
sudo tee /etc/logrotate.d/pm2 > /dev/null <<EOF
/var/log/pm2/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Instalar ferramentas úteis
log "🛠️ Instalando ferramentas úteis..."
sudo apt install -y htop tree jq unzip

# Configurar Git (se necessário)
if ! git config --global user.name > /dev/null 2>&1; then
    warning "Configure o Git com suas informações:"
    info "git config --global user.name 'Seu Nome'"
    info "git config --global user.email 'seu@email.com'"
fi

# Otimizações de sistema
log "⚡ Aplicando otimizações de sistema..."

# Aumentar limites de arquivos abertos
sudo tee -a /etc/security/limits.conf > /dev/null <<EOF
* soft nofile 65536
* hard nofile 65536
EOF

# Otimizações de rede
sudo tee -a /etc/sysctl.conf > /dev/null <<EOF
# Otimizações para aplicações Node.js
net.core.somaxconn = 65536
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.ip_local_port_range = 1024 65535
EOF

# Aplicar configurações
sudo sysctl -p

# Configurar swap (se não existir)
if [ ! -f /swapfile ]; then
    log "💾 Configurando swap..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# Instalar Certbot para SSL
log "🔒 Instalando Certbot para SSL..."
sudo apt install -y certbot python3-certbot-nginx

# Configurar cron para renovação automática de SSL
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

log "✅ Configuração inicial concluída!"

info "📋 Próximos passos:"
info "1. Clone seu repositório em /var/www/revealsongs"
info "2. Configure as variáveis de ambiente (.env.local)"
info "3. Execute o script de deploy (./deploy.sh)"
info "4. Configure o Nginx para seu domínio"
info "5. Configure SSL com: sudo certbot --nginx -d seudominio.com"

log "🎉 Servidor pronto para receber a aplicação RevealSongs!"