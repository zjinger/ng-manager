import type Database from "better-sqlite3";
import { genId } from "../../shared/utils/id";
import type {
  IngestedNotification,
  ListNotificationsQuery,
  NotificationCategory,
  NotificationItem,
  NotificationListResult
} from "./notification.types";

const TODO_DEDUPE_WINDOW_MINUTES = 5;
const ACTIVITY_DEDUPE_WINDOW_MINUTES = 10;

type UserNotificationRow = {
  id: string;
  kind: "todo" | "activity";
  entity_type: string;
  action: string;
  title: string;
  description: string;
  source_label: string;
  project_id: string | null;
  created_at: string;
  route: string;
  unread: number;
  project_name: string | null;
};

type UserNotificationPrefsRow = {
  user_id: string;
  channels_json: string | null;
  events_json: string | null;
};

export type UserNotificationPrefs = {
  channels: Record<string, boolean>;
  events: Record<string, boolean>;
};

export type CreateUserNotificationInput = {
  userId: string;
  kind: "todo" | "activity";
  entityType: string;
  entityId: string;
  action: string;
  title: string;
  description: string;
  sourceLabel: string;
  projectId: string | null;
  route: string;
  createdAt: string;
};

export class NotificationRepo {
  constructor(private readonly db: Database.Database) {}

  // Write-through with dedupe:
  // - todo: same (user, entity, action) in 5 minutes merges into one unread row
  // - activity: same (user, entity) in 10 minutes merges into one unread row
  createMany(inputs: CreateUserNotificationInput[]): IngestedNotification[] {
    if (inputs.length === 0) {
      return [];
    }
    const insertStmt = this.db.prepare(
      `
        INSERT INTO user_notifications (
          id, user_id, kind, entity_type, entity_id, action, title, description,
          source_label, project_id, route, unread, read_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?)
      `
    );
    const findRecentUnreadStmt = this.db.prepare(
      `
        SELECT id
        FROM user_notifications
        WHERE user_id = ?
          AND entity_type = ?
          AND entity_id = ?
          AND action = ?
          AND unread = 1
          AND created_at >= ?
        ORDER BY created_at DESC
        LIMIT 1
      `
    );
    const findRecentUnreadActivityStmt = this.db.prepare(
      `
        SELECT id
        FROM user_notifications
        WHERE user_id = ?
          AND entity_type = ?
          AND entity_id = ?
          AND kind = 'activity'
          AND unread = 1
          AND created_at >= ?
        ORDER BY created_at DESC
        LIMIT 1
      `
    );
    const refreshUnreadStmt = this.db.prepare(
      `
        UPDATE user_notifications
        SET kind = ?,
            action = ?,
            title = ?,
            description = ?,
            source_label = ?,
            project_id = ?,
            route = ?,
            created_at = ?,
            unread = 1,
            read_at = NULL
        WHERE id = ?
      `
    );
    const getByIdStmt = this.db.prepare(
      `
        SELECT
          n.id,
          n.kind,
          n.entity_type,
          n.action,
          n.title,
          n.description,
          n.source_label,
          n.project_id,
          n.created_at,
          n.route,
          n.unread,
          p.name AS project_name
        FROM user_notifications n
        LEFT JOIN projects p ON p.id = n.project_id
        WHERE n.user_id = ?
          AND n.id = ?
        LIMIT 1
      `
    );

    const dedupedRows = this.deduplicateBatch(inputs);
    const insert = this.db.transaction((rows: CreateUserNotificationInput[]) => {
      const delivered: IngestedNotification[] = [];
      for (const row of rows) {
        const windowStart = this.minusMinutesIso(
          row.createdAt,
          row.kind === "activity" ? ACTIVITY_DEDUPE_WINDOW_MINUTES : TODO_DEDUPE_WINDOW_MINUTES
        );
        const existing =
          row.kind === "activity"
            ? (findRecentUnreadActivityStmt.get(
                row.userId,
                row.entityType,
                row.entityId,
                windowStart
              ) as { id: string } | undefined)
            : (findRecentUnreadStmt.get(
                row.userId,
                row.entityType,
                row.entityId,
                row.action,
                windowStart
              ) as { id: string } | undefined);
        let targetId = existing?.id ?? "";

        if (existing?.id) {
          refreshUnreadStmt.run(
            row.kind,
            row.action,
            row.title,
            row.description,
            row.sourceLabel,
            row.projectId,
            row.route,
            row.createdAt,
            existing.id
          );
        } else {
          targetId = genId("noti");
          insertStmt.run(
            targetId,
            row.userId,
            row.kind,
            row.entityType,
            row.entityId,
            row.action,
            row.title,
            row.description,
            row.sourceLabel,
            row.projectId,
            row.route,
            row.createdAt
          );
        }

        const updatedRow = getByIdStmt.get(row.userId, targetId) as UserNotificationRow | undefined;
        if (updatedRow) {
          delivered.push({
            userId: row.userId,
            unreadCount: updatedRow.unread === 1 ? 1 : 0,
            item: this.mapRow(updatedRow)
          });
        }
      }
      return delivered;
    });
    return insert(dedupedRows);
  }

