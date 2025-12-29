// src/core/domain/process/process.model.ts

export interface SpawnOptions {
    cwd: string;
    env?: Record<string, string>;
    /**
     * 默认 true：跨平台跑命令更省事（npm/pnpm/yarn 等）
     * 如果你后面上 node-pty，再考虑 false/pty 专用逻辑
     */
    shell?: boolean;
}

export interface SpawnedProcess {
    pid: number;

    kill(signal?: NodeJS.Signals): void;

    onStdout(cb: (chunk: Buffer) => void): void;
    onStderr(cb: (chunk: Buffer) => void): void;

    onExit(cb: (code: number | null, signal: string | null) => void): void;
}
