// @ts-nocheck
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const releasesRoot = path.join(appRoot, 'releases', 'android');
const defaultApk = path.join(appRoot, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');

main();

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const apkPath = path.resolve(appRoot, args.apk ?? findLatestReleaseApk() ?? defaultApk);
  if (!existsSync(apkPath)) {
    throw new Error(`APK not found: ${apkPath}`);
  }

  run('adb', ['install', '-r', apkPath]);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--apk') args.apk = readArgValue(argv, ++index, arg);
    else if (arg.startsWith('--apk=')) args.apk = arg.slice('--apk='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function readArgValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function findLatestReleaseApk() {
  if (!existsSync(releasesRoot)) return null;

  const apkFiles = [];
  walk(releasesRoot, apkFiles);
  apkFiles.sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);
  return apkFiles[0] ?? null;
}

function walk(dir, apkFiles) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, apkFiles);
    else if (entry.isFile() && entry.name.endsWith('.apk')) apkFiles.push(fullPath);
  }
}

function run(command, args) {
  console.log(`> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: appRoot,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Command failed with exit code ${result.status}: ${command} ${args.join(' ')}`);
  }
}

function printHelp() {
  console.log(`Usage:
  npm run android:release:install
  npm run android:release:install -- --apk releases/android/1.0.0+1/HubV2-android-v1.0.0-1-production-20260612.apk

Options:
  --apk <path>  APK path to install. Defaults to the latest APK in releases/android.
  --help        Show this help.
`);
}
