import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
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
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

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
    NzTooltipModule,
    NzPopconfirmModule,
  ],
  templateUrl: './nginx-server-drawer.component.html',
  styleUrls: ['./nginx-server-drawer.component.less'],
})
export class NginxServerDrawerComponent implements OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() editingServer: NginxServer | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();

  private nginxService = inject(NginxService);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);
  private resetTimer: ReturnType<typeof setTimeout> | null = null;
  private visibleEmitTimer: ReturnType<typeof setTimeout> | null = null;

  saving = signal(false);

  readonly commonListenOptions = ['80', '443', '8080', '8443'];
  readonly commonDomainOptions = ['127.0.0.1', 'localhost', 'example.com'];
  readonly commonIndexOptions = ['index.html'];

  listenValues: string[] = [];
  domainValues: string[] = ['127.0.0.1'];
  indexValues: string[] = ['index.html'];

  formData: CreateNginxServerRequest = {
    name: '',
    listen: [],
    domains: ['127.0.0.1'],
    root: '',
    index: ['index.html'],
    locations: [],
    ssl: false,
    protocol: 'http',
    enabled: true,
    sslCert: '',
    sslKey: '',
    extraConfig: '',
  };

  get drawerTitle() {
    return this.editingServer ? '编辑 Server ' : '新增 Server ';
  }

  ngOnChanges(changes: SimpleChanges): void {
    const visibleChanged = 'visible' in changes;
    const serverChanged = 'editingServer' in changes;
    const shouldReset =
      (visibleChanged && this.visible) ||
      (serverChanged && this.visible && !changes['editingServer']?.firstChange);

    if (shouldReset) {
      this.scheduleResetForm();
    }
  }

  ngOnDestroy(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    if (this.visibleEmitTimer) {
      clearTimeout(this.visibleEmitTimer);
      this.visibleEmitTimer = null;
    }
  }

  private scheduleResetForm(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    this.resetTimer = setTimeout(() => {
      this.resetTimer = null;
      this.resetForm();
      this.cdr.detectChanges();
    }, 0);
  }

  private emitVisibleChange(nextVisible: boolean): void {
    if (this.visibleEmitTimer) {
      clearTimeout(this.visibleEmitTimer);
    }
    this.visibleEmitTimer = setTimeout(() => {
      this.visibleEmitTimer = null;
      this.visibleChange.emit(nextVisible);
    }, 0);
  }

  private resetForm(): void {
    if (this.editingServer) {
      const parsedListen = this.parseListenValues(this.editingServer.listen);
      this.formData = {
        name: this.editingServer.name,
        listen: parsedListen.length ? parsedListen : ['80'],
        domains: [...(this.editingServer.domains || [])],
        root: this.editingServer.root || '',
        index: [...(this.editingServer.index?.length ? this.editingServer.index : ['index.html'])],
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
      this.indexValues = [...(this.formData.index || ['index.html'])];
    } else {
      this.formData = {
        name: '',
        listen: [],
        domains: ['127.0.0.1'],
        root: '',
        index: ['index.html'],
        locations: [],//{ path: '/', proxyPass: '' }
        ssl: false,
        protocol: 'http',
        enabled: true,
        sslCert: '',
        sslKey: '',
        extraConfig: '',
      };
      this.listenValues = [];
      this.domainValues = ['127.0.0.1'];
      this.indexValues = ['index.html'];
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
    this.emitVisibleChange(false);
  }

  syncIndex(): void {
    const normalized = (this.indexValues || [])
      .flatMap(item => String(item || '').split(/[,\s]+/))
      .map(item => item.trim())
      .filter(Boolean)
      .filter((item, index, arr) => arr.indexOf(item) === index);

    this.indexValues = normalized.length ? normalized : ['index.html'];
    this.formData.index = [...this.indexValues];
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
        path: '',
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
    this.syncIndex();
    this.normalizeLocations();
    this.message.info('配置预览功能开发中');
  }

  async save(): Promise<void> {
    if (!this.formData.name.trim()) {
      this.message.warning('请输入 Server 名称');
      return;
    }

    this.syncDomains();
    if (!this.formData.domains?.length) {
      this.message.warning('请至少填写一个域名');
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

    this.syncIndex();
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
        this.emitVisibleChange(false);
      } else {
        this.message.error(res.error || '操作失败');
      }
    } catch (err: any) {
      this.message.error('操作失败: ' + this.extractErrorMessage(err));
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
        const rawConfig = normalizeText(location.rawConfig);
        return {
          path,
          proxyPass,
          root,
          index,
          tryFiles,
          rawConfig,
        };
      })
      .filter(location => Boolean(
        location.proxyPass ||
        location.root ||
        location.index?.length ||
        location.tryFiles?.length ||
        location.rawConfig
      ));

    this.formData.locations = normalized;
  }

  private extractErrorMessage(err: unknown): string {
    const error = err as any;
    return (
      error?.error?.error?.message ||
      error?.error?.message ||
      error?.message ||
      '请求失败'
    );
  }
}
