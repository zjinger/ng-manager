const { execSync } = require("node:child_process");
const path = require("node:path");

const HUB_ROOT = path.resolve(__dirname, "..");

function run(cmd, cwd = HUB_ROOT) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, {
    stdio: "inherit",
    cwd,
  });
}

function main() {
  run("npm --prefix ./web run build");
  run("npm --prefix ./server run build");
  run("node ./scripts/copy.js");
  console.log("\n[build-all] done");
}

main();
