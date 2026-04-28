import fs from 'node:fs';
import path from 'node:path';

const packagesDir = path.join(process.cwd(), 'packages');

for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const pkgPath = path.join(packagesDir, entry.name, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;

  const raw = fs.readFileSync(pkgPath, 'utf8').replace(/^\uFEFF/, '');
  const pkg = JSON.parse(raw);

  if (Object.prototype.hasOwnProperty.call(pkg, 'gitHead')) {
    delete pkg.gitHead;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`[clean:gitHead] ${pkg.name}`);
  }
}
