import type Database from "better-sqlite3";
import type { ProfileActivityItem, ProfileNotificationPrefs, UpdateProfileNotificationPrefsInput } from "./profile.types";

type ProfilePrefsRow = {
  account_id: string;
  channels_json: string;
  events_json: string;
  project_scope_mode?: "all_accessible" | "member_only";
  include_archived_projects?: number;
  updated_at: string;
};

type IssueActivityRow = {
  id: string;
  entity_id: string;
  code: string;
  title: string;
  action: string;
  summary: string | null;
  created_at: string;
  project_id: string;
  project_name: string | null;
};

type RdActivityRow = {
  id: string;
  entity_id: string;
  code: string;
  title: string;
  action: string;
  summary: string | null;
  created_at: string;
  project_id: string;
  project_name: string | null;
};

export class ProfileRepo {
  private readonly hasProjectScopeModeColumn: boolean;
  private readonly hasIncludeArchivedProjectsColumn: boolean;

  constructor(private readonly db: Database.Database) {
    this.hasProjectScopeModeColumn = this.detectProjectScopeModeColumn();
    this.hasIncludeArchivedProjectsColumn = this.detectIncludeArchivedProjectsColumn();
  }

  getNotificationPrefs(accountId: string): ProfileNotificationPrefs | null {
    const row = this.db
      .prepare(
        `
          SELECT account_id, channels_json, events_json, updated_at
          ${this.hasProjectScopeModeColumn ? ", project_scope_mode" : ""}
          ${this.hasIncludeArchivedProjectsColumn ? ", include_archived_projects" : ""}
          FROM profile_notification_prefs
          WHERE account_id = ?
          LIMIT 1
        `
      )
      .get(accountId) as ProfilePrefsRow | undefined;

    if (!row) {
      return null;
    }

    return {
      channels: this.parseBooleanMap(row.channels_json),
      events: this.parseBooleanMap(row.events_json),
      projectScopeMode: row.project_scope_mode ?? "member_only",
      includeArchivedProjects: (row.include_archived_projects ?? 0) === 1,
      updatedAt: row.updated_at
    };
  }

  saveNotificationPrefs(accountId: string, input: UpdateProfileNotificationPrefsInput, now: string): ProfileNotificationPrefs {
    const exists = this.db
      .prepare("SELECT 1 AS ok FROM profile_notification_prefs WHERE account_id = ? LIMIT 1")
      .get(accountId) as { ok: number } | undefined;
    const channelsJson = JSON.stringify(input.channels);
    const eventsJson = JSON.stringify(input.events);
    const projectScopeMode = input.projectScopeMode ?? "member_only";
    const includeArchivedProjects = input.includeArchivedProjects ? 1 : 0;

    if (exists) {
      if (this.hasProjectScopeModeColumn && this.hasIncludeArchivedProjectsColumn) {
        this.db
          .prepare(
            `
              UPDATE profile_notification_prefs
              SET channels_json = ?, events_json = ?, project_scope_mode = ?, include_archived_projects = ?, updated_at = ?
              WHERE account_id = ?
            `
          )
          .run(channelsJson, eventsJson, projectScopeMode, includeArchivedProjects, now, accountId);
      } else if (this.hasProjectScopeModeColumn) {
        this.db
          .prepare(
            `
              UPDATE profile_notification_prefs
              SET channels_json = ?, events_json = ?, project_scope_mode = ?, updated_at = ?
              WHERE account_id = ?
            `
          )
          .run(channelsJson, eventsJson, projectScopeMode, now, accountId);
      } else if (this.hasIncludeArchivedProjectsColumn) {
        this.db
          .prepare(
            `
              UPDATE profile_notification_prefs
              SET channels_json = ?, events_json = ?, include_archived_projects = ?, updated_at = ?
              WHERE account_id = ?
            `
          )
          .run(channelsJson, eventsJson, includeArchivedProjects, now, accountId);
      } else {
        this.db
          .prepare(
            `
              UPDATE profile_notification_prefs
              SET channels_json = ?, events_json = ?, updated_at = ?
              WHERE account_id = ?
            `
          )
          .run(channelsJson, eventsJson, now, accountId);
      }
    } else {
      if (this.hasProjectScopeModeColumn && this.hasIncludeArchivedProjectsColumn) {
        this.db
          .prepare(
            `
              INSERT INTO profile_notification_prefs (
                account_id, channels_json, events_json, project_scope_mode, include_archived_projects, created_at, updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `
          )
          .run(accountId, channelsJson, eventsJson, projectScopeMode, includeArchivedProjects, now, now);
      } else if (this.hasProjectScopeModeColumn) {
        this.db
          .prepare(
            `
              INSERT INTO profile_notification_prefs (
                account_id, channels_json, events_json, project_scope_mode, created_at, updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?)
            `
          )
          .run(accountId, channelsJson, eventsJson, projectScopeMode, now, now);
      } else if (this.hasIncludeArchivedProjectsColumn) {
        this.db
          .prepare(
            `
              INSERT INTO profile_notification_prefs (
                account_id, channels_json, events_json, include_archived_projects, created_at, updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?)
            `
          )
          .run(accountId, channelsJson, eventsJson, includeArchivedProjects, now, now);
      } else {
        this.db
          .prepare(
            `
              INSERT INTO profile_notification_prefs (account_id, channels_json, events_json, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?)
            `
          )
          .run(accountId, channelsJson, eventsJson, now, now);
      }
    }

    return {
      channels: input.channels,
      events: input.events,
      projectScopeMode,
      includeArchivedProjects: includeArchivedProjects === 1,
      updatedAt: now
    };
  }

