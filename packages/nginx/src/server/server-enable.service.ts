import { symlink, unlink } from 'fs/promises';
import { basename, join } from 'path';
import { nginxErrors } from '@yinuo-ngm/errors';
import { NginxConfigService } from '../core/nginx-config.service';
import type { NginxServer } from '../types/nginx.types';
import type { ServerSource } from './server-parser.service';

export class ServerEnableService {
  private readonly disableStartMarker = '# ngm:disable-start';
  private readonly disableEndMarker = '# ngm:disable-end';

  constructor(private readonly configService: NginxConfigService) {}

  async applyEnabledState(
    server: NginxServer,
    enabled: boolean,
    resolveServerSource: (server: NginxServer) => Promise<ServerSource>
  ): Promise<void> {
    if (!server.filePath) {
      throw nginxErrors.serverFileInvalid('', 'Server 配置文件路径不存在');
    }

    const sitesEnabledDir = this.configService.getSitesEnabledDir();
    const sitesAvailableDir = this.configService.getSitesAvailableDir();
    const normalizedFilePath = server.filePath.replace(/\\/g, '/');
    const normalizedSitesAvailableDir = sitesAvailableDir?.replace(/\\/g, '/');
    const shouldUseSitesLink =
      Boolean(sitesEnabledDir) &&
      Boolean(normalizedSitesAvailableDir) &&
      normalizedFilePath.startsWith(normalizedSitesAvailableDir!);

    if (shouldUseSitesLink) {
      const linkPath = join(sitesEnabledDir!, basename(server.filePath));
      if (enabled) {
        try {
          await symlink(server.filePath, linkPath);
        } catch (error: any) {
          if (error.code !== 'EEXIST') {
            throw error;
          }
        }
        return;
      }

      try {
        await unlink(linkPath);
      } catch {
        // 链接不存在，忽略
      }
      return;
    }

    const source = await resolveServerSource(server);
    await this.configService.mutateConfigFile(source.filePath, async original => {
      if (source.start < 0 || source.end > original.length || source.start >= source.end) {
        throw nginxErrors.serverFileInvalid(
          source.filePath,
          `Server 配置块定位失败(id=${server.id}, range=${source.start}-${source.end})，请刷新后重试`
        );
      }

      const segment = original.slice(source.start, source.end);
      const alreadyDisabled = this.isDisabledWrappedBlock(segment);
      if ((enabled && !alreadyDisabled) || (!enabled && alreadyDisabled)) {
        return { type: 'noop' };
      }

      const transformed = enabled ? this.unwrapDisabledBlock(segment) : this.wrapDisabledBlock(segment);
      const next = `${original.slice(0, source.start)}${transformed}${original.slice(source.end)}`;
      return { type: 'write', content: next };
    });
  }

  async cleanupSitesEnabledLinkOnRename(oldFilePath: string): Promise<void> {
    const sitesEnabledDir = this.configService.getSitesEnabledDir();
    if (!sitesEnabledDir) {
      return;
    }
    const oldLink = join(sitesEnabledDir, basename(oldFilePath));
    try {
      await unlink(oldLink);
    } catch {
      // old link may not exist
    }
  }

  isDisabledWrappedBlock(segment: string): boolean {
    return segment.includes(this.disableStartMarker) && segment.includes(this.disableEndMarker);
  }

  wrapDisabledBlock(segment: string): string {
    const lineBreak = segment.includes('\r\n') ? '\r\n' : '\n';
    const commentedBody = segment
      .split(/\r?\n/)
      .map(line => `# ${line}`)
      .join(lineBreak);
    return `${this.disableStartMarker}${lineBreak}${commentedBody}${lineBreak}${this.disableEndMarker}`;
  }

  unwrapDisabledBlock(segment: string): string {
    const lineBreak = segment.includes('\r\n') ? '\r\n' : '\n';
    const lines = segment.split(/\r?\n/);
    const startMarkerRegex = /^\s*#\s*ngm:disable-start\b/i;
    const endMarkerRegex = /^\s*#\s*ngm:disable-end\b/i;
    const startIndex = lines.findIndex(line => startMarkerRegex.test(line));
    const endIndex = lines.findIndex(line => endMarkerRegex.test(line));
    if (startIndex < 0 || endIndex <= startIndex) {
      return segment;
    }

    const body = lines
      .slice(startIndex + 1, endIndex)
      .map(line => line.replace(/^\s*#\s?/, ''))
      .join(lineBreak);
    return body;
  }
}
