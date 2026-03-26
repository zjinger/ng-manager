import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { loadEnv } from "../shared/env/env";

type UploadRow = {
  id: string;
  bucket: string | null;
  category: string | null;
  file_name: string;
  storage_path: string;
};

function sanitizePathSegment(value: string | null | undefined, fallback: string): string {
  const normalized = (value || "").trim().toLowerCase();
  const safe = normalized.replace(/[^a-z0-9_-]/g, "");
  return safe || fallback;
}

function resolveSourcePath(row: UploadRow, uploadDir: string, targetPath: string): string | null {
  if (row.storage_path && fs.existsSync(row.storage_path)) {
    return row.storage_path;
  }

  if (fs.existsSync(targetPath)) {
    return targetPath;
  }

  const byFileName = path.resolve(uploadDir, row.file_name);
  if (fs.existsSync(byFileName)) {
    return byFileName;
  }

  const byBasename = path.resolve(uploadDir, path.basename(row.storage_path || row.file_name));
  if (fs.existsSync(byBasename)) {
    return byBasename;
  }

  return null;
}

function moveFile(sourcePath: string, targetPath: string): void {
  try {
    fs.renameSync(sourcePath, targetPath);
    return;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "EXDEV") {
      throw error;
    }
  }

  fs.copyFileSync(sourcePath, targetPath);
  fs.unlinkSync(sourcePath);
}

function main() {
  const env = loadEnv();
  const db = new Database(env.dbPath);
  db.pragma("foreign_keys = ON");

  const rows = db
    .prepare(
      `
      SELECT id, bucket, category, file_name, storage_path
      FROM uploads
      WHERE storage_provider = 'local'
    `
    )
    .all() as UploadRow[];

  const updatePath = db.prepare("UPDATE uploads SET storage_path = ?, updated_at = ? WHERE id = ?");
  const now = new Date().toISOString();

  let moved = 0;
  let updatedOnly = 0;
  let missing = 0;
  let conflict = 0;

  const migrate = db.transaction(() => {
    for (const row of rows) {
      const bucket = sanitizePathSegment(row.bucket, "default");
      const category = sanitizePathSegment(row.category, "general");
      const targetDir = path.join(env.uploadDir, bucket, category);
      const targetPath = path.resolve(targetDir, row.file_name);
      const sourcePath = resolveSourcePath(row, env.uploadDir, targetPath);

      if (!sourcePath) {
        missing += 1;
        continue;
      }

      if (path.resolve(sourcePath) === targetPath) {
        if (row.storage_path !== targetPath) {
          updatePath.run(targetPath, now, row.id);
          updatedOnly += 1;
        }
        continue;
      }

      fs.mkdirSync(targetDir, { recursive: true });

      if (fs.existsSync(targetPath)) {
        conflict += 1;
        continue;
      }

      moveFile(sourcePath, targetPath);
      updatePath.run(targetPath, now, row.id);
      moved += 1;
    }
  });

  migrate();
  db.close();

  console.log(
    JSON.stringify(
      {
        ok: true,
        total: rows.length,
        moved,
        updatedOnly,
        missing,
        conflict
      },
      null,
      2
    )
  );
}

main();
