import type Database from "better-sqlite3";
import type { RequestContext } from "../../shared/context/request-context";
import type { AdminSearchEntityType, AdminSearchItem, AdminSearchQueryInput, AdminSearchResult } from "./admin-search.types";

type SearchDomain = {
  type: AdminSearchEntityType;
  permission: string;
  query: (keyword: string, limit: number) => AdminSearchItem[];
  count: (keyword: string) => number;
};

type SearchRow = Record<string, unknown>;

const TYPE_PERMISSIONS: Record<AdminSearchEntityType, string> = {
  user: "admin.users.manage",
  department: "admin.departments.manage",
  role: "admin.roles.manage",
  permission: "admin.roles.manage",
  audit_log: "admin.audit.view",
  setting: "admin.settings.manage"
};

const SETTING_ITEMS = [
  {
    id: "general",
    title: "常规设置",
    snippet: "平台名称、基础信息和全局默认配置",
    aliases: ["常规", "基础", "general", "平台", "配置"],
    tab: "general"
  },
  {
    id: "security",
    title: "安全策略",
    snippet: "密码策略、登录安全和会话控制",
    aliases: ["安全", "密码", "登录", "security", "会话"],
    tab: "security"
  },
  {
    id: "notifications",
    title: "通知配置",
    snippet: "系统通知、消息渠道和提醒策略",
    aliases: ["通知", "消息", "提醒", "notification", "notifications"],
    tab: "notifications"
  },
  {
    id: "integration",
    title: "集成与 API",
    snippet: "外部集成、API 配置和开放能力",
    aliases: ["集成", "api", "API", "接口", "integration"],
    tab: "integration"
  }
];

export class AdminSearchService {
  constructor(private readonly db: Database.Database) {}

  search(input: AdminSearchQueryInput, ctx: RequestContext): AdminSearchResult {
    const keyword = input.q.trim();
    if (keyword.length < 2) {
      return { items: [], total: 0 };
    }

    const requestedTypes = new Set(input.types && input.types.length > 0 ? input.types : Object.keys(TYPE_PERMISSIONS) as AdminSearchEntityType[]);
    const domains = this.getDomains()
      .filter((domain) => requestedTypes.has(domain.type))
      .filter((domain) => this.hasPermission(ctx, domain.permission));

    let total = 0;
    const items: AdminSearchItem[] = [];
    for (const domain of domains) {
      total += domain.count(keyword);
      items.push(...domain.query(keyword, input.limit));
    }

    return {
      items: items
        .sort((left, right) => left.score - right.score || right.updatedAt.localeCompare(left.updatedAt) || left.title.localeCompare(right.title))
        .slice(0, input.limit),
      total
    };
  }

