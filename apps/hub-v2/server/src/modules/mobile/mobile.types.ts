import type { PageResult } from "../../shared/http/pagination";
import type { AdminProfile } from "../auth/auth.types";

export type MobileTargetType = "issue" | "rd";
export type MobileTodoCategory = "all" | "issue" | "rd" | "verify";
export type MobileMessageCategory = "all" | "issue" | "rd" | "announcement" | "document" | "release";
export type MobileMessageType = "announcement" | "document" | "release" | "notification";
export type MobileIssueAction = "start" | "wait_update" | "resolve" | "verify" | "reopen" | "close";
export type MobileRdAction = "start" | "block" | "resume" | "complete" | "accept" | "reopen" | "close";

export interface MobileProjectSummary {
  id: string;
  projectKey: string;
  name: string;
  displayCode: string | null;
  avatarUrl: string | null;
  favoriteAt?: string | null;
}

export interface MobileBootstrap {
  profile: AdminProfile;
  projects: MobileProjectSummary[];
  currentProject: MobileProjectSummary | null;
  unreadCount: number;
  capabilities: {
    canUseIssue: boolean;
    canUseRd: boolean;
    canUseMessages: boolean;
    canUseDocuments: boolean;
  };
  defaultFilters: {
    todoCategories: MobileTodoCategory[];
    messageCategories: MobileMessageCategory[];
  };
}

export interface MobileDashboard {
  stats: {
    todoTotal: number;
    verifyTotal: number;
    assignedIssues: number;
    assignedRdItems: number;
    inProgressRdItems: number;
    unreadMessages: number;
  };
  todos: MobileTodoItem[];
  rdProgress: MobileTodoItem[];
  announcements: MobileMessageItem[];
  quickActions: Array<{
    key: string;
    label: string;
    target: string;
    badgeCount?: number;
  }>;
}

export interface MobileTodoQuery {
  category?: MobileTodoCategory;
  projectId?: string;
  status?: string;
  priority?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface MobileTodoItem {
  id: string;
  targetType: MobileTargetType;
  targetId: string;
  code: string;
  title: string;
  status: string;
  priority: string | null;
  projectId: string;
  updatedAt: string;
  assigneeName: string | null;
  summary: string | null;
  mobileRoute: string;
}

export type MobileTodoListResult = PageResult<MobileTodoItem>;

export interface MobileTimelineItem {
  id: string;
  kind: "comment" | "activity" | "progress" | "stage_task";
  authorName: string | null;
  content: string | null;
  action: string | null;
  createdAt: string;
}

export interface MobileTodoDetail {
  targetType: MobileTargetType;
  id: string;
  code: string;
  title: string;
  status: string;
  priority: string;
  projectId: string;
  descriptionMd: string | null;
  assigneeName: string | null;
  verifierName: string | null;
  progress: number | null;
  updatedAt: string;
  timeline: MobileTimelineItem[];
  availableActions: string[];
}

export interface MobileIssueCommentInput {
  content: string;
  mentions?: string[];
}

export interface MobileIssueActionInput {
  action: MobileIssueAction;
  note?: string;
  reason?: string;
}

export interface MobileRdProgressInput {
  progress: number;
  note?: string;
  stageTaskId?: string;
}

export interface MobileRdActionInput {
  action: MobileRdAction;
  note?: string;
  reason?: string;
}

export interface MobileMessageQuery {
  category?: MobileMessageCategory;
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface MobileMessageItem {
  id: string;
  messageType: MobileMessageType;
  category: MobileMessageCategory;
  title: string;
  description: string | null;
  unread: boolean;
  time: string;
  projectId: string | null;
  mobileRoute: string;
}

export type MobileMessageListResult = PageResult<MobileMessageItem> & {
  unreadTotal: number;
};

export interface MobileMessageDetail {
  id: string;
  messageType: MobileMessageType;
  title: string;
  markdown: string;
  projectId: string | null;
  publishedAt: string | null;
  unread: boolean;
}

export interface MobileMessageReadInput {
  all?: boolean;
  notificationIds?: string[];
}

export interface MobileConnectionStatus {
  app: "hub-v2";
  env: string;
  authenticated: boolean;
  profile: AdminProfile;
  projectCount: number;
  currentProject: MobileProjectSummary | null;
}
