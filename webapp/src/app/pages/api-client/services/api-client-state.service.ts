import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { ApiCollectionCreateBody, ApiCollectionEntity, ApiCollectionKind, ApiCollectionTreeNode, ApiCollectionUpdateBody, ApiRequestEntity, ApiRequestKvRow, ApiScope } from '@models/api-client';
import { ApiEnvEntity } from '@models/api-client/api-environment.model';
import { ApiHistoryEntity } from '@models/api-client/api-history.model';
import { ProjectStateService } from '@pages/projects/services/project.state.service';
import { uniqueId } from 'lodash';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ApiClientTabStore } from '../store/api-client-tab.store';
import { envVarsToRecord, genCollectionTreeNodes } from '../utils';
import { ApiClientService } from './api-client.service';
import { CollectionModalService } from './collection-modal.service';
import { ProjectContextStore } from '@app/core/stores';

function now() {
  return Date.now();
}
function newLocalId(prefix: string) {
  const rand = Math.random().toString(16).slice(2, 10);
  return `${prefix}_${rand}_${Date.now().toString(16)}`;
}

@Injectable({
  providedIn: 'root',
})
export class ApiClientStateService {
  private api = inject(ApiClientService);
  private msg = inject(NzMessageService);
  private projectContext = inject(ProjectContextStore);
  private collectionModal = inject(CollectionModalService);
  
  // Tab Store
  readonly tabStore = inject(ApiClientTabStore);

  // request state
  scope = signal<ApiScope>('project');
  loading = signal(false);

  q = signal(''); // 搜索关键词

  // 使用 Tab Store 的 sending 状态
  sending = this.tabStore.sending;
  requests = signal<ApiRequestEntity[]>([]); // 全部请求列表

  // 当前选中请求 ID - 改用 Tab Store
  activeRequestId = computed(() => this.tabStore.activeTab()?.requestId ?? null);

  readonly collections = signal<ApiCollectionEntity[]>([]);

  readonly activeCollectionId = signal<string | null>(null);

  readonly nodes = computed<ApiCollectionTreeNode[]>(() => {
    return genCollectionTreeNodes(this.collections(), this.requests(), '').filter(n => n.kind !== 'request');
  });

  filteredNodes = computed(() => {
    const q = this.q().toLowerCase();
    return genCollectionTreeNodes(this.collections(), this.requests(), q ?? '');
  })

  // history state
  historyOpen = signal(false); // 是否打开 history 面板
  historyLoading = signal(false); // history 加载中
  histories = signal<ApiHistoryEntity[]>([]); // 历史记录列表

  // environments state
  envs = signal<ApiEnvEntity[]>([]);
  envLoading = signal(false);
  activeEnvId = signal<string | null>(null);

  // send result - 改用 Tab Store
  lastResult = this.tabStore.activeResponse;

  // project info
  projectId = computed(() => {
    const p = this.projectContext.currentProject();
    return p?.id ?? '';
  });
  
  // activeRequest 改用 Tab Store
  activeRequest = this.tabStore.activeRequest;
  
  // Tab 相关
  readonly tabs = this.tabStore.tabs;
  readonly activeTabId = this.tabStore.activeTabId;
  readonly activeTab = this.tabStore.activeTab;
  readonly canOpenMore = this.tabStore.canOpenMore;

  activeEnv = computed(() => {
    const id = this.activeEnvId();
    if (!id) return null;
    return this.envs().find(e => e.id === id) ?? null;
  });

  envVarRecord = computed(() => {
    const env = this.activeEnv();
    if (!env) return {};
    return envVarsToRecord(env.variables);
  });

  collectionPath = computed(() => {
    const colId = this.activeCollectionId();
    if (!colId) return null;
    const col = this.collections().find(c => c.id === colId);
    if (!col) return null;
    const pathNames: string[] = [];
    let parentKey: string | null = `${col.id}`;
    while (parentKey) {
      const parentNode = this.collections().find(n => n.id === parentKey);
      if (parentNode) {
        pathNames.unshift(parentNode.name || '未命名');
        parentKey = parentNode.parentId ? `${parentNode.parentId}` : null;
      } else {
        parentKey = null;
      }
    }
    return pathNames.join(' / ');

  });

