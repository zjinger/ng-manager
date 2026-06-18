import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "fs";
import { basename, extname, join, resolve } from "path";

const packageRoot = resolve(__dirname, "..", "..");
const compiledSourceRoot = join(packageRoot, "lib", "src");
const pluginSketchRoot = join(
  packageRoot,
  "sketchplugin",
  "ngm-ai-handoff.sketchplugin",
  "Contents",
  "Sketch",
);
const resourcesRoot = join(packageRoot, "resources");

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function collectFiles(dir: string): string[] {
  const files: string[] = [];

  function visit(current: string): void {
    if (!existsSync(current)) {
      return;
    }

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

function cleanGeneratedRuntime(): void {
  ensureDir(pluginSketchRoot);
  for (const entry of readdirSync(pluginSketchRoot)) {
    if (entry === "manifest.json") {
      continue;
    }
    rmSync(join(pluginSketchRoot, entry), { recursive: true, force: true });
  }
}

function copyRuntime(): number {
  const files = collectFiles(compiledSourceRoot).filter((file) => extname(file) === ".js");
  for (const file of files) {
    copyFileSync(file, join(pluginSketchRoot, basename(file)));
  }
  return files.length;
}

function copyResources(): number {
  const files = collectFiles(resourcesRoot);
  for (const file of files) {
    const rel = file.slice(resourcesRoot.length + 1);
    const target = join(pluginSketchRoot, "resources", rel);
    ensureDir(resolve(target, ".."));
    copyFileSync(file, target);
  }
  return files.length;
}

if (!existsSync(compiledSourceRoot)) {
  throw new Error(`Compiled plugin source does not exist: ${compiledSourceRoot}`);
}

cleanGeneratedRuntime();
const runtimeCount = copyRuntime();
const resourceCount = copyResources();

console.log(`Built Sketch plugin runtime: ${runtimeCount} file(s)`);
console.log(`Copied Sketch plugin resources: ${resourceCount} file(s)`);
console.log(`Plugin output: ${pluginSketchRoot}`);
