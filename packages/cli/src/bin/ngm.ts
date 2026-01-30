#!/usr/bin/env node

import { Command } from "commander";

const program = new Command();

program
    .name("ngm")
    .description("ng-manager CLI")
    .version("0.1.0");

program
    .command("ui")
    .description("Start server and open UI")
    .action(() => {
        require("../commands/ui").startUi();
    });

program
    .command("server")
    .description("Start server only")
    .action(() => {
        require("../commands/server").startServerOnly();
    });

program.parse();
