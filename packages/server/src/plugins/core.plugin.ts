// src/server/plugins/core.plugin.ts

import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { createCoreApp, type CoreApp } from "@ngm/core";
import { env } from "../env";

/**
 * Fastify 装饰器类型扩展
 */
declare module "fastify" {
    interface FastifyInstance {
        core: CoreApp;
    }
}

/**
 * Core Plugin
 * - 创建 CoreApp
 * - 注入到 fastify.core
 */
export default fp(async function corePlugin(
    fastify: FastifyInstance
) {
    const coreApp = await createCoreApp({
        sysLogCapacity: env.sysLogCapacity,
        dataDir: env.dataDir, // 可选: 自定义数据目录
    });

    fastify.decorate("core", coreApp);

    fastify.log.info("[core] core app initialized");
});
