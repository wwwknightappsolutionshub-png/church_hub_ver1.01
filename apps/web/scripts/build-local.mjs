/**
 * Windows-friendly production build without Next standalone output
 * (avoids EPERM on symlink creation without Developer Mode).
 */
import { spawnSync } from 'node:child_process';

process.env.NEXT_STANDALONE = '0';
const result = spawnSync('next', ['build'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});
process.exit(result.status ?? 1);
