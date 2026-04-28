import fs from 'node:fs';
import path from 'node:path';

const checkOnly = process.argv.includes('--check');
const packagesDir = path.join(process.cwd(), 'packages');

const found = [];

for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const pkgPath = path.join(packagesDir, entry.name, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;

  const raw = fs.readFileSync(pkgPath, 'utf8').replace(/^\uFEFF/, '');
  const pkg = JSON.parse(raw);

  if (Object.prototype.hasOwnProperty.call(pkg, 'gitHead')) {
    found.push({ pkgPath, name: pkg.name });

    if (!checkOnly) {
      delete pkg.gitHead;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log(`[clean:gitHead] ${pkg.name}`);
    }
  }
}

if (checkOnly) {
  if (found.length > 0) {
    console.error('[check:githead] gitHead fields found:');
    for (const item of found) {
      console.error(`  ${item.name} - ${item.pkgPath}`);
    }
    process.exit(1);
  }

  console.log('[check:githead] ok');
}

if (!checkOnly && found.length === 0) {
  console.log('[clean:githead] no gitHead fields found');
}