  list(query: ListNotificationsQuery, userId: string): NotificationListResult {
    const page = Number.isFinite(Number(query.page)) && Number(query.page) > 0 ? Math.floor(Number(query.page)) : 1;
    const pageSize =
      Number.isFinite(Number(query.pageSize)) && Number(query.pageSize) > 0
        ? Math.floor(Number(query.pageSize))
        : Number.isFinite(Number(query.limit)) && Number(query.limit) > 0
          ? Math.floor(Number(query.limit))
          : 50;
    const offset = (page - 1) * pageSize;

    const conditions: string[] = ["n.user_id = ?"];
    const params: unknown[] = [userId];

    if (query.kind) {
      conditions.push("n.kind = ?");
      params.push(query.kind);
    }
    if (query.category) {
      const categoryFilter = this.buildCategoryFilter(query.category);
      conditions.push(categoryFilter.clause);
      params.push(...categoryFilter.params);
    }
    if (query.projectId?.trim()) {
      conditions.push("n.project_id = ?");
      params.push(query.projectId.trim());
    }
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      conditions.push("(n.title LIKE ? OR n.description LIKE ? OR COALESCE(p.name, '') LIKE ? OR n.source_label LIKE ?)");
      params.push(keyword, keyword, keyword, keyword);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const totalRow = this.db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM user_notifications n
          LEFT JOIN projects p ON p.id = n.project_id
          ${whereClause}
        `
      )
      .get(...params) as { total: number };
    const unreadTotalRow = this.db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM user_notifications
          WHERE user_id = ?
            AND unread = 1
        `
      )
      .get(userId) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT
            n.id,
            n.kind,
            n.entity_type,
            n.action,
            n.title,
            n.description,
            n.source_label,
            n.project_id,
            n.created_at,
            n.route,
            n.unread,
            p.name AS project_name
          FROM user_notifications n
          LEFT JOIN projects p ON p.id = n.project_id
          ${whereClause}
          ORDER BY n.created_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as UserNotificationRow[];

