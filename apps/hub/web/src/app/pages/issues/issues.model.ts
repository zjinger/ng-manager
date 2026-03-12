export type IssueType =
    | "bug" // 缺陷
    | "requirement_change" //需求变更
    | "feature" // 新功能(新需求)
    | "improvement" // 改进
    | "task" // 任务
    | "test_record"; // 测试记录

export type IssueStatus = "open" | "assigned" | "in_progress" | "fixed" | "verified" | "reopened" | "closed";
export type IssuePriority = "low" | "medium" | "high" | "critical";
export type IssueCloseReasonType = "mistaken" | "duplicate" | "not_issue";
export type IssueActionType = "create" | "update" | "assign" | "start_progress" | "mark_fixed" | "verify" | "reopen" | "close" | "comment" | "upload_attachment" | "remove_attachment";

export type ProjectMemberRole = "product" | "ui" | "frontend_dev" | "backend_dev" | "qa" | "ops";

export interface ProjectMemberItem {
    id: string;
    projectId: string;
    userId: string;
    displayName: string;
    roles: ProjectMemberRole[];
    createdAt: string;
    updatedAt: string;
}

export interface IssueItem {
    id: string;
    projectId: string;
    issueNo: string;
    title: string;
    description: string;
    type: IssueType;
    status: IssueStatus;
    priority: IssuePriority;
    reporterId?: string | null;
    reporterName?: string | null;
    assigneeId?: string | null;
    assigneeName?: string | null;
    verifierId?: string | null;
    verifierName?: string | null;
    reopenCount: number;
    module?: string | null;
    version?: string | null;
    environment?: string | null;
    fixedAt?: string | null;
    verifiedAt?: string | null;
    closedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface IssueComment {
    id: string;
    issueId: string;
    authorId?: string | null;
    authorName?: string | null;
    content: string;
    createdAt: string;
    updatedAt: string;
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

export interface IssueAttachmentDto {
    id: string;
    originalName: string;
    fileExt?: string | null;
    mimeType?: string | null;
    fileSize: number;
    storageProvider: "local";
    uploaderId?: string | null;
    uploaderName?: string | null;
    createdAt: string;
    downloadUrl: string;
}

export interface IssueDetailResult {
    issue: IssueItem;
    comments: IssueComment[];
    attachments: IssueAttachmentDto[];
    logs: IssueActionLog[];
}

export interface IssueListResult {
    items: IssueItem[];
    page: number;
    pageSize: number;
    total: number;
}

export interface ProjectOption {
    id: string;
    name: string;
    projectKey: string;
}

export interface AttachmentPolicyResult {
    accept: string;
    mimePrefixes: string[];
    exts: string[];
}

