import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { ProjectStateService } from '@pages/projects/services/project.state.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ApiClientService, SendResponse } from './api-client.service';
import { ApiRequestEntity, ApiScope } from '@models/api-request.model';
import { ApiHistoryEntity } from '@models/api-history.model';
import { ApiEnvEntity } from '@models/api-environment.model';
import { envVarsToRecord } from '../utils';
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

  // request state
  scope = signal<ApiScope>('project');
  loading = signal(false);
  sending = signal(false);
  requests = signal<ApiRequestEntity[]>([]);
  activeRequestId = signal<string | null>(null);

  // history state
  historyOpen = signal(false); // 是否打开 history 面板
  historyLoading = signal(false); // history 加载中
  histories = signal<ApiHistoryEntity[]>([]); // 历史记录列表

  // environments state
  envs = signal<ApiEnvEntity[]>([]);
  envLoading = signal(false);
  activeEnvId = signal<string | null>(null);
  envDrawerOpen = signal(false); // 是否打开 env 面板


  // project info
  projectId = computed(() => {
    const p = this.projectState.currentProject();
    return p?.id ?? '';
  });

  activeRequest = computed(() => {
    const id = this.activeRequestId();
    if (!id) return null;
    return this.requests().find((x) => x.id === id) ?? null;
  });

  // send result
  lastResult = signal<SendResponse | null>(null);


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

  constructor() {
    // project 变化时自动 reload
    effect(() => {
      if (this.scope() !== 'project') return;
      const pid = this.projectId();
      if (!pid) return;
      void this.loadRequests();
    });

    effect(() => {
      const scope = this.scope();
      if (scope !== 'project') { void this.loadEnvs(); return; }
      const pid = this.projectId();
      if (!pid) return;
      void this.loadEnvs();
    });
  }

  /**
   * 加载请求列表
   */
  async loadRequests() {
    const scope = this.scope();
    const pid = scope === 'project' ? this.projectId() : undefined;
    if (scope === 'project' && !pid) return;

    this.loading.set(true);
    try {
      const list = await this.api.listRequests(scope, pid);
      this.requests.set(list);

      // 默认选中第一个；如果已有 active 且存在则保留
      const active = this.activeRequestId();
      if (active && list.some((x) => x.id === active)) return;
      if (list.length) this.activeRequestId.set(list[0].id);
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
    this.activeRequestId.set(id);
    this.lastResult.set(null);
  }

  /**
   * 新建请求
   */
  newRequest() {
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
      query: [],
      headers: [],
      body: { mode: 'none' },
      auth: { type: 'none' },
      options: { followRedirects: true, timeoutMs: 30_000 },
      tags: [],
      createdAt: t,
      updatedAt: t,
    };

    this.requests.set([req, ...this.requests()]);
    this.activeRequestId.set(req.id);
    this.lastResult.set(null);
  }

  /**
   * 更新当前请求字段
   */
  patchActive(patch: Partial<ApiRequestEntity>) {
    console.log('ApiClientStateService patchActive', patch);
    const id = this.activeRequestId();
    if (!id) return;

    const list = this.requests().map((x) => {
      if (x.id !== id) return x;
      return {
        ...x,
        ...patch,
        updatedAt: now(),
      };
    });
    console.log('ApiClientStateService patchActive', id, patch, list);
    this.requests.set(list);
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

    this.loading.set(true);
    try {
      await this.api.saveRequest(scope, pid, req);
      this.msg.success('已保存');
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
    await this.api.deleteEnv(id);
    await this.loadEnvs();
  }
}
