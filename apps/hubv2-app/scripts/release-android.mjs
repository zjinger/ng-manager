// @ts-nocheck
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const androidRoot = path.join(appRoot, 'android');
const envRoot = path.join(appRoot, 'env');
const packageJsonPath = path.join(appRoot, 'package.json');
const packageLockPath = path.join(appRoot, 'package-lock.json');
const gradlePath = path.join(androidRoot, 'app', 'build.gradle');
const sourceApkPath = path.join(androidRoot, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const releasesRoot = path.join(appRoot, 'releases', 'android');

const signingKeys = [
  'HUBV2_UPLOAD_STORE_FILE',
  'HUBV2_UPLOAD_KEY_ALIAS',
  'HUBV2_UPLOAD_STORE_PASSWORD',
  'HUBV2_UPLOAD_KEY_PASSWORD',
];

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const packageJson = readJson(packageJsonPath);
  const gradleConfig = readGradleConfig();
  const envName = args.env ?? 'production';
  const currentVersionName = packageJson.version ?? gradleConfig.versionName;
  const bump = args.bump ?? (envName === 'production' ? 'patch' : 'none');
  const latestReleaseVersionCode = readLatestReleaseVersionCode();
  const versionName = args.versionName ?? bumpVersion(currentVersionName, bump);
  const versionCode = Number(args.versionCode ?? nextVersionCode(gradleConfig.versionCode, latestReleaseVersionCode));
  const envValues = readEnvFileIfExists(path.join(envRoot, `.env.${envName}`));
  const apiUrl = args.apiUrl ?? envValues.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_API_URL;

  assertBumpValue(bump);
  assertReleaseInputs({ versionName, versionCode, envName, apiUrl });
  const signingStatus = readSigningStatus();

  const releaseDate = formatDate(new Date());
  const releaseId = `${versionName}+${versionCode}`;
  const apkName = `HubV2-v${versionName}+${versionCode}-${formatEnvLabel(envName)}.apk`;
  const releaseDir = path.join(releasesRoot, releaseId);
  const releaseApkPath = path.join(releaseDir, apkName);
  const buildEnv = {
    ...process.env,
    ...envValues,
    EXPO_PUBLIC_APP_ENV: envName,
    EXPO_PUBLIC_API_URL: apiUrl,
    EXPO_PUBLIC_APP_VERSION: versionName,
    HUBV2_VERSION_NAME: versionName,
    HUBV2_VERSION_CODE: String(versionCode),
  };

  const plan = {
    app: 'Hub V2',
    platform: 'android',
    versionName,
    versionCode,
    env: envName,
    apiUrl,
    applicationId: gradleConfig.applicationId,
    releaseDir,
    apkName,
    signingConfigured: signingStatus.configured,
    releaseDate,
    version: {
      currentVersionName,
      currentVersionCode: gradleConfig.versionCode,
      latestReleaseVersionCode,
      bump,
      nextVersionName: versionName,
      nextVersionCode: versionCode,
      packageVersionWillUpdate: packageJson.version !== versionName,
    },
  };

  if (args.dryRun) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  assertSigningConfig(signingStatus);
  if (!args.yes) {
    await confirmReleasePlan(plan);
  }

  if (!args.skipChecks) {
    run(npmCommand(), ['run', 'type-check'], { cwd: appRoot, env: buildEnv });
    run(npmCommand(), ['run', 'lint'], { cwd: appRoot, env: buildEnv });
  }

  run(gradleCommand(), ['assembleRelease'], { cwd: androidRoot, env: buildEnv });

  if (!existsSync(sourceApkPath)) {
    throw new Error(`Release APK not found: ${sourceApkPath}`);
  }

  mkdirSync(releaseDir, { recursive: true });
  copyFileSync(sourceApkPath, releaseApkPath);

  const apkStats = statSync(releaseApkPath);
  const updatedVersionFiles = writeVersionFiles(versionName);
  const releaseInfo = {
    ...plan,
    apkPath: releaseApkPath,
    apkSizeBytes: apkStats.size,
    apkSha256: sha256File(releaseApkPath),
    builtAt: new Date().toISOString(),
    git: readGitInfo(),
    verification: {
      typeCheck: args.skipChecks ? 'skipped' : 'passed',
      lint: args.skipChecks ? 'skipped' : 'passed',
      assembleRelease: 'passed',
    },
    updatedVersionFiles,
  };

  writeFileSync(path.join(releaseDir, 'release.json'), `${JSON.stringify(releaseInfo, null, 2)}\n`, 'utf8');
  writeFileSync(path.join(releaseDir, 'RELEASE.md'), renderReleaseMarkdown(releaseInfo), 'utf8');

  console.log(`Android release APK created: ${releaseApkPath}`);
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--yes' || arg === '-y') args.yes = true;
    else if (arg === '--skip-checks') args.skipChecks = true;
    else if (arg === '--api-url') args.apiUrl = readArgValue(argv, ++index, arg);
    else if (arg.startsWith('--api-url=')) args.apiUrl = arg.slice('--api-url='.length);
    else if (arg === '--env') args.env = readArgValue(argv, ++index, arg);
    else if (arg.startsWith('--env=')) args.env = arg.slice('--env='.length);
    else if (arg === '--bump') args.bump = readArgValue(argv, ++index, arg);
    else if (arg.startsWith('--bump=')) args.bump = arg.slice('--bump='.length);
    else if (arg === '--no-version-bump') args.bump = 'none';
    else if (arg === '--version-name') args.versionName = readArgValue(argv, ++index, arg);
    else if (arg.startsWith('--version-name=')) args.versionName = arg.slice('--version-name='.length);
    else if (arg === '--version-code') args.versionCode = readArgValue(argv, ++index, arg);
    else if (arg.startsWith('--version-code=')) args.versionCode = arg.slice('--version-code='.length);
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

function assertReleaseInputs({ versionName, versionCode, envName, apiUrl }) {
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(versionName)) {
    throw new Error(`Invalid version name: ${versionName}`);
  }
  if (!Number.isInteger(versionCode) || versionCode < 1) {
    throw new Error(`Invalid version code: ${versionCode}`);
  }
  if (!['production', 'preview', 'development'].includes(envName)) {
    throw new Error(`Invalid app env: ${envName}`);
  }
  if (!apiUrl) {
    throw new Error('Missing API URL. Pass --api-url http://host:port/api or set EXPO_PUBLIC_API_URL.');
  }

  const parsed = new URL(apiUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('API URL must start with http:// or https://');
  }
}

