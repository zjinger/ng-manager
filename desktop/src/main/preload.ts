import { contextBridge, ipcRenderer } from "electron";

const desktopApi = {
    isElectron: true,
    minimizeWindow: () => ipcRenderer.send("desktop:window:minimize"),
    maximizeWindow: () => ipcRenderer.send("desktop:window:maximize"),
    closeWindow: () => ipcRenderer.send("desktop:window:close"),
    getWindowStatus: () => ipcRenderer.invoke("desktop:window:status"),
    getAppInfo: () => ipcRenderer.invoke("desktop:app:info"),
};

contextBridge.exposeInMainWorld("ngmDesktop", desktopApi);
