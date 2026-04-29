import type { ApiScope, ApiCollectionKind } from "./api-common.dto";

export interface CollectionNodeFolderDto {
    id: string;
    type: "folder";
    name: string;
    parentId?: string;
    order: number;
}

export interface CollectionNodeRequestDto {
    id: string;
    type: "request";
    name: string;
    parentId?: string;
    order: number;
    requestId: string;
}

export type CollectionNodeDto = CollectionNodeFolderDto | CollectionNodeRequestDto;

export interface ApiCollectionEntityDto {
    id: string;
    name: string;
    kind: ApiCollectionKind;
    scope: ApiScope;
    projectId?: string;
    nodes: CollectionNodeDto[];
    parentId?: string | null;
    order: number;
    createdAt: number;
    updatedAt: number;
}

export interface ListCollectionsQueryDto {
    scope?: ApiScope;
    projectId?: string;
}

export interface CreateCollectionBodyDto {
    scope: ApiScope;
    projectId: string;
    name: string;
    kind: ApiCollectionKind;
    parentId?: string | null;
    order?: number;
}

export interface UpdateCollectionBodyDto {
    name?: string;
    parentId?: string | null;
    order?: number;
}

export interface CollectionIdParamDto {
    id: string;
}

export interface CollectionsBundleDto {
    collections: ApiCollectionEntityDto[];
    requests: import("./api-request.dto").ApiRequestEntityDto[];
}