function assertBumpValue(bump) {
  if (!['major', 'minor', 'patch', 'none'].includes(bump)) {
    throw new Error(`Invalid version bump: ${bump}`);
  }
}

function assertSigningConfig(signingStatus = readSigningStatus()) {
  const missingKeys = signingStatus.missingKeys;
  if (missingKeys.length > 0) {
    throw new Error(`Missing release signing config: ${missingKeys.join(', ')}`);
  }
}

function readSigningStatus() {
  const localProperties = readLocalProperties(path.join(androidRoot, 'local.properties'));
  const missingKeys = signingKeys.filter((key) => !readConfigValue(key, localProperties));
  return {
    configured: missingKeys.length === 0,
    missingKeys,
  };
}

function readConfigValue(key, localProperties) {
  return process.env[key] || localProperties[key];
}

function readLocalProperties(filePath) {
  if (!existsSync(filePath)) return {};

  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((acc, line) => {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) return acc;
      acc[line.slice(0, separatorIndex).trim()] = line.slice(separatorIndex + 1).trim();
      return acc;
    }, {});
}

function readGradleConfig() {
  const content = readFileSync(gradlePath, 'utf8');
  return {
    applicationId: matchGradleValue(content, /applicationId\s+['"]([^'"]+)['"]/),
    versionName: matchGradleValue(content, /versionName\s+['"]([^'"]+)['"]/, '1.0.0'),
    versionCode: Number(matchGradleValue(content, /versionCode\s+(\d+)/, '1')),
  };
}

