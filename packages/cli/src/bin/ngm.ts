#!/usr/bin/env node
import { Command } from "commander";
import { startUi } from "../commands/ui";
import { startServerAction } from "../commands/server";

const program = new Command();

program
    .name("ngm")
    .description("ng-manager local control plane")
    .version("0.1.0");

function withServerOptions(cmd: Command) {
    return cmd
        .option("-p, --port <number>", "server port", (v) => Number(v))
        .option("--host <host>", "server host", "127.0.0.1")
        .option("--data-dir <dir>", "data directory")
        .option("--log-level <level>", "log level", "info")
        .option("--no-open", "do not open browser");
}

/** ui */
withServerOptions(
    program.command("ui").description("start server and open UI")
).action(startUi);

/** server */
withServerOptions(
    program.command("server").description("start server only")
).action(startServerAction);

program.parse();
