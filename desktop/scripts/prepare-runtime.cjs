const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const runtimeRoot = path.join(projectRoot, "runtime");
const runtimeNodeModules = path.join(runtimeRoot, "node_modules");
const desktopNodeModules = path.join(projectRoot, "node_modules");
const workspaceNodeModules = path.resolve(projectRoot, "..", "node_modules");
const packagesRoot = path.resolve(projectRoot, "..", "packages");

const workspacePackages = ["api", "core", "server", "sprite", "storage"];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resetRuntimeDir() {
  fs.rmSync(runtimeRoot, { recursive: true, force: true });
  ensureDir(runtimeNodeModules);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function copyDir(src, dest) {
  fs.cpSync(src, dest, { recursive: true, dereference: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyWorkspacePackage(packageName) {
  const sourceDir = path.join(packagesRoot, packageName);
  const targetDir = path.join(runtimeNodeModules, "@yinuo-ngm", packageName);
  const pkgJson = readJson(path.join(sourceDir, "package.json"));

  if (!fs.existsSync(path.join(sourceDir, "lib"))) {
    throw new Error(`Missing build output for @yinuo-ngm/${packageName}. Run the package build first.`);
  }

  ensureDir(targetDir);
  copyDir(path.join(sourceDir, "lib"), path.join(targetDir, "lib"));
  copyFile(path.join(sourceDir, "package.json"), path.join(targetDir, "package.json"));

  if (packageName === "server") {
    const webRoot = path.join(sourceDir, "www");
    if (!fs.existsSync(webRoot)) {
      throw new Error("Missing server web assets at packages/server/www.");
    }
    copyDir(webRoot, path.join(targetDir, "www"));
  }

  return pkgJson.dependencies || {};
}

function getInstalledPackageDir(packageName) {
  const packagePath = packageName.split("/");
  const desktopPath = path.join(desktopNodeModules, ...packagePath);
  if (fs.existsSync(desktopPath)) {
    return desktopPath;
  }

  return path.join(workspaceNodeModules, ...packagePath);
}

function collectExternalDependencies(rootDeps, lockPackages) {
  const pending = [...rootDeps];
  const seen = new Set();
  const collected = [];

  while (pending.length > 0) {
    const packageName = pending.pop();
    if (!packageName || seen.has(packageName)) {
      continue;
    }

    seen.add(packageName);

    if (packageName.startsWith("@yinuo-ngm/")) {
      continue;
    }

    const lockKey = `node_modules/${packageName}`;
    const lockEntry = lockPackages[lockKey];
    if (!lockEntry) {
      throw new Error(`Cannot find ${packageName} in desktop/package-lock.json.`);
    }

    collected.push(packageName);

    for (const depName of Object.keys(lockEntry.dependencies || {})) {
      pending.push(depName);
    }
  }

  return collected.sort();
}

function copyExternalPackage(packageName) {
  const srcDir = getInstalledPackageDir(packageName);
  const destDir = path.join(runtimeNodeModules, ...packageName.split("/"));

  if (!fs.existsSync(srcDir)) {
    throw new Error(`Installed dependency not found: ${packageName}`);
  }

  copyDir(srcDir, destDir);
}

function main() {
  resetRuntimeDir();

  const lock = readJson(path.join(projectRoot, "package-lock.json"));
  const lockPackages = lock.packages || {};
  const directExternalDeps = new Set();

  for (const packageName of workspacePackages) {
    const deps = copyWorkspacePackage(packageName);
    for (const depName of Object.keys(deps)) {
      if (!depName.startsWith("@yinuo-ngm/")) {
        directExternalDeps.add(depName);
      }
    }
  }

  const externalPackages = collectExternalDependencies([...directExternalDeps], lockPackages);
  for (const packageName of externalPackages) {
    copyExternalPackage(packageName);
  }
}

main();
