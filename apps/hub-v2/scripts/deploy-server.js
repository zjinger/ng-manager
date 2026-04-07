/**
 * deploy-server.js
 * 负责将打包好的压缩包上传到远程服务器，并执行部署脚本完成部署
 * 主要步骤：
 *  1. 解析命令行参数，获取部署目标和选项
 *  2. 从 deploy-config.json 中加载目标服务器的连接信息和部署配置
 *  3. 根据配置执行构建、打包、上传和部署操作
 * 注意：
 *  - 该脚本假设已经通过 build 和 package 脚本准备好了一个包含必要文件和配置的压缩包（如 ngm-hub-v2.tar.gz）
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
const EMPTY_SSH_CONFIG_PATH = path.join(SCRIPTS_DIR, ".ssh-empty-config");

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

/**
 * HUB_V2_DEPLOY_USE_USER_SSH_CONFIG 环境变量的作用是控制部署脚本是否应该绕过用户的 SSH 配置。
 * 当该环境变量设置为 "1" 时，部署脚本将使用一个空的 SSH 配置文件来执行 SSH 和 SCP 命令，从而避免用户本地的 SSH 配置干扰部署过程。
 * 这对于确保部署过程的稳定性和一致性非常重要，特别是在用户的 SSH 配置中可能存在别名、端口转发或其他特殊设置的情况下。
 * 通过使用一个空的 SSH 配置文件，部署脚本可以确保它与目标服务器的连接按照预期进行，而不会受到用户本地 SSH 配置的影响。
 */
function shouldBypassUserSshConfig() {
  return process.env.HUB_V2_DEPLOY_USE_USER_SSH_CONFIG !== "1";
}

/**
 * 为了确保部署过程中不受用户本地 SSH 配置的影响，我们提供了一个空的 SSH 配置文件，并在 SSH 和 SCP 命令中使用 -F 选项指定该配置文件。
 * 这样可以避免用户本地的 SSH 配置（如别名、端口转发、身份验证方法等）干扰部署过程，确保部署脚本能够按照预期连接到目标服务器并执行命令。
 */
function ensureEmptySshConfig() {
  if (!fs.existsSync(EMPTY_SSH_CONFIG_PATH)) {
    fs.writeFileSync(EMPTY_SSH_CONFIG_PATH, "# intentionally empty\n", "utf-8");
  }
  return EMPTY_SSH_CONFIG_PATH;
}

function getSshConfigArg() {
  if (!shouldBypassUserSshConfig()) {
    return "";
  }
  return `-F ${quote(ensureEmptySshConfig())}`;
}

function getSshBase(target) {
  const sshConfigArg = getSshConfigArg();
  return `ssh ${sshConfigArg ? `${sshConfigArg} ` : ""}-p ${target.port} ${target.user}@${target.host}`;
}

function getScpBase(target) {
  const sshConfigArg = getSshConfigArg();
  return `scp ${sshConfigArg ? `${sshConfigArg} ` : ""}-P ${target.port}`;
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
  const serverInit = path.join(REMOTE_SCRIPTS_DIR, "server-init.sh");
  const generateSelfSignedCert = path.join(REMOTE_SCRIPTS_DIR, "generate-self-signed-cert.sh");

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
    `${scp} ${quote(serverInit)} ${target.user}@${target.host}:${target.remoteBinDir}/server-init.sh`,
  );
  run(
    `${scp} ${quote(generateSelfSignedCert)} ${target.user}@${target.host}:${target.remoteBinDir}/generate-self-signed-cert.sh`,
  );

  run(
    `${ssh} "sed -i 's/\\r$//' ${target.remoteBinDir}/remote-deploy.sh ${target.remoteBinDir}/rollback.sh ${target.remoteBinDir}/clean-old-releases.sh ${target.remoteBinDir}/server-init.sh ${target.remoteBinDir}/generate-self-signed-cert.sh 2>/dev/null || true"`,
  );

  run(
    `${ssh} "chmod +x ${target.remoteBinDir}/remote-deploy.sh ${target.remoteBinDir}/rollback.sh ${target.remoteBinDir}/clean-old-releases.sh ${target.remoteBinDir}/server-init.sh ${target.remoteBinDir}/generate-self-signed-cert.sh"`,
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
  run(`${ssh} "sed -i 's/\\r$//' ${target.remoteDeployScript} 2>/dev/null || true"`);
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