  private projectCtx = computed(() => {
    const p = this.projectContext.currentProject();
    if (!p) return null;
    return {
      scope: 'project' as const,
      projectId: p.id,
    };
  });


  constructor() {
    // project 变化时自动 reload
    effect(() => {
      if (this.scope() !== 'project') return;
      const pid = this.projectId();
      if (!pid) return;
      // void this.loadRequests();
      void this.loadAll();
    });

    effect(() => {
      const scope = this.scope();
      if (scope !== 'project') { void this.loadEnvs(); return; }
      const pid = this.projectId();
      if (!pid) return;
      void this.loadEnvs();
    });
  }

  async loadAll() {
    const ctx = this.projectCtx();
    if (!ctx) return;

    this.loading.set(true);
    try {
      const [cols, reqs] = await Promise.all([
        this.api.listCollections(ctx.scope, ctx.projectId),
        this.api.listRequests(ctx.scope, ctx.projectId),
      ]);
      this.collections.set(cols ?? []);
      this.requests.set(reqs ?? []);
    } finally {
      this.loading.set(false);
    }
  }

  async reloadCollections() {
    const ctx = this.projectCtx();
    if (!ctx) return;
    const cols = await this.api.listCollections(ctx.scope, ctx.projectId);
    this.collections.set(cols ?? []);
  }

  async reloadRequests() {
    const ctx = this.projectCtx();
    if (!ctx) return;
    const reqs = await this.api.listRequests(ctx.scope, ctx.projectId);
    this.requests.set(reqs ?? []);
  }

