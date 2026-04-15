import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateNginxServerRequest, UpdateNginxServerRequest } from '@yinuo-ngm/nginx';
import { AppError } from '@yinuo-ngm/core';
import { NginxRouteContext, sendBadRequest } from './nginx-route.context';

/**
 * Nginx Server 块路由
 */
export function registerNginxServerRoutes(context: NginxRouteContext): void {
  const { fastify, nginx } = context;

  fastify.get('/servers', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const servers = await nginx.server.getAllServers();
      return reply.send({
        success: true,
        servers,
      });
    } catch (error) {
      return sendBadRequest(reply, error);
    }
  });

  fastify.get<{ Params: { id: string } }>(
    '/servers/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        const server = await nginx.server.getServer(id);
        if (!server) {
          throw new AppError('NOT_FOUND', 'Server 不存在');
        }

        return reply.send({
          success: true,
          server,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.post<{ Body: CreateNginxServerRequest }>(
    '/servers',
    async (request: FastifyRequest<{ Body: CreateNginxServerRequest }>, reply: FastifyReply) => {
      try {
        const server = await nginx.server.createServer(request.body);
        return reply.send({
          success: true,
          server,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.put<{ Params: { id: string }; Body: UpdateNginxServerRequest }>(
    '/servers/:id',
    async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateNginxServerRequest }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        const server = await nginx.server.updateServer(id, request.body);
        return reply.send({
          success: true,
          server,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/servers/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        await nginx.server.deleteServer(id);
        return reply.send({
          success: true,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.patch<{ Params: { id: string } }>(
    '/servers/:id/enable',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        await nginx.server.enableServer(id);
        return reply.send({
          success: true,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.patch<{ Params: { id: string } }>(
    '/servers/:id/disable',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        await nginx.server.disableServer(id);
        return reply.send({
          success: true,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );
}
