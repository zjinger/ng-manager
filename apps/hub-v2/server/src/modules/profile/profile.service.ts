import type { RequestContext } from "../../shared/context/request-context";
import { nowIso } from "../../shared/utils/time";
import type { ProfileCommandContract, ProfileQueryContract } from "./profile.contract";
import { ProfileRepo } from "./profile.repo";
import type {
  ListProfileActivitiesQuery,
  ProfileActivityItem,
  ProfileNotificationPrefs,
  UpdateProfileNotificationPrefsInput
} from "./profile.types";

const DEFAULT_CHANNELS: Record<string, boolean> = {
  inbox: true
};

const DEFAULT_EVENTS: Record<string, boolean> = {
  issue_todo: true,
  issue_mentioned: true,
  issue_activity: true,
  rd_todo: true,
  rd_activity: true,
  announcement_published: true,
  document_published: true,
  release_published: true,
  project_member_changed: true
};

const DEFAULT_PROJECT_SCOPE_MODE = "all_accessible" as const;
const DEFAULT_INCLUDE_ARCHIVED_PROJECTS = false;

const ISSUE_ACTION_LABELS: Record<string, string> = {
  create: "创建",
  update: "更新",
  assign: "指派",
  start: "开始处理",
  resolve: "标记已解决",
  verify: "验证通过",
  reopen: "重新打开",
  close: "关闭"
};

const RD_ACTION_LABELS: Record<string, string> = {
  create: "创建",
  update: "更新",
  start: "开始执行",
  block: "标记阻塞",
  resume: "恢复执行",
  complete: "标记完成",
  advance_stage: "流转阶段",
  delete: "删除"
};

export class ProfileService implements ProfileQueryContract, ProfileCommandContract {
  constructor(private readonly repo: ProfileRepo) {}

  async getNotificationPrefs(ctx: RequestContext): Promise<ProfileNotificationPrefs> {
    const accountId = ctx.accountId;
    const saved = this.repo.getNotificationPrefs(accountId);
    if (!saved) {
      return {
        channels: { ...DEFAULT_CHANNELS },
        events: { ...DEFAULT_EVENTS },
        projectScopeMode: DEFAULT_PROJECT_SCOPE_MODE,
        includeArchivedProjects: DEFAULT_INCLUDE_ARCHIVED_PROJECTS,
        updatedAt: nowIso()
      };
    }
    return {
      channels: this.mergeFlags(DEFAULT_CHANNELS, saved.channels),
      events: this.mergeFlags(DEFAULT_EVENTS, saved.events),
      projectScopeMode: saved.projectScopeMode ?? DEFAULT_PROJECT_SCOPE_MODE,
      includeArchivedProjects: saved.includeArchivedProjects ?? DEFAULT_INCLUDE_ARCHIVED_PROJECTS,
      updatedAt: saved.updatedAt
    };
  }

  async updateNotificationPrefs(input: UpdateProfileNotificationPrefsInput, ctx: RequestContext): Promise<ProfileNotificationPrefs> {
    const payload: UpdateProfileNotificationPrefsInput = {
      channels: this.mergeFlags(DEFAULT_CHANNELS, input.channels),
      events: this.mergeFlags(DEFAULT_EVENTS, input.events),
      projectScopeMode: input.projectScopeMode ?? DEFAULT_PROJECT_SCOPE_MODE,
      includeArchivedProjects: input.includeArchivedProjects ?? DEFAULT_INCLUDE_ARCHIVED_PROJECTS
    };
    return this.repo.saveNotificationPrefs(ctx.accountId, payload, nowIso());
  }

  async listActivities(query: ListProfileActivitiesQuery, ctx: RequestContext): Promise<ProfileActivityItem[]> {
    const days = this.normalizeDays(query.days);
    const limit = this.normalizeLimit(query.limit);
    const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const actorIds = Array.from(new Set([ctx.userId?.trim(), ctx.accountId?.trim()].filter((item): item is string => !!item)));
    const projectIds = ctx.projectIds ?? [];

    return this.repo.listActivities(actorIds, projectIds, sinceIso, limit, query.kind).map((item) => ({
      ...item,
      action: this.toChineseAction(item.kind, item.action)
    }));
  }

  private mergeFlags(defaultFlags: Record<string, boolean>, input: Record<string, boolean> | null | undefined) {
    return Object.fromEntries(
      Object.entries(defaultFlags).map(([key, fallback]) => [key, input?.[key] ?? fallback])
    );
  }

  private normalizeDays(value: number | undefined): number {
    if (!value || Number.isNaN(value)) {
      return 7;
    }
    return Math.min(30, Math.max(1, Math.floor(value)));
  }

  private normalizeLimit(value: number | undefined): number {
    if (!value || Number.isNaN(value)) {
      return 50;
    }
    return Math.min(200, Math.max(1, Math.floor(value)));
  }

  private toChineseAction(kind: ProfileActivityItem["kind"], action: string): string {
    if (kind === "issue_activity") {
      return ISSUE_ACTION_LABELS[action] ?? action;
    }
    return RD_ACTION_LABELS[action] ?? action;
  }
}
