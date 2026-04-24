import { realpath } from 'fs/promises';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { resolve } from 'path';
import { AppError } from '@yinuo-ngm/core';

export interface NginxRouteContext {
  fastify: FastifyInstance;
  nginx: FastifyInstance['nginx'];
  normalizeFsPath: (filePath: string) => string;
  ensureManageableConfigFile: (rawPath?: string) => Promise<string>;
}

export function createNginxRouteContext(fastify: FastifyInstance): NginxRouteContext {
  const nginx = fastify.nginx;
  const normalizeFsPath = (filePath: string): string => resolve(filePath).replace(/\\/g, '/').toLowerCase();
  const ensureManageableConfigFile = async (rawPath?: string): Promise<string> => {
    const filePath = rawPath?.trim();
    if (!filePath) {
      throw new Error('配置文件路径不能为空');
    }

    const included: string[] = await nginx.config.getIncludedConfigs();
    const includedSet = new Set<string>();
    for (const item of included) {
      try {
        includedSet.add(normalizeFsPath(await realpath(item)));
      } catch {
        includedSet.add(normalizeFsPath(resolve(item)));
      }
    }

    const resolvedTarget = resolve(filePath);
    let normalizedTarget: string;
    try {
      normalizedTarget = normalizeFsPath(await realpath(resolvedTarget));
    } catch {
      normalizedTarget = normalizeFsPath(resolvedTarget);
    }

    if (!includedSet.has(normalizedTarget)) {
      throw new Error('配置文件不在当前可管理列表中');
    }
    return resolvedTarget;
  };

  return {
    fastify,
    nginx,
    normalizeFsPath,
    ensureManageableConfigFile,
  };
}

export function sendBadRequest(reply: FastifyReply, error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '未知错误');
  throw new AppError('BAD_REQUEST', message, {
    route: reply.request?.url,
    method: reply.request?.method,
  });
}
