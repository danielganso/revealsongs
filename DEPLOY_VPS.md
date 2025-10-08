# 🚀 Deploy do RevealSongs na VPS

Este guia fornece um passo a passo completo para fazer o deploy da aplicação RevealSongs em uma VPS usando PM2.

## 📋 Pré-requisitos

- VPS com Ubuntu 20.04+ ou CentOS 7+
- Acesso root ou sudo
- Domínio configurado (opcional)
- Node.js 18+ instalado
- PM2 instalado globalmente
- Nginx instalado (para proxy reverso)

## 🛠️ Passo 1: Preparar o Servidor

### 1.1 Atualizar o sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Instalar Node.js 18+
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 1.3 Instalar PM2 globalmente
```bash
sudo npm install -g pm2
```

### 1.4 Instalar Nginx
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

## 📁 Passo 2: Preparar o Projeto

### 2.1 Criar diretório do projeto
```bash
sudo mkdir -p /var/www/revealsongs
sudo chown -R $USER:$USER /var/www/revealsongs
```

### 2.2 Clonar o repositório
```bash
cd /var/www/revealsongs
git clone <URL_DO_SEU_REPOSITORIO> .
```

### 2.3 Instalar dependências
```bash
npm install
```

## 🔧 Passo 3: Configurar Variáveis de Ambiente

### 3.1 Criar arquivo .env.local
```bash
cp .env.example .env.local
nano .env.local
```

### 3.2 Configurar as variáveis necessárias
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

# NextAuth
NEXTAUTH_SECRET=seu_nextauth_secret_muito_seguro
NEXTAUTH_URL=https://seudominio.com

# OpenAI
OPENAI_API_KEY=sua_chave_openai

# Stripe (se aplicável)
STRIPE_SECRET_KEY=sua_chave_stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=sua_chave_publica_stripe

# Outras configurações
NODE_ENV=production
PORT=3012
```

## 🏗️ Passo 4: Build da Aplicação

### 4.1 Fazer o build de produção
```bash
npm run build
```

### 4.2 Verificar se o build foi bem-sucedido
```bash
ls -la .next/
```

## 🚀 Passo 5: Configurar PM2

### 5.1 O arquivo ecosystem.config.js já foi criado
O arquivo `ecosystem.config.js` já está configurado para rodar na porta 3012 em modo fork.

### 5.2 Iniciar a aplicação com PM2
```bash
pm2 start ecosystem.config.js --env production
```

### 5.3 Verificar status
```bash
pm2 status
pm2 logs revealsongs
```

### 5.4 Salvar configuração do PM2
```bash
pm2 save
pm2 startup
```

## 🌐 Passo 6: Configurar Nginx (Proxy Reverso)

### 6.1 Criar configuração do site
```bash
sudo nano /etc/nginx/sites-available/revealsongs
```

### 6.2 Adicionar configuração
```nginx
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;

    location / {
        proxy_pass http://localhost:3012;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Configurações para arquivos estáticos
    location /_next/static/ {
        proxy_pass http://localhost:3012;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable";
    }

    # Configurações de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

### 6.3 Ativar o site
```bash
sudo ln -s /etc/nginx/sites-available/revealsongs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Passo 7: Configurar SSL (Opcional mas Recomendado)

### 7.1 Instalar Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 7.2 Obter certificado SSL
```bash
sudo certbot --nginx -d seudominio.com -d www.seudominio.com
```

## 📊 Passo 8: Configurar Logs e Monitoramento

### 8.1 Criar diretório de logs
```bash
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2
```

### 8.2 Configurar rotação de logs
```bash
sudo nano /etc/logrotate.d/pm2
```

Adicionar:
```
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
```

## 🔄 Passo 9: Scripts de Deploy Automático

### 9.1 Criar script de deploy
```bash
nano deploy.sh
```

```bash
#!/bin/bash
echo "🚀 Iniciando deploy do RevealSongs..."

# Fazer backup
echo "📦 Fazendo backup..."
cp -r .next .next.backup.$(date +%Y%m%d_%H%M%S)

# Atualizar código
echo "📥 Atualizando código..."
git pull origin main

# Instalar dependências
echo "📦 Instalando dependências..."
npm ci --only=production

# Build da aplicação
echo "🏗️ Fazendo build..."
npm run build

# Reiniciar PM2
echo "🔄 Reiniciando aplicação..."
pm2 reload revealsongs

echo "✅ Deploy concluído com sucesso!"
```

### 9.2 Tornar executável
```bash
chmod +x deploy.sh
```

## 🔧 Comandos Úteis de Manutenção

### Verificar status da aplicação
```bash
pm2 status
pm2 logs revealsongs
pm2 monit
```

### Reiniciar aplicação
```bash
pm2 restart revealsongs
```

### Parar aplicação
```bash
pm2 stop revealsongs
```

### Ver logs em tempo real
```bash
pm2 logs revealsongs --lines 100
```

### Verificar uso de recursos
```bash
pm2 show revealsongs
```

## 🛡️ Configurações de Segurança Adicionais

### Firewall
```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Fail2Ban (opcional)
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 📝 Checklist Final

- [ ] Servidor atualizado e configurado
- [ ] Node.js 18+ instalado
- [ ] PM2 instalado e configurado
- [ ] Projeto clonado e dependências instaladas
- [ ] Variáveis de ambiente configuradas
- [ ] Build de produção realizado
- [ ] PM2 iniciado e funcionando
- [ ] Nginx configurado como proxy reverso
- [ ] SSL configurado (se aplicável)
- [ ] Logs configurados
- [ ] Scripts de deploy criados
- [ ] Firewall configurado

## 🆘 Troubleshooting

### Aplicação não inicia
```bash
pm2 logs revealsongs
npm run build
```

### Erro de permissões
```bash
sudo chown -R $USER:$USER /var/www/revealsongs
```

### Nginx não consegue conectar
```bash
sudo nginx -t
sudo systemctl status nginx
netstat -tlnp | grep :3012
```

### Problemas com SSL
```bash
sudo certbot renew --dry-run
```

---

**🎉 Parabéns! Sua aplicação RevealSongs está agora rodando em produção na porta 3012!**

Para acessar: `http://seudominio.com` ou `https://seudominio.com` (se SSL configurado)