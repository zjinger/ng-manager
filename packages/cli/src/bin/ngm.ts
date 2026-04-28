#!/usr/bin/env node
import { Command } from "commander";
import { startUi } from "../commands/ui";
import { startServerAction } from "../commands/server";
import { statusCmd } from "../commands/status";
import { stopCmd } from "../commands/stop";
import { restartCmd } from "../commands/restart";
import { logsCmd } from "../commands/logs";
const program = new Command();
const { version } = require("../../package.json") as { version: string };

program
    .name("ngm")
    .description("yinuo-ngm · ng-manager local control plane")
    .version(version, "-v, --version");

program
    .command("status")
    .description("show ngm-server status")
    .action(statusCmd);

program
    .command("stop")
    .description("stop ngm-server")
    .action(stopCmd);

function withServerOptions(cmd: Command) {
    return cmd
        .option("-p, --port <number>", "server port", (v) => Number(v))
        .option("--host <host>", "server host", "127.0.0.1")
        .option("--data-dir <dir>", "data directory")
        .option("--log-level <level>", "log level", "silent")
        .option("--foreground", "run server in foreground mode")
        .option("--no-open", "do not open browser");
}

/** ui */
withServerOptions(
    program.command("ui").description("start server and open UI")
).action(startUi);

/** server */
withServerOptions(
    program.command("server").description("start server")
).action(startServerAction);

/** restart */
withServerOptions(
    program.command("restart").description("restart ngm-server")
).action((opts) => restartCmd({ ...opts, ui: false }));

/** ui:restart */
withServerOptions(
    program.command("ui:restart").description("restart server and open UI")
).action((opts) => restartCmd({ ...opts, ui: true }));

/** logs */
program
    .command("logs")
    .description("view server logs")
    .option("--err", "view stderr log")
    .option("-f, --follow", "follow log output")
    .option("-n, --lines <number>", "number of lines to show", (v) => Number(v), 100)
    .option("--data-dir <dir>", "data directory")
    .action(logsCmd);


program.parse();
