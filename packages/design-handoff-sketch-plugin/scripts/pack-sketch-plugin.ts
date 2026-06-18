// @ts-nocheck
const { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } = require("fs");
const { basename, join, relative, resolve } = require("path");
const { execSync } = require("child_process");

const packageRoot = resolve(__dirname, "..", "..");
const pluginRoot = join(packageRoot, "sketchplugin", "ngm-ai-handoff.sketchplugin");
const outputDir = resolve(packageRoot, "..", "..", ".artifacts", "sketch");
// 固定文件名，兼容现有跨平台工作流（Windows 打包 -> 复制到 Mac 解压安装）。
const outputFile = join(outputDir, "ngm-ai-handoff.sketchplugin.zip");

// 版本标记：读 manifest.json 版本 + 本地时间戳 + git 短 hash，
// 额外生成一份带版本号的副本，并在产物目录写 pack-manifest.json，
// 方便追溯每次打包对应哪个版本/提交，同时不破坏固定文件名引用。
function readPluginVersion() {
  try {
    const manifestPath = join(pluginRoot, "Contents", "Sketch", "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    return manifest.version || "0.0.0";
  } catch (error) {
    return "0.0.0";
  }
}

function runGit(args) {
  try {
    return execSync(`git ${args}`, {
      cwd: packageRoot,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch (error) {
    return "";
  }
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function timestampLocal(date) {
  return (
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}` +
    `-${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`
  );
}

function sanitizeFilePart(value) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]/g, "");
}

const pluginVersion = readPluginVersion();
const gitHash = sanitizeFilePart(runGit("rev-parse --short HEAD")) || "nogit";
const gitBranch = sanitizeFilePart(runGit("rev-parse --abbrev-ref HEAD"));
const packedAt = new Date();
const timestamp = timestampLocal(packedAt);
const versionedOutputFile = join(
  outputDir,
  `ngm-ai-handoff-${sanitizeFilePart(pluginVersion)}-${timestamp}-${gitHash}.sketchplugin.zip`,
);

function createCrc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let j = 0; j < 8; j += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
}

const crc32Table = createCrc32Table();

function crc32(buffer) {
  let value = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    value = crc32Table[(value ^ buffer[i]) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function collectFiles(dir) {
  const files = [];

  function visit(current) {
    for (const entry of readdirSync(current)) {
      const filePath = join(current, entry);
      const stat = statSync(filePath);
      if (stat.isDirectory()) {
        visit(filePath);
      } else if (stat.isFile()) {
        files.push(filePath);
      }
    }
  }

  visit(dir);
  return files;
}

function dosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosDate, dosTime };
}

function uint16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function buildZip(files) {
  const chunks = [];
  const centralDirectory = [];
  let offset = 0;

  for (const file of files) {
    const data = readFileSync(file);
    const stat = statSync(file);
    const { dosDate, dosTime } = dosDateTime(stat.mtime);
    const archiveName = [basename(pluginRoot), relative(pluginRoot, file)].join("/").replace(/\\/g, "/");
    const nameBuffer = Buffer.from(archiveName, "utf8");
    const checksum = crc32(data);

    const localHeader = Buffer.concat([
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(dosTime),
      uint16(dosDate),
      uint32(checksum),
      uint32(data.length),
      uint32(data.length),
      uint16(nameBuffer.length),
      uint16(0),
      nameBuffer,
    ]);

    chunks.push(localHeader, data);

    const centralHeader = Buffer.concat([
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(dosTime),
      uint16(dosDate),
      uint32(checksum),
      uint32(data.length),
      uint32(data.length),
      uint16(nameBuffer.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(offset),
      nameBuffer,
    ]);

    centralDirectory.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralStart = offset;
  const centralBuffer = Buffer.concat(centralDirectory);
  const centralSize = centralBuffer.length;
  const endRecord = Buffer.concat([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralSize),
    uint32(centralStart),
    uint16(0),
  ]);

  return Buffer.concat([...chunks, centralBuffer, endRecord]);
}

if (!existsSync(pluginRoot)) {
  throw new Error(`Sketch plugin directory does not exist: ${pluginRoot}`);
}

mkdirSync(outputDir, { recursive: true });

if (existsSync(outputFile)) {
  rmSync(outputFile);
}
// 同一秒内重复运行时，版本化文件名可能冲突，先删除保证幂等。
if (existsSync(versionedOutputFile)) {
  rmSync(versionedOutputFile);
}

const files = collectFiles(pluginRoot);
const zip = buildZip(files);

// 固定名 zip：兼容现有跨平台工作流（Windows 打包 -> 复制到 Mac 解压安装）。
writeFileSync(outputFile, zip);
// 带版本标记的副本：用于追溯每次打包对应的版本/提交。
writeFileSync(versionedOutputFile, zip);

// 产物目录下的打包清单，记录版本/提交/时间/文件名，方便人工或脚本核对。
// 注意：pack-manifest.json 写在 outputDir，不在 pluginRoot 内，不会被打进插件 zip。
const packManifest = {
  pluginName: "NGM AI Handoff",
  version: pluginVersion,
  gitHash,
  gitBranch,
  packedAt: packedAt.toISOString(),
  timestamp,
  fileCount: files.length,
  latestZip: basename(outputFile),
  versionedZip: basename(versionedOutputFile),
};
writeFileSync(
  join(outputDir, "pack-manifest.json"),
  `${JSON.stringify(packManifest, null, 2)}\n`,
);

console.log(`Packed ${files.length} files`);
console.log(`latest   : ${outputFile}`);
console.log(`versioned: ${versionedOutputFile}`);
console.log(
  `manifest : ${join(outputDir, "pack-manifest.json")} (version=${pluginVersion}, git=${gitHash}, at=${timestamp})`,
);
