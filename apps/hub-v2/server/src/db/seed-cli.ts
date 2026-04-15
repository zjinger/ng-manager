import type Database from "better-sqlite3"
import { AuthRepo } from "../modules/auth/auth.repo"
import { AuthService } from "../modules/auth/auth.service"
import { runMigrations } from "../shared/db/migrate"
import { createSqliteDatabase } from "../shared/db/sqlite"
import { loadEnv } from "../shared/env/env"
import { hashPassword } from "../shared/utils/password"

type Row = Record<string, string | number | null>

const SEED_MARKER = "seed:hub-v2"

const users = [
  {
    id: "usr_seed_pm",
    username: "pm.hub",
    display_name: "王雯",
    email: "pm.hub@example.local",
    mobile: "13800000001",
    title_code: "PM",
    status: "active",
    source: "local",
    remark: SEED_MARKER,
  },
  {
    id: "usr_seed_dev_1",
    username: "dev.hub",
    display_name: "陈墨",
    email: "dev.hub@example.local",
    mobile: "13800000002",
    title_code: "Frontend",
    status: "active",
    source: "local",
    remark: SEED_MARKER,
  },
  {
    id: "usr_seed_dev_2",
    username: "dev.runtime",
    display_name: "李程",
    email: "dev.runtime@example.local",
    mobile: "13800000003",
    title_code: "Backend",
    status: "active",
    source: "local",
    remark: SEED_MARKER,
  },
  {
    id: "usr_seed_qa",
    username: "qa.hub",
    display_name: "赵晴",
    email: "qa.hub@example.local",
    mobile: "13800000004",
    title_code: "QA",
    status: "active",
    source: "local",
    remark: SEED_MARKER,
  },
  {
    id: "usr_seed_ux",
    username: "ux.hub",
    display_name: "苏澄",
    email: "ux.hub@example.local",
    mobile: "13800000005",
    title_code: "UX",
    status: "active",
    source: "local",
    remark: SEED_MARKER,
  },
  {
    id: "usr_seed_ops",
    username: "ops.hub",
    display_name: "何舟",
    email: "ops.hub@example.local",
    mobile: "13800000006",
    title_code: "Ops",
    status: "active",
    source: "local",
    remark: SEED_MARKER,
  },
] as const

const adminAccounts = [
  {
    id: "adm_seed_pm",
    user_id: "usr_seed_pm",
    username: "pm.hub",
    password_hash: hashPassword("12345678"),
    nickname: "王雯",
    role: "user",
    status: "active",
    must_change_password: 0,
    last_login_at: null,
  },
  {
    id: "adm_seed_dev",
    user_id: "usr_seed_dev_1",
    username: "dev.hub",
    password_hash: hashPassword("12345678"),
    nickname: "陈墨",
    role: "user",
    status: "active",
    must_change_password: 0,
    last_login_at: null,
  },
  {
    id: "adm_seed_qa",
    user_id: "usr_seed_qa",
    username: "qa.hub",
    password_hash: hashPassword("12345678"),
    nickname: "赵晴",
    role: "user",
    status: "active",
    must_change_password: 0,
    last_login_at: null,
  },
] as const

const projects = [
  {
    id: "prj_seed_hub",
    project_key: "HUB",
    name: "ngm-hub",
    description: "Hub v2 重构与协作看板",
    icon: "H",
    status: "active",
    visibility: "internal",
  },
  {
    id: "prj_seed_runtime",
    project_key: "RUNTIME",
    name: "Runtime Core",
    description: "运行时与容器能力迭代",
    icon: "R",
    status: "active",
    visibility: "private",
  },
  {
    id: "prj_seed_console",
    project_key: "CONSOLE",
    name: "Console Shell",
    description: "管理端框架与导航体验优化",
    icon: "C",
    status: "active",
    visibility: "internal",
  },
] as const

