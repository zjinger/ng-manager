const fs = require("node:fs");
const path = require("node:path");

const source = path.resolve(__dirname, "../src/modules/reimbursement/templates");
const target = path.resolve(__dirname, "../dist/modules/reimbursement/templates");

if (!fs.existsSync(source)) {
  process.exit(0);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.cpSync(source, target, { recursive: true });
