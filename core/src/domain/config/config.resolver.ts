import * as path from "node:path";
import { ConfigDocCandidate, ConfigDomain, ResolvedDoc, ResolvedDomain } from "./config.types";
import { existsSync } from "node:fs";



/**
 * 配置域解析器
 * 存在性裁剪 + candidates 命中
 */
export class ConfigResolver {
    resolveDomain(rootDir: string, domain: ConfigDomain): ResolvedDomain {
        const docs: ResolvedDoc[] = [];

        for (const spec of domain.docs) {
            const { chosen, absPath } = pickCandidate(rootDir, spec.candidates);
            const exists = !!chosen;

            // missing 策略：默认 hide
            const missingPolicy = spec.missing ?? "hide";
            if (!exists && missingPolicy === "hide") {
                continue; // 直接裁剪掉该 doc
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

        // 如果一个 domain 没有任何 doc（都被裁剪），则 domain 也隐藏
        return resolved.filter((d) => d.docs.length > 0);
    }
}

/**
 * 从候选列表中挑选第一个存在的文件
 * @param rootDir 根目录
 * @param candidates 候选列表
 * @returns chosen candidate absPath | undefined
 */
function pickCandidate(rootDir: string, candidates: ConfigDocCandidate[]): { chosen?: ConfigDocCandidate; absPath?: string } {
    const sorted = [...candidates].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    for (const c of sorted) {
        const absPath = path.resolve(rootDir, c.relPath);
        if (existsSync(absPath)) return { chosen: c, absPath };
    }
    return {};
}