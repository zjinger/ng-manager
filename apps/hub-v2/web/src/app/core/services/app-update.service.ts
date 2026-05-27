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

interface PendingUpdate {
  key: string;
  source: UpdateSource;
}

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const STARTUP_DELAY_MS = 15 * 1000;
const FOCUS_CHECK_THROTTLE_MS = 60 * 1000;
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
  private lastFocusCheckAt = 0;
  private notifiedBuildId: string | undefined;
  private notifiedAssetSignature: string | undefined;

  private readonly pendingUpdateState = signal<PendingUpdate | null>(null);
  readonly updateAvailable = computed(() => this.pendingUpdateState() !== null);

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      void this.checkForUpdate();
    }
  };

  private readonly onWindowFocus = (): void => {
    const now = Date.now();
    if (now - this.lastFocusCheckAt < FOCUS_CHECK_THROTTLE_MS) {
      return;
    }

    this.lastFocusCheckAt = now;
    void this.checkForUpdate();
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
      this.currentVersion = latestVersion;
      return true;
    }

    if (latestKey === currentKey) {
      return true;
    }

    if (this.notifiedBuildId === latestKey) {
      return true;
    }

    this.notifiedBuildId = latestKey;
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

    if (this.notifiedAssetSignature === latestAssetSignature) {
      return;
    }

    this.notifiedAssetSignature = latestAssetSignature;
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
      return null;
    }

    const data: unknown = await response.json();
    if (!this.isAppVersionInfo(data) || data.app !== 'hub-v2') {
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
