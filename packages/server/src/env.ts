import path from "path";
import os from "os";

const isDevMode =
    process.env.NODE_ENV === "development" ||
    process.env.npm_lifecycle_event === "dev" ||
    process.env.npm_lifecycle_event === "dev:server";

const defaultPort = isDevMode ? 3211 : 3210;

export const env = {
    port: Number(process.env.NGM_SERVER_PORT || defaultPort),
    host: process.env.NGM_SERVER_HOST || "127.0.0.1",
    dataDir:
        process.env.NGM_DATA_DIR ||
        path.join(os.homedir(), ".ng-manager"),
    logLevel: process.env.NGM_LOG_LEVEL || "info", // 开发环境默认 info，生产环境可通过环境变量覆盖
    shutdownToken: process.env.NGM_SHUTDOWN_TOKEN || "",
    sysLogCapacity: 3000,
    // 默认的测试环境和开发环境的hub地址
    hubV2BaseUrl: isDevMode ? "http://192.168.1.110:19528" : "http://192.168.1.31:7008",
};
