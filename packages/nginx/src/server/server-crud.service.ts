import { basename, join } from 'path';
import { unlink } from 'fs/promises';
import { nginxErrors } from '@yinuo-ngm/errors';
import { NginxConfigService } from '../core/nginx-config.service';
import { NginxService } from '../core/nginx.service';
import type { CreateNginxServerRequest, NginxServer, UpdateNginxServerRequest } from '../types/nginx.types';
import { ServerIdGenerator } from '../utils/server-id-generator';
import type { NginxImportAnalyzeCandidate, NginxImportParseCandidate } from './nginx-server.import.types';
import { ServerConflictService } from './server-conflict.service';
import { ServerEnableService } from './server-enable.service';
import { ServerFileOpsService } from './server-file-ops.service';
import { ServerGeneratorService } from './server-generator.service';
import { ServerImportService } from './server-import.service';
import { ServerParserService, type ServerSource } from './server-parser.service';
import { ServerStateStore } from './server-state.store';

export class ServerCrudService {
  private readonly state = new ServerStateStore();
  private readonly idGenerator: ServerIdGenerator;
  private readonly generator: ServerGeneratorService;
  private readonly parser: ServerParserService;
  private readonly enableService: ServerEnableService;
  private readonly importService: ServerImportService;
  private readonly conflictService: ServerConflictService;
  private readonly fileOps: ServerFileOpsService;

  constructor(
    private readonly nginxService: NginxService,
    private readonly configService: NginxConfigService
  ) {
    this.idGenerator = new ServerIdGenerator(
      id => this.state.hasServer(id),
      id => this.state.hasServerSource(id)
    );
    this.generator = new ServerGeneratorService(this.nginxService);
    this.parser = new ServerParserService(this.configService, this.generator, this.idGenerator);
    this.enableService = new ServerEnableService(this.configService);
    this.importService = new ServerImportService(this.parser, () => this.getAllServers());
    this.conflictService = new ServerConflictService(this.parser);
    this.fileOps = new ServerFileOpsService(this.nginxService, this.configService, this.idGenerator, this.enableService);
  }

  async getAllServers(): Promise<NginxServer[]> {
    if (!this.nginxService.getInstance()) {
      return [];
    }
    await this.ensureServersParsed();
    return Array.from(this.state.servers.values());
  }

  async getServer(id: string): Promise<NginxServer | null> {
    await this.ensureServersParsed();
    return this.state.getServer(id) || null;
  }

  async createServer(request: CreateNginxServerRequest): Promise<NginxServer> {
    if (!this.nginxService.getInstance()) {
      throw nginxErrors.notBound();
    }

    const normalized = this.generator.normalizeCreateRequest(request);
    const nextServer: NginxServer = { ...normalized, id: '', configText: '' };

    await this.ensureServersParsed();
    this.conflictService.ensureNoPortConflicts(null, nextServer.listen, nextServer.enabled, this.state.servers.values());

    const configDir = await this.configService.resolveServerConfigDir();
    const filePath = await this.fileOps.makeGeneratedConfigPath(configDir);
    nextServer.filePath = filePath;
    nextServer.id = this.idGenerator.createManagedServerId();
    nextServer.configText = this.generator.generateServerConfig(nextServer);

    await this.configService.writeConfigFile(filePath, nextServer.configText);
    this.state.serverSources.set(nextServer.id, { filePath, start: 0, end: nextServer.configText.length });
    await this.enableService.applyEnabledState(nextServer, nextServer.enabled, s => this.resolveServerSource(s));

    this.state.servers.set(nextServer.id, nextServer);
    this.state.markParsedFresh();
    return nextServer;
  }

  async updateServer(id: string, request: UpdateNginxServerRequest): Promise<NginxServer> {
    const current = await this.getServer(id);
    if (!current) {
      throw nginxErrors.serverNotFound(id);
    }

    const nextServer = this.mergeUpdateRequest(current, request);
    const nextEnabled = request.enabled ?? nextServer.enabled;
    this.conflictService.ensureNoPortConflicts(id, nextServer.listen, nextEnabled, this.state.servers.values());
    nextServer.configText = this.generator.generateServerConfig(nextServer);

    let source = this.state.getServerSource(id);
    if (!source) {
      throw nginxErrors.serverNotFound(id);
    }
    const oldFilePath = source.filePath;
    if (request.name !== undefined && this.generator.normalizeName(request.name) !== current.name) {
      const renamed = await this.fileOps.tryRenameServerConfigFile(oldFilePath, source, nextServer.name);
      if (renamed) {
        source = { ...source, filePath: renamed.newFilePath };
        nextServer.filePath = renamed.newFilePath;
      }
    }

    await this.fileOps.replaceServerBlock(source.filePath, source.start, source.end, nextServer.configText);
    const nextSource: ServerSource = {
      filePath: source.filePath,
      start: source.start,
      end: source.start + nextServer.configText.length,
    };
    this.state.serverSources.set(id, nextSource);
    nextServer.id = id;

    try {
      await this.enableService.applyEnabledState(nextServer, nextEnabled, s => this.resolveServerSource(s));
    } catch (error) {
      if (!this.fileOps.isServerSourceOutdatedError(error)) {
        throw error;
      }
      await this.ensureServersParsed(true);
      await this.enableService.applyEnabledState(nextServer, nextEnabled, s => this.resolveServerSource(s));
    }

    nextServer.enabled = nextEnabled;
    this.state.servers.set(id, nextServer);
    this.state.markParsedFresh();
    return nextServer;
  }

