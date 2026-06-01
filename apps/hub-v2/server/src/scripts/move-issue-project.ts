/**
 * 临时修复脚本：将误建到其他项目的问题单移动回目标项目。
 *
 * 默认 dry-run，只输出计划和风险提示；加 --apply 才会实际更新。
 *
 * 用法示例：
 * - 预览：
 *   npm --prefix apps/hub-v2/server run issue:move-project -- --issue-no=BXX-TEST-0001 --from-project=B项目KEY --to-project=A项目KEY
 * - 执行并重编号（默认）：
 *   npm --prefix apps/hub-v2/server run issue:move-project -- --apply --issue-no=BXX-TEST-0001 --from-project=B项目KEY --to-project=A项目KEY
 * - 保留原测试单编号：
 *   npm --prefix apps/hub-v2/server run issue:move-project -- --apply --issue-id=iss_xxx --to-project=prj_xxx --keep-issue-no
 * - 如果问题单关联了其他项目的 RD 条目，可选择清空 RD 快照后移动：
 *   npm --prefix apps/hub-v2/server run issue:move-project -- --apply --issue-id=iss_xxx --to-project=prj_xxx --clear-rd-link
 *
 * 项目选择器支持：
 * - --to-project / --from-project：精确匹配 projects.id、project_key、project_no、display_code 或 name
 * - --to-project-id / --from-project-id
 * - --to-project-key / --from-project-key
 * - --to-project-code / --from-project-code：匹配 display_code
 * - --to-project-no / --from-project-no
 */
import type Database from "better-sqlite3";
import { loadMigrationEnv } from "../shared/env/env";
import { createSqliteDatabase } from "../shared/db/sqlite";
import { genId } from "../shared/utils/id";
import { nowIso } from "../shared/utils/time";

type ProjectSelectorKind = "any" | "id" | "key" | "code" | "no";

type ProjectSelector = {
  kind: ProjectSelectorKind;
  value: string;
};

type Args = {
  apply: boolean;
  issueId: string | null;
  issueNo: string | null;
  fromProject: ProjectSelector | null;
  toProject: ProjectSelector;
  keepIssueNo: boolean;
  clearRdLink: boolean;
  allowCrossProjectRdLink: boolean;
  noLog: boolean;
  operatorId: string | null;
  operatorName: string | null;
};

type ProjectRow = {
  id: string;
  project_key: string;
  project_no: string | null;
  display_code: string | null;
  name: string;
};

type IssueRow = {
  id: string;
  project_id: string;
  issue_no: string;
  title: string;
  type: "bug" | "feature" | "change" | "improvement" | "task" | "test" | "support";
  status: string;
  reporter_id: string;
  reporter_name: string;
  assignee_id: string | null;
  assignee_name: string | null;
  verifier_id: string | null;
  verifier_name: string | null;
  rd_item_id: string | null;
  rd_no_snapshot: string | null;
  rd_title_snapshot: string | null;
  module_code: string | null;
  version_code: string | null;
  environment_code: string | null;
  updated_at: string;
};

type RdItemRow = {
  id: string;
  project_id: string;
  rd_no: string;
  title: string;
};

type MovePlan = {
  issue: ReturnType<typeof summarizeIssue>;
  fromProject: ReturnType<typeof summarizeProject>;
  toProject: ReturnType<typeof summarizeProject>;
  dryRun: boolean;
  plannedIssueNo: string;
  keepIssueNo: boolean;
  clearRdLink: boolean;
  relationshipCounts: Record<string, number | null>;
  warnings: string[];
};

const ISSUE_NO_PREFIX_BY_TYPE: Record<IssueRow["type"], string> = {
  bug: "BUG",
  feature: "FEAT",
  change: "CHG",
  improvement: "IMP",
  task: "TASK",
  test: "TEST",
  support: "TASK",
};

function usage(): string {
  return [
    "Usage:",
    "  npm --prefix apps/hub-v2/server run issue:move-project -- --issue-no=<issue_no> --to-project=<project> [--from-project=<project>] [--apply]",
    "  npm --prefix apps/hub-v2/server run issue:move-project -- --issue-id=<issue_id> --to-project-id=<project_id> [--keep-issue-no]",
    "",
    "Options:",
    "  --apply                         execute changes; default is dry-run",
    "  --issue-id=<id>                  issue id selector",
    "  --issue-no=<no>                  issue_no selector",
    "  --from-project=<value>           optional guard; matches id/key/no/display_code/name",
    "  --to-project=<value>             target; matches id/key/no/display_code/name",
    "  --keep-issue-no                  keep current issue_no instead of generating target project issue_no",
    "  --clear-rd-link                  clear rd_item_id and RD snapshots if linked RD item belongs to another project",
    "  --allow-cross-project-rd-link     allow moving while keeping a cross-project RD link",
    "  --no-log                         do not append an issue_logs update record",
  ].join("\n");
}

