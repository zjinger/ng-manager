import { ApiScope } from "./api-types.model";

export type ApiCollectionKind = "request" | "folder" | "collection";

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

// export type ApiCollectionTreeNode =
//     | { type: "folder"; id: string; name: string; children: ApiCollectionTreeNode[] }
//     | { type: "collection"; id: string; name: string; children: ApiCollectionTreeNode[] }
//     | { type: "request"; id: string; name: string; reqId: string };

export interface ApiCollectionEntity {
    id: string;
    name: string;
    kind: ApiCollectionKind;         // folder/collection 先区分 folder 与 collection（folder 下可嵌套 folder/collection）
    scope: ApiScope;                 // project (MVP)
    projectId?: string;
    nodes: ApiCollectionTreeNode[];

    parentId?: string | null;        // null = root
    order: number;                   // 同级排序
    createdAt: number;
    updatedAt: number;
}

export type ApiCollectionTreeNode = {
    key: string;                 // 'c:xxx' | 'r:xxx'
    kind: ApiCollectionKind;
    id: string;

    name: string;
    title: string;              // 显示名称，优先级高于 name
    subtitle?: string;           // url / time 等
    method?: string;             // request method

    parentKey: string | null;    // 父节点 key（用于定位）
    children: ApiCollectionTreeNode[];
};

export type ApiCollectionCreateBody = {
    scope: ApiScope;
    projectId: string;
    name: string;
    kind: ApiCollectionKind;
    parentId?: string | null;
    order?: number;
};

export type ApiCollectionUpdateBody = {
    name?: string;
    parentId?: string | null;
    order?: number;
}

export type ApiCollectionModalMode = 'create' | 'rename' | 'move' | 'pick';

export type ApiCollectionCreateModalData = {
    mode: 'create';
    kind: 'collection' | 'folder';
    nodes: ApiCollectionTreeNode[];        // 只含 collection/folder
    createBody: ApiCollectionCreateBody;   // scope/projectId/kind/name/parentId
    initialParentId?: string | null;       // 纯 id（非 key）
}

export type ApiCollectionRenameModalData = {
    mode: 'rename';
    kind: 'collection' | 'folder';
    nodes: ApiCollectionTreeNode[];
    targetId: string;                      // 被重命名实体 id
    initialName: string;
}
export type ApiCollectionMoveModalData = {
    mode: 'move';
    nodes: ApiCollectionTreeNode[];
    // 移动的对象：request/collection/folder
    target: { kind: 'request' | 'collection' | 'folder'; id: string };
    initialParentId?: string | null;       // 纯 id（非 key）
}

export type ApiCollectionPickModalData = {
    mode: 'pick';
    nodes: ApiCollectionTreeNode[];        // 只含 collection/folder
}

export type ApiCollectionModalData =
    | ApiCollectionCreateModalData
    | ApiCollectionRenameModalData
    | ApiCollectionMoveModalData
    | ApiCollectionPickModalData;