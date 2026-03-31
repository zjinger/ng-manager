import { pinyin } from "pinyin-pro";
import { loadEnv } from "../shared/env/env";
import { createSqliteDatabase } from "../shared/db/sqlite";
import { nowIso } from "../shared/utils/time";

type ProjectRow = {
  id: string;
  name: string;
  project_key: string;
  display_code: string | null;
  created_at: string;
};

type PlannedChange = {
  id: string;
  name: string;
  projectKey: string;
  before: string | null;
  after: string | null;
  reason: "manual-normalized" | "manual-conflict-to-auto" | "auto-generated";
};

function parseArgs(argv: string[]) {
  return {
    apply: argv.includes("--apply")
  };
}

function hashName(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function toPinyinAbbr(projectName: string): string | null {
  if (!/[\u3400-\u9FFF]/.test(projectName)) {
    return null;
  }

  const result = pinyin(projectName, { toneType: "none", type: "array" }) as string[] | string;
  const syllables = Array.isArray(result)
    ? result
    : String(result)
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter(Boolean);

  const letters = syllables
    .map((item) => item.replace(/[^a-zA-Z]/g, ""))
    .filter(Boolean)
    .map((item) => item[0].toUpperCase());

  if (letters.length === 0) {
    return null;
  }
  return letters.join("").slice(0, 3).padEnd(3, "X");
}

function normalizeDisplayCode(value: string | null | undefined, projectName: string): string | null {
  const explicit = value?.trim().toUpperCase() || "";
  if (explicit) {
    const normalized = explicit.replace(/[^A-Z0-9]/g, "").slice(0, 3);
    if (normalized) {
      return normalized;
    }
  }

  const pinyinAbbr = toPinyinAbbr(projectName);
  if (pinyinAbbr) {
    return pinyinAbbr;
  }

  const compactAscii = projectName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (compactAscii.length >= 3) {
    return compactAscii.slice(0, 3);
  }
  if (compactAscii.length > 0) {
    return compactAscii.padEnd(3, "X");
  }

  const hash = hashName(projectName);
  return `P${hash.toString(36).toUpperCase().slice(0, 2).padEnd(2, "0")}`;
}

function buildAutoDisplayCodeCandidates(base: string, seed: string): string[] {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const normalizedBase = base.slice(0, 3).padEnd(3, "X");
  const hash = hashName(seed);
  const seen = new Set<string>();
  const result: string[] = [];

  const push = (value: string) => {
    const candidate = value.slice(0, 3).padEnd(3, "X").toUpperCase();
    if (!seen.has(candidate)) {
      seen.add(candidate);
      result.push(candidate);
    }
  };

  push(normalizedBase);
  push(`${normalizedBase.slice(0, 2)}${chars[hash % chars.length]}`);
  push(`${normalizedBase.slice(0, 1)}${chars[Math.floor(hash / 23) % chars.length]}${chars[Math.floor(hash / 529) % chars.length]}`);

  for (let i = 0; i < chars.length; i += 1) {
    push(`${normalizedBase.slice(0, 2)}${chars[(hash + i) % chars.length]}`);
  }
  for (let i = 0; i < chars.length * chars.length; i += 1) {
    const c1 = chars[(hash + i) % chars.length];
    const c2 = chars[(Math.floor(hash / chars.length) + i) % chars.length];
    push(`${normalizedBase.slice(0, 1)}${c1}${c2}`);
  }

  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadEnv();
  const db = createSqliteDatabase(config);

  try {
    const rows = db
      .prepare(
        `
          SELECT id, name, project_key, display_code, created_at
          FROM projects
          ORDER BY datetime(created_at) ASC, id ASC
        `
      )
      .all() as ProjectRow[];

    const used = new Set<string>();
    const changes: PlannedChange[] = [];

    for (const row of rows) {
      const current = row.display_code?.trim().toUpperCase() || null;
      const hasManualInput = !!row.display_code?.trim();
      const manual = hasManualInput ? normalizeDisplayCode(row.display_code, row.name) : null;

      let next: string | null = null;
      let reason: PlannedChange["reason"] = "auto-generated";

      if (manual && !used.has(manual)) {
        next = manual;
        reason = "manual-normalized";
      } else {
        const base = normalizeDisplayCode(undefined, row.name);
        if (!base) {
          next = null;
          reason = "auto-generated";
        } else {
          const candidates = buildAutoDisplayCodeCandidates(base, `${row.name}|${row.project_key}`);
          const hit = candidates.find((candidate) => !used.has(candidate));
          if (!hit) {
            throw new Error(`no available display_code candidate for project ${row.id}`);
          }
          next = hit;
          reason = hasManualInput ? "manual-conflict-to-auto" : "auto-generated";
        }
      }

      if (next) {
        used.add(next);
      }

      if ((current || null) !== (next || null)) {
        changes.push({
          id: row.id,
          name: row.name,
          projectKey: row.project_key,
          before: current,
          after: next,
          reason
        });
      }
    }

    if (args.apply && changes.length > 0) {
      const updatedAt = nowIso();
      const updateStmt = db.prepare("UPDATE projects SET display_code = ?, updated_at = ? WHERE id = ?");
      const tx = db.transaction(() => {
        for (const change of changes) {
          updateStmt.run(change.after, updatedAt, change.id);
        }
      });
      tx();
    }

    console.log(
      JSON.stringify(
        {
          dbPath: config.dbPath,
          dryRun: !args.apply,
          totalProjects: rows.length,
          changed: changes.length,
          changes
        },
        null,
        2
      )
    );
  } finally {
    db.close();
  }
}

main();