  listActivities(
    actorIds: string[],
    projectIds: string[],
    sinceIso: string,
    limit: number,
    kind?: "issue_activity" | "rd_activity"
  ): ProfileActivityItem[] {
    if (actorIds.length === 0 || limit <= 0) {
      return [];
    }

    const rows: Array<ProfileActivityItem & { createdAtSortable: string }> = [];
    if (!kind || kind === "issue_activity") {
      rows.push(...this.listIssueActivities(actorIds, projectIds, sinceIso, limit));
    }
    if (!kind || kind === "rd_activity") {
      rows.push(...this.listRdActivities(actorIds, projectIds, sinceIso, limit));
    }

    return rows
      .sort((left, right) => right.createdAtSortable.localeCompare(left.createdAtSortable))
      .slice(0, limit)
      .map(({ createdAtSortable, ...item }) => item);
  }

  private listIssueActivities(actorIds: string[], projectIds: string[], sinceIso: string, limit: number) {
    const actorPlaceholders = actorIds.map(() => "?").join(", ");
    const projectScope = this.createProjectScope("i.project_id", projectIds);
    const query = `
      SELECT
        l.id AS id,
        l.issue_id AS entity_id,
        i.issue_no AS code,
        i.title AS title,
        l.action_type AS action,
        l.summary AS summary,
        l.created_at AS created_at,
        i.project_id AS project_id,
        p.name AS project_name
      FROM issue_logs l
      INNER JOIN issues i ON i.id = l.issue_id
      LEFT JOIN projects p ON p.id = i.project_id
      WHERE l.operator_id IN (${actorPlaceholders})
        AND l.created_at >= ?
        ${projectScope.clause}
      ORDER BY l.created_at DESC
      LIMIT ?
    `;
    const values: unknown[] = [...actorIds, sinceIso, ...projectScope.params, limit];
    const rows = this.db.prepare(query).all(...values) as IssueActivityRow[];
    return rows.map((row) => ({
      id: `issue:${row.id}`,
      kind: "issue_activity" as const,
      entityId: row.entity_id,
      code: row.code,
      title: row.title,
      action: row.action,
      summary: row.summary,
      createdAt: row.created_at,
      createdAtSortable: row.created_at,
      projectId: row.project_id,
      projectName: row.project_name?.trim() || "-"
    }));
  }

  private listRdActivities(actorIds: string[], projectIds: string[], sinceIso: string, limit: number) {
    const actorPlaceholders = actorIds.map(() => "?").join(", ");
    const projectScope = this.createProjectScope("r.project_id", projectIds);
    const query = `
      SELECT
        l.id AS id,
        l.item_id AS entity_id,
        r.rd_no AS code,
        r.title AS title,
        l.action_type AS action,
        l.content AS summary,
        l.created_at AS created_at,
        r.project_id AS project_id,
        p.name AS project_name
      FROM rd_logs l
      INNER JOIN rd_items r ON r.id = l.item_id
      LEFT JOIN projects p ON p.id = r.project_id
      WHERE l.operator_id IN (${actorPlaceholders})
        AND l.created_at >= ?
        ${projectScope.clause}
      ORDER BY l.created_at DESC
      LIMIT ?
    `;
    const values: unknown[] = [...actorIds, sinceIso, ...projectScope.params, limit];
    const rows = this.db.prepare(query).all(...values) as RdActivityRow[];
    return rows.map((row) => ({
      id: `rd:${row.id}`,
      kind: "rd_activity" as const,
      entityId: row.entity_id,
      code: row.code,
      title: row.title,
      action: row.action,
      summary: row.summary,
      createdAt: row.created_at,
      createdAtSortable: row.created_at,
      projectId: row.project_id,
      projectName: row.project_name?.trim() || "-"
    }));
  }

  private createProjectScope(column: string, projectIds: string[]) {
    if (projectIds.length === 0) {
      return {
        clause: "",
        params: [] as string[]
      };
    }

    return {
      clause: `AND ${column} IN (${projectIds.map(() => "?").join(", ")})`,
      params: projectIds
    };
  }

  private parseBooleanMap(value: string): Record<string, boolean> {
    try {
      const data = JSON.parse(value) as Record<string, unknown>;
      return Object.fromEntries(Object.entries(data).map(([key, flag]) => [key, Boolean(flag)]));
    } catch {
      return {};
    }
  }

  private detectProjectScopeModeColumn(): boolean {
    const columns = this.db.prepare("PRAGMA table_info(profile_notification_prefs)").all() as Array<{ name: string }>;
    return columns.some((column) => column.name === "project_scope_mode");
  }

  private detectIncludeArchivedProjectsColumn(): boolean {
    const columns = this.db.prepare("PRAGMA table_info(profile_notification_prefs)").all() as Array<{ name: string }>;
    return columns.some((column) => column.name === "include_archived_projects");
  }
}
