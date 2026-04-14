import { ApiClient } from "@yinuo-ngm/api";
import { type CoreApp } from "@yinuo-ngm/core";
import { type NginxApp } from "@yinuo-ngm/nginx";

/**
 * Fastify 装饰器类型扩展
 */
declare module "fastify" {
    interface FastifyInstance {
        core: CoreApp;
        api: ApiClient;
        nginx: NginxApp;
    }
}