function matchGradleValue(content, pattern, fallback = null) {
  const match = content.match(pattern);
  if (match) return match[1];
  if (fallback !== null) return fallback;
  throw new Error(`Unable to read Gradle value with pattern: ${pattern}`);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function readEnvFileIfExists(filePath) {
  if (!existsSync(filePath)) return {};

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

function readLatestReleaseVersionCode() {
  if (!existsSync(releasesRoot)) return null;

  return readdirSync(releasesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const match = entry.name.match(/\+(\d+)$/);
      return match ? Number(match[1]) : null;
    })
    .filter((value) => Number.isInteger(value))
    .reduce((max, value) => Math.max(max, value), 0) || null;
}

function nextVersionCode(gradleVersionCode, latestReleaseVersionCode) {
  return Math.max(Number(gradleVersionCode) || 1, Number(latestReleaseVersionCode) || 0) + 1;
}

function bumpVersion(versionName, bump) {
  if (bump === 'none') return versionName;

  const match = versionName.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Cannot auto bump non-standard version name: ${versionName}`);
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);

  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function formatEnvLabel(envName) {
  return {
    development: 'dev',
    preview: 'preview',
    production: 'prod',
  }[envName] ?? envName;
}

async function confirmReleasePlan(plan) {
  if (!process.stdin.isTTY) {
    throw new Error('Release confirmation required. Pass --yes to run non-interactively.');
  }

  console.log(renderReleasePlan(plan));
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await readline.question('确认构建该 Android release APK？输入 y 继续: ');
    if (!/^y(es)?$/i.test(answer.trim())) {
      throw new Error('Release cancelled.');
    }
  } finally {
    readline.close();
  }
}

function renderReleasePlan(plan) {
  return `
Android release plan

- App: ${plan.app}
- Environment: ${plan.env}
- API URL: ${plan.apiUrl}
- Current versionName: ${plan.version.currentVersionName}
- Current Gradle versionCode: ${plan.version.currentVersionCode}
- Latest release versionCode: ${plan.version.latestReleaseVersionCode ?? 'none'}
- Bump: ${plan.version.bump}
- Next versionName: ${plan.version.nextVersionName}
- Next versionCode: ${plan.version.nextVersionCode}
- APK: ${plan.apkName}
- Output: ${plan.releaseDir}
- Signing configured: ${plan.signingConfigured ? 'yes' : 'no'}
- package.json will update: ${plan.version.packageVersionWillUpdate ? 'yes' : 'no'}
`;
}

function writeVersionFiles(versionName) {
  const updatedFiles = [];
  const packageJson = readJson(packageJsonPath);

  if (packageJson.version !== versionName) {
    packageJson.version = versionName;
    writeJson(packageJsonPath, packageJson);
    updatedFiles.push('package.json');
  }

  if (existsSync(packageLockPath)) {
    const packageLock = readJson(packageLockPath);
    let changed = false;

    if (packageLock.version !== versionName) {
      packageLock.version = versionName;
      changed = true;
    }
    if (packageLock.packages?.['']?.version !== versionName) {
      packageLock.packages[''].version = versionName;
      changed = true;
    }

    if (changed) {
      writeJson(packageLockPath, packageLock);
      updatedFiles.push('package-lock.json');
    }
  }

  return updatedFiles;
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function run(command, args, options) {
  console.log(`> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    ...options,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Command failed with exit code ${result.status}: ${command} ${args.join(' ')}`);
  }
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function gradleCommand() {
  return process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function sha256File(filePath) {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

function readGitInfo() {
  return {
    commit: readCommandOutput('git', ['rev-parse', 'HEAD']),
    shortCommit: readCommandOutput('git', ['rev-parse', '--short', 'HEAD']),
    dirty: Boolean(readCommandOutput('git', ['status', '--short'])),
  };
}

function readCommandOutput(command, args) {
  const result = spawnSync(command, args, { cwd: appRoot, encoding: 'utf8' });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function renderReleaseMarkdown(info) {
  return `# Hub V2 Android Release ${info.versionName}+${info.versionCode}

- App: ${info.app}
- Platform: ${info.platform}
- Environment: ${info.env}
- API URL: ${info.apiUrl}
- Application ID: ${info.applicationId}
- APK: ${info.apkName}
- Size: ${info.apkSizeBytes} bytes
- SHA-256: ${info.apkSha256}
- Built At: ${info.builtAt}
- Git Commit: ${info.git.shortCommit ?? 'unknown'}
- Git Dirty: ${info.git.dirty ? 'yes' : 'no'}
- Updated Version Files: ${info.updatedVersionFiles.length > 0 ? info.updatedVersionFiles.join(', ') : 'none'}

## Verification

- type-check: ${info.verification.typeCheck}
- lint: ${info.verification.lint}
- assembleRelease: ${info.verification.assembleRelease}
`;
}

function printHelp() {
  console.log(`Usage:
  npm run android:release -- --api-url http://host:port/api

Options:
  --api-url <url>          Hub V2 API base URL. Required unless EXPO_PUBLIC_API_URL is set.
  --env <name>             App env. Defaults to production.
  --bump <type>            Auto bump versionName: major, minor, patch, none. Defaults to patch for production, none otherwise.
  --no-version-bump        Alias for --bump none.
  --version-name <version> Android versionName and Expo app version. Overrides auto bump.
  --version-code <number>  Android versionCode. Overrides auto increment.
  --yes, -y                Skip interactive release confirmation.
  --skip-checks            Skip npm type-check and lint.
  --dry-run                Print release plan without building.
  --help                   Show this help.
`);
}
