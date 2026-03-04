import { readLock } from "./lock";
import { isHealthy, getHealth } from "./health";
import { pidExists } from "./pid";

type StatusDeps = {
    readLock: typeof readLock;
    isHealthy: typeof isHealthy;
    getHealth: typeof getHealth;
    pidExists: typeof pidExists;
    log: (line: string) => void;
};

type StatusReport = {
    lockExists: boolean;
    pid: number;
    alive: boolean;
    port: number;
    host: string;
    healthy: boolean;
    startedAt: number;
    healthData?: any;
};

export function formatStatusLines(report: StatusReport): string[] {
    if (!report.lockExists) {
        return ["ngm-server: not running"];
    }

    const lines = [
        "ngm-server status:",
        `  pid:     ${report.pid} (${report.alive ? "alive" : "missing"})`,
        `  port:    ${report.port}`,
        `  url:     http://${report.host}:${report.port}`,
        `  health:  ${report.healthy ? "ok" : "fail"}`,
        `  started: ${new Date(report.startedAt).toLocaleString()}`,
    ];

    if (report.healthy) {
        const data = report.healthData || {};
        lines.push(`  server:  pid=${data.pid} uptime=${Math.floor(data.uptime)}s dataDir=${data.dataDir}`);
    }

    return lines;
}

export function createStatusCmd(deps: StatusDeps = defaultStatusDeps) {
    return async function statusCmd(): Promise<void> {
        const lock = deps.readLock();

        if (!lock) {
            deps.log("ngm-server: not running");
            return;
        }

        const host = lock.host ?? "127.0.0.1";
        const alive = deps.pidExists(lock.pid);
        const healthy = await deps.isHealthy(lock.port, host);
        const health = healthy ? await deps.getHealth(lock.port, host) : null;

        for (const line of formatStatusLines({
            lockExists: true,
            pid: lock.pid,
            alive,
            port: lock.port,
            host,
            healthy,
            startedAt: lock.startedAt,
            healthData: health?.data,
        })) {
            deps.log(line);
        }
    };
}

const defaultStatusDeps: StatusDeps = {
    readLock,
    isHealthy,
    getHealth,
    pidExists,
    log: (line) => console.log(line),
};

export const statusCmd = createStatusCmd();