    return {
      total: totalRow.total,
      unreadTotal: unreadTotalRow.total,
      page,
      pageSize,
      items: rows.map((row) => this.mapRow(row))
    };
  }

  markRead(userId: string, notificationIds: string[], readAt: string): number {
    if (notificationIds.length === 0) {
      return 0;
    }
    const placeholders = notificationIds.map(() => "?").join(", ");
    const result = this.db
      .prepare(
        `
          UPDATE user_notifications
          SET unread = 0, read_at = ?
          WHERE user_id = ?
            AND id IN (${placeholders})
            AND unread = 1
        `
      )
      .run(readAt, userId, ...notificationIds);
    return result.changes;
  }

  countUnread(userId: string): number {
    const row = this.db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM user_notifications
          WHERE user_id = ?
            AND unread = 1
        `
      )
      .get(userId) as { total: number };
    return row.total;
  }

  listProjectMemberUserIds(projectId: string): string[] {
    const rows = this.db
      .prepare(
        `
          SELECT pm.user_id
          FROM project_members pm
          INNER JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = ?
            AND u.status = 'active'
        `
      )
      .all(projectId) as Array<{ user_id: string }>;
    return rows.map((row) => row.user_id).filter(Boolean);
  }

  listAllActiveUserIds(): string[] {
    const rows = this.db
      .prepare(
        `
          SELECT id
          FROM users
          WHERE status = 'active'
        `
      )
      .all() as Array<{ id: string }>;
    return rows.map((row) => row.id).filter(Boolean);
  }

  listNotificationPrefsByUserIds(userIds: string[]): Map<string, UserNotificationPrefs> {
    const normalizedUserIds = Array.from(new Set(userIds.map((id) => id.trim()).filter(Boolean)));
    if (normalizedUserIds.length === 0) {
      return new Map();
    }
    const placeholders = normalizedUserIds.map(() => "?").join(", ");
    const rows = this.db
      .prepare(
        `
          SELECT
            a.user_id,
            p.channels_json,
            p.events_json
          FROM admin_accounts a
          LEFT JOIN profile_notification_prefs p ON p.account_id = a.id
          WHERE a.user_id IN (${placeholders})
        `
      )
      .all(...normalizedUserIds) as UserNotificationPrefsRow[];

    const prefsByUser = new Map<string, UserNotificationPrefs>();
    for (const row of rows) {
      prefsByUser.set(row.user_id, {
        channels: this.parseBooleanMap(row.channels_json),
        events: this.parseBooleanMap(row.events_json)
      });
    }
    return prefsByUser;
  }

  private mapRow(row: UserNotificationRow): NotificationItem {
    return {
      id: row.id,
      kind: row.kind,
      category: this.classifyCategory(row.entity_type, row.kind, row.action),
      unread: row.unread === 1,
      sourceLabel: row.source_label,
      title: row.title,
      description: row.description,
      time: row.created_at,
      projectId: row.project_id,
      projectName: row.project_name ?? (row.project_id ? "未命名项目" : "全局"),
      route: row.route
    };
  }

  private deduplicateBatch(inputs: CreateUserNotificationInput[]): CreateUserNotificationInput[] {
    // Collapse same-batch duplicates before DB lookup to reduce write/read amplification.
    const byKey = new Map<string, CreateUserNotificationInput>();
    for (const row of inputs) {
      const key =
        row.kind === "activity"
          ? `${row.userId}::${row.entityType}::${row.entityId}::activity`
          : `${row.userId}::${row.entityType}::${row.entityId}::${row.action}`;
      const previous = byKey.get(key);
      if (!previous || row.createdAt >= previous.createdAt) {
        byKey.set(key, row);
      }
    }
    return Array.from(byKey.values());
  }

  private buildCategoryFilter(category: NotificationCategory): { clause: string; params: string[] } {
    if (category === "issue_todo") {
      return { clause: "(n.entity_type = ? AND n.kind = 'todo')", params: ["issue"] };
    }
    if (category === "issue_mention") {
      return { clause: "(n.entity_type = ? AND n.action = ?)", params: ["issue", "commented"] };
    }
    if (category === "issue_activity") {
      return {
        clause: "(n.entity_type = ? AND n.kind = 'activity' AND n.action <> ?)",
        params: ["issue", "commented"]
      };
    }
    if (category === "rd_todo") {
      return { clause: "(n.entity_type = ? AND n.kind = 'todo')", params: ["rd"] };
    }
    if (category === "rd_activity") {
      return { clause: "(n.entity_type = ? AND n.kind = 'activity')", params: ["rd"] };
    }
    if (category === "project_member") {
      return { clause: "(n.entity_type = ?)", params: ["project"] };
    }
    return { clause: "(n.entity_type = ?)", params: [category] };
  }

  private classifyCategory(entityType: string, kind: "todo" | "activity", action: string): NotificationCategory {
    if (entityType === "issue") {
      if (kind === "todo") {
        return "issue_todo";
      }
      if (action === "commented") {
        return "issue_mention";
      }
      return "issue_activity";
    }
    if (entityType === "rd") {
      return kind === "todo" ? "rd_todo" : "rd_activity";
    }
    if (entityType === "project") {
      return "project_member";
    }
    if (entityType === "announcement" || entityType === "document" || entityType === "release") {
      return entityType;
    }
    return "issue_activity";
  }

  private parseBooleanMap(value: string | null): Record<string, boolean> {
    if (!value?.trim()) {
      return {};
    }
    try {
      const data = JSON.parse(value) as Record<string, unknown>;
      return Object.fromEntries(Object.entries(data).map(([key, item]) => [key, Boolean(item)]));
    } catch {
      return {};
    }
  }

  private minusMinutesIso(sourceIso: string, minutes: number): string {
    const sourceMs = Date.parse(sourceIso);
    const base = Number.isFinite(sourceMs) ? sourceMs : Date.now();
    return new Date(base - minutes * 60_000).toISOString();
  }
}
