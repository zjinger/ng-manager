import * as path from "node:path";
import { promises as fsp } from "node:fs";
import type { FsEntry, FsListResult, FsLsOptions } from "./fs.types";
import { detectProjectKind } from "./fs.project-detect";
import {
    normalizeInput,
    resolveReal,
    statSafe,
    readdirSafe,
    isWindowsSystemEntry,
    validateDirName,
} from "./fs.path";
import { AppError } from "../../common/errors";
import { FsService } from "./fs.service";

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T, idx: number) => Promise<R>) {
    const ret: R[] = new Array(items.length);
    let i = 0;
    const run = async () => {
        while (i < items.length) {
            const cur = i++;
            ret[cur] = await worker(items[cur], cur);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
    return ret;
}

export class FsServiceImpl implements FsService {
    async ls(inputPath: string, opts: FsLsOptions = {}): Promise<FsListResult> {
        const input = normalizeInput(inputPath);
        if (!input) throw new AppError("PROJECT_ROOT_INVALID" as any, "path is required", { path: input });

        const showSystem = !!opts.showSystem;
        const detectProject = opts.detectProject !== false; // 默认 true
        const concurrency = opts.detectConcurrency ?? 8;

        const real = await resolveReal(input);

        const st = await statSafe(real);
        if (!st) throw new AppError("PROJECT_ROOT_INVALID" as any, "path not found", { path: real });
        if (!st.isDirectory())
            throw new AppError("PROJECT_ROOT_INVALID" as any, "path is not a directory", { path: real });

        const dirents = (await readdirSafe(real)) ?? [];

        const dirs: FsEntry[] = [];
        for (const d of dirents) {
            if (!showSystem && isWindowsSystemEntry(d.name, real)) continue;
            if (!d.isDirectory()) continue;

            dirs.push({ name: d.name, fullPath: path.join(real, d.name), type: "dir" });
        }

        if (detectProject && dirs.length > 0) {
            await mapLimit(dirs, concurrency, async (e) => {
                const detected = await detectProjectKind(e.fullPath);
                if (detected) {
                    e.projectKind = detected.kind;
                    e.projectHints = detected.hints;
                }
                return e;
            });
        }

        dirs.sort((a, b) => a.name.localeCompare(b.name));
        return { path: real, entries: dirs };
    }

    async mkdir(basePath: string, name: string): Promise<FsEntry> {
        const baseInput = normalizeInput(basePath);
        if (!baseInput) throw new AppError("PROJECT_ROOT_INVALID" as any, "path is required", { path: baseInput });

        const dirName = validateDirName(name);
        const baseReal = await resolveReal(baseInput);

        const st = await statSafe(baseReal);
        if (!st) throw new AppError("PROJECT_ROOT_INVALID" as any, "path not found", { path: baseReal });
        if (!st.isDirectory())
            throw new AppError("PROJECT_ROOT_INVALID" as any, "path is not a directory", { path: baseReal });

        const target = path.join(baseReal, dirName);

        const st2 = await statSafe(target);
        if (st2) {
            if (st2.isDirectory())
                throw new AppError("FS_ALREADY_EXISTS" as any, "folder already exists", { path: target });
            throw new AppError("FS_ALREADY_EXISTS" as any, "a file with same name exists", { path: target });
        }

        try {
            await fsp.mkdir(target, { recursive: false });
        } catch (e: any) {
            if (e?.code === "EACCES" || e?.code === "EPERM") {
                throw new AppError("FS_PERMISSION_DENIED" as any, "permission denied", { path: target, code: e.code });
            }
            throw e;
        }

        return { name: dirName, fullPath: target, type: "dir" as const };
    }
}
