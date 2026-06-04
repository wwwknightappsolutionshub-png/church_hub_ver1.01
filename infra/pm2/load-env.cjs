const fs = require('fs');
const path = require('path');

/** Minimal .env parser for ecosystem.config.cjs (no dotenv dependency). */
function loadEnvFile(envPath) {
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function loadChurchHubEnv(root) {
  const file = path.join(root, '.env');
  const fileEnv = loadEnvFile(file);
  const pick = (key, fallback) => process.env[key] || fileEnv[key] || fallback;
  return {
    NODE_ENV: pick('NODE_ENV', 'production'),
    DATABASE_URL: pick('DATABASE_URL', ''),
    SERVER_API_URL: pick('SERVER_API_URL', 'http://127.0.0.1:4000'),
    API_PORT: pick('API_PORT', '4000'),
    NEXT_PUBLIC_API_URL: pick('NEXT_PUBLIC_API_URL', ''),
    NEXT_PUBLIC_APP_URL: pick('NEXT_PUBLIC_APP_URL', ''),
  };
}

module.exports = { loadChurchHubEnv };