function readArg(argv: string[], flag: string): string | null {
  const eq = argv.find((item) => item.startsWith(`${flag}=`));
  if (eq) {
    return eq.slice(flag.length + 1).trim() || null;
  }
  const index = argv.indexOf(flag);
  if (index >= 0) {
    return argv[index + 1]?.trim() || null;
  }
  return null;
}

function readProjectSelector(argv: string[], prefix: "from" | "to"): ProjectSelector | null {
  const exact = readArg(argv, `--${prefix}-project`);
  if (exact) {
    return { kind: "any", value: exact };
  }

  const id = readArg(argv, `--${prefix}-project-id`);
  if (id) {
    return { kind: "id", value: id };
  }

  const key = readArg(argv, `--${prefix}-project-key`);
  if (key) {
    return { kind: "key", value: key };
  }

  const code = readArg(argv, `--${prefix}-project-code`);
  if (code) {
    return { kind: "code", value: code };
  }

  const projectNo = readArg(argv, `--${prefix}-project-no`);
  if (projectNo) {
    return { kind: "no", value: projectNo };
  }

  return null;
}

function parseArgs(argv: string[]): Args {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(usage());
    process.exit(0);
  }

  const issueId = readArg(argv, "--issue-id");
  const issueNo = readArg(argv, "--issue-no");
  if ((issueId ? 1 : 0) + (issueNo ? 1 : 0) !== 1) {
    throw new Error("请且只请提供一个问题选择器：--issue-id 或 --issue-no");
  }

  const toProject = readProjectSelector(argv, "to");
  if (!toProject) {
    throw new Error("请提供目标项目：--to-project 或 --to-project-id/--to-project-key/--to-project-code/--to-project-no");
  }

  return {
    apply: argv.includes("--apply"),
    issueId,
    issueNo,
    fromProject: readProjectSelector(argv, "from"),
    toProject,
    keepIssueNo: argv.includes("--keep-issue-no"),
    clearRdLink: argv.includes("--clear-rd-link"),
    allowCrossProjectRdLink: argv.includes("--allow-cross-project-rd-link"),
    noLog: argv.includes("--no-log"),
    operatorId: readArg(argv, "--operator-id"),
    operatorName: readArg(argv, "--operator-name") ?? "move-issue-project-script",
  };
}

function findIssue(db: Database.Database, args: Pick<Args, "issueId" | "issueNo">): IssueRow {
  const row = args.issueId
    ? db.prepare("SELECT * FROM issues WHERE id = ? LIMIT 1").get(args.issueId)
    : db.prepare("SELECT * FROM issues WHERE issue_no = ? LIMIT 1").get(args.issueNo);
  if (!row) {
    throw new Error(`未找到问题单：${args.issueId ?? args.issueNo}`);
  }
  return row as IssueRow;
}

function findProject(db: Database.Database, selector: ProjectSelector, label: string): ProjectRow {
  const value = selector.value;
  const sqlByKind: Record<ProjectSelectorKind, string> = {
    any: `
      SELECT id, project_key, project_no, display_code, name
      FROM projects
      WHERE id = @value
         OR project_key = @value
         OR COALESCE(project_no, '') = @value
         OR UPPER(COALESCE(display_code, '')) = UPPER(@value)
         OR name = @value
      ORDER BY updated_at DESC, id ASC
    `,
    id: `
      SELECT id, project_key, project_no, display_code, name
      FROM projects
      WHERE id = @value
      LIMIT 2
    `,
    key: `
      SELECT id, project_key, project_no, display_code, name
      FROM projects
      WHERE project_key = @value
      LIMIT 2
    `,
    code: `
      SELECT id, project_key, project_no, display_code, name
      FROM projects
      WHERE UPPER(COALESCE(display_code, '')) = UPPER(@value)
      LIMIT 3
    `,
    no: `
      SELECT id, project_key, project_no, display_code, name
      FROM projects
      WHERE COALESCE(project_no, '') = @value
      LIMIT 3
    `,
  };

  const rows = db.prepare(sqlByKind[selector.kind]).all({ value }) as ProjectRow[];
  if (rows.length === 0) {
    throw new Error(`未找到${label}项目：${value}`);
  }
  if (rows.length > 1) {
    const candidates = rows.map((row) => `${row.id}/${row.project_key}/${row.display_code ?? "-"}/${row.name}`).join(", ");
    throw new Error(`${label}项目选择器不唯一：${value}；候选：${candidates}`);
  }
  return rows[0];
}

