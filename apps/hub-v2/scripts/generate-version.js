/**
 * Generates the SPA version manifest used by the browser to detect deployments.
 * The file is placed next to index.html so it is available as /version.json.
 */
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const HUB_ROOT = path.resolve(__dirname, "..");
const PACKAGE_JSON = path.join(HUB_ROOT, "package.json");
const VERSION_OUTPUT = path.join(HUB_ROOT, "build", "www", "browser", "version.json");

function pad(value) {
  return String(value).padStart(2, "0");
}

function buildTimestamp(date) {
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${MM}${dd}_${HH}${mm}${ss}`;
}

function getTimezoneOffset(date) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const hours = pad(Math.floor(absMinutes / 60));
  const minutes = pad(absMinutes % 60);
  return `${sign}${hours}:${minutes}`;
}

function formatBuildTime(date) {
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}${getTimezoneOffset(date)}`;
}

function readVersion() {
  const raw = fs.readFileSync(PACKAGE_JSON, "utf-8");
  const pkg = JSON.parse(raw);
  return String(pkg.version || "");
}

function readCommit() {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: HUB_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function main() {
  const now = new Date();
  const manifest = {
    app: "hub-v2",
    version: readVersion(),
    buildTime: formatBuildTime(now),
    commit: readCommit(),
    buildId: buildTimestamp(now),
  };

  fs.mkdirSync(path.dirname(VERSION_OUTPUT), { recursive: true });
  fs.writeFileSync(VERSION_OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  console.log(`[version] generated ${VERSION_OUTPUT}`);
}

main();
