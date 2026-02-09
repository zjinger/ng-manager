import { ApiCollectionEntity, ApiCollectionKind, ApiCollectionTreeNode, ApiRequestEntity } from "@models/api-client";
function matchRequest(r: ApiRequestEntity, kw: string) {
    if (!kw) return true;
    const name = (r.name ?? '').toLowerCase();
    const url = (r.url ?? '').toLowerCase();
    return name.includes(kw) || url.includes(kw);
}
export function genCollectionTreeNodes(
    collections: ApiCollectionEntity[],
    requests: ApiRequestEntity[],
    q?: string): ApiCollectionTreeNode[] {
    const kw = q?.trim().toLowerCase() || '';
    // collections children: parentId -> []
    const colChildren = new Map<string | null, ApiCollectionEntity[]>();
    for (const c of (collections ?? [])) {
        const pid = c.parentId ?? null;
        const arr = colChildren.get(pid) ?? [];
        arr.push(c);
        colChildren.set(pid, arr);
    }
    // requests children: collectionId -> []
    const reqChildren = new Map<string | null, ApiRequestEntity[]>();
    for (const r of (requests ?? [])) {
        if (!matchRequest(r, kw)) continue;
        const cid = r.collectionId ?? null;
        const arr = reqChildren.get(cid) ?? [];
        arr.push(r);
        reqChildren.set(cid, arr);
    }

    const buildCol = (c: ApiCollectionEntity, parentKey: string | null): ApiCollectionTreeNode => {
        const id = String(c.id);
        const kind = c.kind ?? 'collection' as ApiCollectionKind;
        const title = c.name ?? '未命名';

        const key = `c:${id}`;
        const childCols = colChildren.get(id) ?? [];
        const childReqs = reqChildren.get(id) ?? [];

        return {
            key,
            kind,
            id,
            title,
            name: c.name,
            parentKey,
            children: [
                ...childCols.map(cc => buildCol(cc, key)),
                ...childReqs.map(r => ({
                    key: `r:${String(r.id)}`,
                    kind: 'request' as ApiCollectionKind,
                    id: r.id,
                    title: r.name ?? '未命名',
                    name: r.name,
                    subtitle: r.url ?? '',
                    method: r.method ?? '',
                    parentKey: key,
                    children: [],
                })),
            ],
        };
    };

    const rootCols = colChildren.get(null) ?? [];
    const rootReqs = reqChildren.get(null) ?? [];

    return [
        ...rootCols.map(c => buildCol(c, null)),
        ...rootReqs.map(r => ({
            key: `r:${String(r.id)}`,
            kind: 'request' as ApiCollectionKind,
            id: String(r.id),
            title: r.name ?? '未命名',
            name: r.name,
            subtitle: r.url ?? '',
            method: r.method ?? '',
            parentKey: null,
            children: [],
        })),
    ];
}