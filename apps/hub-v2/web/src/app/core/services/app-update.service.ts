import { computed, DestroyRef, Injectable, inject, signal } from '@angular/core';
import { APP_CONFIG } from '@environments/environment';

import { DirtyStateService } from './dirty-state.service';

export interface AppVersionInfo {
  app: string;
  version: string;
  buildTime: string;
  commit: string;
  buildId: string;
}

type UpdateSource = 'version' | 'asset';

export interface PendingUpdate {
  readonly key: string;
  readonly source: UpdateSource;
}

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const STARTUP_DELAY_MS = 15 * 1000;
const ACTIVE_CHECK_THROTTLE_MS = 60 * 1000;
const DEFER_UPDATE_MS = 30 * 60 * 1000;
const UPDATE_CHECK_PARAM = '_appUpdateCheck';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly dirtyState = inject(DirtyStateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currentAssetSignature =
    typeof document === 'undefined' ? '' : this.readAssetSignature(document);

  private currentVersion: AppVersionInfo | null = null;
  private started = false;
  private checking = false;
  private intervalId: number | null = null;
  private startupTimerId: number | null = null;
  private lastActiveCheckAt = 0;
  private deferredUpdateKey: string | null = null;
  private deferredUntil = 0;

  private readonly pendingUpdateState = signal<PendingUpdate | null>(null);
  readonly pendingUpdate = computed(() => this.pendingUpdateState());
  readonly updateAvailable = computed(() => this.pendingUpdateState() !== null);

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && this.shouldRunActiveCheck()) {
      void this.checkForUpdate();
    }
  };

  private readonly onWindowFocus = (): void => {
    if (this.shouldRunActiveCheck()) {
      void this.checkForUpdate();
    }
  };

  start(): void {
    if (this.started || !APP_CONFIG.production || typeof window === 'undefined') {
      return;
    }

    this.started = true;
    void this.initializeCurrentVersion();
    this.startupTimerId = window.setTimeout(() => void this.checkForUpdate(), STARTUP_DELAY_MS);
    this.intervalId = window.setInterval(() => void this.checkForUpdate(), CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('focus', this.onWindowFocus);

    this.destroyRef.onDestroy(() => this.stop());
  }

  deferUpdate(): void {
    const pendingUpdate = this.pendingUpdateState();
    if (pendingUpdate) {
      // "稍后"只暂停当前检测到的版本 30 分钟，避免用户长期停留在旧 bundle。
      this.deferredUpdateKey = pendingUpdate.key;
      this.deferredUntil = Date.now() + DEFER_UPDATE_MS;
    }

    this.pendingUpdateState.set(null);
  }

  reloadForUpdate(): void {
    if (this.dirtyState.hasDirty()) {
      const confirmed = window.confirm('当前页面可能有未保存内容，确认刷新页面？');
      if (!confirmed) {
        return;
      }
    }

    window.location.reload();
  }

  private stop(): void {
    if (this.startupTimerId !== null) {
      window.clearTimeout(this.startupTimerId);
      this.startupTimerId = null;
    }

    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('focus', this.onWindowFocus);
  }

  private async initializeCurrentVersion(): Promise<void> {
    try {
      this.currentVersion = await this.fetchVersionInfo();
    } catch (error) {
      console.warn('[app-update] initial version check failed', error);
    }
  }

  private async checkForUpdate(): Promise<void> {
    if (this.checking || this.pendingUpdateState()) {
      return;
    }

    this.checking = true;

    try {
      const handledByVersionManifest = await this.checkVersionManifest();
      if (!handledByVersionManifest) {
        await this.checkAssetFallback();
      }
    } catch (error) {
      console.warn('[app-update] check failed', error);
    } finally {
      this.checking = false;
    }
  }

  private async checkVersionManifest(): Promise<boolean> {
    let latestVersion: AppVersionInfo | null = null;
    try {
      latestVersion = await this.fetchVersionInfo();
    } catch (error) {
      console.warn('[app-update] version manifest check failed', error);
      return false;
    }

    const latestKey = this.getVersionKey(latestVersion);

    if (!latestKey) {
      return false;
    }

    const currentKey = this.getVersionKey(this.currentVersion);
    if (!currentKey) {
      return false;
    }

    if (latestKey === currentKey) {
      return true;
    }

    if (this.isUpdateDeferred(latestKey)) {
      return true;
    }

    this.pendingUpdateState.set({ key: latestKey, source: 'version' });
    return true;
  }

  private async checkAssetFallback(): Promise<void> {
    if (!this.currentAssetSignature) {
      return;
    }

    const latestAssetSignature = await this.fetchLatestAssetSignature();
    if (!latestAssetSignature || latestAssetSignature === this.currentAssetSignature) {
      return;
    }

    if (this.isUpdateDeferred(latestAssetSignature)) {
      return;
    }

    this.pendingUpdateState.set({ key: latestAssetSignature, source: 'asset' });
  }

  private async fetchVersionInfo(): Promise<AppVersionInfo | null> {
    const url = new URL('/version.json', window.location.origin);
    url.searchParams.set(UPDATE_CHECK_PARAM, String(Date.now()));

    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      // null 表示 version manifest 不可用，调用方会继续走 index.html asset fallback。
      return null;
    }

    const data: unknown = await response.json();
    if (!this.isAppVersionInfo(data) || data.app !== 'hub-v2') {
      // null 表示 version manifest 不可用，调用方会继续走 index.html asset fallback。
      return null;
    }

    return data;
  }

  private async fetchLatestAssetSignature(): Promise<string | null> {
    const url = new URL('/index.html', window.location.origin);
    url.searchParams.set(UPDATE_CHECK_PARAM, String(Date.now()));

    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        Accept: 'text/html',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return this.readAssetSignature(doc) || null;
  }

  private readAssetSignature(root: Document): string {
    const scripts = Array.from(root.querySelectorAll('script[src]'))
      .map((element) => element.getAttribute('src') ?? '')
      .map((value) => this.normalizeAssetUrl(value))
      .filter((value): value is string => Boolean(value));

    const styles = Array.from(root.querySelectorAll('link[rel="stylesheet"][href]'))
      .map((element) => element.getAttribute('href') ?? '')
      .map((value) => this.normalizeAssetUrl(value))
      .filter((value): value is string => Boolean(value));

    return [...scripts, ...styles].sort().join('|');
  }

  private normalizeAssetUrl(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const url = new URL(trimmed, window.location.origin);
      if (url.origin !== window.location.origin || !/\.(?:js|css)$/i.test(url.pathname)) {
        return null;
      }

      return url.pathname;
    } catch {
      return null;
    }
  }

  private getVersionKey(version: AppVersionInfo | null): string | null {
    if (!version) {
      return null;
    }

    if (version.buildId.trim()) {
      return `build:${version.buildId.trim()}`;
    }

    if (version.commit.trim()) {
      return `commit:${version.commit.trim()}`;
    }

    return null;
  }

  private shouldRunActiveCheck(): boolean {
    const now = Date.now();
    if (now - this.lastActiveCheckAt < ACTIVE_CHECK_THROTTLE_MS) {
      return false;
    }

    this.lastActiveCheckAt = now;
    return true;
  }

  private isUpdateDeferred(updateKey: string): boolean {
    if (this.deferredUpdateKey !== updateKey) {
      return false;
    }

    if (Date.now() < this.deferredUntil) {
      return true;
    }

    this.deferredUpdateKey = null;
    this.deferredUntil = 0;
    return false;
  }

  private isAppVersionInfo(value: unknown): value is AppVersionInfo {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const record = value as Record<string, unknown>;
    return (
      typeof record['app'] === 'string' &&
      typeof record['version'] === 'string' &&
      typeof record['buildTime'] === 'string' &&
      typeof record['commit'] === 'string' &&
      typeof record['buildId'] === 'string'
    );
  }
}
