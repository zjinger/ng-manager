export type BootstrapStatus = 'running' | 'waitingPick' | 'finalizing' | 'done';

export type PickCandidate = {
    path: string;
    kind: "angular" | "vue";
};

export type BootstrapCtx = {
    taskId: string;
    runId?: string;
    kind: "cli" | "git";
    root: string;
    name: string;
    branch?: string;
    status: BootstrapStatus;
    candidates?: PickCandidate[];
}
