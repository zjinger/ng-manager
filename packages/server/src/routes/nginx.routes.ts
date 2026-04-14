import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type {
    NginxBindRequest,
    CreateNginxServerRequest,
    NginxPerformanceConfig,
    NginxSslCertificate,
    NginxTrafficConfig,
    NginxUpstream,
    UpdateNginxServerRequest,
} from '@yinuo-ngm/nginx';
import { resolve } from 'path';
import {
    clearPersistedNginxPath,
    savePersistedNginxPath,
} from '../plugins/nginx.binding.store';

/**
 * Nginx 管理路由
 */
export async function nginxRoutes(fastify: FastifyInstance) {
    const nginx = fastify.nginx;
    const normalizeFsPath = (filePath: string): string => resolve(filePath).replace(/\\/g, '/').toLowerCase();
    const ensureManageableConfigFile = async (rawPath?: string): Promise<string> => {
        const filePath = rawPath?.trim();
        if (!filePath) {
            throw new Error('配置文件路径不能为空');
        }

        const included = await nginx.config.getIncludedConfigs();
        const includedSet = new Set(included.map(item => normalizeFsPath(item)));
        const normalizedTarget = normalizeFsPath(filePath);
        if (!includedSet.has(normalizedTarget)) {
            throw new Error('配置文件不在当前可管理列表中');
        }
        return resolve(filePath);
    };

    // ========== 实例管理 ==========

    /**
     * GET /nginx/status
     * 获取 Nginx 状态和实例信息
     */
    fastify.get('/status', async (_request: FastifyRequest, reply: FastifyReply) => {
        const instance = nginx.service.getInstance();
        const status = await nginx.service.getStatus();

        return reply.send({
            instance,
            status,
        });
    });

    /**
     * GET /nginx/stats
     * 获取首页统计卡片所需信息（状态 + server 汇总）
     */
    fastify.get('/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
            const instance = nginx.service.getInstance();
            const status = await nginx.service.getStatus();
            const servers = await nginx.server.getAllServers();
            const enabled = servers.filter(item => item.enabled).length;

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
        } catch (error: any) {
            return reply.status(400).send({
                success: false,
                error: error.message,
            });
        }
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
                const instance = await nginx.service.bind(path);
                try {
                    await savePersistedNginxPath(instance.path);
                } catch (persistError: any) {
                    fastify.log.warn(`[nginx] binding persisted failed: ${persistError?.message || persistError}`);
                }
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
        nginx.service.unbind();
        try {
            await clearPersistedNginxPath();
        } catch (error: any) {
            fastify.log.warn(`[nginx] clear persisted binding failed: ${error?.message || error}`);
        }
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
        const result = await nginx.service.start();
        return reply.send(result);
    });

    /**
     * POST /nginx/stop
     * 停止 Nginx
     */
    fastify.post('/stop', async (_request: FastifyRequest, reply: FastifyReply) => {
        const result = await nginx.service.stop();
        return reply.send(result);
    });

    /**
     * POST /nginx/reload
     * 重载配置
     */
    fastify.post('/reload', async (_request: FastifyRequest, reply: FastifyReply) => {
        const result = await nginx.service.reload();
        return reply.send(result);
    });

    /**
     * POST /nginx/test
     * 测试配置
     */
    fastify.post('/test', async (_request: FastifyRequest, reply: FastifyReply) => {
        const result = await nginx.service.testConfig();
        return reply.send(result);
    });

    // ========== 配置管理 ==========

    /**
     * GET /nginx/config
     * 读取主配置
     */
    fastify.get('/config', async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
            const config = await nginx.config.readMainConfig();
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
                await nginx.config.writeMainConfig(content);
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

            const result = await nginx.config.validateConfig(content);
            return reply.send(result);
        }
    );

    /**
     * GET /nginx/config/files
     * 获取包含的配置文件列表
     */
    fastify.get('/config/files', async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
            const files = await nginx.config.getIncludedConfigs();
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

    /**
     * GET /nginx/config/file?filePath=
     * 读取指定配置文件
     */
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
                        config: mainConfig,
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
            } catch (error: any) {
                return reply.status(400).send({
                    success: false,
                    error: error.message,
                });
            }
        }
    );

    /**
     * PUT /nginx/config/file
     * 保存指定配置文件
     */
    fastify.put<{ Body: { filePath: string; content: string } }>(
        '/config/file',
        async (request: FastifyRequest<{ Body: { filePath: string; content: string } }>, reply: FastifyReply) => {
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
            } catch (error: any) {
                return reply.status(400).send({
                    success: false,
                    error: error.message,
                });
            }
        }
    );

    // ========== Server 管理 ==========

    /**
     * GET /nginx/servers
     * 获取所有 server
     */
    fastify.get('/servers', async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
            const servers = await nginx.server.getAllServers();
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
                const server = await nginx.server.getServer(id);
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
                const server = await nginx.server.createServer(request.body);
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
                const server = await nginx.server.updateServer(id, request.body);
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
                await nginx.server.deleteServer(id);
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
                await nginx.server.enableServer(id);
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
                await nginx.server.disableServer(id);
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

    // ========== Phase2 模块配置 ==========

    /**
     * GET /nginx/upstreams
     * 获取 upstream 配置
     */
    fastify.get('/upstreams', async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
            const upstreams = await nginx.module.getUpstreams();
            return reply.send({
                success: true,
                upstreams,
            });
        } catch (error: any) {
            return reply.status(400).send({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * PUT /nginx/upstreams
     * 保存 upstream 配置
     */
    fastify.put<{ Body: { upstreams: NginxUpstream[] } }>(
        '/upstreams',
        async (request: FastifyRequest<{ Body: { upstreams: NginxUpstream[] } }>, reply: FastifyReply) => {
            try {
                await nginx.module.saveUpstreams(request.body?.upstreams || []);
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
     * GET /nginx/ssl/certificates
     * 获取 SSL 证书配置
     */
    fastify.get('/ssl/certificates', async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
            const certificates = await nginx.module.getSslCertificates();
            return reply.send({
                success: true,
                certificates,
            });
        } catch (error: any) {
            return reply.status(400).send({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * PUT /nginx/ssl/certificates
     * 保存 SSL 证书配置
     */
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
            } catch (error: any) {
                return reply.status(400).send({
                    success: false,
                    error: error.message,
                });
            }
        }
    );

    /**
     * GET /nginx/traffic
     * 获取流量控制配置
     */
    fastify.get('/traffic', async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
            const traffic = await nginx.module.getTrafficConfig();
            return reply.send({
                success: true,
                traffic,
            });
        } catch (error: any) {
            return reply.status(400).send({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * PUT /nginx/traffic
     * 保存流量控制配置
     */
    fastify.put<{ Body: NginxTrafficConfig }>(
        '/traffic',
        async (request: FastifyRequest<{ Body: NginxTrafficConfig }>, reply: FastifyReply) => {
            try {
                await nginx.module.saveTrafficConfig(request.body);
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
     * GET /nginx/performance
     * 获取性能优化配置
     */
    fastify.get('/performance', async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
            const performance = await nginx.module.getPerformanceConfig();
            return reply.send({
                success: true,
                performance,
            });
        } catch (error: any) {
            return reply.status(400).send({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * PUT /nginx/performance
     * 保存性能优化配置
     */
    fastify.put<{ Body: NginxPerformanceConfig }>(
        '/performance',
        async (request: FastifyRequest<{ Body: NginxPerformanceConfig }>, reply: FastifyReply) => {
            try {
                await nginx.module.savePerformanceConfig(request.body);
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

    // ========== 日志管理 ==========

    /**
     * GET /nginx/logs/error
     * 获取错误日志尾部
     */
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
            } catch (error: any) {
                return reply.status(400).send({
                    success: false,
                    error: error.message,
                });
            }
        }
    );

    /**
     * GET /nginx/logs/access
     * 获取访问日志尾部
     */
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
            } catch (error: any) {
                return reply.status(400).send({
                    success: false,
                    error: error.message,
                });
            }
        }
    );

    /**
     * GET /nginx/logs/info
     * 获取日志文件信息
     */
    fastify.get(
        '/logs/info',
        async (_request: FastifyRequest, reply: FastifyReply) => {
            try {
                const errorPath = nginx.log.getLogFilePath('error');
                const accessPath = nginx.log.getLogFilePath('access');
                return reply.send({
                    success: true,
                    errorLog: errorPath,
                    accessLog: accessPath,
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
