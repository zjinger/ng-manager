import type { CreateNginxServerRequest, NginxServer } from '../types/nginx.types';
import type { ServerSource } from './server-parser.service';

export class ServerStateStore {
  readonly servers = new Map<string, NginxServer>();
  readonly serverSources = new Map<string, ServerSource>();
  readonly deletedSnapshots = new Map<string, { request: CreateNginxServerRequest; createdAt: number }>();
  private readonly maxDeletedSnapshots = 100;
  private readonly parseCacheTtlMs = 1000;
  private parseCacheAt = 0;
  private parseInFlight: Promise<void> | null = null;

  hasServer(id: string): boolean {
    return this.servers.has(id);
  }

  hasServerSource(id: string): boolean {
    return this.serverSources.has(id);
  }

  getServer(id: string): NginxServer | undefined {
    return this.servers.get(id);
  }

  getServerSource(id: string): ServerSource | undefined {
    return this.serverSources.get(id);
  }

  markParsedFresh(): void {
    this.parseCacheAt = Date.now();
  }

  shouldSkipParse(force: boolean): boolean {
    const now = Date.now();
    return !force && this.parseCacheAt > 0 && now - this.parseCacheAt < this.parseCacheTtlMs;
  }

  async waitInFlightIfFresh(force: boolean): Promise<boolean> {
    if (!this.parseInFlight) {
      return false;
    }
    await this.parseInFlight;
    const refreshedAt = this.parseCacheAt;
    return !force && refreshedAt > 0 && Date.now() - refreshedAt < this.parseCacheTtlMs;
  }

  setParseInFlight(run: Promise<void>): void {
    this.parseInFlight = run;
  }

  clearParseInFlight(run: Promise<void>): void {
    if (this.parseInFlight === run) {
      this.parseInFlight = null;
    }
  }

  replaceParsed(servers: NginxServer[], sources: Map<string, ServerSource>): void {
    this.servers.clear();
    this.serverSources.clear();
    for (const server of servers) {
      this.servers.set(server.id, server);
    }
    for (const [id, source] of sources.entries()) {
      this.serverSources.set(id, source);
    }
    this.markParsedFresh();
  }

  saveDeletedSnapshot(snapshotId: string, request: CreateNginxServerRequest): void {
    this.deletedSnapshots.set(snapshotId, {
      request,
      createdAt: Date.now(),
    });
    this.compactDeletedSnapshots();
  }

  private compactDeletedSnapshots(): void {
    if (this.deletedSnapshots.size <= this.maxDeletedSnapshots) {
      return;
    }
    const ordered = Array.from(this.deletedSnapshots.entries()).sort((a, b) => a[1].createdAt - b[1].createdAt);
    const overflow = ordered.length - this.maxDeletedSnapshots;
    for (let i = 0; i < overflow; i += 1) {
      this.deletedSnapshots.delete(ordered[i][0]);
    }
  }
}

