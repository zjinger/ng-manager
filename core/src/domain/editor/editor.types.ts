export type EditorKind = "code" | "system";

export interface OpenFolderOptions {
    editor?: EditorKind;      // default "code"
    file?: string;            // 可选：打开到某个文件

    /** editor 失败时是否降级到系统打开 */
    fallbackToSystem?: boolean; // default true
}