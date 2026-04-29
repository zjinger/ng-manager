import type { FastifyReply, FastifyRequest } from 'fastify';
import type { NginxBindRequest } from '@yinuo-ngm/nginx';
import { savePersistedNginxPath, clearPersistedNginxPath } from "@yinuo-ngm/core";
import { env } from '../../env';
import { NginxRouteContext, sendBadRequest } from './nginx-route.context';

/**
 * Nginx 生命周期与服务控制路由
 */
export function registerNginxLifecycleRoutes(context: NginxRouteContext): void {
  const { fastify, nginx } = context;

  fastify.get('/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const instance = nginx.service.getInstance();
    const status = await nginx.service.getStatus();

    return reply.send({
      instance,
      status,
    });
  });

  fastify.get('/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const instance = nginx.service.getInstance();
      const status = await nginx.service.getStatus();
      const servers = await nginx.server.getAllServers();
      const enabled = servers.filter((item: { enabled: boolean }) => item.enabled).length;

      return reply.send({
        success: true,
        instance,
        status,
        serverSummary: {
          total: servers.length,
          enabled,
          disabled: Math.max(servers.length - enabled, 0),
        },
      });
    } catch (error) {
      return sendBadRequest(reply, error);
    }
  });

  fastify.post<{ Body: NginxBindRequest }>(
    '/bind',
    async (request: FastifyRequest<{ Body: NginxBindRequest }>, reply: FastifyReply) => {
      const { path } = request.body;

      try {
        const instance = await nginx.service.bind(path);
        try {
          await savePersistedNginxPath(env.dataDir, instance.path);
        } catch (persistError) {
          fastify.log.warn(`[nginx] binding persisted failed: ${String(persistError)}`);
        }
        return reply.send({
          success: true,
          instance,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.post('/unbind', async (_request: FastifyRequest, reply: FastifyReply) => {
    nginx.service.unbind();
    try {
      await clearPersistedNginxPath(env.dataDir);
    } catch (error) {
      fastify.log.warn(`[nginx] clear persisted binding failed: ${String(error)}`);
    }
    return reply.send({
      success: true,
    });
  });

  fastify.get('/local-ip', async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await nginx.service.getLocalIp();
    return reply.send(result);
  });

  fastify.post('/start', async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await nginx.service.start();
    if (result.success) {
      fastify.core.sysLog.info({ scope: 'system', source: 'server', text: '[Nginx] 启动成功' });
    } else {
      fastify.core.sysLog.error({ scope: 'system', source: 'server', text: `[Nginx] 启动失败: ${result.error || '未知错误'}` });
    }
    return reply.send(result);
  });

  fastify.post('/stop', async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await nginx.service.stop();
    if (result.success) {
      fastify.core.sysLog.warn({ scope: 'system', source: 'server', text: '[Nginx] 已停止' });
    } else {
      fastify.core.sysLog.error({ scope: 'system', source: 'server', text: `[Nginx] 停止失败: ${result.error || '未知错误'}` });
    }
    return reply.send(result);
  });

  fastify.post('/reload', async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await nginx.service.reload();
    if (result.success) {
      fastify.core.sysLog.info({ scope: 'system', source: 'server', text: '[Nginx] 配置重载成功' });
    } else {
      fastify.core.sysLog.error({ scope: 'system', source: 'server', text: `[Nginx] 重载失败: ${result.error || '未知错误'}` });
    }
    return reply.send(result);
  });

  fastify.post('/test', async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await nginx.service.testConfig();
    if (result.valid) {
      fastify.core.sysLog.success({ scope: 'system', source: 'server', text: '[Nginx] 配置检测通过' });
    } else {
      fastify.core.sysLog.error({ scope: 'system', source: 'server', text: `[Nginx] 配置检测失败: ${(result.errors || []).join(', ')}` });
    }
    return reply.send(result);
  });
}

