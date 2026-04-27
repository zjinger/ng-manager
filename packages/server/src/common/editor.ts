import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import launchEditor from "launch-editor";
import * as path from "path";

export interface OpenFolderOptions {
    editor?: "code" | "system";
    file?: string;
}

/**
 * 在指定文件夹打开编辑器
 * @param folder 文件夹路径
 * @param opts OpenFolderOptions 选项
 */
export async function openFolder(folder: string, opts: OpenFolderOptions = {}): Promise<void> {
    const editor = opts.editor ?? "code";
    const file = opts.file;

    const target = file
        ? path.resolve(folder, file)
        : path.resolve(folder);

    return new Promise<void>((resolve, reject) => {
        let settled = false;

        // 兜底：避免 callback 不触发导致请求永远挂起
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            resolve();
        }, 200);

        launchEditor(
            target,
            editor === "system" ? undefined : editor,
            (fileName, errorMsg) => {
                // fastify.log.info(`launchEditor callback invoked: file=${fileName}, error=${errorMsg}`);
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                if (errorMsg) {
                    reject(new CoreError(CoreErrorCodes.EDITOR_NOT_FOUND, errorMsg, { fileName, editor, folder, file, target }));
                    return;
                }
                resolve();
            }
        );
    });
}