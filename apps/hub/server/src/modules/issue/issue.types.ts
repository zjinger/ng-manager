export type IssueType =
    | "bug"
    | "requirement_change"
    | "feature"
    | "improvement"
    | "task"
    | "test_record";

export type IssueStatus =
    | "open"
    | "assigned"
    | "in_progress"
    | "fixed"
    | "verified"
    | "reopened"
    | "closed";

export type IssuePriority =
    | "low"
    | "medium"
    | "high"
    | "critical";

export type IssueCloseReasonType =
    | "mistaken"
    | "duplicate"
    | "not_issue";

export type IssueActionType =
    | "create"
    | "update"
    | "assign"
    | "start_progress"
    | "mark_fixed"
    | "verify"
    | "reopen"
    | "close"
    | "comment"
    | "upload_attachment"
    | "remove_attachment";

export interface IssueEntity {
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
    lastVerifiedResult?: "pass" | "fail" | null;
    closedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface IssueCommentEntity {
    id: string;
    issueId: string;
    authorId?: string | null;
    authorName?: string | null;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export interface IssueActionLogEntity {
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

export interface CreateIssueInput {
    projectId: string;
    title: string;
    description?: string;
    type?: IssueType;
    priority?: IssuePriority;
    module?: string;
    version?: string;
    environment?: string;
    reporterId?: string;
    reporterName?: string;
}

export interface UpdateIssueInput {
    title?: string;
    description?: string;
    priority?: IssuePriority;
    module?: string | null;
    version?: string | null;
    environment?: string | null;
}

export type UpdateIssueRepoPatch = UpdateIssueInput & {
    updatedAt: string;
    status?: IssueStatus;
    assigneeId?: string | null;
    assigneeName?: string | null;
    verifierId?: string | null;
    verifierName?: string | null;
    reopenCount?: number;
    fixedAt?: string | null;
    verifiedAt?: string | null;
    lastVerifiedResult?: "pass" | "fail" | null;
    closedAt?: string | null;
};

export interface AssignIssueInput {
    assigneeId?: string | null;
    assigneeName?: string | null;
    operatorId?: string | null;
    operatorName?: string | null;
    comment?: string;
}

export interface StartProgressInput {
    operatorId?: string | null;
    operatorName?: string | null;
    comment?: string;
}

export interface MarkFixedInput {
    operatorId?: string | null;
    operatorName?: string | null;
    comment?: string;
}

export interface VerifyIssueInput {
    operatorId?: string | null;
    operatorName?: string | null;
    comment?: string;
}

export interface ReopenIssueInput {
    operatorId?: string | null;
    operatorName?: string | null;
    comment?: string;
}

export interface CloseIssueInput {
    operatorId?: string | null;
    operatorName?: string | null;
    closeReasonType?: IssueCloseReasonType;
    comment?: string;
}

export interface AddIssueCommentInput {
    authorId?: string | null;
    authorName?: string | null;
    content: string;
}

export interface ListIssueQuery {
    projectId?: string;
    status?: IssueStatus;
    type?: IssueType;
    priority?: IssuePriority;
    keyword?: string;
    page: number;
    pageSize: number;
}

export interface IssueListResult {
    items: IssueEntity[];
    page: number;
    pageSize: number;
    total: number;
}

export interface IssueAttachmentEntity {
    id: string;
    issueId: string;
    fileName: string;
    originalName: string;
    fileExt?: string | null;
    mimeType?: string | null;
    fileSize: number;
    storagePath: string;
    storageProvider: "local";
    uploaderId?: string | null;
    uploaderName?: string | null;
    createdAt: string;
}

export interface IssueDetailResult {
    issue: IssueEntity;
    comments: IssueCommentEntity[];
    attachments: IssueAttachmentEntity[];
    logs: IssueActionLogEntity[];
}

export interface UploadIssueAttachmentInput {
    issueId: string;
    originalName: string;
    mimeType?: string | null;
    fileSize: number;
    tempFilePath: string;
    uploaderId?: string | null;
    uploaderName?: string | null;
}
