// scripts/deploy-server.js
/**
 * 1 本地 build
 * 2 打包 build/* -> ngm-hub.tar.gz
 * 3 scp 上传 tar.gz
 * 4 scp 上传 remote-deploy.sh rollback.sh clean-old-releases.sh
 * 5 ssh 执行 remote-deploy.sh
 * 6 remote-deploy.sh 启动 pm2
 */

const { execSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const HUB_ROOT = path.resolve(__dirname, "..");
const SCRIPTS_DIR = path.join(HUB_ROOT, "scripts");
const BUILD_DIR = path.join(HUB_ROOT, "build");
const ARCHIVE_NAME = "ngm-hub.tar.gz";
const ARCHIVE_PATH = path.join(HUB_ROOT, ARCHIVE_NAME);

const rawCfg = require("./deploy-config.json");

function run(cmd, options = {}) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, {
    stdio: "inherit",
    cwd: HUB_ROOT,
    ...options
  });
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    target: "prod",
    skipBuild: false
  };

  for (const arg of args) {
    if (arg.startsWith("--target=")) {
      result.target = arg.split("=")[1];
    } else if (arg === "--skip-build") {
      result.skipBuild = true;
    }
  }

  return result;
}

function ensureExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

function getTargetConfig(targetName) {
  const cfg = rawCfg.targets?.[targetName];
  if (!cfg) {
    throw new Error(`Unknown deploy target: ${targetName}`);
  }

  const { host, user, port = 22, dir = "/opt/ngm-hub" } = cfg;

  if (!host || !user) {
    throw new Error(`Invalid target config "${targetName}"`);
  }

  return { name: targetName, host, user, port, dir };
}

function ensureBuild(skipBuild) {
  if (skipBuild) {
    console.log("[deploy] skip build");
  } else {
    run("node ./scripts/build-all.js");
  }

  ensureExists(BUILD_DIR, "build dir");
  ensureExists(path.join(BUILD_DIR, "index.js"), "build entry index.js");
  ensureExists(path.join(BUILD_DIR, "package.json"), "build package.json");
  ensureExists(path.join(BUILD_DIR, "ecosystem.config.cjs"), "build ecosystem.config.cjs");
}

function resolvePackListFromBuild() {
  const entries = fs.readdirSync(BUILD_DIR);
  if (!entries.length) {
    throw new Error(`build dir is empty: ${BUILD_DIR}`);
  }
  return entries;
}

function createArchive() {
  if (fs.existsSync(ARCHIVE_PATH)) {
    fs.unlinkSync(ARCHIVE_PATH);
  }

  const packList = resolvePackListFromBuild();

  console.log("[deploy] pack files from build:");
  for (const item of packList) {
    console.log(`  - ${item}`);
  }

  // 关键点：从 build 目录切进去，把 build/* 平铺打进压缩包根目录
  const tarCmd = [
    "tar",
    "-czf",
    `"${ARCHIVE_PATH}"`,
    "-C",
    `"${BUILD_DIR}"`,
    ...packList.map((item) => `"${item}"`)
  ].join(" ");

  run(tarCmd);
  ensureExists(ARCHIVE_PATH, "archive");
}

function uploadFile(localPath, remotePath, port, user, host) {
  ensureExists(localPath, "upload file");
  run(`scp -P ${port} "${localPath}" ${user}@${host}:"${remotePath}"`);
}

function uploadAndDeploy(target) {
  const { host, user, port, dir } = target;

  const remoteDeployScript = path.join(SCRIPTS_DIR, "remote-deploy.sh");
  const rollbackScript = path.join(SCRIPTS_DIR, "rollback.sh");
  const cleanScript = path.join(SCRIPTS_DIR, "clean-old-releases.sh");

  ensureExists(remoteDeployScript, "remote deploy script");
  ensureExists(rollbackScript, "rollback script");
  ensureExists(cleanScript, "clean releases script");

  run(`ssh -p ${port} ${user}@${host} "mkdir -p ${dir}"`);

  uploadFile(ARCHIVE_PATH, `${dir}/${ARCHIVE_NAME}`, port, user, host);
  uploadFile(remoteDeployScript, `${dir}/remote-deploy.sh`, port, user, host);
  uploadFile(rollbackScript, `${dir}/rollback.sh`, port, user, host);
  uploadFile(cleanScript, `${dir}/clean-old-releases.sh`, port, user, host);

  run(
    `ssh -p ${port} ${user}@${host} "cd ${dir} && chmod +x remote-deploy.sh rollback.sh clean-old-releases.sh && ./remote-deploy.sh ${ARCHIVE_NAME}"`
  );
}

function main() {
  const args = parseArgs();
  const target = getTargetConfig(args.target);

  ensureBuild(args.skipBuild);
  createArchive();
  uploadAndDeploy(target);

  console.log("\n[deploy] done");
}

main();