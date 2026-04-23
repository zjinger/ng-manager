import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { NginxService } from '../../services/nginx.service';
import { NginxServerDrawerComponent } from '../nginx-server-drawer/nginx-server-drawer.component';
import type { NginxServer } from '../../models/nginx.types';
import type { CreateNginxServerRequest, NginxLocation } from '../../models/nginx.types';

interface ImportCandidate {
  id: string;
  selected: boolean;
  request?: CreateNginxServerRequest;
  error?: string;
  issues?: Array<{ level: 'error' | 'warning'; message: string; field?: 'name' | 'domains' | 'listen' }>;
}
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
    NzCheckboxModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzSpinModule,
    NzTooltipModule,
    NzSwitchModule,
    NzPopconfirmModule,
    NginxServerDrawerComponent,
  ],
  templateUrl: './nginx-server-list.component.html',
  styleUrls: ['./nginx-server-list.component.less'],
})
export class NginxServerListComponent implements OnInit, OnChanges, OnDestroy {
  @Input() showToolbar = true;
  @Input() nginxRunning: boolean | null = null;
  @Input() openCreateToken = 0;
  @Output() summaryChange = new EventEmitter<{ total: number; enabled: number }>();
  @Output() serverListMutated = new EventEmitter<void>();

  private nginxService = inject(NginxService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);

  servers = signal<NginxServer[]>([]);
  loading = signal(false);
  selectedServerIds = signal<Set<string>>(new Set<string>());

  keyword = '';
  runtimeFilter: 'all' | 'running' | 'stopped' | 'disabled' = 'all';
  sortField: 'name' | 'enabled' | 'ports' | 'runtime' = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';

  drawerVisible = false;
  editingServer = signal<NginxServer | null>(null);
  duplicateSourceServer = signal<NginxServer | null>(null);
  drawerMode = signal<'create' | 'edit' | 'copy'>('create');

