import path from "node:path";
import type Database from "better-sqlite3";
import { createSqliteDatabase } from "../shared/db/sqlite";
import { loadEnv } from "../shared/env/env";

type CountMapping = {
  source: string;
  target: string;
  label: string;
};

const COUNT_MAPPINGS: CountMapping[] = [
  { label: "users", source: "users", target: "users" },
  { label: "admin_accounts", source: "admin_users", target: "admin_accounts" },
  { label: "projects", source: "projects", target: "projects" },
  { label: "project_members", source: "project_members", target: "project_members" },
  { label: "project_modules", source: "project_modules", target: "project_modules" },
  { label: "project_environments", source: "project_environments", target: "project_environments" },
  { label: "project_versions", source: "project_versions", target: "project_versions" },
  { label: "announcements", source: "announcements", target: "announcements" },
  { label: "announcement_reads", source: "announcement_reads", target: "announcement_reads" },
  { label: "documents", source: "documents", target: "documents" },
  { label: "releases", source: "releases", target: "releases" },
  { label: "shared_configs", source: "shared_config", target: "shared_configs" },
  { label: "uploads", source: "uploads", target: "uploads" },
  { label: "issues", source: "issues", target: "issues" },
  { label: "issue_comments", source: "issue_comments", target: "issue_comments" },
  { label: "issue_attachments", source: "issue_attachments", target: "issue_attachments" },
  { label: "issue_participants", source: "issue_participants", target: "issue_participants" },
  { label: "issue_logs", source: "issue_action_logs", target: "issue_logs" },
  { label: "rd_stages", source: "rd_stages", target: "rd_stages" },
  { label: "rd_items", source: "rd_items", target: "rd_items" },
  { label: "rd_logs", source: "rd_logs", target: "rd_logs" },
  { label: "feedbacks", source: "feedbacks", target: "feedbacks" }
];

function parseArg(argv: string[], key: string): string | undefined {
  const index = argv.findIndex((item) => item === `--${key}`);
  if (index < 0) {
    return undefined;
  }
  return argv[index + 1];
}

function tableExists(db: Database.Database, schema: string, table: string): boolean {
  const row = db
    .prepare(
      `SELECT 1 as ok FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`
    )
    .get(table) as { ok?: number } | undefined;
  return Boolean(row?.ok);
}

function countRows(db: Database.Database, schema: string, table: string): number {
  if (!tableExists(db, schema, table)) {
    return 0;
  }
  const row = db.prepare(`SELECT COUNT(*) AS c FROM ${schema}.${table}`).get() as { c: number };
  return row.c;
}

function main() {
  const config = loadEnv();
  const sourceArg = parseArg(process.argv.slice(2), "source");
  const targetArg = parseArg(process.argv.slice(2), "target");

  if (!sourceArg) {
    throw new Error("Missing required argument: --source <v1-db-path>");
  }

  const source = path.resolve(sourceArg);
  const target = path.resolve(targetArg ?? config.dbPath);

  const db = createSqliteDatabase({ ...config, dbPath: target });

  try {
    db.prepare("ATTACH DATABASE ? AS source").run(source);

    const counts = COUNT_MAPPINGS.map((mapping) => {
      const sourceExists = tableExists(db, "source", mapping.source);
      const targetExists = tableExists(db, "main", mapping.target);
      const sourceCount = sourceExists ? countRows(db, "source", mapping.source) : 0;
      const targetCount = targetExists ? countRows(db, "main", mapping.target) : 0;

      return {
        label: mapping.label,
        sourceTable: mapping.source,
        targetTable: mapping.target,
        sourceExists,
        targetExists,
        sourceCount,
        targetCount,
        delta: targetCount - sourceCount
      };
    });

    const missingSourceTables = counts
      .filter((item) => !item.sourceExists)
      .map((item) => item.sourceTable);
    const missingTargetTables = counts
      .filter((item) => !item.targetExists)
      .map((item) => item.targetTable);
    const mismatches = counts.filter(
      (item) => item.sourceExists && item.targetExists && item.delta !== 0
    );

    const result = {
      source,
      target,
      totalMappings: COUNT_MAPPINGS.length,
      missingSourceTables,
      missingTargetTables,
      mismatches,
      counts
    };

    db.prepare("DETACH DATABASE source").run();
    console.log(JSON.stringify(result, null, 2));
  } finally {
    db.close();
  }
}

main();
