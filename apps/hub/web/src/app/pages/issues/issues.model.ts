import type { ProjectMemberItem } from '../projects/projects.model';

export type IssueType = 'bug' | 'feature' | 'change' | 'improvement' | 'task' | 'test';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'verified' | 'closed' | 'reopened';
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
export type IssueActionType =
  | 'create'
  | 'edit'
  | 'assign'
  | 'claim'
  | 'unclaim'
  | 'reassign'
  | 'start'
  | 'resolve'
  | 'verify'
  | 'reopen'
  | 'close'
  | 'add_participant'
  | 'remove_participant'
  | 'comment_add'
  | 'attachment_add'
  | 'attachment_remove';

export interface IssueItem {
  id: string;
  projectId: string;
  issueNo: string;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  reporterId: string;
  reporterName: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  participantNames?: string[];
  reopenCount: number;
  moduleCode?: string | null;
  versionCode?: string | null;
  environmentCode?: string | null;
  resolutionSummary?: string | null;
  closeReason?: string | null;
  closeRemark?: string | null;
  startedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueParticipant {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface IssueCommentMention {
  userId: string;
  displayName: string;
}

export interface IssueComment {
  id: string;
  issueId: string;
  authorId?: string | null;
  authorName?: string | null;
  content: string;
  mentions: IssueCommentMention[];
  createdAt: string;
  updatedAt: string;
}

export interface IssueAttachment {
  id: string;
  issueId: string;
  uploadId: string;
  fileName: string;
  originalName: string;
  mimeType?: string | null;
  fileExt?: string | null;
  fileSize: number;
  storagePath: string;
  storageProvider: 'local';
  uploaderId?: string | null;
  uploaderName?: string | null;
  createdAt: string;
}

export interface IssueActionLog {
  id: string;
  issueId: string;
  actionType: IssueActionType;
  fromStatus?: IssueStatus | null;
  toStatus?: IssueStatus | null;
  operatorId?: string | null;
  operatorName?: string | null;
  summary?: string | null;
  createdAt: string;
}

export interface IssueDetailResult {
  issue: IssueItem;
  participants: IssueParticipant[];
  comments: IssueComment[];
  attachments: IssueAttachment[];
  actionLogs: IssueActionLog[];
}

export interface IssueListResult {
  items: IssueItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ProjectOption {
  id: string;
  projectKey: string;
  name: string;
}

export interface IssueFilterValue {
  projectId: string;
  status: string;
  priority: string;
  type: string;
  assigneeId: string;
  keyword: string;
}

export interface IssueFormValue {
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  assigneeId: string;
  moduleCode: string;
  versionCode: string;
  environmentCode: string;
}

export interface IssueActionPanelSubmit {
  action: 'assign' | 'claim' | 'unclaim' | 'reassign' | 'start' | 'resolve' | 'verify' | 'reopen' | 'close';
  assigneeId?: string;
  comment?: string;
  closeReason?: string;
}

export const ISSUE_TYPE_OPTIONS: Array<{ value: IssueType; label: string; color: string }> = [
  { value: 'bug', label: '缺陷', color: 'red' },
  { value: 'feature', label: '新功能', color: 'green' },
  { value: 'change', label: '需求变更', color: 'gold' },
  { value: 'improvement', label: '改进', color: 'cyan' },
  { value: 'task', label: '任务', color: 'blue' },
  { value: 'test', label: '测试记录', color: 'purple' }
];

export const ISSUE_PRIORITY_OPTIONS: Array<{ value: IssuePriority; label: string; color: string }> = [
  { value: 'low', label: '低', color: 'default' },
  { value: 'medium', label: '中', color: 'blue' },
  { value: 'high', label: '高', color: 'orange' },
  { value: 'critical', label: '紧急', color: 'red' }
];

export const ISSUE_STATUS_OPTIONS: Array<{ value: IssueStatus; label: string; color: string }> = [
  { value: 'open', label: '新建', color: 'gold' },
  { value: 'in_progress', label: '处理中', color: 'processing' },
  { value: 'resolved', label: '待测试', color: 'purple' },
  { value: 'verified', label: '已验证', color: 'green' },
  { value: 'closed', label: '已关闭', color: 'default' },
  { value: 'reopened', label: '重新打开', color: 'volcano' }
];

export const ISSUE_ACTION_LABELS: Record<IssueActionType, string> = {
  create: '创建',
  edit: '编辑',
  assign: '指派负责人',
  claim: '认领',
  unclaim:'取消认领',
  reassign: '转派负责人',
  start: '开始处理',
  resolve: '标记已处理',
  verify: '验证通过',
  reopen: '重新打开',
  close: '关闭',
  add_participant: '添加参与人',
  remove_participant: '移除参与人',
  comment_add: '新增评论',
  attachment_add: '上传附件',
  attachment_remove: '删除附件'
};

export const ISSUE_ACTION_COLORS: Record<IssueActionType, string> = {
  create: 'green',
  edit: 'blue',
  assign: 'blue',
  claim: 'cyan',
  unclaim:'orange',
  reassign: 'purple',
  start: 'processing',
  resolve: 'success',
  verify: 'green',
  reopen: 'volcano',
  close: 'default',
  add_participant: 'lime',
  remove_participant: 'red',
  comment_add: 'gold',
  attachment_add: 'green',
  attachment_remove: 'red'
};

export function issueStatusLabel(status: IssueStatus): string {
  return ISSUE_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

export function issueStatusColor(status: IssueStatus): string {
  return ISSUE_STATUS_OPTIONS.find((item) => item.value === status)?.color ?? 'default';
}

export function issueDisplayStatusLabel(issue: Pick<IssueItem, 'status' | 'assigneeId' | 'closeRemark'>): string {
  if (issue.status === 'open') {
    return issue.assigneeId ? '已确认' : '新建';
  }
  if (issue.status === 'closed' && issue.closeRemark === 'verified_passed') {
    return '已验证';
  }
  return issueStatusLabel(issue.status);
}

export function issueDisplayStatusColor(issue: Pick<IssueItem, 'status' | 'assigneeId' | 'closeRemark'>): string {
  if (issue.status === 'open' && issue.assigneeId) {
    return 'blue';
  }
  if (issue.status === 'closed' && issue.closeRemark === 'verified_passed') {
    return 'green';
  }
  return issueStatusColor(issue.status);
}

export function issuePriorityLabel(priority: IssuePriority): string {
  return ISSUE_PRIORITY_OPTIONS.find((item) => item.value === priority)?.label ?? priority;
}

export function issuePriorityColor(priority: IssuePriority): string {
  return ISSUE_PRIORITY_OPTIONS.find((item) => item.value === priority)?.color ?? 'default';
}

export function issueTypeLabel(type: IssueType): string {
  return ISSUE_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? type;
}

export function issueTypeColor(type: IssueType): string {
  return ISSUE_TYPE_OPTIONS.find((item) => item.value === type)?.color ?? 'default';
}

export function issueActionLabel(actionType: IssueActionType): string {
  return ISSUE_ACTION_LABELS[actionType] ?? actionType;
}

export function issueActionColor(actionType: IssueActionType): string {
  return ISSUE_ACTION_COLORS[actionType] ?? 'default';
}

export function memberDisplay(member: ProjectMemberItem): string {
  return member.displayName?.trim() || member.userId;
}

export function formatFileSize(fileSize: number): string {
  if (fileSize < 1024) {
    return `${fileSize} B`;
  }
  if (fileSize < 1024 * 1024) {
    return `${(fileSize / 1024).toFixed(1)} KB`;
  }
  if (fileSize < 1024 * 1024 * 1024) {
    return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(fileSize / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatActionTransition(log: IssueActionLog): string {
  if (!log.fromStatus && !log.toStatus) {
    return '';
  }
  const from = log.fromStatus ? issueStatusLabel(log.fromStatus) : '无';
  const to = log.toStatus ? issueStatusLabel(log.toStatus) : '无';
  return `${from} -> ${to}`;
}

