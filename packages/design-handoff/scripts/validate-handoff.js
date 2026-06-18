const {
  validateHandoffPackageDetailed,
} = require("../lib");

function readPackageDir() {
  const filtered = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  if (filtered.length > 0) {
    return filtered[0];
  }
  const afterFlag = process.argv.indexOf("--");
  if (afterFlag !== -1 && process.argv[afterFlag + 1]) {
    return process.argv[afterFlag + 1];
  }
  return null;
}

function escapeShellArg(value) {
  return "\"" + String(value).replace(/"/g, "\\\"") + "\"";
}

const packageDir = readPackageDir();

if (!packageDir) {
  console.error("Usage: npm run handoff:validate -w @yinuo-ngm/design-handoff -- <packageDir>");
  console.error("       npm run handoff:validate -- tmp/design-handoff/manual-export/<package-name>");
  process.exit(2);
}

const result = validateHandoffPackageDetailed(packageDir);

const banner = [];
banner.push("NGM Handoff Package Validation");
banner.push("Package: " + packageDir);
banner.push("ok: " + (result.ok ? "true" : "false"));
banner.push(
  "checks: " +
    result.summary.totalChecks +
    " (pass=" + result.summary.passed +
    ", error=" + result.summary.errors +
    ", warning=" + result.summary.warnings +
    ", skip=" + result.summary.skipped + ")",
);
banner.push("");
banner.push("checks:");
result.checks.forEach((check) => {
  const filePart = check.file ? " [" + check.file + "]" : "";
  const msgPart = check.message ? " — " + check.message : "";
  banner.push("  " + check.status.toUpperCase().padEnd(7) + " " + check.rule + filePart + msgPart);
});

if (result.errors.length > 0) {
  banner.push("");
  banner.push("errors:");
  result.errors.forEach((issue) => {
    banner.push("  - " + (issue.file ? issue.file + ": " : "") + issue.message);
  });
}

if (result.warnings.length > 0) {
  banner.push("");
  banner.push("warnings:");
  result.warnings.forEach((issue) => {
    banner.push("  - " + (issue.file ? issue.file + ": " : "") + issue.message);
  });
}

console.log(banner.join("\n"));

if (!result.ok) {
  console.error("\nValidation FAILED.");
  process.exit(1);
}
if (result.summary.warnings > 0) {
  console.log("\nValidation passed with warnings.");
  process.exit(0);
}
console.log("\nValidation passed.");
process.exit(0);
