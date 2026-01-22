import { JsonValue } from "@app/core";
import { ConfigCtx } from "./config.model";

export interface ConfigEditSession {
    fileType: string;
    filePath: string;
    ctx: ConfigCtx;
    options: Record<string, any>;
    /** 基线快照：用于生成 before */
    baseline: Record<string, JsonValue>;
    /** 当前编辑值：表单绑定对象 */
    current: Record<string, JsonValue>;

    /** 用于 dirty 快速判断（可选） */
    updatedAt: number;
}
