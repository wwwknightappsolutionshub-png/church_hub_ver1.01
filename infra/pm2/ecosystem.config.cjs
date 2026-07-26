/**
 * PM2 — Church Hub on aaPanel VPS (native Postgres/Redis on 127.0.0.1).
 *
 * Start:  pm2 start ecosystem.config.cjs
 * Reload: pm2 reload ecosystem.config.cjs --update-env
 * After SMTP/.env changes, prefer delete+start so the live process gets env:
 *   pm2 delete church-hub-api church-hub-web
 *   pm2 start infra/pm2/ecosystem.config.cjs --update-env && pm2 save
 */
const path = require('path');
const { loadChurchHubEnv } = require('./load-env.cjs');

const root = process.env.CHURCHHUB_ROOT || path.resolve(__dirname, '../..');
const webStandalone = path.join(root, 'apps/web/.next/standalone/apps/web');
const shared = loadChurchHubEnv(root);

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
        ...shared,
      },
    },
    {
      name: 'church-hub-web',
      cwd: webStandalone,
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '700M',
      merge_logs: true,
      error_file: path.join(root, 'logs/church-hub-web-error.log'),
      out_file: path.join(root, 'logs/church-hub-web-out.log'),
      env: {
        ...shared,
        PORT: '3003',
        HOSTNAME: '127.0.0.1',
      },
    },
  ],
};
