import { ResolvedDomain } from "../models/config-domain.model";
import { ConfigNavNodeVM } from "../models/config-ui.model";

function mapResolvedToNav(catalog: ResolvedDomain[]): ConfigNavNodeVM[] {
    return catalog
        .sort((a, b) => (a.domain?.nav?.order ?? 0) - (b.domain?.nav?.order ?? 0))
        .map(d => ({
            id: d.domain.id,
            type: "domain",
            label: d.domain.label,
            icon: d.domain.icon,
            description: d.domain.description,
            children: (d.docs ?? []).map((x: any) => ({
                id: x.spec.id,
                type: "doc",
                label: x.spec.title,
                docId: x.spec.id,
                relPath: x.chosen?.relPath,
                codec: x.chosen?.codec,
                exists: x.exists,
            })),
        }));
}

function pickFirstDocId(catalog: ResolvedDomain[]): string | null {
    for (const d of catalog) {
        const first = d.docs?.[0]?.spec?.id;
        if (first) return first;
    }
    return null;
}


export { mapResolvedToNav, pickFirstDocId };