import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const nextCli = join(frontendDirectory, 'node_modules', 'next', 'dist', 'bin', 'next');
const server = spawn(
  process.execPath,
  [nextCli, 'dev', '--port', '3001'],
  {
    env: { ...process.env, NEXT_DIST_DIR: '.next-admin' },
    stdio: 'inherit',
  }
);

server.on('error', (error) => {
  console.error('Unable to start the admin portal development server:', error);
  process.exitCode = 1;
});

server.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
