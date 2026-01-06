import type { OpenFolderOptions } from "./editor.types";

export interface EditorService {
    openFolder(folder: string, opts?: OpenFolderOptions): Promise<void>;
}
