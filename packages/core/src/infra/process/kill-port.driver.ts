import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { KillPortResult } from "./process.types";
import { AppError } from "../../common/errors";
const execFileAsync = promisify(execFile);

function isWin32(): boolean {
    return os.platform() === "win32";
}

export async function killPort(port: number): Promise<KillPortResult> {
    if (!Number.isFinite(port) || port <= 0 || port > 65535) {
        throw new AppError("INVALID_PORT", `invalid port: ${port}`, { port });
    }
    const isWin = isWin32();
    const pids = isWin
        ? await findPidsOnPortWin(port)
        : await findPidsOnPortUnix(port);

    const uniqPids = Array.from(new Set(pids)).filter((x) => Number.isFinite(x) && x > 0);

    if (uniqPids.length === 0) {
        return { port, pids: [], killed: [], failed: [] };
    }

    const { killed, failed } = isWin
        ? await killPidsWin(uniqPids)
        : await killPidsUnix(uniqPids);

    const note =
        isWin
            ? "Windows 可能需要以管理员权限运行（taskkill Access is denied）"
            : "Linux/macOS 可能需要 sudo 权限（kill Operation not permitted）";

    return { port, pids: uniqPids, killed, failed, note };
}

/**
* Windows  只跑 netstat -ano，然后 Node 里过滤，不使用 findstr（避免 code=1 假失败）
* 默认只抓 TCP LISTENING + UDP（UDP 无 state）
*/
async function findPidsOnPortWin(port: number): Promise<number[]> {
    const { stdout } = await execFileAsync("cmd", ["/c", "netstat -ano"], {
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
    });

    const pids: number[] = [];
    const needle = `:${port}`;

    for (const line of stdout.split(/\r?\n/)) {
        const s = line.trim();
        if (!s) continue;

        if (!(s.startsWith("TCP") || s.startsWith("UDP"))) continue;
        if (!s.includes(needle)) continue;

        const parts = s.split(/\s+/);

        // TCP: proto local remote state pid
        if (parts[0] === "TCP" && parts.length >= 5) {
            const local = parts[1];
            const state = parts[3];
            const pidStr = parts[4];

            if (state?.toUpperCase() !== "LISTENING") continue;

            const m = local.match(/:(\d+)\s*$/);
            if (!m || Number(m[1]) !== port) continue;

            const pid = Number(pidStr);
            if (Number.isFinite(pid)) pids.push(pid);
            continue;
        }

        // UDP: proto local remote pid（无 state）
        if (parts[0] === "UDP" && parts.length >= 4) {
            const local = parts[1];
            const pidStr = parts[3];

            const m = local.match(/:(\d+)\s*$/);
            if (!m || Number(m[1]) !== port) continue;

            const pid = Number(pidStr);
            if (Number.isFinite(pid)) pids.push(pid);
            continue;
        }
    }

    return pids;
}

async function findPidsOnPortUnix(port: number): Promise<number[]> {
    // 1) lsof
    {
        const r = await execFileAsync("sh", ["-lc", `command -v lsof >/dev/null 2>&1 && lsof -i :${port} -sTCP:LISTEN -t || true`], {
            maxBuffer: 2 * 1024 * 1024,
        });
        const pids = r.stdout
            .split(/\r?\n/)
            .map((x) => x.trim())
            .filter(Boolean)
            .map(Number)
            .filter((n) => Number.isFinite(n));
        if (pids.length) return pids;
    }

    // 2) ss
    {
        const r = await execFileAsync("sh", ["-lc", `command -v ss >/dev/null 2>&1 && ss -ltnp 2>/dev/null | grep ":${port} " || true`], {
            maxBuffer: 2 * 1024 * 1024,
        });
        const pids = parseUnixPidFromSs(r.stdout);
        if (pids.length) return pids;
    }

    // 3) netstat
    {
        const r = await execFileAsync("sh", ["-lc", `command -v netstat >/dev/null 2>&1 && netstat -ltnp 2>/dev/null | grep ":${port} " || true`], {
            maxBuffer: 2 * 1024 * 1024,
        });
        return parseUnixPidFromNetstat(r.stdout);
    }
}

function parseUnixPidFromSs(stdout: string): number[] {
    const pids: number[] = [];
    for (const line of stdout.split(/\r?\n/)) {
        const ms = line.match(/pid=(\d+)/g);
        if (!ms) continue;
        for (const item of ms) {
            const pid = Number(item.slice(4));
            if (Number.isFinite(pid)) pids.push(pid);
        }
    }
    return pids;
}

function parseUnixPidFromNetstat(stdout: string): number[] {
    const pids: number[] = [];
    for (const line of stdout.split(/\r?\n/)) {
        const s = line.trim();
        if (!s) continue;
        const parts = s.split(/\s+/);
        const last = parts[parts.length - 1] || "";
        const m = last.match(/^(\d+)\//);
        if (!m) continue;
        const pid = Number(m[1]);
        if (Number.isFinite(pid)) pids.push(pid);
    }
    return pids;
}

async function killPidsWin(pids: number[]): Promise<{ killed: number[]; failed: { pid: number; reason: string }[] }> {
    const killed: number[] = [];
    const failed: { pid: number; reason: string }[] = [];

    for (const pid of pids) {
        // /F 强制；/T 杀子进程树
        const r = await execFileAsync("cmd", ["/c", `taskkill /PID ${pid} /F /T`], {
            windowsHide: true,
            maxBuffer: 2 * 1024 * 1024,
        }).then(
            (ok) => ({ ok: true, stdout: ok.stdout, stderr: ok.stderr }),
            (e: any) => ({ ok: false, stdout: String(e?.stdout ?? ""), stderr: String(e?.stderr ?? e?.message ?? "") })
        );

        if (r.ok) {
            killed.push(pid);
        } else {
            failed.push({ pid, reason: (r.stderr || r.stdout || "taskkill failed").trim() });
        }
    }

    return { killed, failed };
}

async function killPidsUnix(pids: number[]): Promise<{ killed: number[]; failed: { pid: number; reason: string }[] }> {
    // 逐个 kill，便于给出 failed 明细
    const killed: number[] = [];
    const failed: { pid: number; reason: string }[] = [];

    for (const pid of pids) {
        const r = await execFileAsync("sh", ["-lc", `kill -9 ${pid}`], {
            maxBuffer: 2 * 1024 * 1024,
        }).then(
            () => ({ ok: true, msg: "" }),
            (e: any) => ({ ok: false, msg: String(e?.stderr ?? e?.message ?? e) })
        );

        if (r.ok) killed.push(pid);
        else failed.push({ pid, reason: (r.msg || "kill failed").trim() });
    }

    return { killed, failed };
}
