import { ApiScope } from "./types";

export type ApiCollectionKind = "folder" | "collection";

export type CollectionNode =
    | { id: string; type: "folder"; name: string; parentId?: string; order: number }
    | {
        id: string;
        type: "request";
        name: string;
        parentId?: string;
        order: number;
        requestId: string;
    };

export interface ApiCollectionEntity {
    id: string;
    name: string; 
    kind: ApiCollectionKind;         // folder/collection 先区分 folder 与 collection（folder 下可嵌套 folder/collection）
    scope: ApiScope;                 // project (MVP)
    projectId?: string;
    nodes: CollectionNode[];

    parentId?: string | null;        // null = root
    order: number;                   // 同级排序
    createdAt: number;
    updatedAt: number;
}
