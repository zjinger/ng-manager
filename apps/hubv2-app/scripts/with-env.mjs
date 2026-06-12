// @ts-nocheck
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envRoot = path.join(appRoot, 'env');

main();

function main() {
  const [envName, separator, ...commandArgs] = process.argv.slice(2);

  if (!envName || envName === '--help' || envName === '-h') {
    printHelp();
    return;
  }

  if (separator !== '--' || commandArgs.length === 0) {
    throw new Error('Missing command. Use: node scripts/with-env.mjs <env> -- <command>');
  }

  const envFilePath = path.join(envRoot, `.env.${envName}`);
  if (!existsSync(envFilePath)) {
    throw new Error(`Environment file not found: ${envFilePath}`);
  }

  const envValues = readEnvFile(envFilePath);
  const [command, ...args] = commandArgs;

  console.log(`> ${command} ${args.join(' ')} [env=${envName}]`);
  const result = spawnSync(command, args, {
    cwd: appRoot,
    env: {
      ...process.env,
      ...envValues,
    },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

function readEnvFile(filePath) {
  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((acc, line) => {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) return acc;

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      acc[key] = unquote(value);
      return acc;
    }, {});
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function printHelp() {
  console.log(`Usage:
  node scripts/with-env.mjs development -- expo start --dev-client
  node scripts/with-env.mjs preview -- expo run:android
  node scripts/with-env.mjs production -- npm run android:release
`);
}
