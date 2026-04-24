import { createHash, randomUUID } from 'crypto';

export class ServerIdGenerator {
  constructor(
    private readonly hasServerId: (id: string) => boolean,
    private readonly hasServerSource: (id: string) => boolean
  ) {}

  createServerId(filePath: string, blockIndex: number): string {
    return createHash('sha1').update(`${filePath}#${blockIndex}`).digest('hex').slice(0, 24);
  }

  createManagedServerId(): string {
    let candidate = this.genId('srv');
    while (this.hasServerId(candidate) || this.hasServerSource(candidate)) {
      candidate = this.genId('srv');
    }
    return candidate;
  }

  ensureUniqueServerId(candidate: string, filePath: string, blockIndex: number): string {
    let next = candidate;
    let salt = 0;
    while (this.hasServerId(next) || this.hasServerSource(next)) {
      salt += 1;
      next = this.createServerId(filePath, blockIndex + salt);
    }
    return next;
  }

  makeSafeFileStem(input: string): string {
    return (
      input
        .trim()
        .toLowerCase()
        .replace(/[^\w.-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'server'
    );
  }

  genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}${randomUUID().replace(/-/g, '').slice(0, 6)}`;
  }
}

