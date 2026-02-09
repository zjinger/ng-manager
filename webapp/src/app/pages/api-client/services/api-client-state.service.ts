import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { ProjectStateService } from '@pages/projects/services/project.state.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ApiClientService } from './api-client.service';
import { ApiCollectionCreateBody, ApiCollectionEntity, ApiCollectionKind, ApiCollectionTreeNode, ApiCollectionUpdateBody, ApiRequestEntity, ApiRequestKvRow, ApiScope, SendResponse } from '@models/api-client';
import { ApiHistoryEntity } from '@models/api-client/api-history.model';
import { ApiEnvEntity } from '@models/api-client/api-environment.model';
import { envVarsToRecord, genCollectionTreeNodes } from '../utils';
import { uniqueId } from 'lodash';
import { CollectionModalService } from './collection-modal.service';

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
  private projectState = inject(ProjectStateService);
  private collectionModal = inject(CollectionModalService);

  // request state
  scope = signal<ApiScope>('project');
  loading = signal(false);

  sending = signal(false);
  requests = signal<ApiRequestEntity[]>([]); // 全部请求列表

  // 当前选中请求 ID
  activeRequestId = signal<string | null>(null);

  readonly collections = signal<ApiCollectionEntity[]>([]);

  readonly activeCollectionId = signal<string | null>(null);

  readonly nodes = computed<ApiCollectionTreeNode[]>(() => {
    return genCollectionTreeNodes(this.collections(), this.requests(), '').filter(n => n.kind !== 'request');
  });

  // history state
  historyOpen = signal(false); // 是否打开 history 面板
  historyLoading = signal(false); // history 加载中
  histories = signal<ApiHistoryEntity[]>([]); // 历史记录列表

  // environments state
  envs = signal<ApiEnvEntity[]>([]);
  envLoading = signal(false);
  activeEnvId = signal<string | null>(null);

  // send result
  lastResult = signal<SendResponse | null>(null);

  // project info
  projectId = computed(() => {
    const p = this.projectState.currentProject();
    return p?.id ?? '';
  });
  activeRequest = signal<ApiRequestEntity | null>(null);

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
    const p = this.projectState.currentProject();
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
        this.setActive(list[0]);
      } else {
        this.setActive(null);
        this.activeRequestId.set(null);
        this.lastResult.set(null);
        this.newRequest();
      }
    } catch (e: any) {
      this.msg.error(e?.message ?? '加载请求失败');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * 选择请求
   */
  selectRequest(id: string) {
    const req = this.requests().find((x) => x.id === id) || null;
    this.setActive(req);
    this.activeCollectionId.set(req?.collectionId ?? null);

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
      this.setActive(req.id === this.activeRequestId() ? { ...req, collectionId: parentId ?? null } : req);
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
   * 新建请求
   */
  newRequest(input: { collectionId?: string | null } = {}) {
    const pid = this.projectId();
    if (this.scope() === 'project' && !pid) {
      this.msg.warning('请先选择项目');
      return;
    }
    const t = now();
    const req: ApiRequestEntity = {
      id: newLocalId('req'),
      name: '',
      method: 'GET',
      url: '',
      collectionId: input.collectionId ?? null,
      query: [],
      pathParams: [],
      headers: [],
      body: { mode: 'none' },
      auth: { type: 'none' },
      options: { followRedirects: true, timeoutMs: 30_000 },
      tags: [],
      createdAt: t,
      updatedAt: t,
    };
    this.setActive(req);
    this.activeCollectionId.set(input.collectionId ?? null);
  }

  /**
   * 更新当前请求字段
   */
  patchActive(patch: Partial<ApiRequestEntity>) {
    const req = this.activeRequest();
    if (!req) return;
    const updated = { ...req, ...patch, updatedAt: Date.now() };
    this.activeRequest.set(updated);
  }

  /**
   * 保存当前请求
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
    }

    this.loading.set(true);
    try {
      await this.api.saveRequest(scope, pid, req);
      this.msg.success('已保存');
      this.activeRequest.set({ ...req }); // 更新引用
      await this.loadRequests(); // 重新加载列表
    } catch (e: any) {
      this.msg.error(e?.message ?? '保存失败');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * 发送当前请求
   */
  async sendActive() {
    const req = this.activeRequest();
    if (!req) return;
    await this.sendResolvedRequest(req);
  }

  /**
   * 删除请求
   */
  async removeRequest(id: string) {
    await this.api.deleteRequest(id, this.scope(), this.projectId());
    this.msg.success('已删除');
    const list = this.requests().filter(r => r.id !== id);
    this.requests.set(list);
    if (this.activeRequestId() === id) {
      const next = list[0]?.id ?? null;
      this.activeRequestId.set(next);
    }
  }

  private setActive(request: ApiRequestEntity | null) {
    if (!request || !request.id || request.id === this.activeRequestId()) return;
    if (request.headers.length) {
      request.headers = this.ensureKvId(request.headers);
    }
    if (request.query.length) {
      request.query = this.ensureKvId(request.query);
    }
    if (request.pathParams.length) {
      request.pathParams = this.ensureKvId(request.pathParams);
    }
    this.activeRequest.set(request);
    this.activeRequestId.set(request.id);
    this.lastResult.set(null);
  }

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
   * 重放历史记录
   */
  async replayHistory(h: ApiHistoryEntity) {
    await this.sendResolvedRequest(h.requestSnapshot);
  }

  /**
   * 发送已解析的请求
   */
  private async sendResolvedRequest(request: ApiRequestEntity) {
    const scope = this.scope();
    const pid = scope === 'project' ? this.projectId() : undefined;
    if (scope === 'project' && !pid) {
      this.msg.warning('请先选择项目');
      return;
    }

    // 允许未保存直接发送：request 直传
    this.sending.set(true);
    this.lastResult.set(null);
    try {
      const res = await this.api.send({
        scope,
        projectId: pid || undefined,
        request,
        envId: this.activeEnvId() ?? undefined,
        projectRoot: (this.projectState.currentProject() as any)?.root, // 有就传，没有就 undefined
      });
      this.lastResult.set(res);
      if (res.error) {
        this.msg.error(`${res.error.code}: ${res.error.message}`);
      } else {
        this.msg.success(`HTTP ${res.response?.status ?? ''} (${res.metrics.durationMs}ms)`);
      }
    } catch (e: any) {
      this.msg.error(e?.message ?? '发送失败');
    } finally {
      this.sending.set(false);
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