  /**
   * 加载请求列表
   */
  async loadRequests() {
    const ctx = this.projectCtx();
    if (!ctx) return;
    this.loading.set(true);
    try {
      const list = await this.api.listRequests(ctx.scope, ctx.projectId);
      this.requests.set(list);
      // 默认选中第一个；如果已有 active 且存在则保留
      const active = this.activeRequestId();
      if (active && list.some((x) => x.id === active)) return;
      if (list.length) {
        this.selectRequest(list[0].id);
      } else {
        this.newTab();
      }
    } catch (e: any) {
      this.msg.error(e?.message ?? '加载请求失败');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * 选择请求 - 在新 Tab 中打开
   */
  selectRequest(id: string) {
    const req = this.requests().find((x) => x.id === id) || null;
    if (req) {
      this.tabStore.openRequestInTab(req, id);
      this.activeCollectionId.set(req.collectionId ?? null);
    }
  }
  
  /**
   * 切换 Tab
   */
  switchTab(tabId: string): void {
    this.tabStore.switchTab(tabId);
    const tab = this.tabStore.getTab(tabId);
    if (tab?.request.collectionId) {
      this.activeCollectionId.set(tab.request.collectionId);
    }
  }
  
  /**
   * 关闭 Tab
   */
  closeTab(tabId: string): void {
    this.tabStore.closeTab(tabId);
  }
  
  /**
   * 新建 Tab
   */
  newTab(collectionId?: string | null): void {
    try {
      this.tabStore.openNewTab(collectionId);
      this.activeCollectionId.set(collectionId ?? null);
    } catch (e: any) {
      this.msg.warning(e.message);
    }
  }
  
  /**
   * 重命名 Tab
   */
  renameTab(tabId: string, title: string): void {
    this.tabStore.renameTab(tabId, title);
  }
  
  /**
   * 重排序 Tab
   */
  reorderTabs(from: number, to: number): void {
    this.tabStore.reorderTabs(from, to);
  }

  /**
   * 处理右键菜单操作
   */
  handleTabContextMenu(event: { tabId: string; action: string }): void {
    switch (event.action) {
      case 'close':
        this.closeTab(event.tabId);
        break;
      case 'closeOthers':
        this.tabStore.closeOtherTabs(event.tabId);
        break;
      case 'closeRight':
        this.tabStore.closeRightTabs(event.tabId);
        break;
      case 'closeSaved':
        this.tabStore.closeSavedTabs();
        break;
      case 'closeAll':
        this.tabStore.closeAllTabs();
        break;
      case 'rename':
        // 重命名由组件处理（启动编辑模式）
        break;
      case 'duplicate':
        try {
          this.tabStore.duplicateTab(event.tabId);
          this.msg.success('已复制请求');
        } catch (e: any) {
          this.msg.warning(e.message);
        }
        break;
      case 'copyUrl':
        const url = this.tabStore.getTabUrl(event.tabId);
        if (url) {
          navigator.clipboard.writeText(url).then(() => {
            this.msg.success('URL 已复制到剪贴板');
          }).catch(() => {
            this.msg.error('复制失败');
          });
        }
        break;
      case 'moveTo':
        // 获取当前 Tab 的请求
        const tab = this.tabStore.getTab(event.tabId);
        if (tab?.requestId) {
          // 打开移动对话框（复用集合移动逻辑）
          this.moveCollection(tab.requestId, 'request');
        }
        break;
    }
  }

  /**
   * 选择集合
   */
  selectCollection(id: string) {
    this.activeCollectionId.set(id);
  }

  /**
   * 新建集合 / 文件夹
   */
  async newCollection(input: {
    name?: string;
    parentId?: string | null;
    kind?: 'collection' | 'folder';
  }) {
    const ctx = this.projectCtx();
    if (!ctx) return;
    const body: ApiCollectionCreateBody = {
      scope: ctx.scope,
      projectId: ctx.projectId,
      name: input.name ?? '',
      kind: input.kind ?? 'collection',
      parentId: input.parentId ?? null,
    };
    const nodes = this.nodes(); // 全量生成树，拿到最新的 collection list
    const createdBody = await this.collectionModal.createCollection({ createBody: body, nodes, kind: body.kind as 'collection' | 'folder', initialParentId: body.parentId ?? null });
    if (createdBody) {
      const newCol = await this.api.createCollection(createdBody);
      this.msg.success('创建成功');
      this.collections.update(list => [...list, newCol]);
      this.activeCollectionId.set(newCol.id);
    }
  }

  // 删除集合/文件夹
  async deleteCollection(id: string, kind: ApiCollectionKind) {
    if (kind === 'request') {
      this.removeRequest(id);
      return;
    }
    await this.api.deleteCollection(id, this.scope(), this.projectId());
    this.msg.success('已删除');
    // await this.loadAll();
    // 乐观更新
    this.collections.update(list => list.filter(c => c.id !== id));
    // 如果当前 active collection 是被删的，重置 active collection
    if (this.activeCollectionId() === id) {
      const firstCol = this.collections()[0];
      this.activeCollectionId.set(firstCol?.id ?? null);
    }
  }

  /**
   * 移动集合/文件夹/请求
   */
  async moveCollection(id: string, kind: ApiCollectionKind) {
    let initialParentId = '';
    if (kind == 'request') {
      const req = this.requests().find(r => r.id === id);
      if (!req) {
        this.msg.error('请求不存在');
        return;
      }
      initialParentId = req.collectionId ?? '';
    } else {
      const col = this.collections().find(c => c.id === id);
      if (!col) {
        this.msg.error('集合不存在');
        return;
      }
      initialParentId = col.parentId ?? '';
    }
    const nodes = this.nodes();
    const { parentId } = await this.collectionModal.moveTarget({
      nodes,
      target: { kind, id },
      initialParentId,
    }) || {};
    if (parentId === undefined) return;

    if (kind === 'request') {
      const req = this.requests().find(r => r.id === id);
      if (!req) {
        this.msg.error('请求不存在');
        return;
      }
      const updated: Partial<ApiRequestEntity> = {
        collectionId: parentId ?? null,
        id: req.id,
      };
      req.collectionId = parentId ?? null;
      await this.api.updateRequest(this.scope(), this.projectId(), updated);
      this.requests.update(list => list.map(r => r.id === id ? { ...r, collectionId: parentId ?? null } : r));
      // 更新 Tab 中的请求
      const tab = this.tabs().find(t => t.requestId === id);
      if (tab) {
        this.tabStore.updateActiveRequest({ collectionId: parentId ?? null });
      }
      this.msg.success('修改成功');
    } else {
      const updated: ApiCollectionUpdateBody = {
        parentId: parentId ?? null,
      }
      const newCol = await this.api.updateCollection(id, updated, this.scope(), this.projectId());
      this.collections.update(list => list.map(c => c.id === id ? newCol : c));
      this.activeCollectionId.set(newCol.id);
      this.msg.success('修改成功');
    }
  }

  /**
   * 重命名集合/文件夹/请求
   */
  async renameCollection(id: string, kind: ApiCollectionKind) {
    let name = '';
    if (kind == 'request') {
      const req = this.requests().find(r => r.id === id);
      if (!req) {
        this.msg.error('请求不存在');
        return;
      }
      name = req.name ?? '';
    } else {
      const col = this.collections().find(c => c.id === id);
      if (!col) {
        this.msg.error('集合不存在');
        return;
      }
      name = col.name ?? '';
    }
    const nodes = this.nodes(); // 全量生成树，拿到最新的 collection list
    const updated = await this.collectionModal.renameCollection({
      nodes,
      kind,
      targetId: id,
      initialName: name,
    })
    if (!updated) return;
    if (kind === 'request') {
      await this.api.updateRequest(this.scope(), this.projectId(), { id, name: updated.name });
      this.requests.update(list => list.map(r => r.id === id ? { ...r, name: updated.name ?? r.name } : r));
      this.msg.success('修改成功');
      this.reloadRequests();
    } else {
      const newCol = await this.api.updateCollection(id, updated, this.scope(), this.projectId());
      this.collections.update(list => list.map(c => c.id === id ? newCol : c));
      this.msg.success('修改成功');
      this.reloadCollections();
    }
  }

  /**
   * 新建请求 - 在新 Tab 中打开
   */
  newRequest(input: { collectionId?: string | null } = {}) {
    const pid = this.projectId();
    if (this.scope() === 'project' && !pid) {
      this.msg.warning('请先选择项目');
      return;
    }
    this.newTab(input.collectionId);
  }

  /**
   * 更新当前请求字段 - 使用 Tab Store
   */
  patchActive(patch: Partial<ApiRequestEntity>) {
    this.tabStore.updateActiveRequest(patch);
  }

  /**
   * 保存当前请求 - 使用 Tab Store
   */
  async saveActive() {
    const req = this.activeRequest();
    if (!req) return;

    const scope = this.scope();
    const pid = scope === 'project' ? this.projectId() : undefined;
    if (scope === 'project' && !pid) throw new Error('projectId missing');

    if (!req.name?.trim()) {
      this.msg.warning('名称不能为空');
      return;
    }
    if (!req.url?.trim()) {
      this.msg.warning('URL 不能为空');
      return;
    }

    // 新请求提示保存到集合
    if (!req.collectionId) {
      const nodes = this.nodes();
      const { parentId } = await this.collectionModal.pickCollection({
        nodes,
      }) || {};
      req.collectionId = parentId ?? null;
      this.tabStore.updateActiveRequest({ collectionId: req.collectionId });
    }

    this.loading.set(true);
    try {
      const result = await this.api.saveRequest(scope, pid, req);
      this.msg.success('已保存');
      // 标记 Tab 为已保存
      this.tabStore.markActiveSaved(result.id);
      await this.loadRequests(); // 重新加载列表
    } catch (e: any) {
      this.msg.error(e?.message ?? '保存失败');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * 发送当前请求 - 使用 Tab Store
   */
  async sendActive() {
    const req = this.activeRequest();
    if (!req) return;
    await this.sendResolvedRequest(req);
  }
  async sendHubV2Issues() {
    const project = this.projectContext.currentProject();
    if (!project?.id) {
      this.msg.warning('请先选择项目');
      return;
    }

    const startedAt = Date.now();
    this.tabStore.setSending(true);
    this.tabStore.updateActiveResponse(null);
    try {
      const data = await this.api.hubTokenRequest({
        projectId: project.id,
        path: `/issues`,
        method: 'GET',
        query: { page: 1, pageSize: 20 },
      });
      const bodyText = JSON.stringify(data, null, 2);
      const endedAt = Date.now();
      this.tabStore.updateActiveResponse({
        historyId: `hub_token_${endedAt}`,
        response: {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json; charset=utf-8' },
          bodyText,
          bodySize: bodyText.length,
        },
        metrics: {
          startedAt,
          endedAt,
          durationMs: endedAt - startedAt,
        },
      });
      this.msg.success(`Hub Issues 请求成功 (${Date.now() - startedAt}ms)`);
    } catch (e: any) {
      const endedAt = Date.now();
      this.tabStore.updateActiveResponse({
        historyId: `hub_token_${endedAt}`,
        error: {
          code: 'HUB_TOKEN_REQUEST_ERROR',
          message: e?.message ?? 'Hub Issues 请求失败',
        },
        metrics: {
          startedAt,
          endedAt,
          durationMs: endedAt - startedAt,
        },
      });
      this.msg.error(e?.message ?? 'Hub Issues 请求失败');
    } finally {
      this.tabStore.setSending(false);
    }
  }

  /**
   * 删除请求
   */
  async removeRequest(id: string) {
    await this.api.deleteRequest(id, this.scope(), this.projectId());
    this.msg.success('已删除');
    const list = this.requests().filter(r => r.id !== id);
    this.requests.set(list);
    // 关闭对应的 Tab
    const tab = this.tabs().find(t => t.requestId === id);
    if (tab) {
      this.tabStore.closeTab(tab.id);
    }
  }
  
  /**
   * 确保 Kv 行有 ID
   */
  private ensureKvId(rows: ApiRequestKvRow[]): ApiRequestKvRow[] {
    return rows.map(ele => {
      if (!ele.id) {
        ele.id = uniqueId();
      }
      return ele;
    })
  }

  /**
   * 打开历史记录面板
   */
  openHistory() {
    this.historyOpen.set(true);
    void this.loadHistory();
  }

  /**
   * 关闭历史记录面板
   */
  closeHistory() {
    this.historyOpen.set(false);
  }

  /**
   * 加载历史记录列表
   */
  async loadHistory() {
    this.historyLoading.set(true);
    try {
      const list = await this.api.listHistory(this.scope(), this.projectId());
      this.histories.set(list);
    } finally {
      this.historyLoading.set(false);
    }
  }

  /**
   * 重放历史记录 - 在新 Tab 中打开
   */
  async replayHistory(h: ApiHistoryEntity) {
    // 在新 Tab 中打开历史请求
    this.tabStore.openRequestInTab(h.requestSnapshot);
    await this.sendResolvedRequest(h.requestSnapshot);
  }

  /**
   * 发送已解析的请求 - 使用 Tab Store
   */
  private async sendResolvedRequest(request: ApiRequestEntity) {
    const scope = this.scope();
    const pid = scope === 'project' ? this.projectId() : undefined;
    if (scope === 'project' && !pid) {
      this.msg.warning('请先选择项目');
      return;
    }

    // 允许未保存直接发送：request 直传
    this.tabStore.setSending(true);
    this.tabStore.updateActiveResponse(null);
    try {
      const res = await this.api.send({
        scope,
        projectId: pid || undefined,
        request,
        envId: this.activeEnvId() ?? undefined,
        projectRoot:(this.projectContext.currentProject() as any)?.root, // 有就传，没有就 undefined
      });
      this.tabStore.updateActiveResponse(res);
      if (res.error) {
        this.msg.error(`${res.error.code}: ${res.error.message}`);
      } else {
        this.msg.success(`HTTP ${res.response?.status ?? ''} (${res.metrics.durationMs}ms)`);
      }
    } catch (e: any) {
      this.msg.error(e?.message ?? '发送失败');
    } finally {
      this.tabStore.setSending(false);
    }
  }

  async loadEnvs() {
    const scope = this.scope();
    const pid = scope === 'project' ? this.projectId() : undefined;
    if (scope === 'project' && !pid) return;

    this.envLoading.set(true);
    try {
      const list = await this.api.listEnvs(scope, pid);
      this.envs.set(list);
      // 保底：若当前 active 不存在，默认选第一个；没有则为 null
      const cur = this.activeEnvId();
      if (cur && list.some(x => x.id === cur)) return;
      this.activeEnvId.set(list[0]?.id ?? null);
    } finally {
      this.envLoading.set(false);
    }
  }

  // 给 UI 用：切换 env
  setActiveEnv(id: string | null) {
    this.activeEnvId.set(id);
  }

  // upsert env（MVP：简单做保存后 reload）
  async saveEnv(env: ApiEnvEntity) {
    const scope = this.scope();
    const pid = scope === 'project' ? this.projectId() : undefined;
    await this.api.saveEnv(scope, pid || undefined, env);
    await this.loadEnvs();
  }

  async deleteEnv(id: string) {
    await this.api.deleteEnv(id, this.scope(), this.projectId());
    if (this.activeEnvId() === id) {
      this.activeEnvId.set(null);
    }
    await this.loadEnvs();
  }
}
