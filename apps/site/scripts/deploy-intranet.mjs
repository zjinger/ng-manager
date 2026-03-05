#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
  const args = {
    serverIp: "192.168.1.31",
    serverUser: "root",
    serverPort: 22,
    remoteRoot: "/opt/www/ng-manager-site",
    skipBuild: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--skip-build") {
      args.skipBuild = true;
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
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
    i += 1;
  }

  return args;
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
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed (${code}): ${command} ${commandArgs.join(" ")}`));
      }
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

async function main() {
  const argv = process.argv.slice(2);
  const options = parseArgs(argv);

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const siteRoot = path.resolve(scriptDir, "..");
  const distDir = path.resolve(siteRoot, ".vitepress/dist");

  if (!options.skipBuild) {
    console.log("[1/4] Build vitepress site...");
    await runCommand("npm.cmd", ["run", "docs:build"], { cwd: siteRoot });
  }

  if (!existsSync(distDir)) {
    throw new Error(`Build output not found: ${distDir}`);
  }

  const releaseName = nowReleaseName();
  const archiveName = `site-${releaseName}.tar.gz`;
  const localArchive = path.join(process.env.TEMP || process.cwd(), archiveName);
  const remoteArchive = `/tmp/${archiveName}`;
  const remoteReleaseDir = `${options.remoteRoot}/releases/${releaseName}`;

  console.log("[2/4] Pack build output...");
  await runCommand("tar", ["-czf", localArchive, "-C", distDir, "."]);

  console.log(`[3/4] Upload package to ${options.serverUser}@${options.serverIp}...`);
  await runCommand("scp", [
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

  console.log("[4/4] Deploy on server...");
  await runCommand("ssh", [
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
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