  configModalVisible = false;
  viewingConfig = signal('');
  importModalVisible = false;
  importText = signal('');
  importing = signal(false);
  importCandidates = signal<ImportCandidate[]>([]);
  readonly skeletonRows = [1, 2, 3, 4, 5];
  undoVisible = signal(false);
  undoText = signal('');
  private undoHandler: (() => Promise<void>) | null = null;
  private undoTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    this.loadServers();
  }

  ngOnDestroy(): void {
    this.clearUndoState();
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
        this.reconcileSelection(res.servers);
        this.emitSummary(res.servers);
      }
    } catch (err: any) {
      this.message.error('加载失败: ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }

  openDrawer(server: NginxServer | null): void {
    this.duplicateSourceServer.set(null);
    this.editingServer.set(server);
    this.drawerMode.set(server ? 'edit' : 'create');
    this.drawerVisible = true;
  }

  openCopyDrawer(server: NginxServer): void {
    this.editingServer.set(null);
    this.duplicateSourceServer.set(server);
    this.drawerMode.set('copy');
    this.drawerVisible = true;
  }

  onDrawerVisibleChange(visible: boolean): void {
    this.drawerVisible = visible;
    if (!visible) {
      this.editingServer.set(null);
      this.duplicateSourceServer.set(null);
      this.drawerMode.set('create');
    }
  }

  onSaved(): void {
    this.loadServers();
    this.serverListMutated.emit();
  }

  importServer(): void {
    this.importText.set('');
    this.importCandidates.set([]);
    this.importModalVisible = true;
  }

  closeImportModal(): void {
    this.importModalVisible = false;
  }

  async readFromClipboard(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      this.importText.set(String(text || '').trim());
      this.refreshImportCandidates();
      this.message.success('已读取剪贴板内容');
    } catch {
      this.message.warning('读取剪贴板失败，请手动粘贴');
    }
  }

  async onImportFileChange(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      this.importText.set(String(text || '').trim());
      this.refreshImportCandidates();
      this.message.success(`已载入文件：${file.name}`);
    } catch {
      this.message.error('读取文件失败');
    } finally {
      target.value = '';
    }
  }

  async submitImport(): Promise<void> {
    if (!this.importCandidates().length) {
      this.refreshImportCandidates();
    }
    const selected = this.importCandidates().filter(item => item.selected && item.request);
    if (!selected.length) {
      this.message.warning('请至少选择一条可导入项');
      return;
    }
    const blocked = selected.filter(item => this.isImportCandidateBlocked(item));
    if (blocked.length) {
      this.message.warning(`有 ${blocked.length} 条存在冲突，请先修复后再导入`);
      const firstBlocked = blocked[0];
      const firstIssue = (firstBlocked.issues || []).find(issue => issue.level === 'error' && issue.field);
      if (firstIssue?.field) {
        this.focusImportField(firstBlocked.id, firstIssue.field);
      }
      return;
    }

    this.importing.set(true);
    const errors: string[] = [];
    let success = 0;
    for (const item of selected) {
      const request = item.request!;
      try {
        const res = await this.nginxService.createServer(request);
        if (res.success) {
          success += 1;
        } else {
          errors.push(res.error || `导入失败（${request.name}）`);
        }
      } catch (err: any) {
        errors.push(err?.message || `导入失败（${request.name}）`);
      }
    }

    this.importing.set(false);
    if (success > 0) {
      this.message.success(`导入成功 ${success} 项`);
      await this.loadServers();
      this.serverListMutated.emit();
    }
    if (errors.length) {
      this.message.warning(`导入异常 ${errors.length} 项：${errors[0]}`);
    }
    if (success > 0) {
      this.importModalVisible = false;
      this.importText.set('');
      this.importCandidates.set([]);
    }
  }

  onImportTextChange(value: string): void {
    this.importText.set(value);
    this.refreshImportCandidates();
  }

  get importTotalCount(): number {
    return this.importCandidates().length;
  }

  get importValidCount(): number {
    return this.importCandidates().filter(item => Boolean(item.request)).length;
  }

  get importSelectedCount(): number {
    return this.importCandidates().filter(item => item.selected && Boolean(item.request)).length;
  }

  get allImportSelectableSelected(): boolean {
    const candidates = this.importCandidates();
    const selectable = candidates.filter(item => Boolean(item.request));
    return selectable.length > 0 && selectable.every(item => item.selected);
  }

  get someImportSelectableSelected(): boolean {
    const candidates = this.importCandidates();
    const selectable = candidates.filter(item => Boolean(item.request));
    if (!selectable.length) {
      return false;
    }
    const selected = selectable.filter(item => item.selected).length;
    return selected > 0 && selected < selectable.length;
  }

  toggleSelectAllImport(checked: boolean): void {
    this.importCandidates.update(list => list.map(item => (
      item.request ? { ...item, selected: checked } : item
    )));
  }

  toggleSelectImport(id: string, checked: boolean): void {
    this.importCandidates.update(list => list.map(item => (
      item.id === id ? { ...item, selected: checked } : item
    )));
  }

  updateImportCandidateName(id: string, value: string): void {
    const nextName = String(value || '').trim();
    this.importCandidates.update(list => list.map(item => {
      if (item.id !== id || !item.request) {
        return item;
      }
      return {
        ...item,
        request: {
          ...item.request,
          name: nextName || item.request.name,
        },
      };
    }));
    this.recalculateImportConflicts();
  }

  getImportCandidateDomainsText(item: ImportCandidate): string {
    return (item.request?.domains || []).join(', ');
  }

  updateImportCandidateDomains(id: string, value: string): void {
    const domains = this.normalizeTagInput(value, ['127.0.0.1']);
    this.importCandidates.update(list => list.map(item => {
      if (item.id !== id || !item.request) {
        return item;
      }
      return {
        ...item,
        request: {
          ...item.request,
          domains,
        },
      };
    }));
    this.recalculateImportConflicts();
  }

  getImportCandidateListenText(item: ImportCandidate): string {
    return (item.request?.listen || []).join(', ');
  }

  updateImportCandidateListen(id: string, value: string): void {
    const listen = this.normalizeListenInput(value);
    this.importCandidates.update(list => list.map(item => {
      if (item.id !== id || !item.request) {
        return item;
      }
      return {
        ...item,
        request: {
          ...item.request,
          listen,
        },
      };
    }));
    this.recalculateImportConflicts();
  }

  getImportCandidateIssues(item: ImportCandidate): Array<{ level: 'error' | 'warning'; message: string; field?: 'name' | 'domains' | 'listen' }> {
    return item.issues || [];
  }

  isImportCandidateBlocked(item: ImportCandidate): boolean {
    if (!item.request) {
      return true;
    }
    return (item.issues || []).some(issue => issue.level === 'error');
  }

  focusImportField(candidateId: string, field: 'name' | 'domains' | 'listen'): void {
    const selector = `input[data-import-id="${candidateId}"][data-field="${field}"]`;
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(selector);
      if (!input) {
        return;
      }
      input.focus();
      input.select();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }

  private refreshImportCandidates(): void {
    const source = this.importText().trim();
    if (!source) {
      this.importCandidates.set([]);
      return;
    }

    const blocks = this.extractServerBlocks(source);
    const parsed = blocks.map((block, index) => {
      const request = this.parseServerBlockToRequest(block);
      return {
        id: `candidate-${index}`,
        selected: Boolean(request),
        request,
        error: request ? undefined : '解析失败：未识别为标准 server 块',
        issues: [],
      } as ImportCandidate;
    });

    this.importCandidates.set(parsed);
    this.recalculateImportConflicts();
  }

  private recalculateImportConflicts(): void {
    const currentServers = this.servers();
    const existingNameSet = new Set(
      currentServers.map(server => String(server.name || '').trim().toLowerCase()).filter(Boolean)
    );
    const existingEnabledPorts = new Set<number>();
    currentServers
      .filter(server => server.enabled)
      .forEach(server => {
        this.extractPorts(server.listen || []).forEach(port => existingEnabledPorts.add(port));
      });

    const candidates = this.importCandidates();
    const nameCounts = new Map<string, number>();
    const portCounts = new Map<number, number>();

    candidates.forEach(item => {
      if (!item.request) {
        return;
      }
      const nameKey = String(item.request.name || '').trim().toLowerCase();
      if (nameKey) {
        nameCounts.set(nameKey, (nameCounts.get(nameKey) || 0) + 1);
      }
      const enabled = item.request.enabled !== false;
      if (!enabled) {
        return;
      }
      const ports = (item.request.listen || [])
        .map(value => Number(value))
        .filter(port => Number.isInteger(port) && port >= 1 && port <= 65535);
      ports.forEach(port => {
        portCounts.set(port, (portCounts.get(port) || 0) + 1);
      });
    });

    this.importCandidates.update(list => list.map(item => {
      if (!item.request) {
        return item;
      }
      const issues: Array<{ level: 'error' | 'warning'; message: string; field?: 'name' | 'domains' | 'listen' }> = [];
      const request = item.request;
      const nameKey = String(request.name || '').trim().toLowerCase();
      if (!nameKey) {
        issues.push({ level: 'error', message: '名称不能为空', field: 'name' });
      } else {
        if (existingNameSet.has(nameKey)) {
          issues.push({ level: 'error', message: `名称冲突：${request.name}`, field: 'name' });
        }
        if ((nameCounts.get(nameKey) || 0) > 1) {
          issues.push({ level: 'error', message: `导入批次内名称重复：${request.name}`, field: 'name' });
        }
      }

      const ports = (request.listen || [])
        .map(value => Number(value))
        .filter(port => Number.isInteger(port) && port >= 1 && port <= 65535);
      if (!ports.length) {
        issues.push({ level: 'error', message: '监听端口无效', field: 'listen' });
      }
      if (request.enabled !== false) {
        ports.forEach(port => {
          if (existingEnabledPorts.has(port)) {
            issues.push({ level: 'error', message: `端口冲突：${port} 已被现有启用 Server 使用`, field: 'listen' });
          }
          if ((portCounts.get(port) || 0) > 1) {
            issues.push({ level: 'error', message: `导入批次内端口重复：${port}`, field: 'listen' });
          }
        });
      }

      if (!(request.domains || []).length) {
        issues.push({ level: 'warning', message: '域名为空，将使用默认域名', field: 'domains' });
      }

      return {
        ...item,
        issues,
        selected: issues.some(issue => issue.level === 'error') ? false : item.selected,
      };
    }));
  }

  private normalizeTagInput(raw: string, fallback: string[] = []): string[] {
    const values = String(raw || '')
      .split(/[,\s]+/)
      .map(item => item.trim())
      .filter(Boolean);
    const unique = Array.from(new Set(values));
    return unique.length ? unique : [...fallback];
  }

  private normalizeListenInput(raw: string): string[] {
    const ports = this.normalizeTagInput(raw);
    const valid = ports
      .map(item => Number(item))
      .filter(port => Number.isInteger(port) && port >= 1 && port <= 65535)
      .map(port => String(port));
    const unique = Array.from(new Set(valid));
    return unique.length ? unique : ['80'];
  }

  get renderedServers(): NginxServer[] {
    const list = [...this.servers()];
    const keyword = this.keyword.trim().toLowerCase();
    const keywordFiltered = keyword
      ? list.filter(server => {
          const haystacks = [
            server.name || '',
            ...(server.domains || []),
            ...(server.listen || []),
          ].map(item => String(item).toLowerCase());
          return haystacks.some(item => item.includes(keyword));
        })
      : list;

    const filtered = keywordFiltered.filter(server => this.matchesRuntimeFilter(server));
    return filtered.sort((a, b) => this.compareServers(a, b));
  }

  get selectedCount(): number {
    return this.selectedServerIds().size;
  }

  get allVisibleSelected(): boolean {
    const visible = this.renderedServers;
    if (!visible.length) {
      return false;
    }
    const selected = this.selectedServerIds();
    return visible.every(server => selected.has(server.id));
  }

  get someVisibleSelected(): boolean {
    const visible = this.renderedServers;
    if (!visible.length) {
      return false;
    }
    const selected = this.selectedServerIds();
    const selectedVisibleCount = visible.filter(server => selected.has(server.id)).length;
    return selectedVisibleCount > 0 && selectedVisibleCount < visible.length;
  }

  toggleSelectAllVisible(checked: boolean): void {
    const next = new Set(this.selectedServerIds());
    const visibleIds = this.renderedServers.map(server => server.id);
    if (checked) {
      visibleIds.forEach(id => next.add(id));
    } else {
      visibleIds.forEach(id => next.delete(id));
    }
    this.selectedServerIds.set(next);
  }

  toggleSelectOne(id: string, checked: boolean): void {
    const next = new Set(this.selectedServerIds());
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.selectedServerIds.set(next);
  }

  clearSelection(): void {
    this.selectedServerIds.set(new Set<string>());
  }

  async bulkSetEnabled(enabled: boolean): Promise<void> {
    const selectedIds = Array.from(this.selectedServerIds());
    if (!selectedIds.length) {
      this.message.warning('请先选择要操作的 Server');
      return;
    }

    const previous = this.servers();
    this.applyOptimisticEnabled(selectedIds, enabled);

    const failures: string[] = [];
    await Promise.all(selectedIds.map(async id => {
      try {
        const res = enabled
          ? await this.nginxService.enableServer(id)
          : await this.nginxService.disableServer(id);
        if (!res.success) {
          failures.push(id);
        }
      } catch {
        failures.push(id);
      }
    }));

    if (failures.length) {
      this.rollbackEnabled(previous, failures);
      this.message.warning(`${failures.length} 项操作失败，已回滚`);
    } else {
      this.message.success(enabled ? '批量启用成功' : '批量禁用成功');
      this.registerUndo(
        enabled ? `已批量启用 ${selectedIds.length} 项` : `已批量禁用 ${selectedIds.length} 项`,
        async () => {
          const rollbackTo = !enabled;
          this.applyOptimisticEnabled(selectedIds, rollbackTo);
          const revertFailures: string[] = [];
          await Promise.all(selectedIds.map(async id => {
            try {
              const res = rollbackTo
                ? await this.nginxService.enableServer(id)
                : await this.nginxService.disableServer(id);
              if (!res.success) {
                revertFailures.push(id);
              }
            } catch {
              revertFailures.push(id);
            }
          }));
          if (revertFailures.length) {
            await this.loadServers();
            throw new Error(`撤销失败 ${revertFailures.length} 项`);
          }
          this.message.success('已撤销批量操作');
        }
      );
      this.serverListMutated.emit();
    }
  }

  async toggleServer(id: string, enabled: boolean): Promise<void> {
    const previous = this.servers();
    this.applyOptimisticEnabled([id], enabled);
    try {
      const res = enabled
        ? await this.nginxService.enableServer(id)
        : await this.nginxService.disableServer(id);

      if (res.success) {
        this.message.success(enabled ? '已启用' : '已禁用');
        this.registerUndo(
          enabled ? '已启用，可撤销' : '已禁用，可撤销',
          async () => {
            const rollbackTo = !enabled;
            this.applyOptimisticEnabled([id], rollbackTo);
            const undoRes = rollbackTo
              ? await this.nginxService.enableServer(id)
              : await this.nginxService.disableServer(id);
            if (!undoRes.success) {
              await this.loadServers();
              throw new Error(undoRes.error || '撤销失败');
            }
            this.message.success('已撤销操作');
          }
        );
        this.serverListMutated.emit();
      } else {
        this.rollbackEnabled(previous, [id]);
        this.message.error(res.error || '操作失败');
      }
    } catch (err: any) {
      this.rollbackEnabled(previous, [id]);
      this.message.error('操作失败: ' + err.message);
    }
  }

  copyServer(server: NginxServer): void {
    this.openCopyDrawer(server);
    this.message.info('复制 Server - 请修改后保存');
  }

  async deleteServer(server: NginxServer): Promise<void> {
    try {
      const res = await this.nginxService.deleteServer(server.id);
      if (res.success) {
        this.message.success('已删除');
        this.removeServerLocally(server.id);
        const restoreRequest = this.toCreateRequestFromServer(server);
        this.registerUndo('已删除，可撤销', async () => {
          const undoRes = await this.nginxService.createServer(restoreRequest);
          if (!undoRes.success) {
            await this.loadServers();
            throw new Error(undoRes.error || '恢复失败');
          }
          await this.loadServers();
          this.message.success('已恢复删除项');
        });
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

  getRuntimeState(server: NginxServer): { label: string; toneClass: string } {
    if (this.nginxRunning === null) {
      return { label: '未知', toneClass: 'unknown' };
    }
    if (!this.nginxRunning) {
      return { label: 'Stopped', toneClass: 'stopped' };
    }
    if (!server.enabled) {
      return { label: 'Disabled', toneClass: 'disabled' };
    }
    return { label: 'Running', toneClass: 'running' };
  }

  private buildAccessUrls(server: NginxServer): string[] {
    const scheme = server.ssl ? 'https' : 'http';
    const ports = this.extractPorts(server.listen);
    const hosts = this.extractHosts(server);
    const selectedPorts = ports.length ? ports : [server.ssl ? 443 : 80];

    if (!hosts.length) {
      return [];
    }

    const urls = new Set<string>();
    hosts.forEach(host => {
      selectedPorts.forEach(port => {
        const url = this.buildUrl(scheme, host, port);
        if (url) {
          urls.add(url);
        }
      });
    });
    return Array.from(urls.values());
  }

  private emitSummary(servers: NginxServer[]): void {
    this.summaryChange.emit({
      total: servers.length,
      enabled: servers.filter(server => server.enabled).length,
    });
  }

  private reconcileSelection(servers: NginxServer[]): void {
    const validIds = new Set(servers.map(server => server.id));
    const next = new Set<string>();
    this.selectedServerIds().forEach(id => {
      if (validIds.has(id)) {
        next.add(id);
      }
    });
    this.selectedServerIds.set(next);
  }

  private compareServers(a: NginxServer, b: NginxServer): number {
    let value = 0;
    if (this.sortField === 'enabled') {
      value = Number(a.enabled) - Number(b.enabled);
    } else if (this.sortField === 'runtime') {
      value = this.getRuntimeRank(a) - this.getRuntimeRank(b);
    } else if (this.sortField === 'ports') {
      value = this.getPrimaryPort(a) - this.getPrimaryPort(b);
    } else {
      value = String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
    }
    return this.sortOrder === 'asc' ? value : -value;
  }

  private getPrimaryPort(server: NginxServer): number {
    const ports = this.extractPorts(server.listen);
    return ports[0] ?? 0;
  }

  private matchesRuntimeFilter(server: NginxServer): boolean {
    if (this.runtimeFilter === 'all') {
      return true;
    }
    const state = this.getRuntimeState(server).toneClass;
    return state === this.runtimeFilter;
  }

  private getRuntimeRank(server: NginxServer): number {
    const state = this.getRuntimeState(server).toneClass;
    if (state === 'running') {
      return 3;
    }
    if (state === 'disabled') {
      return 2;
    }
    if (state === 'stopped') {
      return 1;
    }
    return 0;
  }

  private applyOptimisticEnabled(ids: string[], enabled: boolean): void {
    const idSet = new Set(ids);
    const updated = this.servers().map(server => (
      idSet.has(server.id) ? { ...server, enabled } : server
    ));
    this.servers.set(updated);
    this.emitSummary(updated);
  }

  private rollbackEnabled(previous: NginxServer[], ids: string[]): void {
    const rollbackMap = new Map(previous.map(server => [server.id, server.enabled]));
    const idSet = new Set(ids);
    const rolledBack = this.servers().map(server => (
      idSet.has(server.id) ? { ...server, enabled: rollbackMap.get(server.id) ?? server.enabled } : server
    ));
    this.servers.set(rolledBack);
    this.emitSummary(rolledBack);
  }

  async undoLastAction(): Promise<void> {
    const handler = this.undoHandler;
    if (!handler) {
      return;
    }
    this.clearUndoState();
    try {
      await handler();
      this.serverListMutated.emit();
    } catch (err: any) {
      this.message.error(err?.message || '撤销失败');
    }
  }

  dismissUndo(): void {
    this.clearUndoState();
  }

  private registerUndo(text: string, handler: () => Promise<void>): void {
    this.clearUndoState();
    this.undoText.set(text);
    this.undoHandler = handler;
    this.undoVisible.set(true);
    this.undoTimer = setTimeout(() => {
      this.clearUndoState();
    }, 5000);
  }

  private clearUndoState(): void {
    if (this.undoTimer) {
      clearTimeout(this.undoTimer);
      this.undoTimer = null;
    }
    this.undoHandler = null;
    this.undoVisible.set(false);
    this.undoText.set('');
  }

  private removeServerLocally(id: string): void {
    const updated = this.servers().filter(server => server.id !== id);
    this.servers.set(updated);
    this.emitSummary(updated);
    const nextSelected = new Set(this.selectedServerIds());
    nextSelected.delete(id);
    this.selectedServerIds.set(nextSelected);
  }

  private toCreateRequestFromServer(server: NginxServer): CreateNginxServerRequest {
    return {
      name: String(server.name || '').trim(),
      listen: [...(server.listen || [])],
      domains: [...(server.domains || [])],
      root: String(server.root || '').trim() || undefined,
      index: [...(server.index || [])],
      locations: (server.locations || []).map(item => ({ ...item })),
      ssl: Boolean(server.ssl),
      protocol: server.ssl ? 'https' : 'http',
      enabled: Boolean(server.enabled),
      sslCert: String(server.sslCert || '').trim() || undefined,
      sslKey: String(server.sslKey || '').trim() || undefined,
      extraConfig: String(server.extraConfig || '').trim() || undefined,
    };
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

  private extractServerBlocks(configText: string): string[] {
    const content = String(configText || '');
    const blocks: string[] = [];
    const token = /\bserver\b/g;
    let match: RegExpExecArray | null = null;

    while ((match = token.exec(content)) !== null) {
      let cursor = match.index + match[0].length;
      while (cursor < content.length && /\s/.test(content[cursor])) {
        cursor += 1;
      }
      if (content[cursor] !== '{') {
        continue;
      }
      const end = this.findBlockEnd(content, cursor);
      if (end < 0) {
        continue;
      }
      blocks.push(content.slice(match.index, end + 1));
      token.lastIndex = end + 1;
    }
    return blocks;
  }

  private findBlockEnd(content: string, openBraceIndex: number): number {
    let depth = 0;
    for (let i = openBraceIndex; i < content.length; i += 1) {
      const ch = content[i];
      if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          return i;
        }
      }
    }
    return -1;
  }

  private parseServerBlockToRequest(serverBlock: string): CreateNginxServerRequest | null {
    const openIndex = serverBlock.indexOf('{');
    const closeIndex = serverBlock.lastIndexOf('}');
    if (openIndex < 0 || closeIndex <= openIndex) {
      return null;
    }
    const body = serverBlock.slice(openIndex + 1, closeIndex);
    const topLevel = this.extractTopLevelDirectives(body);

    const listenRaw = topLevel.get('listen') || [];
    const listens = listenRaw
      .map(item => this.parseListenPort(item))
      .filter((value): value is number => value !== null)
      .map(value => String(value));
    const domains = (topLevel.get('server_name') || [])
      .flatMap(item => item.split(/\s+/))
      .map(item => item.trim())
      .filter(item => item && item !== '_');
    const root = (topLevel.get('root') || [])[0]?.trim() || '';
    const index = ((topLevel.get('index') || [])[0] || '')
      .split(/\s+/)
      .map(item => item.trim())
      .filter(Boolean);
    const sslCert = (topLevel.get('ssl_certificate') || [])[0]?.trim() || '';
    const sslKey = (topLevel.get('ssl_certificate_key') || [])[0]?.trim() || '';
    const locations = this.parseLocations(body);

    const hasSslListen = listenRaw.some(item => /\bssl\b/i.test(item));
    const ssl = Boolean(sslCert && sslKey) || hasSslListen;
    const name = domains[0] || `imported-server-${Date.now()}`;
    const uniqueListen = Array.from(new Set(listens));

    return {
      name,
      listen: uniqueListen.length ? uniqueListen : [ssl ? '443' : '80'],
      domains: domains.length ? Array.from(new Set(domains)) : ['127.0.0.1'],
      root,
      index: index.length ? Array.from(new Set(index)) : ['index.html'],
      locations,
      ssl,
      protocol: ssl ? 'https' : 'http',
      enabled: true,
      sslCert: sslCert || undefined,
      sslKey: sslKey || undefined,
      extraConfig: '',
    };
  }

  private extractTopLevelDirectives(content: string): Map<string, string[]> {
    const directiveMap = new Map<string, string[]>();
    let depth = 0;
    let statement = '';
    const flush = () => {
      const normalized = statement.trim();
      statement = '';
      if (!normalized) {
        return;
      }
      const m = normalized.match(/^([a-zA-Z_][\w]*)\s+([\s\S]+)$/);
      if (!m) {
        return;
      }
      const key = m[1].toLowerCase();
      const value = m[2].replace(/;$/, '').trim();
      if (!value) {
        return;
      }
      if (!directiveMap.has(key)) {
        directiveMap.set(key, []);
      }
      directiveMap.get(key)!.push(value);
    };

    for (let i = 0; i < content.length; i += 1) {
      const ch = content[i];
      if (ch === '#') {
        while (i < content.length && content[i] !== '\n') {
          i += 1;
        }
        continue;
      }
      if (ch === '{') {
        depth += 1;
        continue;
      }
      if (ch === '}') {
        if (depth > 0) {
          depth -= 1;
        }
        continue;
      }
      if (depth > 0) {
        continue;
      }
      statement += ch;
      if (ch === ';') {
        flush();
      }
    }
    return directiveMap;
  }

  private parseLocations(content: string): NginxLocation[] {
    const locations: NginxLocation[] = [];
    const locationRegex = /location\s+(\S+)\s*\{([\s\S]*?)\}/g;
    let match: RegExpExecArray | null = null;
    while ((match = locationRegex.exec(content)) !== null) {
      const path = String(match[1] || '').trim() || '/';
      const block = String(match[2] || '');
      const lines = block
        .split(/\r?\n/)
        .map(item => item.trim())
        .filter(Boolean);
      let proxyPass: string | undefined;
      let root: string | undefined;
      let index: string[] | undefined;
      let tryFiles: string[] | undefined;
      const raw: string[] = [];

      lines.forEach(line => {
        const normalized = line.replace(/;$/, '');
        if (/^proxy_pass\s+/i.test(normalized)) {
          proxyPass = normalized.replace(/^proxy_pass\s+/i, '').trim();
          return;
        }
        if (/^root\s+/i.test(normalized)) {
          root = normalized.replace(/^root\s+/i, '').trim();
          return;
        }
        if (/^index\s+/i.test(normalized)) {
          index = normalized.replace(/^index\s+/i, '').split(/\s+/).map(item => item.trim()).filter(Boolean);
          return;
        }
        if (/^try_files\s+/i.test(normalized)) {
          tryFiles = normalized.replace(/^try_files\s+/i, '').split(/\s+/).map(item => item.trim()).filter(Boolean);
          return;
        }
        raw.push(line.endsWith(';') ? line : `${line};`);
      });

      locations.push({
        path,
        proxyPass,
        root,
        index,
        tryFiles,
        rawConfig: raw.length ? raw.join('\n') : undefined,
      });
    }
    return locations;
  }

}

