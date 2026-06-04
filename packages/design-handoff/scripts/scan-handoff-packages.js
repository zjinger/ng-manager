const { scanHandoffPackages } = require("../lib");

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] || null;
}

const root = readArg("--root") || process.argv[2];

if (!root) {
  console.error("Usage: npm run handoff:scan -w @yinuo-ngm/design-handoff -- --root <handoff-root>");
  process.exit(1);
}

const summaries = scanHandoffPackages(root);
const invalid = summaries.filter((item) => !item.validation.ok);
const warnings = summaries.filter((item) => item.validation.warnings.length > 0);

console.log(
  JSON.stringify(
    {
      root,
      packages: summaries.length,
      invalid: invalid.length,
      warnings: warnings.length,
      items: summaries.map((item) => ({
        packageDir: item.packageDir,
        documentName: item.documentName,
        pageName: item.pageName,
        artboardName: item.artboardName,
        textCount: item.textCount,
        componentCount: item.componentCount,
        hasScreenshot: item.hasScreenshot,
        ok: item.validation.ok,
        errors: item.validation.errors,
        warnings: item.validation.warnings,
      })),
    },
    null,
    2,
  ),
);
