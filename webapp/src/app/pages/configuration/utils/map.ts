import { ResolvedDomain } from "../models";
import { ConfigNavNodeVM } from "../models/config-ui.model";

function mapResolvedToNav(catalog: ResolvedDomain[]): ConfigNavNodeVM[] {
    return catalog
        .sort((a, b) => (a.nav?.order ?? 0) - (b.nav?.order ?? 0))
        .map(d => ({
            id: d.domainId,
            type: "domain",
            label: d.label,
            icon: d.icon,
            description: d.description,
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
