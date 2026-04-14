import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { NginxService } from '../../services/nginx.service';
import type { NginxLocation, NginxServer, CreateNginxServerRequest } from '../../models/nginx.types';

/**
 * Nginx Server 新增/编辑 Drawer
 * 使用 nz-form 布局
 */
@Component({
  selector: 'app-nginx-server-drawer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzDrawerModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
  ],
  templateUrl:'./nginx-server-drawer.component.html',
  styleUrls: ['./nginx-server-drawer.component.less'],
})
export class NginxServerDrawerComponent {
  @Input() visible = false;
  @Input() editingServer: NginxServer | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();

  private nginxService = inject(NginxService);
  private message = inject(NzMessageService);

  saving = signal(false);

  readonly commonListenOptions = ['80', '443', '8080', '8443'];
  readonly commonDomainOptions = ['localhost', '127.0.0.1', 'example.com'];

  listenValues: string[] = [];
  domainValues: string[] = ['127.0.0.1'];

  formData: CreateNginxServerRequest = {
    name: '',
    listen: [],
    domains: ['127.0.0.1'],
    root: '',
    locations: [],
    ssl: false,
    protocol: 'http',
    enabled: true,
    sslCert: '',
    sslKey: '',
    extraConfig: '',
  };

  get drawerTitle() {
    return this.editingServer ? '编辑 Server 块' : '新增 Server 块';
  }

  /** 外部传入 editingServer 时同步表单数据 */
  set serverData(value: NginxServer | null) {
    this.editingServer = value;
    this.resetForm();
  }

  /** 每次 visible 变为 true 时重置表单 */
  ngOnChanges(): void {
    if (this.visible) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    if (this.editingServer) {
      const parsedListen = this.parseListenValues(this.editingServer.listen);
      this.formData = {
        name: this.editingServer.name,
        listen: parsedListen.length ? parsedListen : ['80'],
        domains: [...(this.editingServer.domains || [])],
        root: this.editingServer.root || '',
        locations: this.editingServer.locations.map((l) => ({ ...l })),
        ssl: this.editingServer.ssl,
        protocol: this.editingServer.ssl ? 'https' : 'http',
        enabled: this.editingServer.enabled,
        sslCert: this.editingServer.sslCert || '',
        sslKey: this.editingServer.sslKey || '',
        extraConfig: this.editingServer.extraConfig || '',
      };
      this.listenValues = [...this.formData.listen];
      this.domainValues = [...(this.formData.domains || [])];
    } else {
      this.formData = {
        name: '',
        listen: [],
        domains: ['127.0.0.1'],
        root: '',
        locations: [{ path: '/', proxyPass: '' }],
        ssl: false,
        protocol: 'http',
        enabled: true,
        sslCert: '',
        sslKey: '',
        extraConfig: '',
      };
      this.listenValues = [];
      this.domainValues = ['127.0.0.1'];
    }
  }

  syncDomains(): void {
    this.formData.domains = (this.domainValues || [])
      .flatMap(item => item.split(/[,\s]+/))
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .filter((item, index, arr) => arr.indexOf(item) === index);
  }

  onClose(): void {
    this.visibleChange.emit(false);
  }

  addLocation(template: 'empty' | 'api' = 'empty'): void {
    const list = [...(this.formData.locations || [])];
    if (template === 'api') {
      list.push({
        path: '/api/',
        proxyPass: 'http://127.0.0.1:6808',
      });
    } else {
      list.push({
        path: '/',
        proxyPass: '',
      });
    }
    this.formData.locations = list;
  }

  removeLocation(index: number): void {
    const list = [...(this.formData.locations || [])];
    list.splice(index, 1);
    this.formData.locations = list;
  }

  previewConfig(): void {
    this.syncListen();
    this.syncDomains();
    this.normalizeLocations();
    this.message.info('配置预览功能开发中');
  }

  async save(): Promise<void> {
    if (!this.formData.name.trim()) {
      this.message.warning('请输入 Server 名称');
      return;
    }

    this.syncListen();
    if (!this.formData.listen.length) {
      this.message.warning('请至少填写一个监听端口');
      return;
    }

    if (this.formData.protocol === 'https') {
      if (!this.formData.sslCert?.trim()) {
        this.message.warning('请填写 SSL 证书路径');
        return;
      }
      if (!this.formData.sslKey?.trim()) {
        this.message.warning('请填写 SSL 私钥路径');
        return;
      }
    }

    this.syncDomains();
    this.normalizeLocations();

    this.saving.set(true);
    try {
      let res: any;
      if (this.editingServer) {
        res = await this.nginxService.updateServer(this.editingServer.id, this.formData);
      } else {
        res = await this.nginxService.createServer(this.formData);
      }

      if (res.success) {
        this.message.success(this.editingServer ? 'Server 已更新' : 'Server 已创建');
        this.saved.emit();
        this.visibleChange.emit(false);
      } else {
        this.message.error(res.error || '操作失败');
      }
    } catch (err: any) {
      this.message.error('操作失败: ' + err.message);
    } finally {
      this.saving.set(false);
    }
  }

  private syncListen(): void {
    const normalized: string[] = [];
    for (const item of this.listenValues || []) {
      const raw = String(item || '').trim();
      if (!raw) {
        continue;
      }
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
        this.message.warning(`监听端口 "${raw}" 无效，请输入 1-65535 的整数`);
        continue;
      }
      const port = String(parsed);
      if (!normalized.includes(port)) {
        normalized.push(port);
      }
    }
    this.listenValues = normalized;
    this.formData.listen = [...normalized];
  }

  private parseListenValues(listenValues?: string[]): string[] {
    const normalized: string[] = [];
    for (const item of listenValues || []) {
      const match = String(item || '').match(/\d+/);
      if (!match) {
        continue;
      }
      const parsed = Number(match[0]);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
        continue;
      }
      const port = String(parsed);
      if (!normalized.includes(port)) {
        normalized.push(port);
      }
    }
    return normalized;
  }

  private normalizeLocations(): void {
    const normalizeText = (value?: string): string | undefined => {
      const text = String(value || '').trim();
      return text ? text : undefined;
    };

    const parseList = (value?: string | string[]): string[] | undefined => {
      if (Array.isArray(value)) {
        const arr = value.map(item => String(item || '').trim()).filter(Boolean);
        return arr.length ? arr : undefined;
      }
      const text = String(value || '').trim();
      if (!text) {
        return undefined;
      }
      const arr = text.split(/\s+/).map(item => item.trim()).filter(Boolean);
      return arr.length ? arr : undefined;
    };

    const normalized: NginxLocation[] = (this.formData.locations || [])
      .map(location => {
        const path = String(location.path || '').trim() || '/';
        const proxyPass = normalizeText(location.proxyPass);
        const root = normalizeText(location.root);
        const index = parseList(location.index as unknown as string | string[]);
        const tryFiles = parseList(location.tryFiles as unknown as string | string[]);
        return {
          path,
          proxyPass,
          root,
          index,
          tryFiles,
        };
      })
      .filter(location => Boolean(location.proxyPass || location.root || location.index?.length || location.tryFiles?.length));

    if (!normalized.length) {
      this.formData.locations = [{ path: '/', proxyPass: '' }];
      return;
    }
    this.formData.locations = normalized;
  }
}
