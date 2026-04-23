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
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { NginxService } from '../../services/nginx.service';
import type { NginxLocation, NginxServer, CreateNginxServerRequest } from '../../models/nginx.types';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

interface ServerDiffRow {
  label: string;
  before: string;
  after: string;
}

type FrontendServiceType = 'static' | 'web';

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
    NzInputNumberModule,
    NzModalModule,
    NzRadioModule,
    NzSelectModule,
    NzSwitchModule,
    NzTooltipModule,
    NzPopconfirmModule,
    NzCheckboxModule
  ],
  templateUrl: './nginx-server-drawer.component.html',
  styleUrls: ['./nginx-server-drawer.component.less'],
})
export class NginxServerDrawerComponent implements OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() mode: 'create' | 'edit' | 'copy' = 'create';
  @Input() editingServer: NginxServer | null = null;
  @Input() duplicateSourceServer: NginxServer | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();

  private nginxService = inject(NginxService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);
  private cdr = inject(ChangeDetectorRef);
  private resetTimer: ReturnType<typeof setTimeout> | null = null;
  private visibleEmitTimer: ReturnType<typeof setTimeout> | null = null;

  saving = signal(false);
  validatingConfig = signal(false);
  previewVisible = signal(false);
  previewContent = signal('');

  commonDomainOptions = ['127.0.0.1'];
  localIp: string | null = null;
  hasFetchedLocalIp = false;
  readonly commonIndexOptions = ['index.html'];

  listenPort: number | null = null;
  domainValues: string[] = ['127.0.0.1'];
  indexFile = 'index.html';
  frontendServiceType: FrontendServiceType = 'web';
  frontendStaticRoot = '';
  frontendWebService = '';
  apiProxies: Array<{ pathPrefix: string; backendService: string; isWebSocket: boolean }> = [];

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
    if (this.mode === 'copy') {
      return '复制 Server ';
    }
    if (this.mode === 'edit') {
      return '编辑 Server ';
    }
    return '新增 Server ';
  }

  ngOnChanges(changes: SimpleChanges): void {
    const visibleChanged = 'visible' in changes;
    const modeChanged = 'mode' in changes;
    const serverChanged = 'editingServer' in changes;
    const duplicateChanged = 'duplicateSourceServer' in changes;
    const shouldReset =
      (visibleChanged && this.visible) ||
      (modeChanged && this.visible && !changes['mode']?.firstChange) ||
      (serverChanged && this.visible && !changes['editingServer']?.firstChange) ||
      (duplicateChanged && this.visible && !changes['duplicateSourceServer']?.firstChange);

    if (shouldReset) {
      this.scheduleResetForm();
      if (this.visible && !this.hasFetchedLocalIp) {
        this.hasFetchedLocalIp = true;
        this.getLocalIp();
      }
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
      const parsedPort = this.parseListenPort(this.editingServer.listen);
      this.formData = {
        name: this.editingServer.name,
        listen: parsedPort ? [String(parsedPort)] : ['80'],
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
      this.listenPort = parsedPort || 80;
      this.domainValues = [...(this.formData.domains || [])];
      this.indexFile = (this.formData.index || ['index.html'])[0] || 'index.html';
      this.initScenarioFromFormData();
    } else if (this.duplicateSourceServer) {
      const parsedPort = this.parseListenPort(this.duplicateSourceServer.listen);
      this.formData = {
        name: this.makeCopyName(this.duplicateSourceServer.name),
        listen: parsedPort ? [String(parsedPort)] : [],
        domains: [...(this.duplicateSourceServer.domains || ['127.0.0.1'])],
        root: this.duplicateSourceServer.root || '',
        index: [...(this.duplicateSourceServer.index?.length ? this.duplicateSourceServer.index : ['index.html'])],
        locations: this.duplicateSourceServer.locations.map((l) => ({ ...l })),
        ssl: this.duplicateSourceServer.ssl,
        protocol: this.duplicateSourceServer.ssl ? 'https' : 'http',
        enabled: this.duplicateSourceServer.enabled,
        sslCert: this.duplicateSourceServer.sslCert || '',
        sslKey: this.duplicateSourceServer.sslKey || '',
        extraConfig: this.duplicateSourceServer.extraConfig || '',
      };
      this.listenPort = parsedPort;
      this.domainValues = [...(this.formData.domains || [])];
      this.indexFile = (this.formData.index || ['index.html'])[0] || 'index.html';
      this.initScenarioFromFormData();
    } else {
      this.formData = {
        name: '',
        listen: ['80'],
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
      this.listenPort = 80;
      this.domainValues = ['127.0.0.1'];
      this.indexFile = 'index.html';
      this.frontendServiceType = 'web';
      this.frontendStaticRoot = '';
      this.frontendWebService = '';
      this.apiProxies = [];
    }
  }

  private makeCopyName(name: string): string {
    const base = String(name || '').trim();
    if (!base) {
      return 'server-copy';
    }
    return `${base}-copy`;
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

  onFrontendServiceTypeChange(next: FrontendServiceType): void {
    this.frontendServiceType = next;
    if (next === 'static') {
      this.frontendWebService = '';
      this.frontendStaticRoot = this.frontendStaticRoot || String(this.formData.root || '').trim();
      if (!this.indexFile) {
        this.indexFile = 'index.html';
      }
    } else {
      this.frontendStaticRoot = '';
      this.indexFile = 'index.html';
    }
  }

  async getLocalIp(): Promise<void> {
    try {
      const res = await this.nginxService.getLocalIp();
      if (res.success && res.ip) {
        this.localIp = res.ip;
        if (!this.commonDomainOptions.includes(res.ip)) {
          this.commonDomainOptions = [...this.commonDomainOptions, res.ip];
        }
        const currentDomains = this.domainValues || [];
        if (!currentDomains.includes(res.ip)) {
          this.domainValues = [...currentDomains, res.ip];
          this.syncDomains();
        }
      }
    } catch {
      // 静默失败
    }
  }

  addApiProxy(): void {
    this.apiProxies = [...this.apiProxies, { pathPrefix: '/api', backendService: '', isWebSocket: false }];
  }

  removeApiProxy(index: number): void {
    const list = [...this.apiProxies];
    list.splice(index, 1);
    this.apiProxies = list;
  }

  previewConfig(): void {
    this.syncListen();
    this.syncDomains();
    this.syncScenarioToFormData();
    const request = this.toComparableRequestFromForm();
    this.previewContent.set(this.generatePreviewConfig(request));
    this.previewVisible.set(true);
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
    const invalidDomains = this.getInvalidDomains(this.formData.domains);
    if (invalidDomains.length) {
      this.message.warning(`域名格式无效: ${invalidDomains.join(', ')}`);
      return;
    }

    this.syncListen();
    if (!this.formData.listen.length) {
      this.message.warning('请填写监听端口');
      return;
    }

    if (this.frontendServiceType === 'static') {
      const root = String(this.frontendStaticRoot || '').trim();
      if (!root) {
        this.message.warning('选择“静态文件目录”时，请填写前端静态目录');
        return;
      }
      if (!this.isValidFilePath(root)) {
        this.message.warning('前端静态目录路径格式无效，请填写绝对路径');
        return;
      }
    } else {
      const web = String(this.frontendWebService || '').trim();
      if (!web) {
        this.message.warning('选择“Web服务地址”时，请填写前端服务地址');
        return;
      }
      if (!this.isValidHttpUrl(web)) {
        this.message.warning('前端服务地址无效，请填写 http:// 或 https:// 开头的完整地址');
        return;
      }
    }

    for (let i = 0; i < this.apiProxies.length; i++) {
      const proxy = this.apiProxies[i];
      const prefix = this.normalizeApiPathPrefix(proxy.pathPrefix);
      proxy.pathPrefix = prefix;
      const backend = String(proxy.backendService || '').trim();
      if (backend && !this.isValidHttpUrl(backend)) {
        this.message.warning(`第 ${i + 1} 个 API 代理的后端服务地址无效，请填写 http:// 或 https:// 开头的完整地址`);
        return;
      }
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
      if (!this.isValidFilePath(this.formData.sslCert)) {
        this.message.warning('SSL 证书路径格式无效，请填写绝对路径');
        return;
      }
      if (!this.isValidFilePath(this.formData.sslKey)) {
        this.message.warning('SSL 私钥路径格式无效，请填写绝对路径');
        return;
      }
      const sslValidated = await this.validateSslReadable();
      if (!sslValidated) {
        return;
      }
    }

    this.syncScenarioToFormData();
    const changedConfirmed = await this.confirmDiffBeforeSave();
    if (!changedConfirmed) {
      return;
    }
    const hasPortConflict = await this.detectPortConflict();
    if (hasPortConflict) {
      return;
    }
    const validated = await this.validateBeforeSave();
    if (!validated) {
      return;
    }

    this.saving.set(true);
    try {
      const isEditMode = this.mode === 'edit' && Boolean(this.editingServer);
      let res: any;
      if (isEditMode && this.editingServer) {
        res = await this.nginxService.updateServer(this.editingServer.id, this.formData);
      } else {
        res = await this.nginxService.createServer(this.formData);
      }

      if (res.success) {
        this.message.success(isEditMode ? 'Server 已更新，请点击“重载”使变更生效' : 'Server 已创建，请点击“重载”使变更生效');
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

  async runConfigTest(): Promise<void> {
    this.syncListen();
    this.syncDomains();
    this.syncScenarioToFormData();
    await this.validateBeforeSave(true);
  }

  private syncListen(): void {
    if (this.listenPort === null || this.listenPort === undefined) {
      this.formData.listen = [];
      return;
    }
    const port = Math.floor(this.listenPort);
    if (port < 1 || port > 65535) {
      this.message.warning(`监听端口 ${this.listenPort} 无效，请输入 1-65535 的整数`);
      this.formData.listen = [];
      return;
    }
    this.formData.listen = [String(port)];
  }

  private parseListenPort(listenValues?: string[]): number | null {
    if (!listenValues || listenValues.length === 0) {
      return null;
    }
    for (const item of listenValues) {
      const match = String(item || '').match(/\d+/);
      if (!match) {
        continue;
      }
      const parsed = Number(match[0]);
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535) {
        return parsed;
      }
    }
    return null;
  }

  private initScenarioFromFormData(): void {
    const locations = [...(this.formData.locations || [])];
    const rootLocation = locations.find(loc => String(loc.path || '').trim() === '/');

    if (rootLocation?.proxyPass) {
      this.frontendServiceType = 'web';
      this.frontendWebService = String(rootLocation.proxyPass || '').trim();
      this.frontendStaticRoot = '';
    } else {
      this.frontendServiceType = 'static';
      this.frontendStaticRoot = String(rootLocation?.root || this.formData.root || '').trim();
      this.frontendWebService = '';
      const indexArr = rootLocation?.index?.length ? rootLocation.index : (this.formData.index || []);
      this.indexFile = indexArr[0] || 'index.html';
    }

    const apiLocations = locations.filter(loc => {
      const path = String(loc.path || '').trim();
      return !!path && path !== '/' && Boolean(loc.proxyPass);
    });

    if (apiLocations.length > 0) {
      this.apiProxies = apiLocations.map(loc => ({
        pathPrefix: this.normalizeApiPathPrefix(String(loc.path || '/api')),
        backendService: String(loc.proxyPass || '').trim(),
        isWebSocket: false,
      }));
    } else {
      this.apiProxies = [];
    }
  }

  private syncScenarioToFormData(): void {
    const locations: NginxLocation[] = [];
    const staticRoot = String(this.frontendStaticRoot || '').trim();
    const webService = String(this.frontendWebService || '').trim();

    if (this.frontendServiceType === 'static') {
      this.formData.root = staticRoot;
      this.formData.index = this.indexFile ? [this.indexFile] : [];
    } else {
      this.formData.root = '';
      this.formData.index = [];
      if (webService) {
        locations.push({
          path: '/',
          proxyPass: webService,
        });
      }
    }

    if (this.apiProxies.length > 0) {
      for (const proxy of this.apiProxies) {
        const normalizedPath = this.normalizeApiPathPrefix(proxy.pathPrefix);
        const backend = String(proxy.backendService || '').trim();
        if (normalizedPath && backend) {
          const wsRawConfig = proxy.isWebSocket
            ? [
                'proxy_http_version 1.1;',
                'proxy_set_header Upgrade $http_upgrade;',
                'proxy_set_header Connection "upgrade";',
              ].join('\n')
            : undefined;
          locations.push({
            path: normalizedPath,
            proxyPass: backend,
            rawConfig: wsRawConfig,
          });
        }
      }
    }

    this.formData.locations = locations;
  }

  private normalizeApiPathPrefix(raw: string): string {
    let next = String(raw || '').trim();
    if (!next) {
      return '/api';
    }
    if (!next.startsWith('/')) {
      next = `/${next}`;
    }
    return next;
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

  private getInvalidDomains(domains: string[]): string[] {
    return (domains || []).filter(domain => !this.isValidDomain(domain));
  }

  private isValidDomain(domain: string): boolean {
    const text = String(domain || '').trim();
    if (!text) {
      return false;
    }
    if (text === '_' || text === '*' || text === 'localhost') {
      return true;
    }
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(text)) {
      return text.split('.').every(part => Number(part) >= 0 && Number(part) <= 255);
    }
    const domainPattern = /^(?=.{1,253}$)(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/;
    return domainPattern.test(text);
  }

  private isValidFilePath(path: string): boolean {
    const text = String(path || '').trim();
    if (!text) {
      return false;
    }
    if (/^[a-zA-Z]:\\/.test(text)) {
      return true;
    }
    if (text.startsWith('/')) {
      return true;
    }
    return false;
  }

  private isValidHttpUrl(value: string): boolean {
    const text = String(value || '').trim();
    if (!text) {
      return false;
    }
    try {
      const url = new URL(text);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private async validateSslReadable(): Promise<boolean> {
    try {
      const certPath = String(this.formData.sslCert || '').trim();
      const keyPath = String(this.formData.sslKey || '').trim();
      const res = await this.nginxService.validateSslPaths(certPath, keyPath);
      if (!res.success) {
        this.message.warning(res.error || 'SSL 文件校验失败');
        return false;
      }
      if (!res.valid) {
        if (!res.cert?.exists) {
          this.message.warning(`SSL 证书不存在: ${certPath}`);
        } else if (!res.cert?.readable) {
          this.message.warning(`SSL 证书不可读: ${certPath}`);
        }
        if (!res.key?.exists) {
          this.message.warning(`SSL 私钥不存在: ${keyPath}`);
        } else if (!res.key?.readable) {
          this.message.warning(`SSL 私钥不可读: ${keyPath}`);
        }
        return false;
      }
      return true;
    } catch (err: any) {
      this.message.warning('SSL 文件校验失败: ' + this.extractErrorMessage(err));
      return false;
    }
  }

  private async detectPortConflict(): Promise<boolean> {
    try {
      const res = await this.nginxService.getServers();
      if (!res.success || !res.servers?.length) {
        return false;
      }

      const currentServerId = this.mode === 'edit' ? this.editingServer?.id : null;
      const targetPorts = new Set((this.formData.listen || []).map(item => String(item).trim()).filter(Boolean));
      if (!targetPorts.size) {
        return false;
      }

      const conflictServer = res.servers.find(server => {
        if (!server.enabled) {
          return false;
        }
        if (currentServerId && server.id === currentServerId) {
          return false;
        }
        const listenPorts = new Set((server.listen || []).map(item => this.extractListenPort(item)).filter(Boolean));
        for (const port of targetPorts) {
          if (listenPorts.has(port)) {
            return true;
          }
        }
        return false;
      });

      if (conflictServer) {
        this.message.warning(`检测到端口可能冲突：${conflictServer.name}`);
        return true;
      }
      return false;
    } catch (err: any) {
      this.message.warning('端口冲突校验失败，已阻止保存: ' + this.extractErrorMessage(err));
      return true;
    }
  }

  private extractListenPort(listen: string): string {
    const matched = String(listen || '').match(/(\d{1,5})/);
    if (!matched) {
      return '';
    }
    return String(Number(matched[1]));
  }

  private async validateBeforeSave(isManual: boolean = false): Promise<boolean> {
    this.validatingConfig.set(true);
    try {
      const res = await this.nginxService.validateConfig();
      if (res.valid) {
        if (isManual) {
          this.message.success('配置检测通过');
        }
        return true;
      }
      this.message.error('配置检测失败，请先修复全局配置错误后再保存');
      (res.errors || []).slice(0, 3).forEach(item => this.message.error(item));
      return false;
    } catch (err: any) {
      this.message.error('配置检测失败: ' + this.extractErrorMessage(err));
      return false;
    } finally {
      this.validatingConfig.set(false);
    }
  }

  private async confirmDiffBeforeSave(): Promise<boolean> {
    if (this.mode !== 'edit' || !this.editingServer) {
      return true;
    }

    const previous = this.toComparableRequestFromServer(this.editingServer);
    const current = this.toComparableRequestFromForm();
    const diffs = this.buildDiffRows(previous, current);

    if (!diffs.length) {
      this.message.info('未检测到配置变更');
      return false;
    }

    const preview = diffs.slice(0, 12);
    const content = this.renderDiffHtml(preview, diffs.length - preview.length);

    return await new Promise<boolean>(resolve => {
      this.modal.confirm({
        nzTitle: '确认保存以下变更',
        nzContent: content,
        nzWidth: 860,
        nzOkText: '确认保存',
        nzCancelText: '取消',
        nzOnOk: () => resolve(true),
        nzOnCancel: () => resolve(false),
      });
    });
  }

  private toComparableRequestFromServer(server: NginxServer): CreateNginxServerRequest {
    return {
      name: String(server.name || '').trim(),
      listen: this.normalizeStringArray(server.listen || []),
      domains: this.normalizeStringArray(server.domains || []),
      root: String(server.root || '').trim(),
      index: this.normalizeStringArray(server.index || []),
      locations: this.normalizeLocationsForCompare(server.locations || []),
      ssl: Boolean(server.ssl),
      protocol: server.ssl ? 'https' : 'http',
      sslCert: String(server.sslCert || '').trim(),
      sslKey: String(server.sslKey || '').trim(),
      enabled: Boolean(server.enabled),
      extraConfig: String(server.extraConfig || '').trim(),
    };
  }

  private toComparableRequestFromForm(): CreateNginxServerRequest {
    return {
      name: String(this.formData.name || '').trim(),
      listen: this.normalizeStringArray(this.formData.listen || []),
      domains: this.normalizeStringArray(this.formData.domains || []),
      root: String(this.formData.root || '').trim(),
      index: this.normalizeStringArray(this.formData.index || []),
      locations: this.normalizeLocationsForCompare(this.formData.locations || []),
      ssl: this.formData.protocol === 'https',
      protocol: this.formData.protocol === 'https' ? 'https' : 'http',
      sslCert: String(this.formData.sslCert || '').trim(),
      sslKey: String(this.formData.sslKey || '').trim(),
      enabled: this.formData.enabled !== false,
      extraConfig: String(this.formData.extraConfig || '').trim(),
    };
  }

  private buildDiffRows(a: CreateNginxServerRequest, b: CreateNginxServerRequest): ServerDiffRow[] {
    const diffs: ServerDiffRow[] = [];
    this.pushDiff(diffs, '名称', a.name, b.name);
    this.pushDiff(diffs, '监听端口', (a.listen || []).join(', '), (b.listen || []).join(', '));
    this.pushDiff(diffs, '域名', (a.domains || []).join(', '), (b.domains || []).join(', '));
    this.pushDiff(diffs, '根目录', a.root || '', b.root || '');
    this.pushDiff(diffs, '默认首页', (a.index || []).join(', '), (b.index || []).join(', '));
    this.pushDiff(diffs, '协议', a.protocol || '', b.protocol || '');
    this.pushDiff(diffs, 'SSL证书', a.sslCert || '', b.sslCert || '');
    this.pushDiff(diffs, 'SSL私钥', a.sslKey || '', b.sslKey || '');
    this.pushDiff(diffs, '启用状态', String(Boolean(a.enabled)), String(Boolean(b.enabled)));
    this.pushDiff(diffs, '自定义配置', a.extraConfig || '', b.extraConfig || '');
    this.pushDiff(
      diffs,
      'Location 规则',
      this.serializeLocations(a.locations || []),
      this.serializeLocations(b.locations || [])
    );
    return diffs;
  }

  private pushDiff(lines: ServerDiffRow[], label: string, oldValue: string, newValue: string): void {
    const left = String(oldValue || '').trim();
    const right = String(newValue || '').trim();
    if (left === right) {
      return;
    }
    lines.push({
      label,
      before: left || '空',
      after: right || '空',
    });
  }

  private normalizeStringArray(list: string[]): string[] {
    return Array.from(new Set(
      (list || []).map(item => String(item || '').trim()).filter(Boolean)
    )).sort((x, y) => x.localeCompare(y, 'zh-CN'));
  }

  private normalizeLocationsForCompare(list: NginxLocation[]): NginxLocation[] {
    return (list || []).map(item => ({
      path: String(item.path || '').trim(),
      proxyPass: String(item.proxyPass || '').trim() || undefined,
      root: String(item.root || '').trim() || undefined,
      index: this.normalizeStringArray(item.index || []),
      tryFiles: this.normalizeStringArray(item.tryFiles || []),
      rawConfig: String(item.rawConfig || '').trim() || undefined,
    }));
  }

  private serializeLocations(list: NginxLocation[]): string {
    const lines = (list || [])
      .map(item => {
        const path = String(item.path || '/').trim() || '/';
        const proxy = String(item.proxyPass || '').trim();
        const root = String(item.root || '').trim();
        const index = (item.index || []).join(', ');
        const tryFiles = (item.tryFiles || []).join(' ');
        const raw = String(item.rawConfig || '').trim();
        const wsEnabled =
          /proxy_set_header\s+upgrade\s+\$http_upgrade/i.test(raw) ||
          /proxy_set_header\s+connection\s+"?upgrade"?/i.test(raw);
        const parts = [
          `path=${path}`,
          proxy ? `proxy=${proxy}` : '',
          root ? `root=${root}` : '',
          index ? `index=${index}` : '',
          tryFiles ? `try_files=${tryFiles}` : '',
          wsEnabled ? 'ws=on' : 'ws=off',
          raw ? `raw=${raw.replace(/\s+/g, ' ')}` : '',
        ].filter(Boolean);
        return parts.join(' | ');
      })
      .sort((x, y) => x.localeCompare(y, 'zh-CN'));
    return lines.join('\n');
  }

  private generatePreviewConfig(request: CreateNginxServerRequest): string {
    const lines: string[] = ['server {'];
    const listenValues = this.normalizeStringArray(request.listen || []);
    const domainValues = this.normalizeStringArray(request.domains || []);
    const indexValues = this.normalizeStringArray(request.index || []);
    const ssl = request.protocol === 'https' || request.ssl === true;

    lines.push(`    # ngm-name: ${request.name || 'unnamed'}`);
    listenValues.forEach(item => {
      const normalized = String(item || '').trim();
      if (!normalized) {
        return;
      }
      if (ssl && normalized === '443') {
        lines.push(`    listen ${normalized} ssl;`);
      } else {
        lines.push(`    listen ${normalized};`);
      }
    });
    lines.push(`    server_name ${(domainValues.length ? domainValues : ['_']).join(' ')};`);

    if (request.root) {
      lines.push(`    root ${request.root};`);
    }
    if (indexValues.length) {
      lines.push(`    index ${indexValues.join(' ')};`);
    }

    if (ssl) {
      lines.push('');
      lines.push('    # SSL 配置');
      lines.push(`    ssl_certificate ${request.sslCert || '/path/to/cert.pem'};`);
      lines.push(`    ssl_certificate_key ${request.sslKey || '/path/to/key.pem'};`);
    }

    (request.locations || []).forEach(loc => {
      const normalizedPath = String(loc.path || '/').trim() || '/';
      const proxyPass = String(loc.proxyPass || '').trim();
      const rawLines = String(loc.rawConfig || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
      const rawSet = new Set(rawLines.map(line => line.replace(/\s+/g, ' ')));
      const isWsProxy = rawLines.some(line => /upgrade\s+\$http_upgrade/i.test(line));

      lines.push('');
      lines.push(`    location ${normalizedPath} {`);
        if (proxyPass) {
          lines.push(`        proxy_pass ${proxyPass};`);
          const defaultProxyLines = [
            'proxy_set_header Host $host;',
            'proxy_set_header X-Real-IP $remote_addr;',
            'proxy_set_header REMOTE-HOST $remote_addr;',
            'proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
            'proxy_set_header X-Forwarded-Proto $scheme;',
            'proxy_set_header X-Forwarded-Host $host;',
            'proxy_set_header X-Forwarded-Port $server_port;',
          ];
          for (const directive of defaultProxyLines) {
            if (!rawSet.has(directive)) {
              lines.push(`        ${directive}`);
            }
          }
          if (isWsProxy) {
            const wsLines = [
              'proxy_http_version 1.1;',
              'proxy_set_header Upgrade $http_upgrade;',
              'proxy_set_header Connection "upgrade";',
            ];
            for (const directive of wsLines) {
              if (!rawSet.has(directive)) {
                lines.push(`        ${directive}`);
              }
            }
          }
        }
        if (loc.root) {
          lines.push(`        root ${loc.root};`);
        }
        if (loc.index?.length) {
          lines.push(`        index ${loc.index.join(' ')};`);
        }
        if (loc.tryFiles?.length) {
          lines.push(`        try_files ${loc.tryFiles.join(' ')};`);
        }
        if (rawLines.length) {
          rawLines.forEach(item => {
            lines.push(`        ${item.endsWith(';') ? item : `${item};`}`);
          });
        }
        lines.push('    }');
    });

    if (request.extraConfig) {
      lines.push('');
      request.extraConfig
        .split(/\r?\n/)
        .map(item => item.trimEnd())
        .filter(Boolean)
        .forEach(item => {
          lines.push(`    ${item}`);
        });
    }

    lines.push('}');
    return lines.join('\n');
  }

  private renderDiffHtml(rows: ServerDiffRow[], hiddenCount: number): string {
    const body = rows.map(row => {
      const beforeContent = this.formatDiffValue(row.before);
      const afterContent = this.formatDiffValue(row.after);
      return `<tr>
        <td style="padding:8px 10px;border:1px solid #f0f0f0;vertical-align:top;font-weight:600;min-width:110px;">${this.escapeHtml(row.label)}</td>
        <td style="padding:8px 10px;border:1px solid #f0f0f0;vertical-align:top;white-space:pre-wrap;word-break:break-word;max-width:360px;color:#595959;background:#fff7f7;">${beforeContent}</td>
        <td style="padding:8px 10px;border:1px solid #f0f0f0;vertical-align:top;white-space:pre-wrap;word-break:break-word;max-width:360px;color:#262626;background:#f6ffed;">${afterContent}</td>
      </tr>`;
    }).join('');

    const extraText = hiddenCount > 0
      ? `<div style="margin-top:8px;color:#8c8c8c;font-size:12px;">还有 ${hiddenCount} 项变更未展开</div>`
      : '';

    return `
      <div style="max-height:460px;overflow:auto;">
        <div style="margin-bottom:10px;padding:8px 10px;background:#f6ffed;border:1px solid #b7eb8f;border-radius:6px;color:#237804;">
          检测到 ${rows.length} 项配置变更
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr>
              <th style="padding:8px 10px;border:1px solid #f0f0f0;background:#fafafa;text-align:left;">字段</th>
              <th style="padding:8px 10px;border:1px solid #f0f0f0;background:#fff1f0;text-align:left;">原值</th>
              <th style="padding:8px 10px;border:1px solid #f0f0f0;background:#f6ffed;text-align:left;">新值</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
        ${extraText}
      </div>
    `;
  }

  private formatDiffValue(value: string): string {
    const text = String(value || '');
    const normalized = text.length > 300 ? `${text.slice(0, 300)} ...` : text;
    return this.escapeHtml(normalized).replace(/\n/g, '<br/>');
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
