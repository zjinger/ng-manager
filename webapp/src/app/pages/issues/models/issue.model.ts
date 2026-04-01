import { PageResult } from '@app/core/types/page.types';

export type IssueType = 'bug' | 'feature' | 'change' | 'improvement' | 'task' | 'test';
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'verified' | 'closed' | 'reopened';

// 行动类型
export type IssueActionType =
  | 'comments'
  | 'start'
  | 'claim'
  | 'assign'
  | 'resolve'
  | 'verify'
  | 'reopen'
  | 'close'
  | 'add_participants'
  | 'remove_participants';
export interface IssueEntity {
  id: string;
  projectId: string;
  issueNo: string;
  title: string;
  description: string | null;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  reporterId: string;
  reporterName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  verifierId: string | null;
  verifierName: string | null;
  moduleCode: string | null;
  versionCode: string | null;
  environmentCode: string | null;
  resolutionSummary: string | null;
  closeReason: string | null;
  closeRemark: string | null;
  reopenCount: number;
  startedAt: string | null;
  resolvedAt: string | null;
  verifiedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueLogEntity {
  id: string;
  issueId: string;
  actionType: string;
  fromStatus: string | null;
  toStatus: string | null;
  operatorId: string | null;
  operatorName: string | null;
  summary: string | null;
  metaJson: string | null;
  createdAt: string;
}

export interface IssueCommentEntity {
  id: string;
  issueId: string;
  authorId: string;
  authorName: string;
  content: string;
  mentionsJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueParticipantEntity {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface UploadEntity {
  id: string;
  bucket: string;
  category: string;
  fileName: string;
  originalName: string;
  fileExt: string | null;
  mimeType: string | null;
  fileSize: number;
  checksum: string | null;
  storageProvider: 'local';
  storagePath: string;
  visibility: 'private' | 'public';
  status: 'active' | 'inactive';
  uploaderId: string | null;
  uploaderName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueAttachmentEntity {
  id: string;
  issueId: string;
  uploadId: string;
  createdAt: string;
  upload: UploadEntity;
}

export interface IssueListQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  projectId?: string;
  status?: string;
  priority?: string;
}

export type IssueListResult = PageResult<IssueEntity>;

export interface CreateIssueInput {
  projectId: string;
  title: string;
  description?: string;
  type?: IssueType;
  priority?: IssuePriority;
  assigneeId?: string | null;
  participantIds?: string[];
  verifierId?: string | null;
  moduleCode?: string;
  versionCode?: string;
  environmentCode?: string;
}

export interface createCommentInput {
  content: string;
  mentions?: string[];
}

export interface AssignIssueInput {
  assigneeId: string;
}

export interface ProjectMemberEntity {
  id: string;
  projectId: string;
  userId: string;
  displayName: string;
  roleCode: string;
  isOwner: boolean;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}
