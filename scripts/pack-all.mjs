import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const listOnly = process.argv.includes('--list');

const root = process.cwd();
const packagesDir = path.join(root, 'packages');
const outDir = path.join(root, '.artifacts', 'npm');

const packages = fs
  .readdirSync(packagesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => path.join(packagesDir, d.name))
  .filter(dir => fs.existsSync(path.join(dir, 'package.json')))
  .map(dir => {
    const raw = fs.readFileSync(path.join(dir, 'package.json'), 'utf8').replace(/^\uFEFF/, '');
    const pkg = JSON.parse(raw);
    return {
      dir,
      name: pkg.name,
      private: pkg.private === true,
    };
  })
  .filter(pkg => !pkg.private)
  .sort((a, b) => a.name.localeCompare(b.name));

if (listOnly) {
  console.log('[pack:list] packages to be packed:');
  for (const pkg of packages) {
    console.log(`  ${pkg.name}`);
  }
  console.log(`[pack:list] total: ${packages.length}`);
  process.exit(0);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const pkg of packages) {
  console.log(`[pack] ${pkg.name}`);

  const result = spawnSync(
    'npm',
    ['pack', '--pack-destination', outDir, pkg.dir],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`[pack] done: ${outDir}`);
