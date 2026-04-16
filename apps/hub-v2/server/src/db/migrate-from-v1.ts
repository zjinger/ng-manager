import path from "node:path";
import type Database from "better-sqlite3";
import { runMigrations } from "../shared/db/migrate";
import { createSqliteDatabase } from "../shared/db/sqlite";
import { loadEnv } from "../shared/env/env";

type ModuleName = "users" | "projects" | "project-meta" | "content" | "issues" | "rd" | "feedbacks";

type CliOptions = {
  source: string;
  target: string;
  module: ModuleName | "all";
  dryRun: boolean;
};

type MigrationStat = {
  table: string;
  before: number;
  after: number;
  inserted: number;
};

type ModuleSummary = {
  module: ModuleName;
  stats: MigrationStat[];
  skippedTables: string[];
};

const MODULES: ModuleName[] = ["users", "projects", "project-meta", "content", "issues", "rd", "feedbacks"];

const PROJECT_ROLE_PRIORITY: Record<string, number> = {
  project_admin: 100,
  product: 90,
  ui: 80,
  frontend_dev: 70,
  backend_dev: 60,
  qa: 50,
  ops: 40
};

function parseArgs(argv: string[], defaultTarget: string): CliOptions {
  const argMap = new Map<string, string | boolean>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    if (token === "--dry-run") {
      argMap.set("dry-run", true);
      continue;
    }

    const key = token.replace(/^--/, "");
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Argument ${token} requires a value`);
    }

    argMap.set(key, value);
    index += 1;
  }

  const source = String(argMap.get("source") ?? "").trim();
  if (!source) {
    throw new Error("Missing required argument: --source <v1-db-path>");
  }

  const target = path.resolve(String(argMap.get("target") ?? defaultTarget));
  const module = String(argMap.get("module") ?? "all") as ModuleName | "all";
  if (module !== "all" && !MODULES.includes(module)) {
    throw new Error(`Invalid --module value: ${module}`);
  }

  return {
    source: path.resolve(source),
    target,
    module,
    dryRun: Boolean(argMap.get("dry-run"))
  };
}

function tableExists(db: Database.Database, schema: string, table: string): boolean {
  const row = db
    .prepare(
      `SELECT 1 as ok FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`
    )
    .get(table) as { ok?: number } | undefined;
  return Boolean(row?.ok);
}

function listColumns(db: Database.Database, schema: string, table: string): Set<string> {
  if (!tableExists(db, schema, table)) {
    return new Set<string>();
  }

  const rows = db
    .prepare(`PRAGMA ${schema}.table_info(${table})`)
    .all() as Array<{ name: string }>;

  return new Set(rows.map((row) => row.name));
}

function countRows(db: Database.Database, schema: string, table: string): number {
  if (!tableExists(db, schema, table)) {
    return 0;
  }
  const row = db.prepare(`SELECT COUNT(*) AS c FROM ${schema}.${table}`).get() as { c: number };
  return row.c;
}

function assertTargetTable(db: Database.Database, table: string) {
  if (!tableExists(db, "main", table)) {
    throw new Error(
      `[db:migrate:from-v1] target table missing: main.${table}. ` +
      `Please run db:migrate first and ensure migrations are available in runtime package.`
    );
  }
}

function migrateTableByInsertSelect(
  db: Database.Database,
  sourceTable: string,
  targetTable: string,
  targetColumns: string[],
  sourceExpressionSql: string
): MigrationStat {
  const before = countRows(db, "main", targetTable);
  db.prepare(
    `INSERT OR IGNORE INTO main.${targetTable} (${targetColumns.join(", ")}) ${sourceExpressionSql.replace(
      "__SOURCE_TABLE__",
      `source.${sourceTable}`
    )}`
  ).run();
  const after = countRows(db, "main", targetTable);

  return {
    table: targetTable,
    before,
    after,
    inserted: Math.max(after - before, 0)
  };
}

function migrateUsersModule(db: Database.Database): ModuleSummary {
  const skippedTables: string[] = [];
  const stats: MigrationStat[] = [];
  assertTargetTable(db, "users");
  assertTargetTable(db, "admin_accounts");

  if (tableExists(db, "source", "users")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "users",
        "users",
        [
          "id",
          "username",
          "display_name",
          "email",
          "mobile",
          "title_code",
          "status",
          "source",
          "remark",
          "created_at",
          "updated_at"
        ],
        `SELECT id, username, display_name, email, mobile, title_code, status, source, remark, created_at, updated_at FROM __SOURCE_TABLE__`
      )
    );
  } else {
    skippedTables.push("source.users");
  }

  if (tableExists(db, "source", "admin_users")) {
    const adminColumns = listColumns(db, "source", "admin_users");
    const avatarUploadExpr = adminColumns.has("avatar_upload_id")
      ? "avatar_upload_id"
      : "NULL AS avatar_upload_id";
    const before = countRows(db, "main", "admin_accounts");
    // 兼容旧 SQLite：不用 INSERT ... ON CONFLICT DO UPDATE
    // 采用两步：
    // 1) 先按 username（不区分大小写）更新已有账号
    // 2) 再插入不存在的账号
    db.prepare(
      `UPDATE main.admin_accounts AS tgt
       SET
         user_id = (
           SELECT src.user_id
           FROM source.admin_users src
           WHERE lower(src.username) = lower(tgt.username)
           LIMIT 1
         ),
         password_hash = (
           SELECT src.password_hash
           FROM source.admin_users src
           WHERE lower(src.username) = lower(tgt.username)
           LIMIT 1
         ),
         nickname = (
           SELECT COALESCE(NULLIF(src.nickname, ''), src.username)
           FROM source.admin_users src
           WHERE lower(src.username) = lower(tgt.username)
           LIMIT 1
         ),
         avatar_upload_id = (
           SELECT ${avatarUploadExpr}
           FROM source.admin_users src
           WHERE lower(src.username) = lower(tgt.username)
           LIMIT 1
         ),
         role = (
           SELECT CASE WHEN src.role IN ('admin', 'user') THEN src.role ELSE 'admin' END
           FROM source.admin_users src
           WHERE lower(src.username) = lower(tgt.username)
           LIMIT 1
         ),
         status = (
           SELECT CASE
                    WHEN src.status = 'disabled' THEN 'inactive'
                    WHEN src.status IN ('active', 'inactive') THEN src.status
                    ELSE 'active'
                  END
           FROM source.admin_users src
           WHERE lower(src.username) = lower(tgt.username)
           LIMIT 1
         ),
         must_change_password = (
           SELECT COALESCE(src.must_change_password, 1)
           FROM source.admin_users src
           WHERE lower(src.username) = lower(tgt.username)
           LIMIT 1
         ),
         last_login_at = (
           SELECT src.last_login_at
           FROM source.admin_users src
           WHERE lower(src.username) = lower(tgt.username)
           LIMIT 1
         ),
         updated_at = (
           SELECT src.updated_at
           FROM source.admin_users src
           WHERE lower(src.username) = lower(tgt.username)
           LIMIT 1
         )
       WHERE EXISTS (
         SELECT 1
         FROM source.admin_users src
         WHERE lower(src.username) = lower(tgt.username)
       )`
    ).run();

    db.prepare(
      `INSERT OR IGNORE INTO main.admin_accounts (
          id,
          user_id,
          username,
          password_hash,
          nickname,
          avatar_upload_id,
          role,
          status,
          must_change_password,
          last_login_at,
          created_at,
          updated_at
        )
        SELECT
          id,
          user_id,
          username,
          password_hash,
          COALESCE(NULLIF(nickname, ''), username) AS nickname,
          ${avatarUploadExpr},
          CASE WHEN role IN ('admin', 'user') THEN role ELSE 'admin' END AS role,
          CASE
            WHEN status = 'disabled' THEN 'inactive'
            WHEN status IN ('active', 'inactive') THEN status
            ELSE 'active'
          END AS status,
          COALESCE(must_change_password, 1) AS must_change_password,
          last_login_at,
          created_at,
          updated_at
        FROM source.admin_users`
    ).run();
    const after = countRows(db, "main", "admin_accounts");
    stats.push({
      table: "admin_accounts",
      before,
      after,
      inserted: Math.max(after - before, 0)
    });
  } else {
    skippedTables.push("source.admin_users");
  }

  return { module: "users", stats, skippedTables };
}

function roleCodeCaseExpression(): string {
  return `CASE
      WHEN role_top.role IN ('project_admin', 'product', 'ui', 'frontend_dev', 'backend_dev', 'qa', 'ops')
        THEN role_top.role
      ELSE 'member'
    END`;
}

function migrateProjectsModule(db: Database.Database): ModuleSummary {
  const skippedTables: string[] = [];
  const stats: MigrationStat[] = [];

  if (tableExists(db, "source", "projects")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "projects",
        "projects",
        [
          "id",
          "project_key",
          "name",
          "description",
          "icon",
          "status",
          "visibility",
          "created_at",
          "updated_at"
        ],
        `SELECT
            id,
            project_key,
            name,
            description,
            icon,
            CASE WHEN status IN ('active', 'inactive') THEN status ELSE 'active' END AS status,
            CASE WHEN visibility IN ('internal', 'private') THEN visibility ELSE 'internal' END AS visibility,
            created_at,
            updated_at
          FROM __SOURCE_TABLE__`
      )
    );
  } else {
    skippedTables.push("source.projects");
  }

  if (tableExists(db, "source", "project_members")) {
    const hasRoles = tableExists(db, "source", "project_member_roles");
    if (!hasRoles) {
      skippedTables.push("source.project_member_roles");
    }

    const before = countRows(db, "main", "project_members");
    const topRoleSql = hasRoles
      ? `LEFT JOIN (
            SELECT
              pmr.member_id,
              pmr.role
            FROM source.project_member_roles pmr
            JOIN (
              SELECT
                member_id,
                MAX(
                  CASE role
                    WHEN 'project_admin' THEN ${PROJECT_ROLE_PRIORITY.project_admin}
                    WHEN 'product' THEN ${PROJECT_ROLE_PRIORITY.product}
                    WHEN 'ui' THEN ${PROJECT_ROLE_PRIORITY.ui}
                    WHEN 'frontend_dev' THEN ${PROJECT_ROLE_PRIORITY.frontend_dev}
                    WHEN 'backend_dev' THEN ${PROJECT_ROLE_PRIORITY.backend_dev}
                    WHEN 'qa' THEN ${PROJECT_ROLE_PRIORITY.qa}
                    WHEN 'ops' THEN ${PROJECT_ROLE_PRIORITY.ops}
                    ELSE 0
                  END
                ) AS role_rank
              FROM source.project_member_roles
              GROUP BY member_id
            ) ranked
              ON ranked.member_id = pmr.member_id
             AND ranked.role_rank = CASE pmr.role
                 WHEN 'project_admin' THEN ${PROJECT_ROLE_PRIORITY.project_admin}
                 WHEN 'product' THEN ${PROJECT_ROLE_PRIORITY.product}
                 WHEN 'ui' THEN ${PROJECT_ROLE_PRIORITY.ui}
                 WHEN 'frontend_dev' THEN ${PROJECT_ROLE_PRIORITY.frontend_dev}
                 WHEN 'backend_dev' THEN ${PROJECT_ROLE_PRIORITY.backend_dev}
                 WHEN 'qa' THEN ${PROJECT_ROLE_PRIORITY.qa}
                 WHEN 'ops' THEN ${PROJECT_ROLE_PRIORITY.ops}
                 ELSE 0
               END
          ) role_top ON role_top.member_id = pm.id`
      : "";

    const ownerSql = hasRoles
      ? `CASE
            WHEN EXISTS (
              SELECT 1
              FROM source.project_member_roles owner_role
              WHERE owner_role.member_id = pm.id
                AND owner_role.role = 'project_admin'
            ) THEN 1
            ELSE 0
          END AS is_owner`
      : "0 AS is_owner";

    db.prepare(
      `INSERT OR IGNORE INTO main.project_members (
          id,
          project_id,
          user_id,
          display_name,
          role_code,
          is_owner,
          joined_at,
          created_at,
          updated_at
        )
        SELECT
          pm.id,
          pm.project_id,
          pm.user_id,
          COALESCE(NULLIF(pm.display_name, ''), u.display_name, u.username, pm.user_id) AS display_name,
          ${hasRoles ? roleCodeCaseExpression() : "'member'"} AS role_code,
          ${ownerSql},
          COALESCE(pm.joined_at, pm.created_at, CURRENT_TIMESTAMP) AS joined_at,
          pm.created_at,
          pm.updated_at
        FROM source.project_members pm
        LEFT JOIN source.users u ON u.id = pm.user_id
        ${topRoleSql}`
    ).run();

    const after = countRows(db, "main", "project_members");
    stats.push({
      table: "project_members",
      before,
      after,
      inserted: Math.max(after - before, 0)
    });
  } else {
    skippedTables.push("source.project_members");
  }

  return { module: "projects", stats, skippedTables };
}

function migrateProjectMetaModule(db: Database.Database): ModuleSummary {
  const skippedTables: string[] = [];
  const stats: MigrationStat[] = [];

  if (tableExists(db, "source", "project_modules")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "project_modules",
        "project_modules",
        ["id", "project_id", "name", "code", "project_no", "enabled", "sort", "\"desc\"", "created_at", "updated_at"],
        `SELECT
            pm.id,
            pm.project_id,
            pm.name,
            pm.code,
            NULL AS project_no,
            COALESCE(pm.enabled, 1) AS enabled,
            COALESCE(pm.sort, 0) AS sort,
            pm."desc",
            pm.created_at,
            pm.updated_at
          FROM __SOURCE_TABLE__ pm
          JOIN main.projects p ON p.id = pm.project_id`
      )
    );
  } else {
    skippedTables.push("source.project_modules");
  }

  if (tableExists(db, "source", "project_environments")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "project_environments",
        "project_environments",
        ["id", "project_id", "name", "code", "enabled", "sort", "\"desc\"", "created_at", "updated_at"],
        `SELECT
            pe.id,
            pe.project_id,
            pe.name,
            pe.code,
            COALESCE(pe.enabled, 1) AS enabled,
            COALESCE(pe.sort, 0) AS sort,
            pe."desc",
            pe.created_at,
            pe.updated_at
          FROM __SOURCE_TABLE__ pe
          JOIN main.projects p ON p.id = pe.project_id`
      )
    );
  } else {
    skippedTables.push("source.project_environments");
  }

  if (tableExists(db, "source", "project_versions")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "project_versions",
        "project_versions",
        ["id", "project_id", "version", "code", "enabled", "sort", "\"desc\"", "created_at", "updated_at"],
        `SELECT
            pv.id,
            pv.project_id,
            pv.version,
            pv.code,
            COALESCE(pv.enabled, 1) AS enabled,
            COALESCE(pv.sort, 0) AS sort,
            pv."desc",
            pv.created_at,
            pv.updated_at
          FROM __SOURCE_TABLE__ pv
          JOIN main.projects p ON p.id = pv.project_id`
      )
    );
  } else {
    skippedTables.push("source.project_versions");
  }

  return { module: "project-meta", stats, skippedTables };
}

function migrateContentModule(db: Database.Database): ModuleSummary {
  const skippedTables: string[] = [];
  const stats: MigrationStat[] = [];

  if (tableExists(db, "source", "uploads")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "uploads",
        "uploads",
        [
          "id",
          "bucket",
          "category",
          "file_name",
          "original_name",
          "file_ext",
          "mime_type",
          "file_size",
          "checksum",
          "storage_provider",
          "storage_path",
          "visibility",
          "status",
          "uploader_id",
          "uploader_name",
          "created_at",
          "updated_at"
        ],
        `SELECT
            id, bucket, category, file_name, original_name, file_ext, mime_type, file_size, checksum,
            storage_provider, storage_path,
            CASE WHEN visibility IN ('private', 'public') THEN visibility ELSE 'private' END AS visibility,
            CASE WHEN status IN ('active', 'inactive') THEN status ELSE 'active' END AS status,
            uploader_id, uploader_name, created_at, updated_at
          FROM __SOURCE_TABLE__`
      )
    );
  } else {
    skippedTables.push("source.uploads");
  }

  if (tableExists(db, "source", "announcements")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "announcements",
        "announcements",
        [
          "id",
          "project_id",
          "title",
          "summary",
          "content_md",
          "scope",
          "pinned",
          "status",
          "publish_at",
          "expire_at",
          "created_by",
          "created_at",
          "updated_at"
        ],
        `SELECT
            id, project_id, title, summary, content_md,
            CASE WHEN scope = 'project' THEN 'project' ELSE 'global' END AS scope,
            COALESCE(pinned, 0) AS pinned,
            CASE WHEN status IN ('draft', 'published', 'archived') THEN status ELSE 'draft' END AS status,
            publish_at, expire_at, created_by, created_at, updated_at
          FROM __SOURCE_TABLE__`
      )
    );
  } else {
    skippedTables.push("source.announcements");
  }

  if (tableExists(db, "source", "announcement_reads")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "announcement_reads",
        "announcement_reads",
        ["id", "announcement_id", "user_id", "read_version", "read_at"],
        `SELECT id, announcement_id, user_id, read_version, read_at FROM __SOURCE_TABLE__`
      )
    );
  } else {
    skippedTables.push("source.announcement_reads");
  }

  if (tableExists(db, "source", "documents")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "documents",
        "documents",
        [
          "id",
          "project_id",
          "slug",
          "title",
          "category",
          "summary",
          "content_md",
          "status",
          "version",
          "created_by",
          "publish_at",
          "created_at",
          "updated_at"
        ],
        `SELECT
            id, project_id, slug, title, category, summary, content_md,
            CASE WHEN status IN ('draft', 'published', 'archived') THEN status ELSE 'draft' END AS status,
            version, created_by,
            CASE WHEN status = 'published' THEN updated_at ELSE NULL END AS publish_at,
            created_at, updated_at
          FROM __SOURCE_TABLE__`
      )
    );
  } else {
    skippedTables.push("source.documents");
  }

  if (tableExists(db, "source", "releases")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "releases",
        "releases",
        [
          "id",
          "project_id",
          "channel",
          "version",
          "title",
          "notes",
          "download_url",
          "status",
          "published_at",
          "created_by",
          "created_at",
          "updated_at"
        ],
        `SELECT
            id, project_id, channel, version, title, notes, download_url,
            CASE WHEN status IN ('draft', 'published', 'archived') THEN status ELSE 'draft' END AS status,
            published_at,
            NULL AS created_by,
            created_at, updated_at
          FROM __SOURCE_TABLE__`
      )
    );
  } else {
    skippedTables.push("source.releases");
  }

  if (tableExists(db, "source", "shared_config")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "shared_config",
        "shared_configs",
        [
          "id",
          "project_id",
          "scope",
          "config_key",
          "config_name",
          "category",
          "value_type",
          "config_value",
          "description",
          "is_encrypted",
          "priority",
          "status",
          "created_at",
          "updated_at"
        ],
        `SELECT
            id,
            project_id,
            CASE WHEN scope = 'project' THEN 'project' ELSE 'global' END AS scope,
            config_key,
            config_name,
            category,
            value_type,
            config_value,
            description,
            COALESCE(is_encrypted, 0) AS is_encrypted,
            COALESCE(priority, 0) AS priority,
            CASE WHEN status IN ('active', 'inactive') THEN status ELSE 'active' END AS status,
            created_at,
            updated_at
          FROM __SOURCE_TABLE__`
      )
    );
  } else {
    skippedTables.push("source.shared_config");
  }

  return { module: "content", stats, skippedTables };
}

function migrateIssuesModule(db: Database.Database): ModuleSummary {
  const skippedTables: string[] = [];
  const stats: MigrationStat[] = [];

  if (tableExists(db, "source", "issues")) {
    const issueColumns = listColumns(db, "source", "issues");
    const verifierIdExpr = issueColumns.has("verifier_id")
      ? "verifier_id"
      : "NULL AS verifier_id";
    const verifierNameExpr = issueColumns.has("verifier_name")
      ? "verifier_name"
      : "NULL AS verifier_name";
    const verifiedAtExpr = issueColumns.has("verified_at")
      ? "verified_at"
      : "NULL AS verified_at";

    stats.push(
      migrateTableByInsertSelect(
        db,
        "issues",
        "issues",
        [
          "id",
          "project_id",
          "issue_no",
          "title",
          "description",
          "type",
          "status",
          "priority",
          "reporter_id",
          "reporter_name",
          "assignee_id",
          "assignee_name",
          "verifier_id",
          "verifier_name",
          "module_code",
          "version_code",
          "environment_code",
          "resolution_summary",
          "close_reason",
          "close_remark",
          "reopen_count",
          "started_at",
          "resolved_at",
          "verified_at",
          "closed_at",
          "created_at",
          "updated_at"
        ],
        `SELECT
            id,
            project_id,
            issue_no,
            title,
            description,
            type,
            status,
            priority,
            reporter_id,
            reporter_name,
            assignee_id,
            assignee_name,
            ${verifierIdExpr},
            ${verifierNameExpr},
            module_code,
            version_code,
            environment_code,
            resolution_summary,
            close_reason,
            close_remark,
            COALESCE(reopen_count, 0) AS reopen_count,
            started_at,
            resolved_at,
            ${verifiedAtExpr},
            closed_at,
            created_at,
            updated_at
          FROM __SOURCE_TABLE__`
      )
    );
  } else {
    skippedTables.push("source.issues");
  }

  if (tableExists(db, "source", "issue_comments")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "issue_comments",
        "issue_comments",
        ["id", "issue_id", "author_id", "author_name", "content", "mentions_json", "created_at", "updated_at"],
        `SELECT
            id,
            issue_id,
            COALESCE(author_id, 'system') AS author_id,
            COALESCE(NULLIF(author_name, ''), 'System') AS author_name,
            content,
            COALESCE(mentions_json, '[]') AS mentions_json,
            created_at,
            updated_at
          FROM __SOURCE_TABLE__`
      )
    );
  } else {
    skippedTables.push("source.issue_comments");
  }

  if (tableExists(db, "source", "issue_attachments")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "issue_attachments",
        "issue_attachments",
        ["id", "issue_id", "upload_id", "created_at"],
        `SELECT id, issue_id, upload_id, created_at FROM __SOURCE_TABLE__`
      )
    );
  } else {
    skippedTables.push("source.issue_attachments");
  }

  if (tableExists(db, "source", "issue_participants")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "issue_participants",
        "issue_participants",
        ["id", "issue_id", "user_id", "user_name", "created_at"],
        `SELECT id, issue_id, user_id, user_name, created_at FROM __SOURCE_TABLE__`
      )
    );
  } else {
    skippedTables.push("source.issue_participants");
  }

  if (tableExists(db, "source", "issue_action_logs")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "issue_action_logs",
        "issue_logs",
        [
          "id",
          "issue_id",
          "action_type",
          "from_status",
          "to_status",
          "operator_id",
          "operator_name",
          "summary",
          "meta_json",
          "created_at"
        ],
        `SELECT
            id,
            issue_id,
            action_type,
            from_status,
            to_status,
            operator_id,
            operator_name,
            summary,
            NULL AS meta_json,
            created_at
          FROM __SOURCE_TABLE__`
      )
    );
  } else {
    skippedTables.push("source.issue_action_logs");
  }

  return { module: "issues", stats, skippedTables };
}

function migrateRdModule(db: Database.Database): ModuleSummary {
  const skippedTables: string[] = [];
  const stats: MigrationStat[] = [];

  if (tableExists(db, "source", "rd_stages")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "rd_stages",
        "rd_stages",
        ["id", "project_id", "name", "sort", "enabled", "created_at", "updated_at"],
        `SELECT id, project_id, name, sort, COALESCE(enabled, 1) AS enabled, created_at, updated_at FROM __SOURCE_TABLE__`
      )
    );
  } else {
    skippedTables.push("source.rd_stages");
  }

  if (tableExists(db, "source", "rd_items")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "rd_items",
        "rd_items",
        [
          "id",
          "project_id",
          "rd_no",
          "title",
          "description",
          "stage_id",
          "type",
          "status",
          "priority",
          "assignee_id",
          "assignee_name",
          "creator_id",
          "creator_name",
          "reviewer_id",
          "reviewer_name",
          "progress",
          "plan_start_at",
          "plan_end_at",
          "actual_start_at",
          "actual_end_at",
          "blocker_reason",
          "created_at",
          "updated_at"
        ],
        `SELECT
            id,
            project_id,
            rd_no,
            title,
            description,
            stage_id,
            type,
            status,
            priority,
            assignee_id,
            assignee_name,
            creator_id,
            creator_name,
            reviewer_id,
            reviewer_name,
            COALESCE(progress, 0) AS progress,
            plan_start_at,
            plan_end_at,
            actual_start_at,
            actual_end_at,
            blocker_reason,
            created_at,
            updated_at
          FROM __SOURCE_TABLE__`
      )
    );
  } else {
    skippedTables.push("source.rd_items");
  }

  if (tableExists(db, "source", "rd_logs")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "rd_logs",
        "rd_logs",
        [
          "id",
          "project_id",
          "item_id",
          "action_type",
          "content",
          "operator_id",
          "operator_name",
          "meta_json",
          "created_at"
        ],
        `SELECT
            rl.id,
            rl.project_id,
            rl.item_id,
            rl.action_type,
            rl.content,
            rl.operator_id,
            rl.operator_name,
            NULL AS meta_json,
            rl.created_at
          FROM __SOURCE_TABLE__ rl
          JOIN main.rd_items ri ON ri.id = rl.item_id
          JOIN main.projects p ON p.id = rl.project_id`
      )
    );
  } else {
    skippedTables.push("source.rd_logs");
  }

  return { module: "rd", stats, skippedTables };
}

function migrateFeedbacksModule(db: Database.Database): ModuleSummary {
  const skippedTables: string[] = [];
  const stats: MigrationStat[] = [];

  if (tableExists(db, "source", "feedbacks")) {
    stats.push(
      migrateTableByInsertSelect(
        db,
        "feedbacks",
        "feedbacks",
        [
          "id",
          "source",
          "category",
          "title",
          "content",
          "contact",
          "client_name",
          "client_version",
          "client_ip",
          "os_info",
          "project_key",
          "status",
          "created_at",
          "updated_at"
        ],
        `SELECT
            id,
            source,
            category,
            title,
            content,
            contact,
            client_name,
            client_version,
            client_ip,
            os_info,
            project_key,
            COALESCE(status, 'open') AS status,
            created_at,
            updated_at
          FROM __SOURCE_TABLE__`
      )
    );
  } else {
    skippedTables.push("source.feedbacks");
  }

  return { module: "feedbacks", stats, skippedTables };
}

function runModule(db: Database.Database, moduleName: ModuleName): ModuleSummary {
  switch (moduleName) {
    case "users":
      return migrateUsersModule(db);
    case "projects":
      return migrateProjectsModule(db);
    case "project-meta":
      return migrateProjectMetaModule(db);
    case "content":
      return migrateContentModule(db);
    case "issues":
      return migrateIssuesModule(db);
    case "rd":
      return migrateRdModule(db);
    case "feedbacks":
      return migrateFeedbacksModule(db);
    default:
      return { module: moduleName, stats: [], skippedTables: [] };
  }
}

function main() {
  const config = loadEnv();
  const options = parseArgs(process.argv.slice(2), config.dbPath);

  const targetConfig = { ...config, dbPath: options.target };
  const db = createSqliteDatabase(targetConfig);

  try {
    runMigrations(db);
    db.prepare("ATTACH DATABASE ? AS source").run(options.source);

    const selectedModules =
      options.module === "all" ? MODULES : [options.module];

    const result: {
      source: string;
      target: string;
      dryRun: boolean;
      module: string;
      modules: ModuleSummary[];
    } = {
      source: options.source,
      target: options.target,
      dryRun: options.dryRun,
      module: options.module,
      modules: []
    };

    if (options.dryRun) {
      for (const moduleName of selectedModules) {
        const previewStats: MigrationStat[] = [];
        const previewTablesByModule: Record<ModuleName, string[]> = {
          users: ["users", "admin_users"],
          projects: ["projects", "project_members", "project_member_roles"],
          "project-meta": ["project_modules", "project_environments", "project_versions"],
          content: [
            "uploads",
            "announcements",
            "announcement_reads",
            "documents",
            "releases",
            "shared_config"
          ],
          issues: [
            "issues",
            "issue_comments",
            "issue_attachments",
            "issue_participants",
            "issue_action_logs"
          ],
          rd: ["rd_stages", "rd_items", "rd_logs"],
          feedbacks: ["feedbacks"]
        };

        const missing: string[] = [];
        for (const table of previewTablesByModule[moduleName]) {
          if (!tableExists(db, "source", table)) {
            missing.push(`source.${table}`);
            continue;
          }
          previewStats.push({
            table: table,
            before: countRows(db, "main", table),
            after: countRows(db, "source", table),
            inserted: 0
          });
        }

        result.modules.push({
          module: moduleName,
          stats: previewStats,
          skippedTables: missing
        });
      }
    } else {
      const transaction = db.transaction(() => {
        for (const moduleName of selectedModules) {
          result.modules.push(runModule(db, moduleName));
        }
      });
      transaction();
    }

    db.prepare("DETACH DATABASE source").run();

    console.log(JSON.stringify(result, null, 2));
  } finally {
    db.close();
  }
}

main();
