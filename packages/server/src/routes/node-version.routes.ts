import type { FastifyInstance } from 'fastify';
import { CoreError, CoreErrorCodes } from '@yinuo-ngm/errors';
/** Node 版本管理 路由 */
export default async function nodeVersionRoutes(fastify: FastifyInstance) {

  fastify.get('/current', async () => {
    const service = fastify.core.nodeVersion;
    return await service.getCurrentVersion();
  });

  fastify.post<{ Body: { version: string } }>('/switch', async req => {
    const { version } = req.body || {};
    if (!version) {
      throw new CoreError(CoreErrorCodes.VERSION_REQUIRED, '请指定要切换的 Node 版本', {});
    }

    const service = fastify.core.nodeVersion;
    return await service.switchVersion(version);
  });

  fastify.post<{ Body: { projectPath: string } }>('/project-requirement', async req => {
    const { projectPath } = req.body || {};
    if (!projectPath) {
      throw new CoreError(CoreErrorCodes.PROJECT_PATH_REQUIRED, '请指定项目路径', {});
    }

    const service = fastify.core.nodeVersion;
    return await service.detectProjectRequirement(projectPath);
  });

  /**
   * 下载安装指定版本的Node
   */
  fastify.post<{ Body: { version: string } }>('/install', async req => {
    const { version } = req.body || {};
    if (!version) {
      throw new CoreError(CoreErrorCodes.VERSION_REQUIRED, '请指定要安装的 Node 版本', {});
    }

    const service = fastify.core.nodeVersion;
    const result = await service.installNodeVersion(version);
    return result;
  });

  /**
   * 卸载指定版本的 Node
   */
  fastify.post<{ Body: { version: string } }>('/uninstall', async req => {
    const { version } = req.body || {};
    if (!version) {
      throw new CoreError(CoreErrorCodes.VERSION_REQUIRED, '请指定要卸载的 Node 版本', {});
    }

    const service = fastify.core.nodeVersion;
    const success = await service.uninstallNodeVersion(version);
    return { success };
  });

  /**
   * 写入 engines.node 到 package.json
   */
  fastify.post<{ Body: { projectPath: string; version: string } }>(
    '/write-engine-config',
    async req => {
      const { projectPath, version } = req.body || {};
      if (!projectPath) {
        throw new CoreError(CoreErrorCodes.PROJECT_PATH_REQUIRED, '请指定项目路径', {});
      }
      if (!version) {
        throw new CoreError(CoreErrorCodes.VERSION_REQUIRED, '请指定版本要求', {});
      }

      const service = fastify.core.nodeVersion;
      const success = await service.writeEngineConfig(projectPath, version);
      return { success };
    },
  );
}
