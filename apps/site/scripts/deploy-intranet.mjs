#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
  const args = {
    serverIp: "192.168.1.31",
    serverUser: "root",
    serverPort: 22,
    remoteRoot: "/opt/www/ng-manager-site",
    skipBuild: false,
    ignoreSshConfig: false,
    identityFile: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--skip-build") {
      args.skipBuild = true;
      continue;
    }

    if (token === "--ignore-ssh-config") {
      args.ignoreSshConfig = true;
      continue;
    }

    if (!token.startsWith("--")) {
      throw new Error(`Unknown argument: ${token}`);
    }

    const key = token.slice(2);
    const value = argv[i + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for argument: ${token}`);
    }

    switch (key) {
      case "server-ip":
        args.serverIp = value;
        break;
      case "server-user":
        args.serverUser = value;
        break;
      case "server-port":
        args.serverPort = Number(value);
        if (!Number.isInteger(args.serverPort) || args.serverPort <= 0) {
          throw new Error(`Invalid --server-port: ${value}`);
        }
        break;
      case "remote-root":
        args.remoteRoot = value;
        break;
      case "identity-file":
        args.identityFile = value;
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }

    i += 1;
  }

  return args;
}

function quoteArg(arg) {
  if (/[\s"]/u.test(arg)) {
    return `"${arg.replace(/"/g, '\\"')}"`;
  }
  return arg;
}

function formatCommand(command, args) {
  return [command, ...args.map(quoteArg)].join(" ");
}

function runCommand(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const needsShellOnWindows =
      process.platform === "win32" && /\.(cmd|bat)$/i.test(command);

    const child = spawn(command, commandArgs, {
      stdio: "inherit",
      shell: needsShellOnWindows,
      ...options,
    });

    child.on("error", (error) => {
      reject(
        new Error(
          `Failed to start command: ${formatCommand(command, commandArgs)}\n${error.message}`,
        ),
      );
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Command failed (${code}): ${formatCommand(command, commandArgs)}`,
        ),
      );
    });
  });
}

function nowReleaseName() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function getNullConfigPath() {
  return process.platform === "win32" ? "NUL" : "/dev/null";
}

function buildSshCommonArgs(options) {
  const args = [];

  if (options.ignoreSshConfig) {
    args.push("-F", getNullConfigPath());
  }

  if (options.identityFile) {
    args.push("-i", options.identityFile);
  }

  return args;
}

async function checkRequiredCommands() {
  await checkCommandExists("ssh", ["-V"]);
  await checkCommandExists("tar", ["--version"]);

  if (process.platform === "win32") {
    await checkCommandExists("where", ["scp"]);
  } else {
    await checkCommandExists("which", ["scp"]);
  }
}

async function checkCommandExists(command, args, options = {}) {
  try {
    await runCommand(command, args, options);
  } catch (error) {
    throw new Error(
      `Required command is not available: ${command}\n${error.message}`,
    );
  }
}

async function testSshConnection(options) {
  const sshCommonArgs = buildSshCommonArgs(options);
  const target = `${options.serverUser}@${options.serverIp}`;

  const testArgs = [
    ...sshCommonArgs,
    "-p",
    String(options.serverPort),
    "-o",
    "BatchMode=yes",
    "-o",
    "ConnectTimeout=8",
    target,
    "echo SSH connection OK",
  ];

  try {
    await runCommand("ssh", testArgs);
  } catch (error) {
    throw new Error(
      [
        "SSH connectivity check failed.",
        `Target: ${target}:${options.serverPort}`,
        "",
        "Possible causes:",
        "1. ~/.ssh/config permissions are invalid",
        "2. SSH key is missing or not accepted by the server",
        "3. The server is unreachable or port is blocked",
        "4. You need --identity-file or --ignore-ssh-config",
        "",
        error.message,
      ].join("\n"),
    );
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const options = parseArgs(argv);

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const siteRoot = path.resolve(scriptDir, "..");
  const distDir = path.resolve(siteRoot, ".vitepress/dist");

  const releaseName = nowReleaseName();
  const archiveName = `site-${releaseName}.tar.gz`;
  const localArchive = path.join(os.tmpdir(), archiveName);
  const remoteArchive = `/tmp/${archiveName}`;
  const remoteReleaseDir = `${options.remoteRoot}/releases/${releaseName}`;

  try {
    // console.log("[0/5] Check required commands...");
    // await checkCommandExists("ssh");
    // await checkCommandExists("scp");
    // await checkCommandExists("tar", ["--version"]);

    console.log("[0/5] Check required commands...");
    await checkRequiredCommands();

    console.log("[1/5] Test SSH connection...");
    await testSshConnection(options);

    if (!options.skipBuild) {
      console.log("[2/5] Build vitepress site...");
      await runCommand(getNpmCommand(), ["run", "docs:build"], {
        cwd: siteRoot,
      });
    } else {
      console.log("[2/5] Skip build (--skip-build)");
    }

    if (!existsSync(distDir)) {
      throw new Error(`Build output not found: ${distDir}`);
    }

    console.log("[3/5] Pack build output...");
    await runCommand("tar", ["-czf", localArchive, "-C", distDir, "."]);

    console.log(
      `[4/5] Upload package to ${options.serverUser}@${options.serverIp}...`,
    );
    await runCommand("scp", [
      ...buildSshCommonArgs(options),
      "-P",
      String(options.serverPort),
      localArchive,
      `${options.serverUser}@${options.serverIp}:${remoteArchive}`,
    ]);

    const remoteCommand = [
      "set -e",
      `mkdir -p '${options.remoteRoot}/releases'`,
      `mkdir -p '${remoteReleaseDir}'`,
      `tar -xzf '${remoteArchive}' -C '${remoteReleaseDir}'`,
      `ln -sfn '${remoteReleaseDir}' '${options.remoteRoot}/current'`,
      `rm -f '${remoteArchive}'`,
    ].join("; ");

    console.log("[5/5] Deploy on server...");
    await runCommand("ssh", [
      ...buildSshCommonArgs(options),
      "-p",
      String(options.serverPort),
      `${options.serverUser}@${options.serverIp}`,
      remoteCommand,
    ]);

    console.log("");
    console.log("Deployment completed.");
    console.log(`Server: ${options.serverIp}`);
    console.log(`Current release: ${remoteReleaseDir}`);
    console.log(`Symlink: ${options.remoteRoot}/current`);
  } finally {
    if (existsSync(localArchive)) {
      try {
        unlinkSync(localArchive);
      } catch {
        // ignore cleanup error
      }
    }
  }
}

main().catch((error) => {
  console.error("");
  console.error("[DEPLOY ERROR]");
  console.error(error.message || error);
  process.exit(1);
});
