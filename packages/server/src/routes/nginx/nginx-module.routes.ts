import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  NginxModuleSettings,
  NginxPerformanceConfig,
  NginxSslCertificate,
  NginxTrafficConfig,
  NginxUpstream,
} from '@yinuo-ngm/nginx';
import { NginxRouteContext, sendBadRequest } from './nginx-route.context';

/**
 * Nginx 模块（Upstream/SSL/流量/性能/设置）路由
 */
export function registerNginxModuleRoutes(context: NginxRouteContext): void {
  const { fastify, nginx } = context;

  fastify.get('/upstreams', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const upstreams = await nginx.module.getUpstreams();
      return reply.send({
        success: true,
        upstreams,
      });
    } catch (error) {
      return sendBadRequest(reply, error);
    }
  });

  fastify.put<{ Body: { upstreams: NginxUpstream[] } }>(
    '/upstreams',
    async (request: FastifyRequest<{ Body: { upstreams: NginxUpstream[] } }>, reply: FastifyReply) => {
      try {
        await nginx.module.saveUpstreams(request.body?.upstreams || []);
        return reply.send({
          success: true,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.get('/ssl/certificates', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const certificates = await nginx.module.getSslCertificates();
      return reply.send({
        success: true,
        certificates,
      });
    } catch (error) {
      return sendBadRequest(reply, error);
    }
  });

  fastify.put<{ Body: { certificates: NginxSslCertificate[] } }>(
    '/ssl/certificates',
    async (
      request: FastifyRequest<{ Body: { certificates: NginxSslCertificate[] } }>,
      reply: FastifyReply
    ) => {
      try {
        await nginx.module.saveSslCertificates(request.body?.certificates || []);
        return reply.send({
          success: true,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.get('/traffic', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const traffic = await nginx.module.getTrafficConfig();
      return reply.send({
        success: true,
        traffic,
      });
    } catch (error) {
      return sendBadRequest(reply, error);
    }
  });

  fastify.put<{ Body: NginxTrafficConfig }>(
    '/traffic',
    async (request: FastifyRequest<{ Body: NginxTrafficConfig }>, reply: FastifyReply) => {
      try {
        await nginx.module.saveTrafficConfig(request.body);
        return reply.send({
          success: true,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.get('/performance', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const performance = await nginx.module.getPerformanceConfig();
      return reply.send({
        success: true,
        performance,
      });
    } catch (error) {
      return sendBadRequest(reply, error);
    }
  });

  fastify.put<{ Body: NginxPerformanceConfig }>(
    '/performance',
    async (request: FastifyRequest<{ Body: NginxPerformanceConfig }>, reply: FastifyReply) => {
      try {
        await nginx.module.savePerformanceConfig(request.body);
        return reply.send({
          success: true,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.get('/module/settings', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const settings = await nginx.module.getModuleSettings();
      return reply.send({
        success: true,
        settings,
      });
    } catch (error) {
      return sendBadRequest(reply, error);
    }
  });

  fastify.put<{ Body: Partial<NginxModuleSettings> }>(
    '/module/settings',
    async (request: FastifyRequest<{ Body: Partial<NginxModuleSettings> }>, reply: FastifyReply) => {
      try {
        const settings = await nginx.module.saveModuleSettings(request.body || {});
        return reply.send({
          success: true,
          settings,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );
}

