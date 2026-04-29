import type { CoreApp } from "@yinuo-ngm/core";
import type { NginxApp } from "@yinuo-ngm/nginx";
import type { ApiClient } from "@yinuo-ngm/api";

/**
 * Fastify 装饰器类型扩展
 * api 和 nginx 现在通过 fastify.core.nginx 和 fastify.core.apiClient 访问
 * 此处保留类型声明以保持向后兼容
 */
declare module "fastify" {
    interface FastifyInstance {
        core: CoreApp;
        nginx: NginxApp;
        api: ApiClient;
    }
}