  async deleteServer(id: string): Promise<{ snapshotId: string }> {
    const server = await this.getServer(id);
    if (!server) {
      throw nginxErrors.serverNotFound(id);
    }
    const snapshotId = this.createDeleteSnapshot(server);

    const source = this.state.getServerSource(id);
    const filePath = source?.filePath || server.filePath;
    if (source) {
      await this.fileOps.removeServerBlock(source.filePath, source.start, source.end);
    } else if (filePath) {
      try {
        await unlink(filePath);
      } catch {
        // ignore
      }
    }

    const sitesEnabledDir = this.configService.getSitesEnabledDir();
    if (sitesEnabledDir && filePath) {
      const linkPath = join(sitesEnabledDir, basename(filePath));
      try {
        await unlink(linkPath);
      } catch {
        // ignore
      }
    }

    this.state.servers.delete(id);
    this.state.serverSources.delete(id);
    this.state.markParsedFresh();
    return { snapshotId };
  }

  async restoreDeletedServer(snapshotId: string): Promise<NginxServer> {
    const snapshot = this.state.deletedSnapshots.get(snapshotId);
    if (!snapshot) {
      throw nginxErrors.serverNotFound(`snapshot:${snapshotId}`);
    }
    const restored = await this.createServer(snapshot.request);
    this.state.deletedSnapshots.delete(snapshotId);
    return restored;
  }

  async enableServer(id: string): Promise<void> {
    const server = await this.getServer(id);
    if (!server) {
      throw nginxErrors.serverNotFound(id);
    }
    this.conflictService.ensureNoPortConflicts(id, server.listen, true, this.state.servers.values());
    await this.enableService.applyEnabledState(server, true, s => this.resolveServerSource(s));
    server.enabled = true;
    this.state.servers.set(id, server);
    this.state.markParsedFresh();
  }

  async disableServer(id: string): Promise<void> {
    const server = await this.getServer(id);
    if (!server) {
      throw nginxErrors.serverNotFound(id);
    }
    await this.enableService.applyEnabledState(server, false, s => this.resolveServerSource(s));
    server.enabled = false;
    this.state.servers.set(id, server);
    this.state.markParsedFresh();
  }

  async parseImportCandidates(configText: string): Promise<NginxImportParseCandidate[]> {
    return this.importService.parseImportCandidates(configText);
  }

  async analyzeImportRequests(requests: CreateNginxServerRequest[]): Promise<NginxImportAnalyzeCandidate[]> {
    return this.importService.analyzeImportRequests(requests);
  }

  private async ensureServersParsed(force = false): Promise<void> {
    if (this.state.shouldSkipParse(force)) {
      return;
    }
    if (await this.state.waitInFlightIfFresh(force)) {
      return;
    }

    const run = this.parser
      .parseServersFromConfig()
      .then(({ servers, sources }) => {
        this.state.replaceParsed(servers, sources);
      })
      .finally(() => {
        this.state.clearParseInFlight(run);
      });
    this.state.setParseInFlight(run);
    await run;
  }

  private async resolveServerSource(server: NginxServer): Promise<ServerSource> {
    const cached = this.state.getServerSource(server.id);
    if (cached) {
      return cached;
    }
    await this.ensureServersParsed(true);
    const reparsed = this.state.getServerSource(server.id);
    if (reparsed) {
      return reparsed;
    }
    return { filePath: server.filePath!, start: 0, end: (server.configText || '').length };
  }

  private mergeUpdateRequest(current: NginxServer, request: UpdateNginxServerRequest): NginxServer {
    const next: NginxServer = {
      ...current,
      listen: [...(current.listen || [])],
      domains: [...(current.domains || [])],
      index: [...(current.index || [])],
      locations: (current.locations || []).map(item => ({ ...item })),
    };
    if (request.name !== undefined) next.name = this.generator.normalizeName(request.name);
    if (request.listen !== undefined) {
      next.listen = this.generator.normalizeListenValues(
        request.listen,
        this.generator.resolveSsl(request.ssl ?? next.ssl, request.protocol)
      );
    }
    if (request.domains !== undefined) next.domains = this.generator.normalizeDomains(request.domains);
    if (request.root !== undefined) next.root = this.generator.normalizeOptionalText(request.root);
    if (request.index !== undefined) next.index = this.generator.normalizeServerIndex(request.index);
    if (request.locations !== undefined) next.locations = this.generator.normalizeLocations(request.locations);
    if (request.protocol !== undefined) next.ssl = this.generator.resolveSsl(next.ssl, request.protocol);
    if (request.ssl !== undefined) next.ssl = this.generator.resolveSsl(request.ssl, undefined);
    if (request.sslCert !== undefined) next.sslCert = this.generator.normalizeOptionalText(request.sslCert);
    if (request.sslKey !== undefined) next.sslKey = this.generator.normalizeOptionalText(request.sslKey);
    if (request.extraConfig !== undefined) next.extraConfig = this.generator.normalizeOptionalText(request.extraConfig);
    next.updatedAt = new Date().toISOString();
    return next;
  }

  private createDeleteSnapshot(server: NginxServer): string {
    const snapshotId = this.idGenerator.genId('del');
    const request: CreateNginxServerRequest = {
      name: String(server.name || '').trim(),
      listen: [...(server.listen || [])],
      domains: [...(server.domains || [])],
      root: String(server.root || '').trim() || undefined,
      index: [...(server.index || [])],
      locations: (server.locations || []).map(item => ({ ...item })),
      ssl: Boolean(server.ssl),
      protocol: server.ssl ? 'https' : 'http',
      enabled: Boolean(server.enabled),
      sslCert: String(server.sslCert || '').trim() || undefined,
      sslKey: String(server.sslKey || '').trim() || undefined,
      extraConfig: String(server.extraConfig || '').trim() || undefined,
      createdBy: server.createdBy,
    };
    this.state.saveDeletedSnapshot(snapshotId, request);
    return snapshotId;
  }
}

