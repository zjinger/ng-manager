export interface LogLine {
    id?: string;// UUID v4
    ts: number;                 // Date.now()
    level: string;          // debug | info | warn | error
    source: string;          // 谁写的
    scope: string;           // 归属范围
    /**
     * task 生命周期：refId = runId, data.taskId
     * project：refId = projectId
     * ws：refId = connId
     * server：refId = "server" 
     */
    refId?: string;             // taskId / projectId / etc
    text: string;
    data?: any;                 // 额外数据
}