const projectMembers = [
  { id: "pm_seed_hub_1", project_id: "prj_seed_hub", user_id: "usr_seed_pm", display_name: "王雯", role_code: "owner", is_owner: 1 },
  { id: "pm_seed_hub_2", project_id: "prj_seed_hub", user_id: "usr_seed_dev_1", display_name: "陈墨", role_code: "member", is_owner: 0 },
  { id: "pm_seed_hub_3", project_id: "prj_seed_hub", user_id: "usr_seed_qa", display_name: "赵晴", role_code: "tester", is_owner: 0 },
  { id: "pm_seed_hub_4", project_id: "prj_seed_hub", user_id: "usr_seed_ux", display_name: "苏澄", role_code: "viewer", is_owner: 0 },
  { id: "pm_seed_runtime_1", project_id: "prj_seed_runtime", user_id: "usr_seed_dev_2", display_name: "李程", role_code: "owner", is_owner: 1 },
  { id: "pm_seed_runtime_2", project_id: "prj_seed_runtime", user_id: "usr_seed_pm", display_name: "王雯", role_code: "manager", is_owner: 0 },
  { id: "pm_seed_runtime_3", project_id: "prj_seed_runtime", user_id: "usr_seed_qa", display_name: "赵晴", role_code: "tester", is_owner: 0 },
  { id: "pm_seed_console_1", project_id: "prj_seed_console", user_id: "usr_seed_dev_1", display_name: "陈墨", role_code: "owner", is_owner: 1 },
  { id: "pm_seed_console_2", project_id: "prj_seed_console", user_id: "usr_seed_pm", display_name: "王雯", role_code: "manager", is_owner: 0 },
  { id: "pm_seed_console_3", project_id: "prj_seed_console", user_id: "usr_seed_ops", display_name: "何舟", role_code: "member", is_owner: 0 },
] as const

const announcements = [
  {
    id: "ann_seed_global_1",
    project_id: null,
    title: "Hub v2 测试环境已开放",
    summary: "现可使用 pm.hub / dev.hub / qa.hub 账号进行联调测试。",
    content_md: "## 测试环境说明\n\n- 默认密码：`12345678`\n- 可切换浅色 / 暗黑主题\n- 当前优先验证 dashboard / users / projects / issues",
    scope: "global",
    pinned: 1,
    status: "published",
    publish_at: offsetIso(-2),
    expire_at: null,
    created_by: SEED_MARKER,
  },
  {
    id: "ann_seed_hub_1",
    project_id: "prj_seed_hub",
    title: "测试单交互稿进入联调",
    summary: "列表视图、卡片视图与详情页样式均已切换到新设计稿。",
    content_md: "请重点验证测试单列表、详情、评论和状态流转页面。",
    scope: "project",
    pinned: 0,
    status: "published",
    publish_at: offsetIso(-8),
    expire_at: null,
    created_by: SEED_MARKER,
  },
  {
    id: "ann_seed_runtime_1",
    project_id: "prj_seed_runtime",
    title: "Runtime 计划切分完成",
    summary: "本周将进入接口整理和发布脚本梳理阶段。",
    content_md: "本公告用于让 dashboard 的最近公告卡片有项目维度数据。",
    scope: "project",
    pinned: 0,
    status: "published",
    publish_at: offsetIso(-20),
    expire_at: null,
    created_by: SEED_MARKER,
  },
] as const

