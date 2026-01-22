/**
 * 统一工作区模型
 */
export interface WorkspaceModel {
    /** 原始 json 内容 */
    raw: any;
    /** 文件路径 */
    filePath: string;
}

/** JSON 值类型 */
export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | { [key: string]: JsonValue };


