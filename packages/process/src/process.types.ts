export interface SpawnOptions {
    cwd: string;
    env?: Record<string, string>;
    cols?: number;
    rows?: number;
    shell?: boolean;
    detached?: boolean;
    stdio?: "pipe" | "ignore";
}

export interface SpawnedProcess {
    pid: number;
    write(data: string): void;
    interrupt(): void;
    kill(signal?: NodeJS.Signals): void;
    resize?(cols: number, rows: number): void;
    onStdout(cb: (chunk: Buffer) => void): void;
    onStderr(cb: (chunk: Buffer) => void): void;
    onExit(cb: (code: number | null, signal: string | null) => void): void;
    onData?(cb: (data: string) => void): void;
}

export type ProcHandle = {
    pid: number;
    interrupt?: () => void;
    kill: (s?: NodeJS.Signals) => void;
    resize?: (cols: number, rows: number) => void;
};

export interface KillPortResult {
    port: number;
    pids: number[];
    killed: number[];
    failed: { pid: number; reason: string }[];
    note?: string;
}
