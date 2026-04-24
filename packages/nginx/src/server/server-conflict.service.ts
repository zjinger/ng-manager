import { nginxErrors } from '@yinuo-ngm/errors';
import type { NginxServer } from '../types/nginx.types';
import { ServerParserService } from './server-parser.service';

export class ServerConflictService {
  constructor(private readonly parser: ServerParserService) {}

  ensureNoPortConflicts(excludeId: string | null, listen: string[], enabled: boolean, servers: Iterable<NginxServer>): void {
    if (!enabled) {
      return;
    }
    const candidatePorts = this.parser.extractListenPorts(listen);
    if (!candidatePorts.length) {
      return;
    }

    const ownersByPort = new Map<number, Set<string>>();
    for (const server of servers) {
      if (!server.enabled) {
        continue;
      }
      if (excludeId && server.id === excludeId) {
        continue;
      }
      for (const port of this.parser.extractListenPorts(server.listen)) {
        if (!ownersByPort.has(port)) {
          ownersByPort.set(port, new Set<string>());
        }
        ownersByPort.get(port)!.add(server.name || server.id);
      }
    }

    let firstConflictPort = 0;
    let firstConflictOwners: string[] = [];
    for (const port of candidatePorts) {
      const owners = ownersByPort.get(port);
      if (!owners?.size) {
        continue;
      }
      const ownerList = Array.from(owners);
      if (firstConflictPort === 0) {
        firstConflictPort = port;
        firstConflictOwners = ownerList;
      }
    }

    if (firstConflictPort > 0) {
      throw nginxErrors.serverPortConflict(firstConflictPort, firstConflictOwners);
    }
  }
}

