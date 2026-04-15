import type { FastifyInstance } from 'fastify';
import { createNginxRouteContext } from './nginx/nginx-route.context';
import { registerNginxConfigRoutes } from './nginx/nginx-config.routes';
import { registerNginxLifecycleRoutes } from './nginx/nginx-lifecycle.routes';
import { registerNginxLogRoutes } from './nginx/nginx-log.routes';
import { registerNginxModuleRoutes } from './nginx/nginx-module.routes';
import { registerNginxServerRoutes } from './nginx/nginx-server.routes';

/**
 * Nginx 管理路由入口
 */
export async function nginxRoutes(fastify: FastifyInstance) {
  const context = createNginxRouteContext(fastify);

  registerNginxLifecycleRoutes(context);
  registerNginxConfigRoutes(context);
  registerNginxServerRoutes(context);
  registerNginxModuleRoutes(context);
  registerNginxLogRoutes(context);
}

