import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import {
    safeSvnPath,
    normalizeSvnUrl,
} from "./svn.util";
import type {
    SvnWorkingCopyResult,
    SvnSyncResult,
} from "./svn.types";
import { SvnRuntimeRepo } from "./svn-runtime.repo";
import { SvnSyncService } from "./svn-sync.service";

const execFileAsync = promisify(execFile);

export class SvnSyncServiceImpl implements SvnSyncService {
    constructor(
        private runtimeRepo: SvnRuntimeRepo,
        private svnBinary: string = "svn"
    ) { }

    private async svnInfoUrl(dir: string): Promise<string> {
        try {
            const { stdout } = await execFileAsync(
                this.svnBinary,
                ["info", "--show-item", "url"],
                { cwd: dir }
            );
            return stdout.trim();
        } catch {
            return "";
        }
    }

    private async checkoutOrUpdate(
        dir: string,
        svnUrlRaw: string
    ): Promise<SvnWorkingCopyResult> {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const desiredUrl = safeSvnPath(svnUrlRaw);
        const desiredNorm = normalizeSvnUrl(desiredUrl);

        const svnDir = path.join(dir, ".svn");
        const isCheckout = !fs.existsSync(svnDir);

        if (isCheckout) {
            const { stdout, stderr } = await execFileAsync(
                this.svnBinary,
                ["checkout", desiredUrl, "."],
                { cwd: dir }
            );
            const currentUrl = await this.svnInfoUrl(dir);
            return {
                mode: "checkout",
                stdout,
                stderr,
                desiredUrl,
                currentUrl,
            };
        }

        const currentUrl0 = await this.svnInfoUrl(dir);
        if (!currentUrl0) {
            await fs.promises.rm(dir, { recursive: true, force: true });
            fs.mkdirSync(dir, { recursive: true });

            const { stdout, stderr } = await execFileAsync(
                this.svnBinary,
                ["checkout", desiredUrl, "."],
                { cwd: dir }
            );
            const currentUrl = await this.svnInfoUrl(dir);
            return {
                mode: "recheckout",
                stdout,
                stderr,
                desiredUrl,
                currentUrl,
            };
        }

        const currentNorm = normalizeSvnUrl(currentUrl0);

        if (currentNorm !== desiredNorm) {
            try {
                const { stdout, stderr } = await execFileAsync(
                    this.svnBinary,
                    ["switch", desiredUrl, ".", "--ignore-ancestry"],
                    { cwd: dir }
                );
                const currentUrl = await this.svnInfoUrl(dir);
                return {
                    mode: "switch",
                    stdout,
                    stderr,
                    desiredUrl,
                    currentUrl,
                };
            } catch {
                await fs.promises.rm(dir, { recursive: true, force: true });
                fs.mkdirSync(dir, { recursive: true });

                const { stdout, stderr } = await execFileAsync(
                    this.svnBinary,
                    ["checkout", desiredUrl, "."],
                    { cwd: dir }
                );
                const currentUrl = await this.svnInfoUrl(dir);
                return {
                    mode: "recheckout",
                    stdout,
                    stderr,
                    desiredUrl,
                    currentUrl,
                };
            }
        }

        const { stdout, stderr } = await execFileAsync(
            this.svnBinary,
            ["update"],
            { cwd: dir }
        );

        const currentUrl = await this.svnInfoUrl(dir);
        return {
            mode: "update",
            stdout,
            stderr,
            desiredUrl,
            currentUrl,
        };
    }

    async sync(
        projectId: string,
        sourceId: string,
        dir: string,
        url: string
    ): Promise<SvnSyncResult> {
        const r = await this.checkoutOrUpdate(dir, url);
        const now = new Date().toISOString();

        this.runtimeRepo.update(projectId, sourceId, {
            lastSyncAt: now,
            lastSyncMode: r.mode,
            desiredUrl: r.desiredUrl,
            currentUrl: r.currentUrl,
            lastStdout: r.stdout?.slice(0, 5000),
            lastStderr: r.stderr?.slice(0, 5000),
        });

        return {
            ok: true,
            projectId,
            sourceId,
            mode: r.mode,
            updatedAt: now,
            desiredUrl: r.desiredUrl,
            currentUrl: r.currentUrl,
            stdout: r.stdout,
            stderr: r.stderr,
        };
    }
}