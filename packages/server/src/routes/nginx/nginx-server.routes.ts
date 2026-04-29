import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  AnalyzeNginxImportServersRequestDto,
  CreateNginxServerRequestDto,
  ParseNginxImportServersRequestDto,
  RestoreDeletedNginxServerRequestDto,
  UpdateNginxServerRequestDto,
  ValidateNginxSslPathsRequestDto,
} from '@yinuo-ngm/protocol';
import { GlobalError, GlobalErrorCodes } from '@yinuo-ngm/errors';
import { NginxRouteContext, sendBadRequest, toNginxServerDto } from './nginx-route.context';

interface ParsedImportCandidate {
  request?: CreateNginxServerRequestDto;
  error?: string;
  issues?: Array<{ level: 'error' | 'warning'; message: string; field?: 'name' | 'domains' | 'listen' }>;
}

type ServerRuntimeStatus = 'running' | 'stopped' | 'disabled' | 'pending' | 'unknown';

/**
 * Nginx Server 块路由
 */
export function registerNginxServerRoutes(context: NginxRouteContext): void {
  const { fastify, nginx } = context;

  const buildRuntimeStatus = (
    enabled: boolean,
    nginxRunning: boolean | null,
    pendingReload: boolean
  ): ServerRuntimeStatus => {
    if (!enabled) {
      return 'disabled';
    }
    if (nginxRunning === null) {
      return 'unknown';
    }
    if (pendingReload) {
      return 'pending';
    }
    return nginxRunning ? 'running' : 'stopped';
  };

  const parseIsoMs = (value?: string): number | null => {
    const text = String(value || '').trim();
    if (!text) {
      return null;
    }
    const ms = Date.parse(text);
    return Number.isFinite(ms) ? ms : null;
  };

  const isServerPendingReload = (
    server: { enabled?: boolean; updatedAt?: string; createdAt?: string },
    nginxRunning: boolean | null,
    lastAppliedAt: number | null
  ): boolean => {
    if (!server.enabled || !nginxRunning) {
      return false;
    }
    if (lastAppliedAt === null) {
      return false;
    }
    const changedAt = parseIsoMs(server.updatedAt) ?? parseIsoMs(server.createdAt);
    if (changedAt === null) {
      return false;
    }
    return changedAt > lastAppliedAt;
  };

  const resolveActor = (request: FastifyRequest): string | undefined => {
    const directHeader = request.headers['x-ngm-user'] || request.headers['x-user'] || request.headers['x-username'];
    if (typeof directHeader === 'string' && directHeader.trim()) {
      return directHeader.trim();
    }
    const user = (request as any)?.user;
    if (typeof user?.name === 'string' && user.name.trim()) {
      return user.name.trim();
    }
    if (typeof user?.username === 'string' && user.username.trim()) {
      return user.username.trim();
    }
    if (typeof user?.id === 'string' && user.id.trim()) {
      return user.id.trim();
    }
    return undefined;
  };

  fastify.get('/servers', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const servers = await nginx.server.getAllServers();
      let nginxRunning: boolean | null = null;
      let lastAppliedAt: number | null = null;
      try {
        const status = await nginx.service.getStatus();
        nginxRunning = Boolean(status.isRunning);
        lastAppliedAt = nginx.service.getLastConfigAppliedAt();
      } catch {
        nginxRunning = null;
      }
      const enriched = servers.map(server => ({
        ...server,
        runtimeStatus: buildRuntimeStatus(
          Boolean(server.enabled),
          nginxRunning,
          isServerPendingReload(server, nginxRunning, lastAppliedAt)
        ),
      }));
      return reply.send({
        success: true,
        servers: enriched.map(toNginxServerDto),
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
          throw new GlobalError(GlobalErrorCodes.NOT_FOUND, 'Server 不存在');
        }
        let nginxRunning: boolean | null = null;
        let lastAppliedAt: number | null = null;
        try {
          const status = await nginx.service.getStatus();
          nginxRunning = Boolean(status.isRunning);
          lastAppliedAt = nginx.service.getLastConfigAppliedAt();
        } catch {
          nginxRunning = null;
        }
        const enriched = {
          ...server,
          runtimeStatus: buildRuntimeStatus(
            Boolean(server.enabled),
            nginxRunning,
            isServerPendingReload(server, nginxRunning, lastAppliedAt)
          ),
        };

        return reply.send({
          success: true,
          server: toNginxServerDto(enriched),
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.post<{ Body: CreateNginxServerRequestDto }>(
    '/servers',
    async (request: FastifyRequest<{ Body: CreateNginxServerRequestDto }>, reply: FastifyReply) => {
      try {
        const actor = resolveActor(request);
        const payload: CreateNginxServerRequestDto = actor
          ? { ...request.body, createdBy: request.body?.createdBy || actor }
          : { ...request.body };
        const server = await nginx.server.createServer(payload);
        return reply.send({
          success: true,
          server: toNginxServerDto(server),
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.put<{ Params: { id: string }; Body: UpdateNginxServerRequestDto }>(
    '/servers/:id',
    async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateNginxServerRequestDto }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        const server = await nginx.server.updateServer(id, request.body);
        return reply.send({
          success: true,
          server: toNginxServerDto(server),
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
        const result = await nginx.server.deleteServer(id);
        return reply.send({
          success: true,
          snapshotId: result.snapshotId,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.post<{ Body: RestoreDeletedNginxServerRequestDto }>(
    '/servers/restore-deleted',
    async (request: FastifyRequest<{ Body: RestoreDeletedNginxServerRequestDto }>, reply: FastifyReply) => {
      try {
        const snapshotId = String(request.body?.snapshotId || '').trim();
        if (!snapshotId) {
          throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, 'snapshotId 不能为空');
        }
        const server = await nginx.server.restoreDeletedServer(snapshotId);
        return reply.send({
          success: true,
          server: toNginxServerDto(server),
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

  fastify.post<{ Body: ParseNginxImportServersRequestDto }>(
    '/servers/import/parse',
    async (request: FastifyRequest<{ Body: ParseNginxImportServersRequestDto }>, reply: FastifyReply) => {
      try {
        const content = String(request.body?.content || '').trim();
        if (!content) {
          return reply.send({
            success: true,
            candidates: [] as ParsedImportCandidate[],
          });
        }
        const candidates = await nginx.server.parseImportCandidates(content);
        return reply.send({
          success: true,
          candidates,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.post<{ Body: AnalyzeNginxImportServersRequestDto }>(
    '/servers/import/analyze',
    async (request: FastifyRequest<{ Body: AnalyzeNginxImportServersRequestDto }>, reply: FastifyReply) => {
      try {
        const requests = Array.isArray(request.body?.requests) ? request.body.requests : [];
        const candidates = await nginx.server.analyzeImportRequests(requests);

        return reply.send({
          success: true,
          candidates,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.post<{ Body: ValidateNginxSslPathsRequestDto }>(
    '/servers/validate-ssl-paths',
    async (request: FastifyRequest<{ Body: ValidateNginxSslPathsRequestDto }>, reply: FastifyReply) => {
      try {
        const certPath = String(request.body?.sslCert || '').trim();
        const keyPath = String(request.body?.sslKey || '').trim();

        const cert = certPath
          ? await nginx.service.validateFileReadable(certPath)
          : { exists: false, readable: false, error: '证书路径为空' };
        const key = keyPath
          ? await nginx.service.validateFileReadable(keyPath)
          : { exists: false, readable: false, error: '私钥路径为空' };

        return reply.send({
          success: true,
          valid: cert.exists && cert.readable && key.exists && key.readable,
          cert,
          key,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );
}
