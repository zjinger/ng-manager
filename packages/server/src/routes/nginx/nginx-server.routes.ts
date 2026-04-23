import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateNginxServerRequest, UpdateNginxServerRequest } from '@yinuo-ngm/nginx';
import { AppError } from '@yinuo-ngm/core';
import { NginxRouteContext, sendBadRequest } from './nginx-route.context';

interface ParsedImportCandidate {
  request?: CreateNginxServerRequest;
  error?: string;
  issues?: Array<{ level: 'error' | 'warning'; message: string; field?: 'name' | 'domains' | 'listen' }>;
}

type ServerRuntimeStatus = 'running' | 'stopped' | 'disabled' | 'unknown';

/**
 * Nginx Server 块路由
 */
export function registerNginxServerRoutes(context: NginxRouteContext): void {
  const { fastify, nginx } = context;

  const buildRuntimeStatus = (enabled: boolean, nginxRunning: boolean | null): ServerRuntimeStatus => {
    if (!enabled) {
      return 'disabled';
    }
    if (nginxRunning === null) {
      return 'unknown';
    }
    return nginxRunning ? 'running' : 'stopped';
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

  const extractServerBlocks = (configText: string): string[] => {
    const content = normalizeImportContent(configText);
    const blocks: string[] = [];
    const token = /\bserver\b/g;
    let match: RegExpExecArray | null = null;
    while ((match = token.exec(content)) !== null) {
      let cursor = match.index + match[0].length;
      while (cursor < content.length && /\s/.test(content[cursor])) {
        cursor += 1;
      }
      if (content[cursor] !== '{') {
        continue;
      }
      const end = findBlockEnd(content, cursor);
      if (end < 0) {
        continue;
      }
      blocks.push(content.slice(match.index, end + 1));
      token.lastIndex = end + 1;
    }
    return blocks;
  };

  const normalizeImportContent = (configText: string): string => {
    const repaired = String(configText || '').replace(
      /(ngm:disable-(?:start|end))\s*#/gi,
      '$1\n#'
    );
    const lines = repaired.split(/\r?\n/);
    const normalizedLines: string[] = [];
    let inDisabled = false;

    for (const rawLine of lines) {
      const line = String(rawLine || '');
      const marker = line.match(/^\s*#\s*ngm:disable-(start|end)\b/i);
      if (marker) {
        inDisabled = marker[1].toLowerCase() === 'start';
        continue;
      }

      if (inDisabled) {
        // 禁用块按整段注释保存：去掉每行前导 '#' 后恢复为可解析配置
        normalizedLines.push(line.replace(/^\s*#\s?/, ''));
      } else {
        normalizedLines.push(line);
      }
    }

    return normalizedLines.join('\n');
  };

  const findBlockEnd = (content: string, openBraceIndex: number): number => {
    let depth = 0;
    for (let i = openBraceIndex; i < content.length; i += 1) {
      const ch = content[i];
      if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          return i;
        }
      }
    }
    return -1;
  };

  const extractTopLevelDirectives = (content: string): Map<string, string[]> => {
    const directiveMap = new Map<string, string[]>();
    let depth = 0;
    let statement = '';
    const flush = () => {
      const normalized = statement.trim();
      statement = '';
      if (!normalized) {
        return;
      }
      const m = normalized.match(/^([a-zA-Z_][\w]*)\s+([\s\S]+)$/);
      if (!m) {
        return;
      }
      const key = m[1].toLowerCase();
      const value = m[2].replace(/;$/, '').trim();
      if (!value) {
        return;
      }
      if (!directiveMap.has(key)) {
        directiveMap.set(key, []);
      }
      directiveMap.get(key)!.push(value);
    };

    for (let i = 0; i < content.length; i += 1) {
      const ch = content[i];
      if (ch === '#') {
        while (i < content.length && content[i] !== '\n') {
          i += 1;
        }
        continue;
      }
      if (ch === '{') {
        depth += 1;
        continue;
      }
      if (ch === '}') {
        if (depth > 0) {
          depth -= 1;
        }
        continue;
      }
      if (depth > 0) {
        continue;
      }
      statement += ch;
      if (ch === ';') {
        flush();
      }
    }
    return directiveMap;
  };

  const stripLineCommentPrefix = (content: string): string => (
    String(content || '')
      .split(/\r?\n/)
      .map(line => line.replace(/^\s*#\s?/, ''))
      .join('\n')
  );

  const parseListenPort = (rawListen: string): string | null => {
    const text = String(rawListen || '').trim();
    if (!text) {
      return null;
    }
    const token = text.split(/\s+/)[0] || '';
    let portToken = token;
    if (/^\[[^\]]+\]:\d+$/.test(token)) {
      portToken = token.replace(/^.*\]:/, '');
    } else if (token.includes(':')) {
      portToken = token.slice(token.lastIndexOf(':') + 1);
    }
    const port = Number(portToken);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return null;
    }
    return String(port);
  };

  const parseLocations = (content: string): CreateNginxServerRequest['locations'] => {
    const locations: CreateNginxServerRequest['locations'] = [];
    const locationRegex = /location\s+(\S+)\s*\{([\s\S]*?)\}/g;
    let match: RegExpExecArray | null = null;
    while ((match = locationRegex.exec(content)) !== null) {
      const path = String(match[1] || '').trim() || '/';
      const block = String(match[2] || '');
      const lines = block
        .split(/\r?\n/)
        .map(item => item.trim())
        .filter(Boolean);
      let proxyPass: string | undefined;
      let root: string | undefined;
      let index: string[] | undefined;
      let tryFiles: string[] | undefined;
      const raw: string[] = [];

      lines.forEach(line => {
        const normalized = line.replace(/;$/, '');
        if (/^proxy_pass\s+/i.test(normalized)) {
          proxyPass = normalized.replace(/^proxy_pass\s+/i, '').trim();
          return;
        }
        if (/^root\s+/i.test(normalized)) {
          root = normalized.replace(/^root\s+/i, '').trim();
          return;
        }
        if (/^index\s+/i.test(normalized)) {
          index = normalized.replace(/^index\s+/i, '').split(/\s+/).map(item => item.trim()).filter(Boolean);
          return;
        }
        if (/^try_files\s+/i.test(normalized)) {
          tryFiles = normalized.replace(/^try_files\s+/i, '').split(/\s+/).map(item => item.trim()).filter(Boolean);
          return;
        }
        raw.push(line.endsWith(';') ? line : `${line};`);
      });

      locations.push({
        path,
        proxyPass,
        root,
        index,
        tryFiles,
        rawConfig: raw.length ? raw.join('\n') : undefined,
      });
    }
    return locations;
  };

  const parseServerBlockToRequest = (serverBlock: string): CreateNginxServerRequest | null => {
    const openIndex = serverBlock.indexOf('{');
    const closeIndex = serverBlock.lastIndexOf('}');
    if (openIndex < 0 || closeIndex <= openIndex) {
      return null;
    }
    const body = serverBlock.slice(openIndex + 1, closeIndex);
    const uncommentedBody = stripLineCommentPrefix(body);
    const topLevel = extractTopLevelDirectives(body);
    const commentedTopLevel = extractTopLevelDirectives(uncommentedBody);
    const chooseDirective = (key: string): string[] => {
      const raw = topLevel.get(key) || [];
      if (raw.length) {
        return raw;
      }
      return commentedTopLevel.get(key) || [];
    };

    const listenRaw = chooseDirective('listen');
    const listens = listenRaw
      .map(item => parseListenPort(item))
      .filter((value): value is string => Boolean(value));
    const domains = chooseDirective('server_name')
      .flatMap(item => item.split(/\s+/))
      .map(item => item.trim())
      .filter(item => item && item !== '_');
    const root = (chooseDirective('root')[0] || '').trim();
    const index = (chooseDirective('index')[0] || '')
      .split(/\s+/)
      .map(item => item.trim())
      .filter(Boolean);
    const sslCert = (chooseDirective('ssl_certificate')[0] || '').trim();
    const sslKey = (chooseDirective('ssl_certificate_key')[0] || '').trim();
    let locations = parseLocations(body);
    if (!locations.length) {
      locations = parseLocations(uncommentedBody);
    }
    const managedName = serverBlock.match(/#\s*ngm-name:\s*([^\r\n]+)/i)?.[1]?.trim() || '';

    const hasSslListen = listenRaw.some(item => /\bssl\b/i.test(item));
    const ssl = Boolean(sslCert && sslKey) || hasSslListen;
    const name = managedName || domains[0] || '';
    const uniqueListen = Array.from(new Set(listens));

    return {
      name,
      listen: uniqueListen.length ? uniqueListen : [ssl ? '443' : '80'],
      domains: domains.length ? Array.from(new Set(domains)) : ['127.0.0.1'],
      root,
      index: index.length ? Array.from(new Set(index)) : ['index.html'],
      locations,
      ssl,
      protocol: ssl ? 'https' : 'http',
      enabled: true,
      sslCert: sslCert || undefined,
      sslKey: sslKey || undefined,
      extraConfig: '',
    };
  };

  fastify.get('/servers', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const servers = await nginx.server.getAllServers();
      let nginxRunning: boolean | null = null;
      try {
        const status = await nginx.service.getStatus();
        nginxRunning = Boolean(status.isRunning);
      } catch {
        nginxRunning = null;
      }
      const enriched = servers.map(server => ({
        ...server,
        runtimeStatus: buildRuntimeStatus(Boolean(server.enabled), nginxRunning),
      }));
      return reply.send({
        success: true,
        servers: enriched,
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
        let nginxRunning: boolean | null = null;
        try {
          const status = await nginx.service.getStatus();
          nginxRunning = Boolean(status.isRunning);
        } catch {
          nginxRunning = null;
        }
        const enriched = {
          ...server,
          runtimeStatus: buildRuntimeStatus(Boolean(server.enabled), nginxRunning),
        };

        return reply.send({
          success: true,
          server: enriched,
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
        const actor = resolveActor(request);
        const payload: CreateNginxServerRequest = actor
          ? { ...request.body, createdBy: request.body?.createdBy || actor }
          : { ...request.body };
        const server = await nginx.server.createServer(payload);
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

  fastify.post<{ Body: { content?: string } }>(
    '/servers/import/parse',
    async (request: FastifyRequest<{ Body: { content?: string } }>, reply: FastifyReply) => {
      try {
        const content = String(request.body?.content || '').trim();
        if (!content) {
          return reply.send({
            success: true,
            candidates: [] as ParsedImportCandidate[],
          });
        }
        const blocks = extractServerBlocks(content);
        const parsedCandidates: ParsedImportCandidate[] = blocks.map(block => {
          const parsed = parseServerBlockToRequest(block);
          if (!parsed) {
            return { error: '解析失败：未识别为标准 server 块' };
          }
          return { request: parsed };
        });
        const seenFingerprints = new Set<string>();
        const candidates: ParsedImportCandidate[] = [];
        parsedCandidates.forEach(candidate => {
          if (!candidate.request) {
            candidates.push(candidate);
            return;
          }
          const fingerprint = JSON.stringify({
            name: candidate.request.name,
            listen: [...(candidate.request.listen || [])].sort(),
            domains: [...(candidate.request.domains || [])].sort(),
            root: candidate.request.root || '',
            index: [...(candidate.request.index || [])].sort(),
            locations: candidate.request.locations || [],
            ssl: Boolean(candidate.request.ssl),
            sslCert: candidate.request.sslCert || '',
            sslKey: candidate.request.sslKey || '',
            extraConfig: candidate.request.extraConfig || '',
          });
          if (seenFingerprints.has(fingerprint)) {
            return;
          }
          seenFingerprints.add(fingerprint);
          candidates.push(candidate);
        });
        return reply.send({
          success: true,
          candidates,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.post<{ Body: { requests?: CreateNginxServerRequest[] } }>(
    '/servers/import/analyze',
    async (request: FastifyRequest<{ Body: { requests?: CreateNginxServerRequest[] } }>, reply: FastifyReply) => {
      try {
        const requests = Array.isArray(request.body?.requests) ? request.body.requests : [];
        const existingServers = await nginx.server.getAllServers();
        const existingNameSet = new Set(
          existingServers.map(server => String(server.name || '').trim().toLowerCase()).filter(Boolean)
        );
        const existingEnabledPorts = new Set<number>();
        existingServers
          .filter(server => server.enabled)
          .forEach(server => {
            (server.listen || [])
              .map(item => parseListenPort(item))
              .filter((value): value is string => Boolean(value))
              .map(value => Number(value))
              .filter(port => Number.isInteger(port) && port > 0)
              .forEach(port => existingEnabledPorts.add(port));
          });

        const nameCounts = new Map<string, number>();
        const portCounts = new Map<number, number>();

        requests.forEach(item => {
          const nameKey = String(item?.name || '').trim().toLowerCase();
          if (nameKey) {
            nameCounts.set(nameKey, (nameCounts.get(nameKey) || 0) + 1);
          }
          if (item?.enabled === false) {
            return;
          }
          (item?.listen || [])
            .map(value => Number(value))
            .filter(port => Number.isInteger(port) && port >= 1 && port <= 65535)
            .forEach(port => {
              portCounts.set(port, (portCounts.get(port) || 0) + 1);
            });
        });

        const candidates: ParsedImportCandidate[] = requests.map(item => {
          const issues: Array<{ level: 'error' | 'warning'; message: string; field?: 'name' | 'domains' | 'listen' }> = [];
          const nameKey = String(item?.name || '').trim().toLowerCase();
          if (!nameKey) {
            issues.push({ level: 'error', message: '名称不能为空', field: 'name' });
          } else {
            if (existingNameSet.has(nameKey)) {
              issues.push({ level: 'error', message: `名称冲突：${item.name}`, field: 'name' });
            }
            if ((nameCounts.get(nameKey) || 0) > 1) {
              issues.push({ level: 'error', message: `导入批次内名称重复：${item.name}`, field: 'name' });
            }
          }

          const ports = (item?.listen || [])
            .map(value => Number(value))
            .filter(port => Number.isInteger(port) && port >= 1 && port <= 65535);
          if (!ports.length) {
            issues.push({ level: 'error', message: '监听端口无效', field: 'listen' });
          }
          if (item?.enabled !== false) {
            ports.forEach(port => {
              if (existingEnabledPorts.has(port)) {
                issues.push({ level: 'error', message: `端口冲突：${port} 已被现有启用 Server 使用`, field: 'listen' });
              }
              if ((portCounts.get(port) || 0) > 1) {
                issues.push({ level: 'error', message: `导入批次内端口重复：${port}`, field: 'listen' });
              }
            });
          }

          if (!(item?.domains || []).length) {
            issues.push({ level: 'warning', message: '域名为空，将使用默认域名', field: 'domains' });
          }

          return {
            request: item,
            issues,
          };
        });

        return reply.send({
          success: true,
          candidates,
        });
      } catch (error) {
        return sendBadRequest(reply, error);
      }
    }
  );

  fastify.post<{ Body: { sslCert?: string; sslKey?: string } }>(
    '/servers/validate-ssl-paths',
    async (request: FastifyRequest<{ Body: { sslCert?: string; sslKey?: string } }>, reply: FastifyReply) => {
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