  private getDomains(): SearchDomain[] {
    return [
      {
        type: "user",
        permission: TYPE_PERMISSIONS.user,
        count: (keyword) => this.countRows("users u", "(u.username LIKE ? OR u.display_name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)", keyword),
        query: (keyword, limit) => this.queryRows(
          `
            SELECT id, username, display_name, email, mobile, status, updated_at
            FROM users u
            WHERE u.username LIKE ? OR u.display_name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?
            ORDER BY updated_at DESC
            LIMIT ?
          `,
          keyword,
          limit,
          (row) => ({
            type: "user",
            id: String(row.id),
            title: String(row.display_name || row.username),
            snippet: `账号 ${String(row.username)} · ${String(row.status)}${row.email ? ` · ${String(row.email)}` : ""}`,
            updatedAt: String(row.updated_at),
            url: this.url("/admin/users", keyword)
          })
        )
      },
      {
        type: "department",
        permission: TYPE_PERMISSIONS.department,
        count: (keyword) => this.countRows("departments d", "(d.code LIKE ? OR d.name LIKE ? OR d.external_finance_code LIKE ?)", keyword, 3),
        query: (keyword, limit) => this.queryRows(
          `
            SELECT id, code, name, status, external_finance_code, updated_at
            FROM departments d
            WHERE d.code LIKE ? OR d.name LIKE ? OR d.external_finance_code LIKE ?
            ORDER BY sort ASC, name ASC
            LIMIT ?
          `,
          keyword,
          limit,
          (row) => ({
            type: "department",
            id: String(row.id),
            title: String(row.name),
            snippet: `部门编码 ${String(row.code)} · ${String(row.status)}${row.external_finance_code ? ` · 财务编码 ${String(row.external_finance_code)}` : ""}`,
            updatedAt: String(row.updated_at),
            url: this.url("/admin/departments", keyword)
          }),
          3
        )
      },
      {
        type: "role",
        permission: TYPE_PERMISSIONS.role,
        count: (keyword) => this.countRows("system_roles r", "(r.code LIKE ? OR r.name LIKE ? OR r.description LIKE ?)", keyword, 3),
        query: (keyword, limit) => this.queryRows(
          `
            SELECT id, code, name, purpose_name, status, updated_at
            FROM system_roles r
            WHERE r.code LIKE ? OR r.name LIKE ? OR r.description LIKE ?
            ORDER BY sort ASC, name ASC
            LIMIT ?
          `,
          keyword,
          limit,
          (row) => ({
            type: "role",
            id: String(row.id),
            title: String(row.name),
            snippet: `角色编码 ${String(row.code)} · ${String(row.purpose_name)} · ${String(row.status)}`,
            updatedAt: String(row.updated_at),
            url: this.url("/admin/roles", keyword)
          }),
          3
        )
      },
      {
        type: "permission",
        permission: TYPE_PERMISSIONS.permission,
        count: (keyword) => this.countRows("system_permissions p", "(p.code LIKE ? OR p.name LIKE ? OR p.group_name LIKE ? OR p.domain_name LIKE ?)", keyword),
        query: (keyword, limit) => this.queryRows(
          `
            SELECT id, code, name, group_name, domain_name, status, updated_at
            FROM system_permissions p
            WHERE p.code LIKE ? OR p.name LIKE ? OR p.group_name LIKE ? OR p.domain_name LIKE ?
            ORDER BY domain_code ASC, group_code ASC, sort ASC
            LIMIT ?
          `,
          keyword,
          limit,
          (row) => ({
            type: "permission",
            id: String(row.id),
            title: String(row.name),
            snippet: `${String(row.domain_name)} / ${String(row.group_name)} · ${String(row.code)} · ${String(row.status)}`,
            updatedAt: String(row.updated_at),
            url: this.url("/admin/permission-items", keyword)
          })
        )
      },
      {
        type: "audit_log",
        permission: TYPE_PERMISSIONS.audit_log,
        count: (keyword) => this.countRows("admin_audit_logs l", "(l.summary LIKE ? OR l.actor_name LIKE ? OR l.target_name LIKE ? OR l.target_id LIKE ? OR l.ip LIKE ? OR l.request_id LIKE ?)", keyword, 6),
        query: (keyword, limit) => this.queryRows(
          `
            SELECT id, module, action, level, actor_name, target_name, summary, created_at
            FROM admin_audit_logs l
            WHERE l.summary LIKE ? OR l.actor_name LIKE ? OR l.target_name LIKE ? OR l.target_id LIKE ? OR l.ip LIKE ? OR l.request_id LIKE ?
            ORDER BY created_at DESC, id DESC
            LIMIT ?
          `,
          keyword,
          limit,
          (row) => ({
            type: "audit_log",
            id: String(row.id),
            title: String(row.summary),
            snippet: `${String(row.module)} / ${String(row.action)} · ${String(row.level)}${row.actor_name ? ` · ${String(row.actor_name)}` : ""}${row.target_name ? ` · ${String(row.target_name)}` : ""}`,
            updatedAt: String(row.created_at),
            url: this.url("/admin/audit", keyword)
          }),
          6
        )
      },
      {
        type: "setting",
        permission: TYPE_PERMISSIONS.setting,
        count: (keyword) => this.matchSettings(keyword).length,
        query: (keyword, limit) => this.matchSettings(keyword).slice(0, limit)
      }
    ];
  }

  private countRows(table: string, condition: string, keyword: string, copies = 4): number {
    const like = `%${keyword}%`;
    const row = this.db.prepare(`SELECT COUNT(*) AS total FROM ${table} WHERE ${condition}`).get(...Array(copies).fill(like)) as { total: number } | undefined;
    return row?.total ?? 0;
  }

  private queryRows(
    sql: string,
    keyword: string,
    limit: number,
    map: (row: SearchRow) => Omit<AdminSearchItem, "projectId" | "score">,
    copies = 4
  ): AdminSearchItem[] {
    const like = `%${keyword}%`;
    const rows = this.db.prepare(sql).all(...Array(copies).fill(like), Math.max(limit, 1)) as SearchRow[];
    return rows.map((row) => {
      const item = map(row);
      return {
        ...item,
        projectId: null,
        score: this.score(item.title, item.snippet, keyword)
      };
    });
  }

  private matchSettings(keyword: string): AdminSearchItem[] {
    const normalized = keyword.toLowerCase();
    return SETTING_ITEMS
      .filter((item) => [item.title, item.snippet, ...item.aliases].some((text) => text.toLowerCase().includes(normalized)))
      .map((item) => ({
        type: "setting",
        id: item.id,
        projectId: null,
        title: item.title,
        snippet: item.snippet,
        updatedAt: "1970-01-01T00:00:00.000Z",
        score: this.score(item.title, item.snippet, keyword),
        url: this.url("/admin/settings", keyword, { tab: item.tab })
      }));
  }

  private score(title: string, snippet: string, keyword: string): number {
    const normalizedKeyword = keyword.toLowerCase();
    const normalizedTitle = title.toLowerCase();
    if (normalizedTitle === normalizedKeyword) {
      return 0;
    }
    if (normalizedTitle.startsWith(normalizedKeyword)) {
      return 1;
    }
    if (normalizedTitle.includes(normalizedKeyword)) {
      return 2;
    }
    return snippet.toLowerCase().includes(normalizedKeyword) ? 3 : 9;
  }

  private url(path: string, keyword: string, extra: Record<string, string> = {}): string {
    const params = new URLSearchParams({ keyword, ...extra });
    return `${path}?${params.toString()}`;
  }

  private hasPermission(ctx: RequestContext, permission: string): boolean {
    return (ctx.authScopes ?? []).includes(permission);
  }
}
