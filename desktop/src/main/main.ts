import { app, BrowserWindow, dialog } from "electron";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ServerManager } from "./serverManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function isServe() {
    return process.argv.includes("--serve");
}
const isDev = isServe();
let serverMgr: ServerManager | null = null;
async function createWindow(baseUrl: string) {
    console.log('[desktop] main started', {
        pid: process.pid,
        argv: process.argv,
        node: process.versions.node,
        electron: process.versions.electron,
    });
    const win = new BrowserWindow({
        width: 800,
        height:640,
        title: "Ng-Manager",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    if (isDev) {
        import("electron-debug").then((debug) => {
            debug.default({ isEnabled: true, showDevTools: true });
        });
        // import("electron-reloader").then((reloader) => {
        //     const reloaderFn = (reloader as any).default || reloader;
        //     reloaderFn(module);
        // });

        await win.loadURL("http://localhost:4200");
    } else {
        // 生产模式：这里后续接 webapp build 输出
        // await win.loadFile(path.join(__dirname, "../../webapp/index.html"));
        await win.loadURL("http://localhost:4200"); // 暂时占位，先跑通闭环
    }
    // 先不做复杂注入，先把 baseUrl 留给后续 IPC
    console.log("[desktop] server baseUrl:", baseUrl);
}

function resolveServerDir() {
    // dev：dist/main/main.js => desktop/dist/main
    // 回到 desktop 根，再回到仓库根，再到 server
    return resolve(__dirname, "..", "..", "..", "server");
}
async function boot() {
    const mode = "dev" as const; // 当前阶段先固定 dev。后面 build 时再切 prod
    const serverDir = resolveServerDir();
    // ⚠️ dist 输出目录若不同，这里按实际改
    console.log("[desktop] serverDir:", serverDir);
    serverMgr = new ServerManager({
        mode,
        serverDir,
        host: "127.0.0.1",
        port: 3210,
        onLog: (line) => process.stdout.write(line),
    });

    try {
        await serverMgr.start();
        await createWindow(serverMgr.baseUrl);
    } catch (e: any) {
        console.error(e);
        dialog.showErrorBox("Local Server Failed", String(e?.message || e));
        // 启动失败就退出（也可做重试，这里先不加复杂度）
        app.quit();
    }
}

app.whenReady().then(boot);

app.on("before-quit", async () => {
    try {
        await serverMgr?.stop();
    } catch {
        // ignore
    }
});