const issues = [
  {
    id: "iss_seed_900001",
    project_id: "prj_seed_hub",
    issue_no: "ISS-900001",
    title: "登录页暗黑模式切换后按钮阴影偏浅",
    description: "切换到暗黑主题后，登录按钮 hover 阴影仍然偏亮，与设计稿不一致。",
    type: "bug",
    status: "resolved",
    priority: "high",
    reporter_id: "usr_seed_qa",
    reporter_name: "赵晴",
    assignee_id: "usr_seed_dev_1",
    assignee_name: "陈墨",
    verifier_id: "usr_seed_qa",
    verifier_name: "赵晴",
    module_code: "Auth",
    version_code: "v2.3.0",
    environment_code: "Staging",
    resolution_summary: "已改成主题变量阴影，并同步浅色/暗黑两套 hover 态。",
    close_reason: null,
    close_remark: null,
    reopen_count: 0,
    started_at: offsetIso(-30),
    resolved_at: offsetIso(-10),
    verified_at: null,
    closed_at: null,
  },
  {
    id: "iss_seed_900002",
    project_id: "prj_seed_hub",
    issue_no: "ISS-900002",
    title: "项目切换器在窄屏下遮挡顶部操作区",
    description: "Sidebar 收起后，项目切换浮层在 1024 宽度下会覆盖头部通知按钮。",
    type: "bug",
    status: "in_progress",
    priority: "medium",
    reporter_id: "usr_seed_pm",
    reporter_name: "王雯",
    assignee_id: "usr_seed_dev_1",
    assignee_name: "陈墨",
    verifier_id: "usr_seed_pm",
    verifier_name: "王雯",
    module_code: "Layout",
    version_code: "v2.3.0",
    environment_code: "Development",
    resolution_summary: null,
    close_reason: null,
    close_remark: null,
    reopen_count: 1,
    started_at: offsetIso(-16),
    resolved_at: null,
    verified_at: null,
    closed_at: null,
  },
  {
    id: "iss_seed_900003",
    project_id: "prj_seed_runtime",
    issue_no: "ISS-900003",
    title: "Runtime 服务启动日志缺少 requestId",
    description: "排查链路时无法快速关联单次请求的日志上下文。",
    type: "task",
    status: "open",
    priority: "medium",
    reporter_id: "usr_seed_ops",
    reporter_name: "何舟",
    assignee_id: "usr_seed_dev_2",
    assignee_name: "李程",
    verifier_id: "usr_seed_pm",
    verifier_name: "王雯",
    module_code: "Server",
    version_code: "v2.2.3",
    environment_code: "Production",
    resolution_summary: null,
    close_reason: null,
    close_remark: null,
    reopen_count: 0,
    started_at: null,
    resolved_at: null,
    verified_at: null,
    closed_at: null,
  },
  {
    id: "iss_seed_900004",
    project_id: "prj_seed_console",
    issue_no: "ISS-900004",
    title: "控制台菜单分组需要补齐权限标记",
    description: "当前菜单已分组，但系统管理区还没有按角色隐藏。",
    type: "improvement",
    status: "verified",
    priority: "low",
    reporter_id: "usr_seed_pm",
    reporter_name: "王雯",
    assignee_id: "usr_seed_dev_1",
    assignee_name: "陈墨",
    verifier_id: "usr_seed_pm",
    verifier_name: "王雯",
    module_code: "Navigation",
    version_code: "v2.3.0",
    environment_code: "Staging",
    resolution_summary: "已完成导航配置收口，待合并角色显示规则。",
    close_reason: null,
    close_remark: null,
    reopen_count: 0,
    started_at: offsetIso(-60),
    resolved_at: offsetIso(-36),
    verified_at: offsetIso(-12),
    closed_at: null,
  },
] as const

const issueLogs = [
  logIssue("ilog_seed_1", "iss_seed_900001", "create", null, "open", "usr_seed_qa", "赵晴", "提报暗黑模式按钮阴影问题", -36),
  logIssue("ilog_seed_2", "iss_seed_900001", "assign", "open", "open", "usr_seed_pm", "王雯", "指派给陈墨处理", -34),
  logIssue("ilog_seed_3", "iss_seed_900001", "start", "open", "in_progress", "usr_seed_dev_1", "陈墨", "开始修复登录页阴影样式", -30),
  logIssue("ilog_seed_4", "iss_seed_900001", "resolve", "in_progress", "resolved", "usr_seed_dev_1", "陈墨", "已切换为主题变量阴影", -10),
  logIssue("ilog_seed_5", "iss_seed_900002", "create", null, "open", "usr_seed_pm", "王雯", "记录窄屏浮层遮挡问题", -20),
  logIssue("ilog_seed_6", "iss_seed_900002", "start", "open", "in_progress", "usr_seed_dev_1", "陈墨", "已开始排查窄屏下的浮层定位", -16),
  logIssue("ilog_seed_7", "iss_seed_900003", "create", null, "open", "usr_seed_ops", "何舟", "提报日志链路问题", -18),
  logIssue("ilog_seed_8", "iss_seed_900004", "verify", "resolved", "verified", "usr_seed_pm", "王雯", "已完成验收，可继续补权限规则", -12),
] as const

