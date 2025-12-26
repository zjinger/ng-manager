// desktop/src/main/main.ts
import { app, BrowserWindow } from "electron";

function isServe() {
    return process.argv.includes("--serve");
}

const isDev = isServe();

async function createWindow() {
    console.log('[desktop] main started', {
        pid: process.pid,
        argv: process.argv,
        node: process.versions.node,
        electron: process.versions.electron,
    });
    const win = new BrowserWindow({
        width: 1280,
        height: 820,
        title: "Ng-Manager",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    if (isDev) {
        await win.loadURL("http://localhost:4200");
    } else {
        // production: loadFile(...)
        await win.loadFile("path/to/index.html");
    }
}

app.whenReady().then(createWindow);