function findProjectById(db: Database.Database, projectId: string): ProjectRow {
  return findProject(db, { kind: "id", value: projectId }, "当前");
}

function findRdItem(db: Database.Database, rdItemId: string | null): RdItemRow | null {
  if (!rdItemId) {
    return null;
  }
  const row = db
    .prepare(
      `
        SELECT id, project_id, rd_no, title
        FROM rd_items
        WHERE id = ?
        LIMIT 1
      `
    )
    .get(rdItemId) as RdItemRow | undefined;
  return row ?? null;
}

function tableExists(db: Database.Database, tableName: string): boolean {
  const row = db
    .prepare("SELECT 1 AS hit FROM sqlite_master WHERE type IN ('table', 'view') AND name = ? LIMIT 1")
    .get(tableName) as { hit: number } | undefined;
  return !!row;
}

function countWhere(db: Database.Database, tableName: string, whereSql: string, params: unknown[]): number | null {
  if (!tableExists(db, tableName)) {
    return null;
  }
  const row = db.prepare(`SELECT COUNT(*) AS total FROM ${tableName} WHERE ${whereSql}`).get(...params) as { total: number };
  return row.total;
}

function collectRelationshipCounts(db: Database.Database, issueId: string): Record<string, number | null> {
  return {
    logs: countWhere(db, "issue_logs", "issue_id = ?", [issueId]),
    comments: countWhere(db, "issue_comments", "issue_id = ?", [issueId]),
    participants: countWhere(db, "issue_participants", "issue_id = ?", [issueId]),
    attachments: countWhere(db, "issue_attachments", "issue_id = ?", [issueId]),
    branches: countWhere(db, "issue_branches", "issue_id = ?", [issueId]),
  };
}

function getNextIssueNo(db: Database.Database, targetProject: ProjectRow, type: IssueRow["type"]): string {
  const projectCode = (targetProject.display_code?.trim() || "PRJ").toUpperCase().slice(0, 3).padEnd(3, "X");
  const typeCode = ISSUE_NO_PREFIX_BY_TYPE[type] ?? "ISS";
  const row = db.prepare("SELECT COUNT(*) AS total FROM issues WHERE project_id = ?").get(targetProject.id) as { total: number };
  let seq = row.total + 1;

  while (seq <= 999999) {
    const candidate = `${projectCode}-${typeCode}-${String(seq).padStart(4, "0")}`;
    const exists = db.prepare("SELECT 1 AS hit FROM issues WHERE issue_no = ? LIMIT 1").get(candidate) as
      | { hit: number }
      | undefined;
    if (!exists) {
      return candidate;
    }
    seq += 1;
  }

  throw new Error("无法生成新的问题单编号");
}

function collectActors(issue: IssueRow): Array<{ id: string; name: string; role: string }> {
  const actors = [
    { id: issue.reporter_id, name: issue.reporter_name, role: "reporter" },
    { id: issue.assignee_id, name: issue.assignee_name ?? "", role: "assignee" },
    { id: issue.verifier_id, name: issue.verifier_name ?? "", role: "verifier" },
  ];
  const seen = new Set<string>();
  return actors
    .filter((actor): actor is { id: string; name: string; role: string } => !!actor.id)
    .filter((actor) => {
      if (seen.has(actor.id)) {
        return false;
      }
      seen.add(actor.id);
      return true;
    });
}