const issueComments = [
  commentIssue("icom_seed_1", "iss_seed_900001", "usr_seed_qa", "赵晴", "切暗黑后按钮投影会发白，建议直接参考设计稿里的 dark button 阴影。", -28),
  commentIssue("icom_seed_2", "iss_seed_900002", "usr_seed_dev_1", "陈墨", "已复现，问题出在 project switcher 的浮层层级和偏移计算。", -15),
  commentIssue("icom_seed_3", "iss_seed_900003", "usr_seed_pm", "王雯", "这个问题优先级中等，先保证 requestId 能串起 hub 与 runtime 日志。", -12),
] as const

const issueParticipants = [
  participant("ipt_seed_1", "iss_seed_900001", "usr_seed_pm", "王雯", -34),
  participant("ipt_seed_2", "iss_seed_900002", "usr_seed_qa", "赵晴", -19),
  participant("ipt_seed_3", "iss_seed_900003", "usr_seed_pm", "王雯", -18),
  participant("ipt_seed_4", "iss_seed_900004", "usr_seed_ops", "何舟", -14),
] as const

const rdStages = [
  stage("rds_seed_hub_1", "prj_seed_hub", "待开始", 1, -72),
  stage("rds_seed_hub_2", "prj_seed_hub", "进行中", 2, -72),
  stage("rds_seed_hub_3", "prj_seed_hub", "待验收", 3, -72),
  stage("rds_seed_hub_4", "prj_seed_hub", "已完成", 4, -72),
  stage("rds_seed_runtime_1", "prj_seed_runtime", "待开始", 1, -72),
  stage("rds_seed_runtime_2", "prj_seed_runtime", "进行中", 2, -72),
  stage("rds_seed_runtime_3", "prj_seed_runtime", "待验收", 3, -72),
  stage("rds_seed_runtime_4", "prj_seed_runtime", "已完成", 4, -72),
] as const

const rdItems = [
  {
    id: "rdi_seed_900001",
    project_id: "prj_seed_hub",
    rd_no: "RD-900001",
    title: "工作台 深色主题验收",
    description: "按暗黑设计稿收工作台卡片、列表和 hover 层次。",
    stage_id: "rds_seed_hub_3",
    type: "feature_dev",
    status: "done",
    priority: "high",
    assignee_id: "usr_seed_dev_1",
    assignee_name: "陈墨",
    creator_id: "usr_seed_pm",
    creator_name: "王雯",
    reviewer_id: "usr_seed_pm",
    reviewer_name: "王雯",
    progress: 100,
    plan_start_at: offsetIso(-72),
    plan_end_at: offsetIso(24),
    actual_start_at: offsetIso(-60),
    actual_end_at: offsetIso(-6),
    blocker_reason: null,
  },
  {
    id: "rdi_seed_900002",
    project_id: "prj_seed_hub",
    rd_no: "RD-900002",
    title: "Projects 成员管理弹框落地",
    description: "补齐项目列表、成员管理和测试数据准备入口。",
    stage_id: "rds_seed_hub_2",
    type: "integration",
    status: "doing",
    priority: "medium",
    assignee_id: "usr_seed_dev_1",
    assignee_name: "陈墨",
    creator_id: "usr_seed_pm",
    creator_name: "王雯",
    reviewer_id: "usr_seed_qa",
    reviewer_name: "赵晴",
    progress: 65,
    plan_start_at: offsetIso(-24),
    plan_end_at: offsetIso(36),
    actual_start_at: offsetIso(-20),
    actual_end_at: null,
    blocker_reason: null,
  },
  {
    id: "rdi_seed_900003",
    project_id: "prj_seed_runtime",
    rd_no: "RD-900003",
    title: "RequestContext 日志链路补全",
    description: "将 requestId、source、accountId 全部补齐到 runtime 日志上下文。",
    stage_id: "rds_seed_runtime_2",
    type: "tech_refactor",
    status: "blocked",
    priority: "high",
    assignee_id: "usr_seed_dev_2",
    assignee_name: "李程",
    creator_id: "usr_seed_pm",
    creator_name: "王雯",
    reviewer_id: "usr_seed_ops",
    reviewer_name: "何舟",
    progress: 35,
    plan_start_at: offsetIso(-40),
    plan_end_at: offsetIso(12),
    actual_start_at: offsetIso(-36),
    actual_end_at: null,
    blocker_reason: "需要确认日志聚合侧是否支持新的字段索引",
  },
] as const

