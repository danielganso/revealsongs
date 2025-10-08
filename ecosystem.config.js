module.exports = {
  apps: [
    {
      name: 'revealsongs',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/revealsongs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3012
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3012
      },
      // Configurações de log
      log_file: '/var/log/pm2/revealsongs.log',
      out_file: '/var/log/pm2/revealsongs-out.log',
      error_file: '/var/log/pm2/revealsongs-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Configurações de restart
      watch: false,
      ignore_watch: ['node_modules', '.next', 'logs'],
      max_memory_restart: '1G',
      
      // Configurações de restart automático
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Configurações de merge de logs
      merge_logs: true,
      
      // Configurações de tempo
      kill_timeout: 5000,
      listen_timeout: 8000,
      
      // Variáveis de ambiente específicas (ajuste conforme necessário)
      env_vars: {
        // Adicione suas variáveis de ambiente aqui
        // SUPABASE_URL: 'sua_url_supabase',
        // SUPABASE_ANON_KEY: 'sua_chave_anonima',
        // NEXTAUTH_SECRET: 'seu_nextauth_secret',
        // NEXTAUTH_URL: 'https://seudominio.com'
      }
    }
  ]
};