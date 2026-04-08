import { randomUUID } from 'crypto';
import { access, constants, readFile, symlink, unlink } from 'fs/promises';
import { basename, join } from 'path';
import { nginxConfigService } from './nginx-config.service';
import { nginxService } from './nginx.service';
import type {
  CreateNginxServerRequest,
  NginxLocation,
  NginxServer,
  UpdateNginxServerRequest,
} from './nginx.types';

/**
 * Nginx Server 块管理服务
 * 负责 server 块的增删改查、启用/禁用等
 */
export class NginxServerService {
  private servers: Map<string, NginxServer> = new Map();

  /**
   * 获取所有 server 块
   */
  async getAllServers(): Promise<NginxServer[]> {
    const instance = nginxService.getInstance();
    if (!instance) {
      return [];
    }

    // 从配置文件解析 server 块
    await this.parseServersFromConfig();

    return Array.from(this.servers.values());
  }

  /**
   * 获取单个 server
   */
  async getServer(id: string): Promise<NginxServer | null> {
    await this.parseServersFromConfig();
    return this.servers.get(id) || null;
  }

  /**
   * 创建 server
   */
  async createServer(request: CreateNginxServerRequest): Promise<NginxServer> {
    const instance = nginxService.getInstance();
    if (!instance) {
      throw new Error('Nginx 未绑定');
    }

    const id = randomUUID();
    const server: NginxServer = {
      id,
      name: request.name,
      listen: request.listen,
      locations: request.locations,
      ssl: request.ssl || false,
      enabled: true,
      configText: this.generateServerConfig(request),
    };

    // 写入配置文件
    const configDir = nginxConfigService.getConfDir() || 
                      nginxConfigService.getSitesAvailableDir() ||
                      join(nginxConfigService.getConfigDir()!, 'conf.d');
    
    const filePath = join(configDir, `${request.name}.conf`);
    await nginxConfigService.writeConfigFile(filePath, server.configText);

    // 如果是 Debian/Ubuntu 风格，创建符号链接
    const sitesEnabledDir = nginxConfigService.getSitesEnabledDir();
    if (sitesEnabledDir) {
      const linkPath = join(sitesEnabledDir, `${request.name}.conf`);
      try {
        await symlink(filePath, linkPath);
      } catch {
        // 链接已存在，忽略
      }
    }

    server.filePath = filePath;
    this.servers.set(id, server);

    return server;
  }

  /**
   * 更新 server
   */
  async updateServer(id: string, request: UpdateNginxServerRequest): Promise<NginxServer> {
    const server = await this.getServer(id);
    if (!server) {
      throw new Error('Server 不存在');
    }

    // 更新字段
    if (request.name !== undefined) server.name = request.name;
    if (request.listen !== undefined) server.listen = request.listen;
    if (request.locations !== undefined) server.locations = request.locations;
    if (request.ssl !== undefined) server.ssl = request.ssl;

    // 重新生成配置
    server.configText = this.generateServerConfig({
      name: server.name,
      listen: server.listen,
      locations: server.locations,
      ssl: server.ssl,
    });

    // 写入配置文件
    if (server.filePath) {
      await nginxConfigService.writeConfigFile(server.filePath, server.configText);
    }

    this.servers.set(id, server);
    return server;
  }

  /**
   * 删除 server
   */
  async deleteServer(id: string): Promise<void> {
    const server = await this.getServer(id);
    if (!server) {
      throw new Error('Server 不存在');
    }

    // 删除配置文件
    if (server.filePath) {
      try {
        await unlink(server.filePath);
      } catch {
        // 文件不存在，忽略
      }

      // 删除符号链接（如果存在）
      const sitesEnabledDir = nginxConfigService.getSitesEnabledDir();
      if (sitesEnabledDir) {
        const linkPath = join(sitesEnabledDir, basename(server.filePath));
        try {
          await unlink(linkPath);
        } catch {
          // 链接不存在，忽略
        }
      }
    }

    this.servers.delete(id);
  }

  /**
   * 启用 server
   */
  async enableServer(id: string): Promise<void> {
    const server = await this.getServer(id);
    if (!server) {
      throw new Error('Server 不存在');
    }

    const sitesEnabledDir = nginxConfigService.getSitesEnabledDir();
    if (!sitesEnabledDir) {
      throw new Error('不支持启用/禁用操作');
    }

    if (!server.filePath) {
      throw new Error('Server 配置文件不存在');
    }

    const linkPath = join(sitesEnabledDir, basename(server.filePath));
    
    try {
      await symlink(server.filePath, linkPath);
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }

    server.enabled = true;
    this.servers.set(id, server);
  }

  /**
   * 禁用 server
   */
  async disableServer(id: string): Promise<void> {
    const server = await this.getServer(id);
    if (!server) {
      throw new Error('Server 不存在');
    }

    const sitesEnabledDir = nginxConfigService.getSitesEnabledDir();
    if (!sitesEnabledDir) {
      throw new Error('不支持启用/禁用操作');
    }

    if (!server.filePath) {
      throw new Error('Server 配置文件不存在');
    }

    const linkPath = join(sitesEnabledDir, basename(server.filePath));
    
    try {
      await unlink(linkPath);
    } catch {
      // 链接不存在，忽略
    }

    server.enabled = false;
    this.servers.set(id, server);
  }

