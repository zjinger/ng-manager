import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ServerManager } from "./serverManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IPC_CHANNELS = {
    WINDOW_MINIMIZE: "desktop:window:minimize",
    WINDOW_MAXIMIZE: "desktop:window:maximize",
    WINDOW_CLOSE: "desktop:window:close",
    WINDOW_STATUS: "desktop:window:status",
    APP_INFO: "desktop:app:info",
} as const;

function isServe() {
    return process.argv.includes("--serve");
}
const isDev = isServe() || !app.isPackaged;
let win: BrowserWindow | null = null;
let serverMgr: ServerManager | null = null;
let isQuitting = false;
let isStoppingServer = false;

function getPreloadPath() {
    return join(__dirname, "preload.js");
}

function isAllowedNavigation(targetUrl: string, baseUrl: string) {
    try {
        const target = new URL(targetUrl);
        const base = new URL(baseUrl);

        return target.origin === base.origin;
    } catch {
        return false;
    }
}

function isSafeExternalUrl(targetUrl: string) {
    try {
        const parsed = new URL(targetUrl);

        return parsed.protocol === "https:" || parsed.protocol === "mailto:";
    } catch {
        return false;
    }
}

async function stopServer() {
    if (isStoppingServer) {
        return;
    }

    isStoppingServer = true;
    try {
        await serverMgr?.stop();
    } catch {
        // ignore
    } finally {
        isStoppingServer = false;
    }
}

function registerIpcHandlers() {
    ipcMain.removeHandler(IPC_CHANNELS.APP_INFO);
    ipcMain.removeHandler(IPC_CHANNELS.WINDOW_STATUS);
    ipcMain.removeAllListeners(IPC_CHANNELS.WINDOW_MINIMIZE);
    ipcMain.removeAllListeners(IPC_CHANNELS.WINDOW_MAXIMIZE);
    ipcMain.removeAllListeners(IPC_CHANNELS.WINDOW_CLOSE);

    ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
        win?.minimize();
    });

    ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
        if (!win) {
            return;
        }
        if (win.isMaximized()) {
            win.unmaximize();
            return;
        }
        win.maximize();
    });

    ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
        isQuitting = true;
        void app.quit();
    });

    ipcMain.handle(IPC_CHANNELS.WINDOW_STATUS, async () => {
        return {
            isMaximized: win?.isMaximized() ?? false,
            isMinimized: win?.isMinimized() ?? false,
            isFocused: win?.isFocused() ?? false,
        };
    });

    ipcMain.handle(IPC_CHANNELS.APP_INFO, async () => {
        return {
            name: app.getName(),
            version: app.getVersion(),
            isPackaged: app.isPackaged,
            isDev,
            baseUrl: serverMgr?.baseUrl ?? null,
        };
    });
}

async function createWindow(baseUrl: string) {
    console.log('[desktop] main started', {
        pid: process.pid,
        argv: process.argv,
        node: process.versions.node,
        electron: process.versions.electron,
    });
    win = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1100,
        minHeight: 720,
        title: "Ng-Manager",
        show: false,
        webPreferences: {
            preload: getPreloadPath(),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            devTools: isDev,
        },
    });

    win.once("ready-to-show", () => {
        win?.show();
    });

    win.on("closed", () => {
        win = null;
    });

    win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
        if (isSafeExternalUrl(targetUrl)) {
            void shell.openExternal(targetUrl);
        }

        return { action: "deny" };
    });

    win.webContents.on("will-navigate", (event, targetUrl) => {
        if (!isAllowedNavigation(targetUrl, baseUrl)) {
            event.preventDefault();

            if (isSafeExternalUrl(targetUrl)) {
                void shell.openExternal(targetUrl);
            }
        }
    });

    if (isDev) {
        import("electron-debug").then((debug) => {
            debug.default({ isEnabled: true, showDevTools: true });
        });

        await win.loadURL("http://localhost:4200");
    } else {
        await win.loadURL(baseUrl);
    }

    console.log("[desktop] server baseUrl:", baseUrl);

    return win;
}

function resolveServerDir() {
    if (app.isPackaged) {
        return resolve(
            process.resourcesPath,
            "app.asar.unpacked",
            "runtime",
            "node_modules",
            "@yinuo-ngm",
            "server",
        );
    }

    return resolve(__dirname, "..", "..", "..", "packages", "server");
}
async function boot() {
    const mode = isDev ? "dev" : "prod";
    const serverDir = resolveServerDir();
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
        registerIpcHandlers();
        await createWindow(serverMgr.baseUrl);
    } catch (e: any) {
        console.error(e);
        dialog.showErrorBox("Local Server Failed", String(e?.message || e));
        // 启动失败就退出（也可做重试，这里先不加复杂度）
        app.quit();
    }
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
    app.quit();
} else {
    app.on("second-instance", () => {
        if (!win) {
            return;
        }

        if (win.isMinimized()) {
            win.restore();
        }

        win.show();
        win.focus();
    });

    app.whenReady().then(boot);
}

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        isQuitting = true;
        void app.quit();
    }
});

app.on("activate", async () => {
    if (win || !serverMgr) {
        return;
    }

    await createWindow(serverMgr.baseUrl);
});

app.on("before-quit", async () => {
    isQuitting = true;
    await stopServer();
});

process.on("SIGINT", async () => {
    isQuitting = true;
    await stopServer();
    app.exit(0);
});

process.on("SIGTERM", async () => {
    isQuitting = true;
    await stopServer();
    app.exit(0);
});
