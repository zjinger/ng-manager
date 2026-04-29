import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  UpdateNginxConfigFileRequestDto,
  UpdateNginxConfigRequestDto,
  ValidateNginxConfigRequestDto,
} from '@yinuo-ngm/protocol';
import { NginxRouteContext, sendBadRequest, toNginxConfigDto, toNginxConfigValidationDto } from './nginx-route.context';

/**
 * Nginx 配置文件路由
 */
export function registerNginxConfigRoutes(context: NginxRouteContext): void {
  const { fastify, nginx, normalizeFsPath, ensureManageableConfigFile } = context;

  fastify.get('/config', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const config = await nginx.config.readMainConfig();
      return reply.send({
        success: true,
        config: toNginxConfigDto(config),
      });
    } catch (error) {
      return sendBadRequest(reply, error);
    }
  });

  fastify.put<{ Body: UpdateNginxConfigRequestDto }>(
    '/config',
    async (request: FastifyRequest<{ Body: UpdateNginxConfigRequestDto }>, reply: FastifyReply) => {
      const { content } = request.body;

      try {
        await nginx.config.writeMainConfig(content);
        return reply.send({
          success: true,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.post<{ Body: ValidateNginxConfigRequestDto }>(
    '/config/validate',
    async (request: FastifyRequest<{ Body: ValidateNginxConfigRequestDto }>, reply: FastifyReply) => {
      const { content } = request.body;

      const result = await nginx.config.validateConfig(content);
      return reply.send(toNginxConfigValidationDto(result));
    }
  );

  fastify.get('/config/files', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const files = await nginx.config.getIncludedConfigs();
      return reply.send({
        success: true,
        files,
      });
    } catch (error) {
      return sendBadRequest(reply, error);
    }
  });

  fastify.get<{ Querystring: { filePath: string } }>(
    '/config/file',
    async (request: FastifyRequest<{ Querystring: { filePath: string } }>, reply: FastifyReply) => {
      try {
        const filePath = await ensureManageableConfigFile(request.query?.filePath);
        const mainConfig = await nginx.config.readMainConfig();
        const isMainConfig = normalizeFsPath(mainConfig.mainConfigPath) === normalizeFsPath(filePath);

        if (isMainConfig) {
          return reply.send({
            success: true,
            config: toNginxConfigDto(mainConfig),
          });
        }

        const content = await nginx.config.readConfigFile(filePath);
        const isWritable = await nginx.config.isConfigFileWritable(filePath);
        return reply.send({
          success: true,
          config: {
            mainConfigPath: filePath,
            content,
            isWritable,
          },
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.put<{ Body: UpdateNginxConfigFileRequestDto }>(
    '/config/file',
    async (request: FastifyRequest<{ Body: UpdateNginxConfigFileRequestDto }>, reply: FastifyReply) => {
      try {
        const filePath = await ensureManageableConfigFile(request.body?.filePath);
        const content = request.body?.content ?? '';
        const mainConfig = await nginx.config.readMainConfig();
        const isMainConfig = normalizeFsPath(mainConfig.mainConfigPath) === normalizeFsPath(filePath);

        if (isMainConfig) {
          await nginx.config.writeMainConfig(content);
        } else {
          await nginx.config.writeConfigFile(filePath, content);
        }

        return reply.send({
          success: true,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );
}

