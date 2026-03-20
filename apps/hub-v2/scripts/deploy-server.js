/**
 * deploy-server.js
 * 负责将打包好的压缩包上传到远程服务器，并执行部署脚本完成部署
 * 主要步骤：
 *  1. 解析命令行参数，获取部署目标和选项
 *  2. 从 deploy-config.json 中加载目标服务器的连接信息和部署配置
 *  3. 根据配置执行构建、打包、上传和部署操作
 * 注意：
 *  - 该脚本假设已经通过 build 和 package 脚本准备好了一个包含必要文件和配置的压缩包（如 ngm-hub.tar.gz）
 * - 该脚本会使用 ssh 和 scp 命令与远程服务器进行交互，确保远程服务器上有一个部署脚本（如 remote-deploy.sh）来处理上传的压缩包并完成部署
 * - 该脚本的目的是简化部署过程，确保每次部署都包含最新的代码和配置，并且可以通过简单的命令行参数来控制构建和部署流程
 * 
 */

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const HUB_ROOT = path.resolve(__dirname, "..");
const SCRIPTS_DIR = __dirname;
const REMOTE_SCRIPTS_DIR = path.join(SCRIPTS_DIR, "remote");
const CONFIG_PATH = path.join(SCRIPTS_DIR, "deploy-config.json");

function parseArgs(argv) {
  const args = {
    target: null,
    skipBuild: false,
    installRemoteScripts: false,
  };

  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--target=")) {
      args.target = arg.split("=")[1];
    } else if (arg === "--skip-build") {
      args.skipBuild = true;
    } else if (arg === "--install-remote-scripts") {
      args.installRemoteScripts = true;
    }
  }

  if (!args.target) {
    throw new Error("missing required arg: --target=<name>");
  }

  return args;
}

function loadConfig(targetName) {
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  const config = JSON.parse(raw);
  const target = config.targets?.[targetName];

  if (!target) {
    throw new Error(`target not found: ${targetName}`);
  }

  return target;
}

function run(command, cwd = HUB_ROOT) {
  console.log(`[deploy] ${command}`);
  execSync(command, {
    cwd,
    stdio: "inherit",
  });
}

function quote(value) {
  return `"${value}"`;
}

function getSshBase(target) {
  return `ssh -p ${target.port} ${target.user}@${target.host}`;
}

function getScpBase(target) {
  return `scp -P ${target.port}`;
}

function buildAndPackage(skipBuild) {
  if (!skipBuild) {
    run("npm run build");
  }
  run("npm run package");
}

function installRemoteScripts(target) {
  const ssh = getSshBase(target);
  const scp = getScpBase(target);

  run(`${ssh} "mkdir -p ${target.remoteBinDir}"`);

  const remoteDeploy = path.join(REMOTE_SCRIPTS_DIR, "remote-deploy.sh");
  const rollback = path.join(REMOTE_SCRIPTS_DIR, "rollback.sh");
  const clean = path.join(REMOTE_SCRIPTS_DIR, "clean-old-releases.sh");

  run(
    `${scp} ${quote(remoteDeploy)} ${target.user}@${target.host}:${target.remoteBinDir}/remote-deploy.sh`,
  );
  run(
    `${scp} ${quote(rollback)} ${target.user}@${target.host}:${target.remoteBinDir}/rollback.sh`,
  );
  run(
    `${scp} ${quote(clean)} ${target.user}@${target.host}:${target.remoteBinDir}/clean-old-releases.sh`,
  );

  run(
    `${ssh} "chmod +x ${target.remoteBinDir}/remote-deploy.sh ${target.remoteBinDir}/rollback.sh ${target.remoteBinDir}/clean-old-releases.sh"`,
  );

  console.log("[deploy] remote scripts installed");
}

function uploadArchiveAndDeploy(target) {
  const archivePath = path.join(HUB_ROOT, target.archiveName);
  if (!fs.existsSync(archivePath)) {
    throw new Error(`archive not found: ${archivePath}`);
  }

  const ssh = getSshBase(target);
  const scp = getScpBase(target);
  const remoteArchivePath = `${target.incomingDir}/${target.archiveName}`;

  run(`${ssh} "mkdir -p ${target.appRoot} ${target.incomingDir}"`);
  run(
    `${scp} ${quote(archivePath)} ${target.user}@${target.host}:${remoteArchivePath}`,
  );
  run(`${ssh} "${target.remoteDeployScript} ${remoteArchivePath}"`);

  console.log("[deploy] release done");
}

function main() {
  const args = parseArgs(process.argv);
  const target = loadConfig(args.target);

  if (args.installRemoteScripts) {
    installRemoteScripts(target);
    return;
  }

  buildAndPackage(args.skipBuild);
  uploadArchiveAndDeploy(target);
}

main();
