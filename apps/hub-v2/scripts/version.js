const fs = require("node:fs");
const path = require("node:path");

const HUB_ROOT = path.resolve(__dirname, "..");
const VERSION_FILE = path.join(HUB_ROOT, "VERSION");
const PACKAGE_FILES = [
  path.join(HUB_ROOT, "package.json"),
  path.join(HUB_ROOT, "web", "package.json"),
  path.join(HUB_ROOT, "server", "package.json"),
];

function isSemver(value) {
  return /^\d+\.\d+\.\d+$/.test(value);
}

function readVersion() {
  if (!fs.existsSync(VERSION_FILE)) {
    return "0.1.0";
  }
  return fs.readFileSync(VERSION_FILE, "utf8").trim();
}

function writeVersion(version) {
  fs.writeFileSync(VERSION_FILE, `${version}\n`, "utf8");
  for (const file of PACKAGE_FILES) {
    if (!fs.existsSync(file)) continue;
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    json.version = version;
    fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  }
}

function bump(version, type) {
  const [major, minor, patch] = version.split(".").map((part) => Number(part));
  if (type === "major") return `${major + 1}.0.0`;
  if (type === "minor") return `${major}.${minor + 1}.0`;
  if (type === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`unsupported bump type: ${type}`);
}

function main() {
  const [, , command, arg] = process.argv;
  const current = readVersion();

  if (!isSemver(current)) {
    throw new Error(`invalid VERSION format: ${current}. expected x.y.z`);
  }

  if (!command || command === "show") {
    console.log(current);
    return;
  }

  if (command === "set") {
    const target = arg?.trim();
    if (!target || !isSemver(target)) {
      throw new Error("usage: node scripts/version.js set <x.y.z>");
    }
    writeVersion(target);
    console.log(`version updated: ${current} -> ${target}`);
    return;
  }

  if (command === "bump") {
    const bumpType = (arg || "patch").trim();
    const next = bump(current, bumpType);
    writeVersion(next);
    console.log(`version bumped(${bumpType}): ${current} -> ${next}`);
    return;
  }

  throw new Error("usage: node scripts/version.js <show|set|bump> [value]");
}

main();
