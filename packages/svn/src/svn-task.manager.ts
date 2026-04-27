import type { ChildProcess } from "node:child_process";

export class SvnTaskManager {
    private tasks = new Map<string, { child?: ChildProcess }>();

    private key(projectId: string, sourceId: string) {
        return `${projectId}:${sourceId}`;
    }

    isRunning(projectId: string, sourceId: string) {
        return this.tasks.has(this.key(projectId, sourceId));
    }

    register(projectId: string, sourceId: string, child?: ChildProcess) {
        this.tasks.set(this.key(projectId, sourceId), { child });
    }

    setChild(projectId: string, sourceId: string, child?: ChildProcess) {
        const k = this.key(projectId, sourceId);
        const t = this.tasks.get(k);
        if (!t) return;
        t.child = child;
    }

    finish(projectId: string, sourceId: string) {
        this.tasks.delete(this.key(projectId, sourceId));
    }

    cancel(projectId: string, sourceId: string) {
        const t = this.tasks.get(this.key(projectId, sourceId));
        if (!t?.child) return false;
        t.child.kill("SIGTERM");
        return true;
    }
}
