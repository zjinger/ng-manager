import { stopCmd } from "./stop";
import { startUi } from "./ui";
import { startServer } from "./server";

type RestartOpts = {
    ui?: boolean;
    port?: number;
    host?: string;
    dataDir?: string;
    logLevel?: string;
    open?: boolean;
};

export async function restartCmd(opts: RestartOpts) {
    await stopCmd();

    // 给端口一点释放时间（Windows 必须）
    await new Promise((r) => setTimeout(r, 800));

    if (opts.ui !== false) {
        await startUi(opts);
    } else {
        await startServer(opts);
    }
}
