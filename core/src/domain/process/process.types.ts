export interface SpawnOptions {
    cwd: string;
    env?: Record<string, string>;

    /** PTY 场景：终端尺寸（不传就给默认） */
    cols?: number;
    rows?: number;

    /** pipe spawn 时可用；PTY 下忽略 */
    shell?: boolean;

    detached?: boolean;
    stdio?: "pipe" | "ignore";
}

export interface SpawnedProcess {
    pid: number;

    /** PTY：写入输入  */
    write(data: string): void;

    /** PTY：等价 Ctrl+C */
    interrupt(): void;

    /** 兜底强杀 */
    kill(signal?: NodeJS.Signals): void;

    /** PTY：resize，修对齐/表格/换行 */
    resize?(cols: number, rows: number): void;

    onStdout(cb: (chunk: Buffer) => void): void; // pipe driver
    onStderr(cb: (chunk: Buffer) => void): void; // pipe driver
    onExit(cb: (code: number | null, signal: string | null) => void): void;

    /** PTY：统一用 onData（pipe driver 可空实现） */
    onData?(cb: (data: string) => void): void;
}

export type ProcHandle = {
    pid: number;
    interrupt?: () => void; // PTY Ctrl+C
    kill: (s?: NodeJS.Signals) => void;
    resize?: (cols: number, rows: number) => void;
};
