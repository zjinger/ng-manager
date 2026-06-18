const { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } = require("fs");
const { basename, join, relative, resolve } = require("path");
const { execSync } = require("child_process");

const packageRoot = resolve(__dirname, "..", "..");
const pluginRoot = join(packageRoot, "sketchplugin", "ngm-ai-handoff.sketchplugin");
const outputDir = resolve(packageRoot, "..", "..", ".artifacts", "sketch");

// 版本标记：读 manifest.json 版本 + 本地时间戳 + git 短 hash。
// 只生成一个带版本号的主 zip，避免固定名、版本名、清单三份产物造成混淆。
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
const packedAt = new Date();
const timestamp = timestampLocal(packedAt);
const outputFile = join(
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

// 同一秒内重复运行时，版本化文件名可能冲突，先删除保证幂等。
if (existsSync(outputFile)) {
  rmSync(outputFile);
}

const files = collectFiles(pluginRoot);
const zip = buildZip(files);

// 只写一个主产物：带版本、时间戳和提交短 hash，便于追溯。
writeFileSync(outputFile, zip);

console.log(`Packed ${files.length} files`);
console.log(`output: ${outputFile}`);
console.log(`version=${pluginVersion}, git=${gitHash}, at=${timestamp}`);

export {};