  /**
   * 从配置文件解析 server 块
   */
  private async parseServersFromConfig(): Promise<void> {
    const instance = nginxService.getInstance();
    if (!instance) {
      return;
    }

    this.servers.clear();

    // 读取所有包含的配置文件
    const configFiles = await nginxConfigService.getIncludedConfigs();

    for (const filePath of configFiles) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const servers = this.parseServerBlocks(content, filePath);
        
        for (const server of servers) {
          this.servers.set(server.id, server);
        }
      } catch {
        // 读取失败，忽略
      }
    }
  }

  /**
   * 解析 server 块
   */
  private parseServerBlocks(content: string, filePath: string): NginxServer[] {
    const servers: NginxServer[] = [];
    
    // 匹配 server 块
    const serverRegex = /server\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs;
    let match;

    while ((match = serverRegex.exec(content)) !== null) {
      const blockContent = match[1];
      const server = this.parseServerBlock(blockContent, filePath);
      
      if (server) {
        servers.push(server);
      }
    }

    return servers;
  }

  /**
   * 解析单个 server 块
   */
  private parseServerBlock(content: string, filePath: string): NginxServer | null {
    // 解析 listen
    const listenMatch = content.match(/listen\s+(\S+);/g);
    const listen = listenMatch?.map(m => {
      const match = m.match(/listen\s+(\S+);/);
      return match?.[1] || '';
    }).filter(Boolean) || ['80'];

    // 解析 server_name
    const nameMatch = content.match(/server_name\s+([^;]+);/);
    const name = nameMatch?.[1]?.trim() || '_';

    // 解析 ssl
    const ssl = content.includes('ssl') || content.includes('ssl_certificate');

    // 解析 location 块
    const locations = this.parseLocations(content);

    // 检查是否启用（Debian/Ubuntu 风格）
    let enabled = true;
    if (filePath.includes('sites-available')) {
      const sitesEnabledDir = nginxConfigService.getSitesEnabledDir();
      if (sitesEnabledDir) {
        const linkPath = join(sitesEnabledDir, basename(filePath));
        try {
          access(linkPath, constants.F_OK);
        } catch {
          enabled = false;
        }
      }
    }

    return {
      id: randomUUID(),
      name,
      listen,
      locations,
      ssl,
      enabled,
      configText: `server {${content}}`,
      filePath,
    };
  }

  /**
   * 解析 location 块
   */
  private parseLocations(content: string): NginxLocation[] {
    const locations: NginxLocation[] = [];
    
    const locationRegex = /location\s+(\S+)\s*\{([^}]*)\}/gs;
    let match;

    while ((match = locationRegex.exec(content)) !== null) {
      const path = match[1];
      const blockContent = match[2];

      // 解析 proxy_pass
      const proxyMatch = blockContent.match(/proxy_pass\s+([^;]+);/);
      const proxyPass = proxyMatch?.[1]?.trim();

      // 解析 root
      const rootMatch = blockContent.match(/root\s+([^;]+);/);
      const root = rootMatch?.[1]?.trim();

      // 解析 index
      const indexMatch = blockContent.match(/index\s+([^;]+);/);
      const index = indexMatch?.[1]?.trim().split(/\s+/);

      // 解析 try_files
      const tryFilesMatch = blockContent.match(/try_files\s+([^;]+);/);
      const tryFiles = tryFilesMatch?.[1]?.trim().split(/\s+/);

      locations.push({
        path,
        proxyPass,
        root,
        index,
        tryFiles,
        rawConfig: match[0],
      });
    }

    return locations;
  }

  /**
   * 生成 server 配置
   */
  private generateServerConfig(server: {
    name: string;
    listen: string[];
    locations: NginxLocation[];
    ssl?: boolean;
  }): string {
    const lines: string[] = ['server {'];

    // listen 指令
    for (const port of server.listen) {
      if (server.ssl && (port === '443' || port.endsWith(' ssl'))) {
        lines.push(`    listen ${port} ssl;`);
      } else {
        lines.push(`    listen ${port};`);
      }
    }

    // server_name
    lines.push(`    server_name ${server.name};`);

    // SSL 配置
    if (server.ssl) {
      lines.push('');
      lines.push('    # SSL 配置');
      lines.push(`    ssl_certificate /path/to/cert.pem;`);
      lines.push(`    ssl_certificate_key /path/to/key.pem;`);
    }

    // location 块
    for (const loc of server.locations) {
      lines.push('');
      lines.push(`    location ${loc.path} {`);

      if (loc.proxyPass) {
        lines.push(`        proxy_pass ${loc.proxyPass};`);
        lines.push(`        proxy_set_header Host $host;`);
        lines.push(`        proxy_set_header X-Real-IP $remote_addr;`);
      }

      if (loc.root) {
        lines.push(`        root ${loc.root};`);
      }

      if (loc.index && loc.index.length > 0) {
        lines.push(`        index ${loc.index.join(' ')};`);
      }

      if (loc.tryFiles && loc.tryFiles.length > 0) {
        lines.push(`        try_files ${loc.tryFiles.join(' ')};`);
      }

      lines.push('    }');
    }

    lines.push('}');

    return lines.join('\n');
  }
}

// 单例实例
export const nginxServerService = new NginxServerService();
