import { ApiClient } from "@yinuo-ngm/api";
import { type CoreApp } from "@yinuo-ngm/core";

/**
 * Fastify 装饰器类型扩展
 */
declare module "fastify" {
    interface FastifyInstance {
        core: CoreApp;
        api: ApiClient;
    }
}