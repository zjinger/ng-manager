import type { FastifyReply, FastifyRequest } from 'fastify';
import { NginxRouteContext, sendBadRequest } from './nginx-route.context';

/**
 * Nginx 日志路由
 */
export function registerNginxLogRoutes(context: NginxRouteContext): void {
  const { fastify, nginx } = context;

  fastify.get<{ Querystring: { tail?: string } }>(
    '/logs/error',
    async (request: FastifyRequest<{ Querystring: { tail?: string } }>, reply: FastifyReply) => {
      try {
        const tail = Math.max(1, Math.min(1000, Number(request.query?.tail ?? 100)));
        const lines = await nginx.log.readLogTail('error', tail);
        return reply.send({
          success: true,
          lines,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.get<{ Querystring: { tail?: string } }>(
    '/logs/access',
    async (request: FastifyRequest<{ Querystring: { tail?: string } }>, reply: FastifyReply) => {
      try {
        const tail = Math.max(1, Math.min(1000, Number(request.query?.tail ?? 100)));
        const lines = await nginx.log.readLogTail('access', tail);
        return reply.send({
          success: true,
          lines,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.get('/logs/info', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const errorPath = nginx.log.getLogFilePath('error');
      const accessPath = nginx.log.getLogFilePath('access');
      return reply.send({
        success: true,
        errorLog: errorPath,
        accessLog: accessPath,
      });
    } catch (error) {
      return sendBadRequest(reply, error);
    }
  });
}

