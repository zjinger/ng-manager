import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  SaveNginxModuleSettingsRequestDto,
  SaveNginxPerformanceConfigRequestDto,
  SaveNginxSslCertificatesRequestDto,
  SaveNginxTrafficConfigRequestDto,
  SaveNginxUpstreamsRequestDto,
} from '@yinuo-ngm/protocol';
import {
  NginxRouteContext,
  sendBadRequest,
  toNginxModuleSettingsDto,
  toNginxPerformanceConfigDto,
  toNginxSslCertificateDto,
  toNginxTrafficConfigDto,
  toNginxUpstreamDto,
} from './nginx-route.context';

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
        upstreams: upstreams.map(toNginxUpstreamDto),
      });
    } catch (error) {
      return sendBadRequest(reply, error);
    }
  });

  fastify.put<{ Body: SaveNginxUpstreamsRequestDto }>(
    '/upstreams',
    async (request: FastifyRequest<{ Body: SaveNginxUpstreamsRequestDto }>, reply: FastifyReply) => {
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
        certificates: certificates.map(toNginxSslCertificateDto),
      });
    } catch (error) {
      return sendBadRequest(reply, error);
    }
  });

  fastify.put<{ Body: SaveNginxSslCertificatesRequestDto }>(
    '/ssl/certificates',
    async (
      request: FastifyRequest<{ Body: SaveNginxSslCertificatesRequestDto }>,
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
        traffic: toNginxTrafficConfigDto(traffic),
      });
    } catch (error) {
      return sendBadRequest(reply, error);
    }
  });

  fastify.put<{ Body: SaveNginxTrafficConfigRequestDto }>(
    '/traffic',
    async (request: FastifyRequest<{ Body: SaveNginxTrafficConfigRequestDto }>, reply: FastifyReply) => {
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
        performance: toNginxPerformanceConfigDto(performance),
      });
    } catch (error) {
      return sendBadRequest(reply, error);
    }
  });

  fastify.put<{ Body: SaveNginxPerformanceConfigRequestDto }>(
    '/performance',
    async (request: FastifyRequest<{ Body: SaveNginxPerformanceConfigRequestDto }>, reply: FastifyReply) => {
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
        settings: toNginxModuleSettingsDto(settings),
      });
    } catch (error) {
      return sendBadRequest(reply, error);
    }
  });

  fastify.put<{ Body: SaveNginxModuleSettingsRequestDto }>(
    '/module/settings',
    async (request: FastifyRequest<{ Body: SaveNginxModuleSettingsRequestDto }>, reply: FastifyReply) => {
      try {
        const settings = await nginx.module.saveModuleSettings(request.body || {});
        return reply.send({
          success: true,
          settings: toNginxModuleSettingsDto(settings),
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );
}

