import { existsSync } from "node:fs";
import * as path from "node:path";
import { ResolvedDoc, ResolvedDomain } from "./config.types";
import { ConfigDocCandidate, ConfigDomain } from "./domains";

export class ConfigResolver {
    resolveDomain(rootDir: string, domain: ConfigDomain): ResolvedDomain {
        const docs: ResolvedDoc[] = [];

        for (const spec of domain.docs) {
            const { chosen, absPath } = pickCandidate(rootDir, spec.candidates);
            const exists = !!chosen;

            const missingPolicy = spec.missing ?? "hide";
            if (!exists && missingPolicy === "hide") {
                continue;
            }

            docs.push({
                spec,
                exists,
                chosen,
                absPath,
            });
        }

        return { domain, docs };
    }

    resolveAll(rootDir: string, domains: ConfigDomain[]): ResolvedDomain[] {
        const resolved = domains.map((d) => this.resolveDomain(rootDir, d));
        return resolved.filter((d) => d.docs.length > 0);
    }
}

function pickCandidate(rootDir: string, candidates: ConfigDocCandidate[]): { chosen?: ConfigDocCandidate; absPath?: string } {
    const sorted = [...candidates].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    for (const c of sorted) {
        const absPath = path.resolve(rootDir, c.relPath);
        if (existsSync(absPath)) return { chosen: c, absPath };
    }
    return {};
}
