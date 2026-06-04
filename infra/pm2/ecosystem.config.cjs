/**
 * PM2 — Church Hub on aaPanel VPS (native Postgres/Redis on 127.0.0.1).
 *
 * Start:  pm2 start ecosystem.config.cjs
 * Reload: pm2 reload ecosystem.config.cjs --update-env
 */
const path = require('path');

const root = process.env.CHURCHHUB_ROOT || path.resolve(__dirname, '../..');

module.exports = {
  apps: [
    {
      name: 'church-hub-api',
      cwd: path.join(root, 'apps/api'),
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '600M',
      merge_logs: true,
      error_file: path.join(root, 'logs/church-hub-api-error.log'),
      out_file: path.join(root, 'logs/church-hub-api-out.log'),
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'church-hub-web',
      cwd: path.join(root, 'apps/web'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3003 -H 127.0.0.1',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '700M',
      merge_logs: true,
      error_file: path.join(root, 'logs/church-hub-web-error.log'),
      out_file: path.join(root, 'logs/church-hub-web-out.log'),
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
