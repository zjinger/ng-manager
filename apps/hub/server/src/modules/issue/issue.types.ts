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
    | "resolved"
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
    | "not_issue"
    | "cancelled"
    | "done_elsewhere";

export type IssueActionType =
    | "create"
    | "update"
    | "assign"
    | "claim"
    | "unassign"
    | "reassign"
    | "set_verifier"
    | "add_participant"
    | "remove_participant"
    | "add_watcher"
    | "remove_watcher"
    | "start"
    | "resolve"
    | "revoke_resolve"
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
    resolvedAt?: string | null;
    verifiedAt?: string | null;
    lastVerifiedResult?: "pass" | "fail" | null;
    closeReasonType?: IssueCloseReasonType | null;
    closeReasonText?: string | null;
    closedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface IssueCommentMentionEntity {
    userId: string;
    displayName: string;
}

export interface IssueCommentEntity {
    id: string;
    issueId: string;
    authorId?: string | null;
    authorName?: string | null;
    content: string;
    mentions: IssueCommentMentionEntity[];
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
    metaJson?: string | null;
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
    assigneeId?: string | null;
    verifierId?: string | null;
    operatorId?: string | null;
    operatorName?: string | null;
}

export interface UpdateIssueInput {
    title?: string;
    description?: string;
    priority?: IssuePriority;
    module?: string | null;
    version?: string | null;
    environment?: string | null;
    operatorId?: string | null;
    operatorName?: string | null;
}

export type UpdateIssueRepoPatch = Omit<UpdateIssueInput, "operatorId" | "operatorName"> & {
    updatedAt: string;
    status?: IssueStatus;
    assigneeId?: string | null;
    assigneeName?: string | null;
    verifierId?: string | null;
    verifierName?: string | null;
    reopenCount?: number;
    resolvedAt?: string | null;
    verifiedAt?: string | null;
    lastVerifiedResult?: "pass" | "fail" | null;
    closeReasonType?: IssueCloseReasonType | null;
    closeReasonText?: string | null;
    closedAt?: string | null;
};

export interface IssueOperatorInput {
    operatorId?: string | null;
    operatorName?: string | null;
    comment?: string;
}

export interface AssignIssueInput extends IssueOperatorInput {
    assigneeId: string;
}

export interface ClaimIssueInput extends IssueOperatorInput {
}

export interface UnassignIssueInput extends IssueOperatorInput {
}

export interface ReassignIssueInput extends IssueOperatorInput {
    assigneeId: string;
}

export interface SetIssueVerifierInput extends IssueOperatorInput {
    verifierId?: string | null;
}

export interface StartIssueInput extends IssueOperatorInput {
}

export interface ResolveIssueInput extends IssueOperatorInput {
    comment: string;
}

export interface RevokeResolveIssueInput extends IssueOperatorInput {
}

export interface VerifyIssueInput extends IssueOperatorInput {
}

export interface ReopenIssueInput extends IssueOperatorInput {
    comment: string;
}

export interface CloseIssueInput extends IssueOperatorInput {
    closeReasonType?: IssueCloseReasonType;
}

export interface AddIssueParticipantInput extends IssueOperatorInput {
    userId: string;
}

export interface RemoveIssueParticipantInput extends IssueOperatorInput {
    userId: string;
}

export interface AddIssueWatcherInput extends IssueOperatorInput {
    userId: string;
    userName?: string | null;
}

export interface RemoveIssueWatcherInput extends IssueOperatorInput {
    userId: string;
}

export interface AddIssueCommentInput {
    authorId?: string | null;
    authorName?: string | null;
    content: string;
    mentions?: IssueCommentMentionEntity[];
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

export interface IssueParticipantEntity {
    id: string;
    issueId: string;
    userId: string;
    userName?: string | null;
    createdAt: string;
}

export interface IssueWatcherEntity {
    id: string;
    issueId: string;
    userId: string;
    userName?: string | null;
    createdAt: string;
}

export interface IssueAttachmentEntity {
    id: string;
    issueId: string;
    uploadId: string;
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
    participants: IssueParticipantEntity[];
    watchers: IssueWatcherEntity[];
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

