import { computed, effect, Injectable, signal } from '@angular/core';
import { isEqual, uniqueId } from 'lodash';
import type { ApiRequestEntity } from '@models/api-client/api-request.model';
import type { SendResponse } from '@models/api-client/api-send.model';
import type { ApiClientTab } from '@models/api-client/api-tab.model';

const TAB_STORAGE_KEY = 'hub-v2:api-client:tabs';
const MAX_STORAGE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 天

function now(): number {
  return Date.now();
}

function generateTabId(): string {
  return `tab_${now().toString(16)}_${Math.random().toString(16).slice(2, 8)}`;
}

/**
 * API Client Tab 状态管理
 * 支持多请求并行编辑
 */
@Injectable({ providedIn: 'root' })
export class ApiClientTabStore {
  readonly maxTabs = 20;

  // State
  readonly tabs = signal<ApiClientTab[]>([]);
  readonly activeTabId = signal<string | null>(null);
  readonly sending = signal(false);

  // Computed
  readonly activeTab = computed(() => {
    const id = this.activeTabId();
    const tabs = this.tabs();
    return id ? tabs.find((t) => t.id === id) ?? null : null;
  });

  readonly activeRequest = computed(() => this.activeTab()?.request ?? null);

  readonly activeResponse = computed(() => this.activeTab()?.lastResponse ?? null);

  readonly canOpenMore = computed(() => this.tabs().length < this.maxTabs);

  readonly tabCount = computed(() => this.tabs().length);

  constructor() {
    // 初始化时从 LocalStorage 恢复
    this.restoreFromStorage();

    // 变化时自动保存
    effect(() => {
      const tabs = this.tabs();
      const activeId = this.activeTabId();
      this.saveToStorage(tabs, activeId);
    });
  }

