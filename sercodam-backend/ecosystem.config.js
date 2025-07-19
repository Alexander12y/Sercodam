module.exports = {
  apps: [
    {
      name: 'sercodam-backend',
      script: './src/server.js',
      cwd: './sercodam-backend',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 4000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'temp',
        '*.log'
      ],
      // Configuración de logs
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Configuración de monitoreo
      pmx: true,
      // Configuración de health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true
    }
  ],

  deploy: {
    production: {
      user: 'sercodam',
      host: 'your-vps-ip',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/sercodam-op.git',
      path: '/var/www/sercodam-op',
      'pre-deploy-local': '',
      'post-deploy': 'npm install --production && npm run migrate && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    staging: {
      user: 'sercodam',
      host: 'your-vps-ip',
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/sercodam-op.git',
      path: '/var/www/sercodam-op-staging',
      'pre-deploy-local': '',
      'post-deploy': 'npm install --production && npm run migrate && npm run seed && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': ''
    }
  }
};

