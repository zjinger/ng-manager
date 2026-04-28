import type { PickCandidate } from "@yinuo-ngm/project";

export type BootstrapStatus = 'running' | 'waitingPick' | 'finalizing' | 'done';

export type BootstrapCtx = {
    taskId: string;
    runId?: string;
    kind: "cli" | "git";
    root: string;
    name: string;
    branch?: string;
    status: BootstrapStatus;
    candidates?: PickCandidate[];
};