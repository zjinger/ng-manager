import { NginxConfigService } from '../core/nginx-config.service';
import { NginxService } from '../core/nginx.service';
import type { CreateNginxServerRequest, NginxServer, UpdateNginxServerRequest } from '../types/nginx.types';
import { ServerCrudService } from './server-crud.service';
import type {
  NginxImportAnalyzeCandidate,
  NginxImportIssue,
  NginxImportParseCandidate,
} from './nginx-server.import.types';

export type { NginxImportIssue, NginxImportParseCandidate, NginxImportAnalyzeCandidate };

/**
 * Nginx Server 门面服务
 * 对外保持原有 API，内部委托给拆分后的子服务。
 */
export class NginxServerService {
  private readonly crud: ServerCrudService;

  constructor(nginxService: NginxService, configService: NginxConfigService) {
    this.crud = new ServerCrudService(nginxService, configService);
  }

  async getAllServers(): Promise<NginxServer[]> {
    return this.crud.getAllServers();
  }

  async getServer(id: string): Promise<NginxServer | null> {
    return this.crud.getServer(id);
  }

  async createServer(request: CreateNginxServerRequest): Promise<NginxServer> {
    return this.crud.createServer(request);
  }

  async updateServer(id: string, request: UpdateNginxServerRequest): Promise<NginxServer> {
    return this.crud.updateServer(id, request);
  }

  async deleteServer(id: string): Promise<{ snapshotId: string }> {
    return this.crud.deleteServer(id);
  }

  async restoreDeletedServer(snapshotId: string): Promise<NginxServer> {
    return this.crud.restoreDeletedServer(snapshotId);
  }

  async parseImportCandidates(configText: string): Promise<NginxImportParseCandidate[]> {
    return this.crud.parseImportCandidates(configText);
  }

  async analyzeImportRequests(requests: CreateNginxServerRequest[]): Promise<NginxImportAnalyzeCandidate[]> {
    return this.crud.analyzeImportRequests(requests);
  }

  async enableServer(id: string): Promise<void> {
    return this.crud.enableServer(id);
  }

  async disableServer(id: string): Promise<void> {
    return this.crud.disableServer(id);
  }
}
