import type {
    TaskBootstrapDonePayload,
    TaskBootstrapFailedPayload,
    TaskBootstrapNeedPickRootPayload,
} from "@yinuo-ngm/protocol";

export const BootstrapEvents = {
    DONE: 'project.bootstrap.done',
    FAILED: 'project.bootstrap.failed',
    NEED_PICK_ROOT: 'project.bootstrap.needPickRoot',
} as const;

export type BootstrapEventMap = {
    [BootstrapEvents.DONE]: TaskBootstrapDonePayload;
    [BootstrapEvents.FAILED]: TaskBootstrapFailedPayload;
    [BootstrapEvents.NEED_PICK_ROOT]: TaskBootstrapNeedPickRootPayload;
};