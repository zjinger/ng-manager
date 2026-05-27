const fs = require("node:fs");
const path = require("node:path");

const templateDirs = [
  ["../src/modules/reimbursement/templates", "../dist/modules/reimbursement/templates"],
  ["../src/modules/rd/templates", "../dist/modules/rd/templates"]
];

for (const [sourceDir, targetDir] of templateDirs) {
  const source = path.resolve(__dirname, sourceDir);
  const target = path.resolve(__dirname, targetDir);
  if (!fs.existsSync(source)) {
    continue;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}