  /**
   * 创建空白 Tab
   */
  createEmptyTab(collectionId?: string | null): ApiClientTab {
    const t = now();
    const request: ApiRequestEntity = {
      id: `req_${t.toString(16)}_${Math.random().toString(16).slice(2, 6)}`,
      name: '',
      method: 'GET',
      url: '',
      collectionId: collectionId ?? null,
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

    return {
      id: generateTabId(),
      requestId: null,
      request,
      title: 'New Request',
      isDirty: false,
      lastResponse: null,
      createdAt: t,
      updatedAt: t,
    };
  }

  /**
   * 新建 Tab
   */
  openNewTab(collectionId?: string | null): string {
    if (!this.canOpenMore()) {
      throw new Error('已达到最大 Tab 数量限制');
    }

    const tab = this.createEmptyTab(collectionId);
    this.tabs.update((tabs) => [...tabs, tab]);
    this.activeTabId.set(tab.id);
    return tab.id;
  }

  /**
   * 在新 Tab 中打开请求
   */
  openRequestInTab(request: ApiRequestEntity, requestId?: string): string {
    // 检查是否已打开
    const existing = this.tabs().find((t) => t.requestId === request.id);
    if (existing) {
      this.activeTabId.set(existing.id);
      return existing.id;
    }

    if (!this.canOpenMore()) {
      throw new Error('已达到最大 Tab 数量限制');
    }

    const t = now();
    const requestCopy = { ...request };
    const tab: ApiClientTab = {
      id: generateTabId(),
      requestId: request.id,
      request: requestCopy,
      savedSnapshot: requestCopy, // 保存快照用于比较
      title: this.generateTabTitle(request),
      isDirty: false,
      lastResponse: null,
      createdAt: t,
      updatedAt: t,
    };

    this.tabs.update((tabs) => [...tabs, tab]);
    this.activeTabId.set(tab.id);
    return tab.id;
  }

  /**
   * 关闭 Tab
   */
  closeTab(tabId: string): void {
    const tabs = this.tabs();
    const index = tabs.findIndex((t) => t.id === tabId);

    if (index < 0) return;

    // 如果关闭的是当前激活的 Tab，切换到相邻 Tab
    const isActive = this.activeTabId() === tabId;

    this.tabs.update((list) => list.filter((t) => t.id !== tabId));

    // 如果关闭后没有 Tab，创建一个新的
    if (this.tabs().length === 0) {
      const newTab = this.createEmptyTab();
      this.tabs.set([newTab]);
      this.activeTabId.set(newTab.id);
      return;
    }

    // 切换激活 Tab
    if (isActive) {
      const newTabs = this.tabs();
      const newIndex = Math.min(index, newTabs.length - 1);
      this.activeTabId.set(newTabs[newIndex]?.id ?? null);
    }
  }

  /**
   * 关闭其他 Tab
   */
  closeOtherTabs(tabId: string): void {
    const tab = this.tabs().find((t) => t.id === tabId);
    if (!tab) return;

    this.tabs.set([tab]);
    this.activeTabId.set(tabId);
  }

  /**
   * 关闭右侧 Tab
   */
  closeRightTabs(tabId: string): void {
    const index = this.tabs().findIndex((t) => t.id === tabId);
    if (index < 0) return;

    this.tabs.update((tabs) => tabs.slice(0, index + 1));

    // 如果当前激活的 Tab 被关闭，切换到指定 Tab
    if (!this.tabs().find((t) => t.id === this.activeTabId())) {
      this.activeTabId.set(tabId);
    }
  }

  /**
   * 关闭已保存的 Tab
   */
  closeSavedTabs(): void {
    const activeId = this.activeTabId();
    const activeTab = this.tabs().find((t) => t.id === activeId);

    this.tabs.update((tabs) => tabs.filter((t) => t.isDirty || !t.requestId));

    // 如果当前激活的 Tab 被关闭，切换到第一个 Tab
    if (!this.tabs().find((t) => t.id === activeId)) {
      const firstTab = this.tabs()[0];
      if (firstTab) {
        this.activeTabId.set(firstTab.id);
      } else {
        // 如果没有 Tab 了，创建一个新的
        const newTab = this.createEmptyTab();
        this.tabs.set([newTab]);
        this.activeTabId.set(newTab.id);
      }
    }
  }

  /**
   * 关闭所有 Tab（保留一个空白 Tab）
   */
  closeAllTabs(): void {
    const newTab = this.createEmptyTab();
    this.tabs.set([newTab]);
    this.activeTabId.set(newTab.id);
  }

  /**
   * 复制 Tab（创建新 Tab 并复制请求）
   */
  duplicateTab(tabId: string): string {
    const tab = this.tabs().find((t) => t.id === tabId);
    if (!tab) throw new Error('Tab not found');

    if (!this.canOpenMore()) {
      throw new Error('已达到最大 Tab 数量限制');
    }

    const t = now();
    const requestCopy: ApiRequestEntity = {
      ...tab.request,
      id: `req_${t.toString(16)}_${Math.random().toString(16).slice(2, 6)}`,
      name: `${tab.request.name || '未命名'} (副本)`,
      createdAt: t,
      updatedAt: t,
    };

    const newTab: ApiClientTab = {
      id: generateTabId(),
      requestId: null, // 新请求，未保存
      request: requestCopy,
      savedSnapshot: null,
      title: this.generateTabTitle(requestCopy),
      isDirty: true, // 副本视为有修改
      lastResponse: null,
      createdAt: t,
      updatedAt: t,
    };

    // 插入到当前 Tab 后面
    const index = this.tabs().findIndex((t) => t.id === tabId);
    this.tabs.update((tabs) => {
      const result = [...tabs];
      result.splice(index + 1, 0, newTab);
      return result;
    });
    this.activeTabId.set(newTab.id);

    return newTab.id;
  }

  /**
   * 获取 Tab 的 URL
   */
  getTabUrl(tabId: string): string | null {
    const tab = this.tabs().find((t) => t.id === tabId);
    return tab?.request.url ?? null;
  }

  /**
   * 切换 Tab
   */
  switchTab(tabId: string): void {
    const tab = this.tabs().find((t) => t.id === tabId);
    if (tab) {
      this.activeTabId.set(tabId);
    }
  }

  /**
   * 重命名 Tab - 同时更新 request.name
   */
  renameTab(tabId: string, title: string): void {
    this.tabs.update((tabs) =>
      tabs.map((t) => {
        if (t.id !== tabId) return t;
        // 同步更新 request.name
        const updatedRequest = { ...t.request, name: title, updatedAt: now() };
        return { 
          ...t, 
          title, 
          request: updatedRequest,
          isDirty: t.requestId ? true : t.isDirty, // 已保存的请求重命名后标记为 dirty
          updatedAt: now() 
        };
      })
    );
  }

  /**
   * 重排序 Tab
   */
  reorderTabs(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;

    this.tabs.update((tabs) => {
      const result = [...tabs];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }

  /**
   * 更新当前 Tab 的请求
   */
  updateActiveRequest(patch: Partial<ApiRequestEntity>): void {
    const activeId = this.activeTabId();
    if (!activeId) return;

    this.tabs.update((tabs) =>
      tabs.map((t) => {
        if (t.id !== activeId) return t;
        
        const updated = { ...t.request, ...patch, updatedAt: now() };
        
        // 与保存时的快照比较，判断是否有变化
        const snapshot = t.savedSnapshot;
        const hasChanges = snapshot ? this.hasChanges(snapshot, updated) : true;
        
        return {
          ...t,
          request: updated,
          title: this.generateTabTitle(updated),
          isDirty: hasChanges,
          updatedAt: now(),
        };
      })
    );
  }

  /**
   * 更新当前 Tab 的响应
   */
  updateActiveResponse(response: SendResponse | null): void {
    const activeId = this.activeTabId();
    if (!activeId) return;

    this.tabs.update((tabs) =>
      tabs.map((t) =>
        t.id === activeId ? { ...t, lastResponse: response, updatedAt: now() } : t
      )
    );
  }

  /**
   * 标记当前 Tab 为已保存
   */
  markActiveSaved(requestId: string): void {
    const activeId = this.activeTabId();
    if (!activeId) return;

    this.tabs.update((tabs) =>
      tabs.map((t) => {
        if (t.id !== activeId) return t;
        // 保存时更新快照
        return { 
          ...t, 
          requestId, 
          savedSnapshot: { ...t.request }, // 更新快照
          isDirty: false, 
          updatedAt: now() 
        };
      })
    );
  }

  /**
   * 标记当前 Tab 为脏
   */
  markActiveDirty(): void {
    const activeId = this.activeTabId();
    if (!activeId) return;

    this.tabs.update((tabs) =>
      tabs.map((t) =>
        t.id === activeId ? { ...t, isDirty: true, updatedAt: now() } : t
      )
    );
  }

  /**
   * 设置发送状态
   */
  setSending(value: boolean): void {
    this.sending.set(value);
  }

  /**
   * 获取 Tab
   */
  getTab(tabId: string): ApiClientTab | null {
    return this.tabs().find((t) => t.id === tabId) ?? null;
  }

  /**
   * 检查 Tab 是否有未保存修改
   */
  isTabDirty(tabId: string): boolean {
    return this.getTab(tabId)?.isDirty ?? false;
  }

  // ========== Private Methods ==========

  private generateTabTitle(request: ApiRequestEntity): string {
    if (request.name) return request.name;

    if (!request.url) return 'New Request';

    // 提取路径部分
    const url = request.url
      .replace(/^\{\{[^}]+\}\}/, '') // 移除变量前缀
      .replace(/^https?:\/\/[^/]+/, ''); // 移除域名

    const path = url.split('?')[0] || '/';

    return `${request.method} ${path}`;
  }

  private hasChanges(original: ApiRequestEntity, current: ApiRequestEntity): boolean {
    // 排除 updatedAt，只比较实际内容
    const { updatedAt: _1, ...originalWithoutTime } = original;
    const { updatedAt: _2, ...currentWithoutTime } = current;
    return !isEqual(originalWithoutTime, currentWithoutTime);
  }

  private restoreFromStorage(): void {
    try {
      const raw = localStorage.getItem(TAB_STORAGE_KEY);
      if (!raw) {
        this.createInitialTab();
        return;
      }

      const data = JSON.parse(raw);
      const age = Date.now() - data.savedAt;

      if (age > MAX_STORAGE_AGE || !Array.isArray(data.tabs) || data.tabs.length === 0) {
        this.createInitialTab();
        return;
      }

      // 过滤掉过期数据
      const validTabs = data.tabs.filter(
        (t: ApiClientTab) => t.id && t.request
      );

      if (validTabs.length === 0) {
        this.createInitialTab();
        return;
      }

      this.tabs.set(validTabs);
      this.activeTabId.set(data.activeTabId ?? validTabs[0].id);
    } catch {
      this.createInitialTab();
    }
  }

  private saveToStorage(tabs: ApiClientTab[], activeTabId: string | null): void {
    try {
      // 只保存必要字段，减少存储大小
      const minimalTabs = tabs.map((t) => ({
        id: t.id,
        requestId: t.requestId,
        request: t.request,
        title: t.title,
        isDirty: t.isDirty,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));

      localStorage.setItem(
        TAB_STORAGE_KEY,
        JSON.stringify({
          tabs: minimalTabs,
          activeTabId,
          savedAt: Date.now(),
        })
      );
    } catch {
      // Storage full, 清理旧数据
      localStorage.removeItem(TAB_STORAGE_KEY);
    }
  }

  private createInitialTab(): void {
    const tab = this.createEmptyTab();
    this.tabs.set([tab]);
    this.activeTabId.set(tab.id);
  }
}

