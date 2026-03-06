export type AnnouncementScope = "all" | "desktop" | "cli";
export type AnnouncementStatus = "draft" | "published" | "archived";

export interface AnnouncementEntity {
    id: string;
    title: string;
    summary?: string | null;
    contentMd: string;
    scope: AnnouncementScope;
    pinned: boolean;
    status: AnnouncementStatus;
    publishAt?: string | null;
    expireAt?: string | null;
    createdBy?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAnnouncementInput {
    title: string;
    summary?: string;
    contentMd: string;
    scope: AnnouncementScope;
    pinned?: boolean;
    publishAt?: string;
    expireAt?: string;
    createdBy?: string;
}

export interface UpdateAnnouncementInput {
    title?: string;
    summary?: string;
    contentMd?: string;
    scope?: AnnouncementScope;
    pinned?: boolean;
    publishAt?: string | null;
    expireAt?: string | null;
}

export interface PublishAnnouncementInput {
    publishAt?: string;
}

export interface ListAnnouncementQuery {
    status?: AnnouncementStatus;
    scope?: AnnouncementScope;
    pinned?: boolean;
    keyword?: string;
    page: number;
    pageSize: number;
}

export interface AnnouncementListResult {
    items: AnnouncementEntity[];
    page: number;
    pageSize: number;
    total: number;
}