import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { NginxService } from '../../services/nginx.service';
import { NginxServerDrawerComponent } from '../nginx-server-drawer/nginx-server-drawer.component';
import type { NginxServer } from '../../models/nginx.types';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

/**
 * Nginx Server 列表组件
 * 对齐设计稿 nginx.html 中 server-block-list 样式
 */
@Component({
  selector: 'app-nginx-server-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzSpinModule,
    NzTooltipModule,
    NzSwitchModule,
    NzPopconfirmModule,
    NginxServerDrawerComponent,
  ],
  templateUrl: './nginx-server-list.component.html',
  styleUrls: ['./nginx-server-list.component.less'],
})
export class NginxServerListComponent implements OnInit, OnChanges {
  @Input() showToolbar = true;
  @Input() openCreateToken = 0;
  @Output() summaryChange = new EventEmitter<{ total: number; enabled: number }>();
  @Output() serverListMutated = new EventEmitter<void>();

  private nginxService = inject(NginxService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);

  servers = signal<NginxServer[]>([]);
  loading = signal(false);

  drawerVisible = false;
  editingServer = signal<NginxServer | null>(null);

  configModalVisible = false;
  viewingConfig = signal('');

  ngOnInit() {
    this.loadServers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const openCreate = changes['openCreateToken'];
    if (openCreate && !openCreate.firstChange) {
      this.openDrawer(null);
    }
  }

  async loadServers(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.nginxService.getServers();
      if (res.success && res.servers) {
        this.servers.set(res.servers);
        this.summaryChange.emit({
          total: res.servers.length,
          enabled: res.servers.filter(server => server.enabled).length,
        });
      }
    } catch (err: any) {
      this.message.error('加载失败: ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }

  openDrawer(server: NginxServer | null): void {
    this.editingServer.set(server);
    this.drawerVisible = true;
  }

  onDrawerVisibleChange(visible: boolean): void {
    this.drawerVisible = visible;
    if (!visible) {
      this.editingServer.set(null);
    }
  }

  onSaved(): void {
    this.loadServers();
    this.serverListMutated.emit();
  }

  importServer(): void {
    this.message.info('导入功能开发中');
  }

  async toggleServer(id: string, enabled: boolean): Promise<void> {
    try {
      const res = enabled
        ? await this.nginxService.enableServer(id)
        : await this.nginxService.disableServer(id);

      if (res.success) {
        this.message.success(enabled ? '已启用' : '已禁用');
        await this.loadServers();
        this.serverListMutated.emit();
      } else {
        this.message.error(res.error || '操作失败');
      }
    } catch (err: any) {
      this.message.error('操作失败: ' + err.message);
    }
  }

  copyServer(server: NginxServer): void {
    this.editingServer.set(server);
    this.drawerVisible = true;
    this.message.info('复制 Server - 请修改名称后保存');
  }

  async deleteServer(server: NginxServer): Promise<void> {
    try {
      const res = await this.nginxService.deleteServer(server.id);
      if (res.success) {
        this.message.success('已删除');
        this.loadServers();
        this.serverListMutated.emit();
      } else {
        this.message.error(res.error || '删除失败');
      }
    } catch (err: any) {
      this.message.error('删除失败: ' + err.message);
    }
  }

  getAccessUrls(server: NginxServer): string[] {
    return this.buildAccessUrls(server);
  }

  private buildAccessUrls(server: NginxServer): string[] {
    const scheme = server.ssl ? 'https' : 'http';
    const ports = this.extractPorts(server.listen);
    const hosts = this.extractHosts(server);
    const selectedPort = ports[0] ?? (server.ssl ? 443 : 80);

    if (!hosts.length) {
      return [];
    }

    return hosts
      .map(host => this.buildUrl(scheme, host, selectedPort))
      .filter(Boolean)
      .slice(0, 6);
  }

  private extractPorts(listen: string[]): number[] {
    const ports = new Set<number>();
    for (const item of listen || []) {
      const port = this.parseListenPort(item);
      if (port !== null) {
        ports.add(port);
      }
    }
    return Array.from(ports.values()).sort((a, b) => a - b);
  }

  private parseListenPort(rawListen: string): number | null {
    const text = String(rawListen || '').trim();
    if (!text || /^unix:/i.test(text)) {
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
    return port;
  }

  private extractHosts(server: NginxServer): string[] {
    const hosts = new Set<string>();
    for (const domain of server.domains || []) {
      const item = String(domain || '').trim();
      if (!item || item === '_' || item === '*') {
        continue;
      }
      hosts.add(item);
    }

    if (!hosts.size) {
      const listenHost = this.parseListenHost(server.listen?.[0] || '');
      if (listenHost) {
        hosts.add(listenHost);
      }
    }

    if (!hosts.size) {
      hosts.add('127.0.0.1');
    }

    return Array.from(hosts.values());
  }

  private parseListenHost(rawListen: string): string | null {
    const text = String(rawListen || '').trim();
    if (!text || /^unix:/i.test(text)) {
      return null;
    }
    const token = text.split(/\s+/)[0] || '';
    if (/^\[[^\]]+\]:\d+$/.test(token)) {
      const host = token.slice(1, token.indexOf(']')).trim();
      return this.normalizeHost(host);
    }
    if (token.includes(':')) {
      const host = token.slice(0, token.lastIndexOf(':')).trim();
      return this.normalizeHost(host);
    }
    return null;
  }

  private normalizeHost(host: string): string | null {
    if (!host || host === '*' || host === '0.0.0.0' || host === '::' || host === '[::]') {
      return null;
    }
    return host;
  }

  private buildUrl(scheme: 'http' | 'https', host: string, port: number): string {
    const normalizedHost = this.normalizeHostForUrl(host);
    if (!normalizedHost) {
      return '';
    }
    const hidePort = (scheme === 'http' && port === 80) || (scheme === 'https' && port === 443);
    return `${scheme}://${normalizedHost}${hidePort ? '' : `:${port}`}`;
  }

  private normalizeHostForUrl(host: string): string {
    const text = String(host || '').trim();
    if (!text) {
      return '';
    }
    if (text.includes(':') && !text.startsWith('[') && !text.endsWith(']')) {
      return `[${text}]`;
    }
    return text;
  }
}

