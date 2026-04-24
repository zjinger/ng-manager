import { randomUUID } from 'crypto';
import { access, constants, readFile, rename as fsRename } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { nginxErrors } from '@yinuo-ngm/errors';
import { NginxConfigService } from '../core/nginx-config.service';
import { NginxService } from '../core/nginx.service';
import { ServerIdGenerator } from '../utils/server-id-generator';
import type { ServerSource } from './server-parser.service';
import { ServerEnableService } from './server-enable.service';

/**
 * Server 配置文件操作服务
 * 负责对 Server 配置文件进行重命名、替换、删除等操作
 * 这些操作通常伴随着 Server 的更新、删除等功能
 * 由于 Nginx 配置文件的灵活性，无法保证配置块的位置和格式，因此在操作前会进行严格的验证
 * 以避免误操作导致 Nginx 配置文件损坏或服务不可用
 */
export class ServerFileOpsService {
  constructor(
    private readonly nginxService: NginxService,
    private readonly configService: NginxConfigService,
    private readonly idGenerator: ServerIdGenerator,
    private readonly enableService: ServerEnableService
  ) {}

  async tryRenameServerConfigFile(
    oldFilePath: string,
    source: ServerSource,
    nextName: string
  ): Promise<{ newFilePath: string } | null> {
    const canRename = await this.canRenameServerConfigFile(oldFilePath, source.start, source.end);
    if (!canRename) {
      return null;
    }

    const nextStem = this.idGenerator.makeSafeFileStem(nextName);
    const nextFilePath = await this.makeUniqueConfigPath(dirname(oldFilePath), `${nextStem}.conf`);
    if (this.normalizeFsPath(nextFilePath) === this.normalizeFsPath(oldFilePath)) {
      return null;
    }

    await fsRename(oldFilePath, nextFilePath);
    await this.enableService.cleanupSitesEnabledLinkOnRename(oldFilePath);
    return { newFilePath: nextFilePath };
  }

  async replaceServerBlock(
    filePath: string,
    start: number,
    end: number,
    nextBlockContent: string
  ): Promise<void> {
    await this.configService.mutateConfigFile(filePath, async original => {
      if (start < 0 || end > original.length || start >= end) {
        throw nginxErrors.serverFileInvalid(filePath, `Server 配置块定位失败(range=${start}-${end})，请刷新后重试`);
      }
      const next = `${original.slice(0, start)}${nextBlockContent}${original.slice(end)}`;
      return { type: 'write', content: next };
    });
  }

  async removeServerBlock(filePath: string, start: number, end: number): Promise<void> {
    await this.configService.mutateConfigFile(filePath, async original => {
      if (start < 0 || end > original.length || start >= end) {
        throw nginxErrors.serverFileInvalid(filePath, `Server 配置块定位失败(range=${start}-${end})，请刷新后重试`);
      }

      const next = `${original.slice(0, start)}${original.slice(end)}`;
      if (!next.trim()) {
        return { type: 'delete' };
      }
      return { type: 'write', content: next };
    });
  }

  async makeGeneratedConfigPath(dir: string): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const fileName = `ngm-${this.idGenerator.genId('srv')}.conf`;
      const candidate = join(dir, fileName);
      try {
        await access(candidate, constants.F_OK);
      } catch {
        return candidate;
      }
    }

    return join(dir, `ngm-${Date.now()}-${randomUUID().slice(0, 8)}.conf`);
  }

  isServerSourceOutdatedError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'code' in error) {
      return (error as { code: number }).code === 20205;
    }
    const message = error instanceof Error ? error.message : String(error ?? '');
    return message.includes('Server 配置块定位失败') || message.includes('Server 配置文件无效');
  }

  private async canRenameServerConfigFile(filePath: string, start: number, end: number): Promise<boolean> {
    if (!/\.conf$/i.test(filePath)) {
      return false;
    }

    const instance = this.nginxService.getInstance();
    if (instance && this.normalizeFsPath(filePath) === this.normalizeFsPath(instance.configPath)) {
      return false;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      const head = content.slice(0, Math.max(0, start));
      const tail = content.slice(Math.max(0, end));
      return !head.trim() && !tail.trim();
    } catch {
      return false;
    }
  }

  private async makeUniqueConfigPath(dir: string, fileName: string): Promise<string> {
    const initial = join(dir, fileName);
    try {
      await access(initial, constants.F_OK);
      const stem = basename(fileName, '.conf');
      return join(dir, `${stem}-${Date.now()}-${randomUUID().slice(0, 8)}.conf`);
    } catch {
      return initial;
    }
  }

  private normalizeFsPath(filePath: string): string {
    return filePath.replace(/\\/g, '/').toLowerCase();
  }
}
