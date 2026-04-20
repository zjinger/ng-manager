import type { FastifyInstance } from 'fastify';
import { AppError } from '@yinuo-ngm/core';
/** Node 版本管理 路由 */
export default async function nodeVersionRoutes(fastify: FastifyInstance) {

  fastify.get('/current', async () => {
    const service = fastify.core.nodeVersion;
    return await service.getCurrentVersion();
  });

  fastify.post<{ Body: { version: string } }>('/switch', async req => {
    const { version } = req.body || {};
    if (!version) {
      throw new AppError('VERSION_REQUIRED', '请指定要切换的 Node 版本', {});
    }

    const service = fastify.core.nodeVersion;
    return await service.switchVersion(version);
  });

  fastify.post<{ Body: { projectPath: string } }>('/project-requirement', async req => {
    const { projectPath } = req.body || {};
    if (!projectPath) {
      throw new AppError('PROJECT_PATH_REQUIRED', '请指定项目路径', {});
    }

    const service = fastify.core.nodeVersion;
    return await service.detectProjectRequirement(projectPath);
  });
}
