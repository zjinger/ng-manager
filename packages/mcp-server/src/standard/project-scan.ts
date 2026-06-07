import * as fs from "fs/promises";
import * as path from "path";
import { projectRelativePath } from "../filesystem/project-files";

const IGNORED_DIRS = new Set([".git", ".ng-manager", "node_modules", "dist", "lib", "coverage", ".angular", ".cache"]);

export type SourceFile = {
  path: string;
  absolutePath: string;
  text?: string;
  lineCount?: number;
};

export async function listProjectFiles(projectRoot: string, maxFiles = 12000): Promise<SourceFile[]> {
  const out: SourceFile[] = [];

  async function visit(dir: string): Promise<void> {
    if (out.length >= maxFiles) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (out.length >= maxFiles) return;
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          await visit(path.join(dir, entry.name));
        }
        continue;
      }
      if (!entry.isFile()) continue;
      const absolutePath = path.join(dir, entry.name);
      out.push({
        path: projectRelativePath(projectRoot, absolutePath),
        absolutePath,
      });
    }
  }

  await visit(projectRoot);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

export async function readSourceText(file: SourceFile, maxBytes = 250000): Promise<SourceFile> {
  const stat = await fs.stat(file.absolutePath);
  if (stat.size > maxBytes) {
    return { ...file, text: "", lineCount: undefined };
  }
  const text = await fs.readFile(file.absolutePath, "utf-8");
  return {
    ...file,
    text,
    lineCount: text.split(/\r?\n/).length,
  };
}

export async function readSourceFiles(files: SourceFile[], predicate: (file: SourceFile) => boolean): Promise<SourceFile[]> {
  const selected = files.filter(predicate);
  return Promise.all(selected.map((file) => readSourceText(file).catch(() => file)));
}
