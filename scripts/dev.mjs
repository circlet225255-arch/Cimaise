import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const root = process.cwd();
const phpIni = join(root, 'php.ini');

function canRun(command) {
  const result = spawnSync(command, ['-v'], { stdio: 'ignore', windowsHide: true });
  return result.status === 0;
}

function findPhp() {
  const candidates = [];
  if (process.env.PHP_BIN) candidates.push(process.env.PHP_BIN);
  candidates.push(process.platform === 'win32' ? 'php.exe' : 'php');

  if (process.platform === 'win32') {
    const wingetRoot = join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
    if (existsSync(wingetRoot)) {
      for (const packageName of readdirSync(wingetRoot)) {
        if (/^PHP\.PHP\./i.test(packageName)) {
          candidates.push(join(wingetRoot, packageName, 'php.exe'));
        }
      }
    }
  }

  return candidates.find((candidate) => {
    if (candidate === 'php.exe' || candidate === 'php') return canRun(candidate);
    return existsSync(candidate) && canRun(candidate);
  });
}

const php = findPhp();
if (!php) {
  console.error('PHP 8.2+ is required. Set PHP_BIN or install PHP before running npm run dev.');
  process.exit(1);
}

const phpDir = dirname(php);
const extensionDir = process.env.PHP_EXTENSION_DIR || join(phpDir, 'ext');
const phpArgs = [];

if (existsSync(phpIni)) phpArgs.push('-c', phpIni);
const devExtensions = [
  'php_pdo_sqlite.dll',
  'php_sqlite3.dll',
  'php_fileinfo.dll',
  'php_mbstring.dll',
  'php_gd.dll',
  'php_exif.dll',
  'php_curl.dll',
  'php_intl.dll',
];
const availableExtensions = devExtensions.filter((extension) => existsSync(join(extensionDir, extension)));
if (availableExtensions.length > 0) {
  phpArgs.push('-d', `extension_dir=${extensionDir}`);
  for (const extension of availableExtensions) {
    phpArgs.push('-d', `extension=${extension}`);
  }
}

const env = {
  ...process.env,
  VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173',
};

const backend = spawn(php, [
  ...phpArgs,
  '-S', '127.0.0.1:8080',
  '-t', 'public',
  'public/router.php',
], { cwd: root, env, stdio: 'inherit', windowsHide: true });

const vite = spawn(process.execPath, [
  join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
  '--host', '127.0.0.1',
], { cwd: root, env, stdio: 'inherit', windowsHide: true });

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of [backend, vite]) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

for (const child of [backend, vite]) {
  child.on('error', (error) => {
    console.error(error.message);
    shutdown(1);
  });
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) shutdown(code || 1);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