const rdLogs = [
  logRd("rlog_seed_1", "prj_seed_hub", "rdi_seed_900001", "create", "创建 dashboard 深色主题验收任务", "usr_seed_pm", "王雯", -72),
  logRd("rlog_seed_2", "prj_seed_hub", "rdi_seed_900001", "start", "开始按暗黑稿收首页卡片层次", "usr_seed_dev_1", "陈墨", -60),
  logRd("rlog_seed_3", "prj_seed_hub", "rdi_seed_900001", "complete", "dashboard 深色稿第一轮完成", "usr_seed_dev_1", "陈墨", -6),
  logRd("rlog_seed_4", "prj_seed_hub", "rdi_seed_900002", "start", "成员管理弹框进行中", "usr_seed_dev_1", "陈墨", -20),
  logRd("rlog_seed_5", "prj_seed_runtime", "rdi_seed_900003", "block", "等待日志平台确认 requestId 检索策略", "usr_seed_dev_2", "李程", -8),
] as const

function offsetIso(hoursOffset: number): string {
  return new Date(Date.now() + hoursOffset * 60 * 60 * 1000).toISOString()
}

function withTimestamps<T extends Row>(row: T, createdAt: string, updatedAt = createdAt): T & Row {
  return {
    ...row,
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

function logIssue(
  id: string,
  issueId: string,
  actionType: string,
  fromStatus: string | null,
  toStatus: string | null,
  operatorId: string | null,
  operatorName: string | null,
  summary: string,
  hoursOffset: number
) {
  return {
    id,
    issue_id: issueId,
    action_type: actionType,
    from_status: fromStatus,
    to_status: toStatus,
    operator_id: operatorId,
    operator_name: operatorName,
    summary,
    meta_json: null,
    created_at: offsetIso(hoursOffset),
  }
}

function commentIssue(id: string, issueId: string, authorId: string, authorName: string, content: string, hoursOffset: number) {
  const ts = offsetIso(hoursOffset)
  return {
    id,
    issue_id: issueId,
    author_id: authorId,
    author_name: authorName,
    content,
    mentions_json: "[]",
    created_at: ts,
    updated_at: ts,
  }
}

function participant(id: string, issueId: string, userId: string, userName: string, hoursOffset: number) {
  return {
    id,
    issue_id: issueId,
    user_id: userId,
    user_name: userName,
    created_at: offsetIso(hoursOffset),
  }
}

function stage(id: string, projectId: string, name: string, sort: number, hoursOffset: number) {
  const ts = offsetIso(hoursOffset)
  return {
    id,
    project_id: projectId,
    name,
    sort,
    enabled: 1,
    created_at: ts,
    updated_at: ts,
  }
}

function logRd(
  id: string,
  projectId: string,
  itemId: string,
  actionType: string,
  content: string,
  operatorId: string | null,
  operatorName: string | null,
  hoursOffset: number
) {
  return {
    id,
    project_id: projectId,
    item_id: itemId,
    action_type: actionType,
    content,
    operator_id: operatorId,
    operator_name: operatorName,
    meta_json: null,
    created_at: offsetIso(hoursOffset),
  }
}

function upsert(db: Database.Database, table: string, row: Row, conflictColumn = "id") {
  const columns = Object.keys(row)
  const placeholders = columns.map(() => "?").join(", ")
  const updates = columns.filter((column) => column !== conflictColumn).map((column) => `${column} = excluded.${column}`).join(", ")
  db.prepare(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT(${conflictColumn}) DO UPDATE SET ${updates}`
  ).run(...columns.map((column) => row[column]))
}

function main() {
  const config = loadEnv()
  const db = createSqliteDatabase(config)

  try {
    runMigrations(db)
    const authService = new AuthService(config, new AuthRepo(db))
    authService.ensureDefaultAdmin()

    const seed = db.transaction(() => {
      for (const user of users) {
        const ts = offsetIso(-96)
        upsert(db, "users", withTimestamps(user, ts))
      }

      for (const account of adminAccounts) {
        const ts = offsetIso(-96)
        upsert(db, "admin_accounts", withTimestamps(account, ts))
      }

      for (const project of projects) {
        const ts = offsetIso(-80)
        upsert(db, "projects", withTimestamps(project, ts))
      }

      for (const member of projectMembers) {
        const ts = offsetIso(-78)
        upsert(
          db,
          "project_members",
          {
            ...member,
            joined_at: ts,
            created_at: ts,
            updated_at: ts,
          }
        )
      }

      for (const announcement of announcements) {
        upsert(
          db,
          "announcements",
          withTimestamps(announcement, announcement.publish_at ?? offsetIso(-24), announcement.publish_at ?? offsetIso(-24))
        )
      }

      for (const issue of issues) {
        const issueCreatedAt = issue.started_at ?? issue.resolved_at ?? issue.verified_at ?? offsetIso(-24)
        const issueUpdatedAt = issue.closed_at ?? issue.verified_at ?? issue.resolved_at ?? issue.started_at ?? issueCreatedAt
        upsert(
          db,
          "issues",
          withTimestamps(issue, issueCreatedAt, issueUpdatedAt)
        )
      }

      for (const issueLog of issueLogs) {
        upsert(db, "issue_logs", issueLog)
      }

      for (const issueComment of issueComments) {
        upsert(db, "issue_comments", issueComment)
      }

      for (const issueParticipant of issueParticipants) {
        upsert(db, "issue_participants", issueParticipant)
      }

      for (const rdStage of rdStages) {
        upsert(db, "rd_stages", rdStage)
      }

      for (const rdItem of rdItems) {
        upsert(
          db,
          "rd_items",
          withTimestamps(rdItem, rdItem.actual_start_at ?? rdItem.plan_start_at ?? offsetIso(-12), rdItem.actual_end_at ?? rdItem.actual_start_at ?? offsetIso(-2))
        )
      }

      for (const rdLog of rdLogs) {
        upsert(db, "rd_logs", rdLog)
      }
    })

    seed()

    const summary = {
      dbPath: config.dbPath,
      seededAccounts: adminAccounts.length + 1,
      seededUsers: users.length,
      seededProjects: projects.length,
      seededMembers: projectMembers.length,
      seededAnnouncements: announcements.length,
      seededIssues: issues.length,
      seededIssueComments: issueComments.length,
      seededRdItems: rdItems.length,
      loginHints: [
        { username: config.initAdminUsername, password: config.initAdminPassword },
        { username: "pm.hub", password: "12345678" },
        { username: "dev.hub", password: "12345678" },
        { username: "qa.hub", password: "12345678" },
      ],
    }

    console.log(JSON.stringify(summary, null, 2))
  } finally {
    db.close()
  }
}

main()
