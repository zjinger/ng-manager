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

export type ApiCollectionScope = "global" | "project";

export interface ApiCollectionEntity {
    id: string;
    name: string;
    scope: ApiCollectionScope;
    projectId?: string;
    nodes: CollectionNode[];
    createdAt: number;
    updatedAt: number;
}
