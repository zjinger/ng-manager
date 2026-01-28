
/**
 * 引导流程状态
 * - running: 正在运行
 * - waitingPick: 等待用户选择仓库候选项
 * - finalizing: 正在完成最后的引导步骤
 * - done: 引导完成
 */
export type BootstrapStatus = 'running' | 'waitingPick' | 'finalizing' | 'done';

/**
 * 选择的仓库候选项
 */
export type PickCandidate = {
    path: string;
    kind: "angular" | "vue";
};

/**
 * 引导上下文
 * - cli: 通过 CLI 参数引导
 * - git: 通过 Git 仓库引导
 */
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