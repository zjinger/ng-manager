const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const sourceDir = path.join(rootDir, "src");
const testFilePattern = /\.test\.ts$/;

function collectTestFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }

    if (entry.isFile() && testFilePattern.test(entry.name)) {
      files.push(path.relative(rootDir, fullPath));
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

const testFiles = collectTestFiles(sourceDir);

if (testFiles.length === 0) {
  console.error("No test files found under src/**/*.test.ts");
  process.exit(1);
}

const tsxCli = path.join(
  rootDir,
  "node_modules",
  "tsx",
  "dist",
  "cli.mjs"
);

const result = spawnSync(process.execPath, [tsxCli, "--test", ...process.argv.slice(2), ...testFiles], {
  cwd: rootDir,
  stdio: "inherit"
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
