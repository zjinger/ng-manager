import { ProcessService } from "../process";
import type { EditorService } from "./editor.service";
import type { OpenFolderOptions } from "./editor.types";

function systemOpenCommand() {
    if (process.platform === "win32") return { cmd: "explorer", argsPrefix: [] as string[] };
    if (process.platform === "darwin") return { cmd: "open", argsPrefix: [] as string[] };
    return { cmd: "xdg-open", argsPrefix: [] as string[] };
}

// Windows 下用 cmd 执行 code（因为 code 往往是 code.cmd）
function buildVsCodeCommand(folder: string, file?: string) {
    const args = ["-n", folder];
    if (file) args.push(file);

    if (process.platform === "win32") {
        // cmd /c 会识别 code.cmd / code.bat
        // 用 start "" 可以让它独立启动（不阻塞）
        return { cmd: "cmd", args: ["/c", "start", "", "code", ...args], cwd: folder, shell: false as const };
    }

    // mac/linux 通常 code 是可执行文件/软链
    return { cmd: "code", args, cwd: folder, shell: false as const };
}

export class EditorServiceImpl implements EditorService {

    constructor(private proc: ProcessService) { }

    private async openSystem(folder: string) {
        const sys = systemOpenCommand();
        await this.proc.spawnDetached(sys.cmd, [...sys.argsPrefix, folder], {
            cwd: process.cwd(),
            shell: false,
        });
    }

    async openFolder(folder: string, opts: OpenFolderOptions = {}): Promise<void> {
        const editor = opts.editor ?? "code";
        const fallbackToSystem = opts.fallbackToSystem ?? true;
        if (editor === "code") {
            const c = buildVsCodeCommand(folder, opts.file);
            try {
                await this.proc.spawnDetached(c.cmd, c.args, { cwd: c.cwd, shell: c.shell });
                return;
            } catch (e) {
                // 策略 A：降级 system（推荐）
                // 策略 B（严格）：throw e
                if (!fallbackToSystem) throw e;
                await this.openSystem(folder);
                return;
            }
        }
        await this.openSystem(folder);
    }
}