import path from "path";
import os from "os";

export const env = {
    port: Number(process.env.NGM_SERVER_PORT || 3210),
    host: process.env.NGM_SERVER_HOST || "127.0.0.1",
    dataDir:
        process.env.NGM_DATA_DIR ||
        path.join(os.homedir(), ".ng-manager"),
    logLevel: process.env.NGM_LOG_LEVEL || "info",
    sysLogCapacity: 3000,
};