function collectWarnings(db: Database.Database, issue: IssueRow, targetProject: ProjectRow, rdItem: RdItemRow | null, args: Args): string[] {
  const warnings: string[] = [];

  if (rdItem && rdItem.project_id !== targetProject.id) {
    warnings.push(
      `问题单关联的 RD 条目 ${rdItem.rd_no}(${rdItem.id}) 属于其他项目；执行时需要 --clear-rd-link 或 --allow-cross-project-rd-link`
    );
  }

  const participants = tableExists(db, "issue_participants")
    ? (db
        .prepare(
          `
            SELECT user_id AS id, user_name AS name
            FROM issue_participants
            WHERE issue_id = ?
            ORDER BY created_at ASC
          `
        )
        .all(issue.id) as Array<{ id: string; name: string }>)
    : [];

  const actors = [
    ...collectActors(issue),
    ...participants.map((item) => ({ id: item.id, name: item.name, role: "participant" })),
  ];
  const missingMembers = actors.filter((actor) => {
    const row = db
      .prepare("SELECT 1 AS hit FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1")
      .get(targetProject.id, actor.id) as { hit: number } | undefined;
    return !row;
  });
  if (missingMembers.length > 0) {
    warnings.push(
      `目标项目缺少这些问题相关人员的项目成员关系：${missingMembers
        .map((item) => `${item.name || item.id}(${item.role})`)
        .join(", ")}`
    );
  }

  if (issue.module_code && !projectMetaValueExists(db, "project_modules", targetProject.id, issue.module_code)) {
    warnings.push(`目标项目未找到模块编码/名称：${issue.module_code}`);
  }
  if (issue.version_code && !projectVersionValueExists(db, targetProject.id, issue.version_code)) {
    warnings.push(`目标项目未找到版本编码/名称：${issue.version_code}`);
  }
  if (issue.environment_code && !projectMetaValueExists(db, "project_environments", targetProject.id, issue.environment_code)) {
    warnings.push(`目标项目未找到环境编码/名称：${issue.environment_code}`);
  }

  if (args.keepIssueNo) {
    warnings.push(`将保留原问题单编号 ${issue.issue_no}；如果编号包含项目编码，移动后可能仍显示旧项目编码`);
  }

  return warnings;
}

function projectMetaValueExists(db: Database.Database, tableName: "project_modules" | "project_environments", projectId: string, value: string): boolean {
  if (!tableExists(db, tableName)) {
    return true;
  }
  const row = db
    .prepare(`SELECT 1 AS hit FROM ${tableName} WHERE project_id = ? AND (code = ? OR name = ?) LIMIT 1`)
    .get(projectId, value, value) as { hit: number } | undefined;
  return !!row;
}

function projectVersionValueExists(db: Database.Database, projectId: string, value: string): boolean {
  if (!tableExists(db, "project_versions")) {
    return true;
  }
  const row = db
    .prepare("SELECT 1 AS hit FROM project_versions WHERE project_id = ? AND (code = ? OR version = ?) LIMIT 1")
    .get(projectId, value, value) as { hit: number } | undefined;
  return !!row;
}

function assertMoveAllowed(issue: IssueRow, currentProject: ProjectRow, targetProject: ProjectRow, rdItem: RdItemRow | null, args: Args): void {
  if (currentProject.id === targetProject.id) {
    throw new Error(`问题单已经在目标项目中：${targetProject.name}(${targetProject.id})`);
  }

  if (rdItem && rdItem.project_id !== targetProject.id && !args.clearRdLink && !args.allowCrossProjectRdLink) {
    throw new Error(
      `问题单关联的 RD 条目 ${rdItem.rd_no}(${rdItem.id}) 不属于目标项目；请确认后加 --clear-rd-link 或 --allow-cross-project-rd-link`
    );
  }
}

function summarizeProject(project: ProjectRow) {
  return {
    id: project.id,
    projectKey: project.project_key,
    projectNo: project.project_no,
    displayCode: project.display_code,
    name: project.name,
  };
}

function summarizeIssue(issue: IssueRow) {
  return {
    id: issue.id,
    issueNo: issue.issue_no,
    title: issue.title,
    type: issue.type,
    status: issue.status,
    projectId: issue.project_id,
    rdItemId: issue.rd_item_id,
    rdNoSnapshot: issue.rd_no_snapshot,
    rdTitleSnapshot: issue.rd_title_snapshot,
    updatedAt: issue.updated_at,
  };
}

