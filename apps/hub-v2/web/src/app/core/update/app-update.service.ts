import { DestroyRef, Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '@environments/environment';
import { NzNotificationService } from 'ng-zorro-antd/notification';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const STARTUP_DELAY_MS = 15 * 1000;
const UPDATE_CHECK_PARAM = '_appUpdateCheck';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly notification = inject(NzNotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currentAssetSignature =
    typeof document === 'undefined' ? '' : this.readAssetSignature(document);

  private started = false;
  private checking = false;
  private updateNoticeShown = false;
  private intervalId: number | null = null;
  private startupTimerId: number | null = null;

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      void this.checkForUpdate();
    }
  };

  private readonly onWindowFocus = (): void => {
    void this.checkForUpdate();
  };

  start(): void {
    if (this.started || !APP_CONFIG.production || typeof window === 'undefined' || !this.currentAssetSignature) {
      return;
    }

    this.started = true;
    this.startupTimerId = window.setTimeout(() => void this.checkForUpdate(), STARTUP_DELAY_MS);
    this.intervalId = window.setInterval(() => void this.checkForUpdate(), CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('focus', this.onWindowFocus);

    this.destroyRef.onDestroy(() => this.stop());
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

  private async checkForUpdate(): Promise<void> {
    if (this.checking || this.updateNoticeShown) {
      return;
    }

    this.checking = true;

    try {
      const latestAssetSignature = await this.fetchLatestAssetSignature();
      if (!latestAssetSignature || latestAssetSignature === this.currentAssetSignature) {
        return;
      }

      this.showUpdateNotice();
    } catch (error) {
      console.warn('[app-update] check failed', error);
    } finally {
      this.checking = false;
    }
  }

  private async fetchLatestAssetSignature(): Promise<string | null> {
    const url = new URL('/index.html', window.location.origin);
    url.searchParams.set(UPDATE_CHECK_PARAM, String(Date.now()));

    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        Accept: 'text/html',
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

  private showUpdateNotice(): void {
    this.updateNoticeShown = true;
    const ref = this.notification.info('应用已更新', '新版本已部署，点击此通知刷新页面。', {
      nzClass: 'app-update-notification',
      nzDuration: 0,
      nzKey: 'app-update-available',
      nzPlacement: 'bottomRight',
    });

    ref.onClick.subscribe(() => {
      window.location.reload();
    });
  }
}
