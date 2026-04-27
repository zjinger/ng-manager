import * as fs from "fs";
import * as path from "path";
import { ProjectFramework } from "../project.meta";
import { ParsedPackageJson } from "../parsers/parsePackageJson";
import { PickCandidate } from "../bootstrap.types";

export function detectFramework(
    rootDir: string,
    pkg: ParsedPackageJson | null
): ProjectFramework {
    if (fs.existsSync(path.join(rootDir, "angular.json"))) {
        return "angular";
    }
    const deps = {
        ...(pkg?.dependencies ?? {}),
        ...(pkg?.devDependencies ?? {}),
    };
    if (deps["@angular/core"]) return "angular";
    if (deps["vue"]) return "vue";
    if (deps["react"]) return "react";
    if (pkg) return "node";
    return "unknown";
}

const IGNORE_DIRS = new Set([".git", "node_modules", "dist", "build", "out", "target", ".angular", ".nx", ".turbo",]);

function existsFile(p: string) {
    try { return fs.existsSync(p); } catch { return false; }
}
function detectWorkspaceKind(dir: string): "angular" | "vue" | null {
    if (isWorkspaceAngular(dir)) return "angular";
    if (isWorkspaceVue(dir)) return "vue";
    return null;
}

function isWorkspaceAngular(dir: string) {
    return existsFile(path.join(dir, "angular.json"));
}
function isWorkspaceVue(dir: string) {
    if (existsFile(path.join(dir, "vue.config.js"))) return true;
    if (existsFile(path.join(dir, "vite.config.ts"))) return true;
    if (existsFile(path.join(dir, "vite.config.js"))) return true;
    if (existsFile(path.join(dir, "package.json"))) {
        if (existsFile(path.join(dir, "src", "main.ts"))) return true;
        if (existsFile(path.join(dir, "src", "main.js"))) return true;
    }
    return false;
}

export function scanWorkspaceCandidates(root: string, maxDepth = 3): PickCandidate[] {
    const out: PickCandidate[] = [];
    const walk = (dir: string, depth: number) => {
        if (depth > maxDepth) return;
        const kind = detectWorkspaceKind(dir);
        if (kind) {
            out.push({ path: dir, kind });
            return;
        }
        let ents: fs.Dirent[];
        try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const e of ents) {
            if (e.isDirectory() && !IGNORE_DIRS.has(e.name)) {
                walk(path.join(dir, e.name), depth + 1);
            }
        }
    };
    walk(root, 0);
    return out;
}