function buildPlan(db: Database.Database, args: Args): MovePlan {
  const issue = findIssue(db, args);
  const currentProject = findProjectById(db, issue.project_id);
  const targetProject = findProject(db, args.toProject, "目标");
  const sourceGuardProject = args.fromProject ? findProject(db, args.fromProject, "来源") : null;
  if (sourceGuardProject && sourceGuardProject.id !== currentProject.id) {
    throw new Error(
      `来源项目保护未通过：问题单当前在 ${currentProject.name}(${currentProject.id})，不是 ${sourceGuardProject.name}(${sourceGuardProject.id})`
    );
  }

  const rdItem = findRdItem(db, issue.rd_item_id);
  assertMoveAllowed(issue, currentProject, targetProject, rdItem, args);
  const plannedIssueNo = args.keepIssueNo ? issue.issue_no : getNextIssueNo(db, targetProject, issue.type);

  return {
    issue: summarizeIssue(issue),
    fromProject: summarizeProject(currentProject),
    toProject: summarizeProject(targetProject),
    dryRun: !args.apply,
    plannedIssueNo,
    keepIssueNo: args.keepIssueNo,
    clearRdLink: args.clearRdLink,
    relationshipCounts: collectRelationshipCounts(db, issue.id),
    warnings: collectWarnings(db, issue, targetProject, rdItem, args),
  };
}

function applyMove(db: Database.Database, args: Args): MovePlan {
  const tx = db.transaction(() => {
    const issue = findIssue(db, args);
    const currentProject = findProjectById(db, issue.project_id);
    const targetProject = findProject(db, args.toProject, "目标");
    const sourceGuardProject = args.fromProject ? findProject(db, args.fromProject, "来源") : null;
    if (sourceGuardProject && sourceGuardProject.id !== currentProject.id) {
      throw new Error(
        `来源项目保护未通过：问题单当前在 ${currentProject.name}(${currentProject.id})，不是 ${sourceGuardProject.name}(${sourceGuardProject.id})`
      );
    }

    const rdItem = findRdItem(db, issue.rd_item_id);
    assertMoveAllowed(issue, currentProject, targetProject, rdItem, args);

    const updatedAt = nowIso();
    const nextIssueNo = args.keepIssueNo ? issue.issue_no : getNextIssueNo(db, targetProject, issue.type);
    const rdPatch = args.clearRdLink
      ? ", rd_item_id = NULL, rd_no_snapshot = NULL, rd_title_snapshot = NULL, rd_status_snapshot = NULL"
      : "";

    const result = db
      .prepare(
        `
          UPDATE issues
          SET project_id = ?, issue_no = ?, updated_at = ?${rdPatch}
          WHERE id = ? AND project_id = ?
        `
      )
      .run(targetProject.id, nextIssueNo, updatedAt, issue.id, currentProject.id);

    if (result.changes !== 1) {
      throw new Error(`更新问题单失败：期望更新 1 行，实际更新 ${result.changes} 行`);
    }

    if (!args.noLog) {
      db.prepare(
        `
          INSERT INTO issue_logs (
            id, issue_id, action_type, from_status, to_status, operator_id, operator_name, summary, meta_json, created_at
          ) VALUES (?, ?, 'update', ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        genId("islog"),
        issue.id,
        issue.status,
        issue.status,
        args.operatorId,
        args.operatorName,
        `移动问题单所属项目：${currentProject.name} -> ${targetProject.name}`,
        JSON.stringify({
          action: "move_issue_project",
          fromProjectId: currentProject.id,
          fromProjectKey: currentProject.project_key,
          toProjectId: targetProject.id,
          toProjectKey: targetProject.project_key,
          beforeIssueNo: issue.issue_no,
          afterIssueNo: nextIssueNo,
          clearRdLink: args.clearRdLink,
        }),
        updatedAt
      );
    }

    const movedIssue = findIssue(db, { issueId: issue.id, issueNo: null });
    const movedRdItem = findRdItem(db, movedIssue.rd_item_id);
    return {
      issue: summarizeIssue(movedIssue),
      fromProject: summarizeProject(currentProject),
      toProject: summarizeProject(targetProject),
      dryRun: false,
      plannedIssueNo: nextIssueNo,
      keepIssueNo: args.keepIssueNo,
      clearRdLink: args.clearRdLink,
      relationshipCounts: collectRelationshipCounts(db, issue.id),
      warnings: collectWarnings(db, movedIssue, targetProject, movedRdItem, args),
    };
  });

  return tx();
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const config = loadMigrationEnv();
  const db = createSqliteDatabase(config);

  try {
    const result = args.apply ? applyMove(db, args) : buildPlan(db, args);
    console.log(
      JSON.stringify(
        {
          dbPath: config.dbPath,
          ...result,
        },
        null,
        2
      )
    );
  } finally {
    db.close();
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error("");
  console.error(usage());
  process.exitCode = 1;
}
