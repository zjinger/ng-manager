import type {
    ApiCollectionEntity,
    ApiCollectionKind,
    ApiCollectionTreeNode,
    ApiRequestEntity,
} from "@models/api-client";

function matchRequest(r: ApiRequestEntity, kw: string) {
    if (!kw) return true;
    const name = (r.name ?? "").toLowerCase();
    const url = (r.url ?? "").toLowerCase();
    return name.includes(kw) || url.includes(kw);
}

/** normalize id for map keys: null/undefined/''/'null'/'undefined' => null */
function normId(v: unknown): string | null {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (!s) return null;
    const l = s.toLowerCase();
    if (l === "null" || l === "undefined") return null;
    return s;
}

function sortCollections(a: ApiCollectionEntity, b: ApiCollectionEntity) {
    return (
        (a.parentId ?? "").localeCompare(b.parentId ?? "") ||
        (a.order ?? 0) - (b.order ?? 0) ||
        (a.name ?? "").localeCompare(b.name ?? "")
    );
}

function sortRequests(a: ApiRequestEntity, b: ApiRequestEntity) {
    return (
        (normId(a.collectionId) ?? "").localeCompare(normId(b.collectionId) ?? "") ||
        (a.order ?? 0) - (b.order ?? 0) ||
        (a.name ?? "").localeCompare(b.name ?? "") ||
        (a.url ?? "").localeCompare(b.url ?? "")
    );
}

export function genCollectionTreeNodes(
    collections: ApiCollectionEntity[],
    requests: ApiRequestEntity[],
    q?: string
): ApiCollectionTreeNode[] {
    const kw = q?.trim().toLowerCase() || "";

    // 先做稳定排序，避免 map push 时顺序漂移
    const colsSorted = [...(collections ?? [])].sort(sortCollections);
    const reqsSorted = [...(requests ?? [])].sort(sortRequests);

    // collections children: parentId -> []
    const colChildren = new Map<string | null, ApiCollectionEntity[]>();
    for (const c of colsSorted) {
        const pid = normId(c.parentId);
        const arr = colChildren.get(pid) ?? [];
        arr.push(c);
        colChildren.set(pid, arr);
    }

    // requests children: collectionId -> []
    const reqChildren = new Map<string | null, ApiRequestEntity[]>();
    for (const r of reqsSorted) {
        if (!matchRequest(r, kw)) continue;
        const cid = normId(r.collectionId);
        const arr = reqChildren.get(cid) ?? [];
        arr.push(r);
        reqChildren.set(cid, arr);
    }

    const buildReqNode = (r: ApiRequestEntity, parentKey: string | null): ApiCollectionTreeNode => ({
        key: `r:${String(r.id)}`,
        kind: "request" as ApiCollectionKind,
        id: String(r.id),
        title: r.name ?? "未命名",
        name: r.name,
        subtitle: r.url ?? "",
        method: r.method ?? "",
        parentKey,
        children: [],
    });

    const buildCol = (c: ApiCollectionEntity, parentKey: string | null): ApiCollectionTreeNode => {
        const id = normId(c.id)!; // collection id 必须存在
        const key = `c:${id}`;

        const childCols = colChildren.get(id) ?? [];
        const childReqs = reqChildren.get(id) ?? [];

        return {
            key,
            kind: (c.kind ?? "collection") as ApiCollectionKind,
            id,
            title: c.name ?? "未命名",
            name: c.name,
            parentKey,
            children: [
                ...childCols.map((cc) => buildCol(cc, key)),
                ...childReqs.map((r) => buildReqNode(r, key)),
            ],
        };
    };

    const rootCols = colChildren.get(null) ?? [];
    const rootReqs = reqChildren.get(null) ?? [];

    return [
        ...rootCols.map((c) => buildCol(c, null)),
        ...rootReqs.map((r) => buildReqNode(r, null)),
    ];
}
