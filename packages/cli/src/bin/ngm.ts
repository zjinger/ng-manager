#!/usr/bin/env node
import { Command } from "commander";
import { execa } from "execa";
import getPort from "get-port";
import open from "open";
import envPaths from "env-paths";
import  path from "node:path";
import fs from "node:fs";

const program = new Command();

program
    .name("ngm")
    .description("ng-manager local control plane")
    .version("0.1.0");

program
    .command("ui")
    .description("Start local server and open UI in browser")
    .option("--port <port>", "server port")
    .option("--no-open", "do not open browser")
    .action(async (opts) => {
        const paths = envPaths("ng-manager");
        fs.mkdirSync(paths.data, { recursive: true });

        const port = opts.port ? Number(opts.port) : await getPort({ port: [5820, 5821, 5822, 0] });

        // server 入口：推荐 server 包暴露一个可执行文件 dist/bin/ngm-server.js
        const serverBin = path.resolve(
            new URL(import.meta.url).pathname,
            "../../ngm-server.js"
        );

        const child = execa("node", [serverBin, "--port", String(port), "--dataDir", paths.data], {
            stdio: "inherit",
        });

        // 简化版：直接等 800ms 再 open（更稳是轮询 /health）
        await new Promise((r) => setTimeout(r, 800));

        if (opts.open !== false) {
            await open(`http://127.0.0.1:${port}`);
        }

        // 前台保持，接收 ctrl+c
        await child;
    });

program
    .command("start")
    .description("Start local server only")
    .option("--port <port>", "server port", "5820")
    .action(async (opts) => {
        const paths = envPaths("ng-manager");
        fs.mkdirSync(paths.data, { recursive: true });

        const serverBin = path.resolve(
            new URL(import.meta.url).pathname,
            "../../ngm-server.js"
        );

        await execa("node", [serverBin, "--port", String(opts.port), "--dataDir", paths.data], {
            stdio: "inherit",
        });
    });

program.parse();
