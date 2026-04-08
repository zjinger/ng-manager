import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { nginxService } from './nginx.service';
import { nginxConfigService } from './nginx-config.service';
import { nginxServerService } from './nginx-server.service';
import type {
  NginxBindRequest,
  CreateNginxServerRequest,
  UpdateNginxServerRequest,
} from './nginx.types';

/**
 * Nginx 管理路由
 */
export async function nginxRoutes(fastify: FastifyInstance) {
  // ========== 实例管理 ==========

  /**
   * GET /nginx/status
   * 获取 Nginx 状态和实例信息
   */
  fastify.get('/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const instance = nginxService.getInstance();
    const status = await nginxService.getStatus();

    return reply.send({
      instance,
      status,
    });
  });

  /**
   * POST /nginx/bind
   * 绑定 Nginx 实例
   */
  fastify.post<{ Body: NginxBindRequest }>(
    '/bind',
    async (request: FastifyRequest<{ Body: NginxBindRequest }>, reply: FastifyReply) => {
      const { path } = request.body;

      try {
        const instance = await nginxService.bind(path);
        return reply.send({
          success: true,
          instance,
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * POST /nginx/unbind
   * 解绑 Nginx 实例
   */
  fastify.post('/unbind', async (_request: FastifyRequest, reply: FastifyReply) => {
    nginxService.unbind();
    return reply.send({
      success: true,
    });
  });

  // ========== 服务控制 ==========

  /**
   * POST /nginx/start
   * 启动 Nginx
   */
  fastify.post('/start', async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await nginxService.start();
    return reply.send(result);
  });

  /**
   * POST /nginx/stop
   * 停止 Nginx
   */
  fastify.post('/stop', async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await nginxService.stop();
    return reply.send(result);
  });

  /**
   * POST /nginx/reload
   * 重载配置
   */
  fastify.post('/reload', async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await nginxService.reload();
    return reply.send(result);
  });

  /**
   * POST /nginx/test
   * 测试配置
   */
  fastify.post('/test', async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await nginxService.testConfig();
    return reply.send(result);
  });

  // ========== 配置管理 ==========

  /**
   * GET /nginx/config
   * 读取主配置
   */
  fastify.get('/config', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const config = await nginxConfigService.readMainConfig();
      return reply.send({
        success: true,
        config,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * PUT /nginx/config
   * 更新主配置
   */
  fastify.put<{ Body: { content: string } }>(
    '/config',
    async (request: FastifyRequest<{ Body: { content: string } }>, reply: FastifyReply) => {
      const { content } = request.body;

      try {
        await nginxConfigService.writeMainConfig(content);
        return reply.send({
          success: true,
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * POST /nginx/config/validate
   * 验证配置
   */
  fastify.post<{ Body: { content?: string } }>(
    '/config/validate',
    async (request: FastifyRequest<{ Body: { content?: string } }>, reply: FastifyReply) => {
      const { content } = request.body;

      const result = await nginxConfigService.validateConfig(content);
      return reply.send(result);
    }
  );

  /**
   * GET /nginx/config/files
   * 获取包含的配置文件列表
   */
  fastify.get('/config/files', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const files = await nginxConfigService.getIncludedConfigs();
      return reply.send({
        success: true,
        files,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  // ========== Server 管理 ==========

  /**
   * GET /nginx/servers
   * 获取所有 server
   */
  fastify.get('/servers', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const servers = await nginxServerService.getAllServers();
      return reply.send({
        success: true,
        servers,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /nginx/servers/:id
   * 获取单个 server
   */
  fastify.get<{ Params: { id: string } }>(
    '/servers/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        const server = await nginxServerService.getServer(id);
        if (!server) {
          return reply.status(404).send({
            success: false,
            error: 'Server 不存在',
          });
        }

        return reply.send({
          success: true,
          server,
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * POST /nginx/servers
   * 创建 server
   */
  fastify.post<{ Body: CreateNginxServerRequest }>(
    '/servers',
    async (request: FastifyRequest<{ Body: CreateNginxServerRequest }>, reply: FastifyReply) => {
      try {
        const server = await nginxServerService.createServer(request.body);
        return reply.send({
          success: true,
          server,
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * PUT /nginx/servers/:id
   * 更新 server
   */
  fastify.put<{ Params: { id: string }; Body: UpdateNginxServerRequest }>(
    '/servers/:id',
    async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateNginxServerRequest }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        const server = await nginxServerService.updateServer(id, request.body);
        return reply.send({
          success: true,
          server,
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * DELETE /nginx/servers/:id
   * 删除 server
   */
  fastify.delete<{ Params: { id: string } }>(
    '/servers/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        await nginxServerService.deleteServer(id);
        return reply.send({
          success: true,
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * PATCH /nginx/servers/:id/enable
   * 启用 server
   */
  fastify.patch<{ Params: { id: string } }>(
    '/servers/:id/enable',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        await nginxServerService.enableServer(id);
        return reply.send({
          success: true,
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * PATCH /nginx/servers/:id/disable
   * 禁用 server
   */
  fastify.patch<{ Params: { id: string } }>(
    '/servers/:id/disable',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        await nginxServerService.disableServer(id);
        return reply.send({
          success: true,
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );
}
