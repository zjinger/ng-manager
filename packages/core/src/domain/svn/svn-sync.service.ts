import type { SvnRuntime, SvnSyncResult, } from "./svn.types";

export interface SvnSyncService {
    /**
     * 同步SVN工作副本 ，一次性完成checkout/switch/update逻辑
     * - 如果本地没有工作副本，执行 checkout
     * - 如果本地有工作副本，且URL与目标URL相同，执行 update
     * - 如果本地有工作副本，但URL与目标URL不同，执行 switch
     */
    sync(
        projectId: string,
        sourceId: string,
        dir: string,
        url: string
    ): Promise<SvnSyncResult>

    /**
     * 同步SVN工作副本,实时任务流式，适用于需要实时展示日志的场景
     * - 如果本地没有工作副本，执行 checkout
     * - 如果本地有工作副本，且URL与目标URL相同，执行 update
     * - 如果本地有工作副本，但URL与目标URL不同，执行 switch
     * 支持：
     *  - 实时输出stdout和stderr日志
     * onEvent回调会接收一个对象，包含以下字段：
     * - type: "stdout" | "stderr" | "mode" | "currentUrl" | "desiredUrl"
     * - data: string (当type为stdout或stderr时) 或 SvnSyncMode (当type为mode时) 或 string (当type为currentUrl或desiredUrl时)
     */
    syncWithStream(
        projectId: string,
        sourceId: string,
        dir: string,
        url: string,
    ): Promise<void>

    // 获取SVN运行时数据
    getRuntimeByProjectId(projectId: string, tail?: number): Promise<SvnRuntime[]>;
}