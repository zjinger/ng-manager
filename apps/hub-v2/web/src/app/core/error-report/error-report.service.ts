import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { APP_CONFIG } from '@environments/environment';

import { AppUpdateService } from '../services/app-update.service';
import type { AppVersionManifest, ClientErrorReportPayload, ErrorReportInput } from './error-report.types';
import { isChunkLoadError, normalizeError, normalizeText, sanitizeExtra, sanitizeUrl } from './error-report.util';

const ERROR_REPORT_ENDPOINT = '/api/client/error-reports';
const DEDUPE_WINDOW_MS = 5000;

@Injectable({ providedIn: 'root' })
export class ErrorReportService {
  private readonly router = inject(Router);
  private readonly appUpdate = inject(AppUpdateService);
  private readonly enabled = APP_CONFIG.production;
  private readonly recentReports = new Map<string, number>();
  private versionInfo: AppVersionManifest | null = null;
  private versionPromise: Promise<AppVersionManifest | null> | null = null;

  report(input: ErrorReportInput): void {
    if (!this.enabled || typeof window === 'undefined') {
      return;
    }

    const normalized = normalizeError(input.error);
    const isChunkError = input.type === 'chunk-load' || isChunkLoadError(input.error, input.message);
    const type = isChunkError ? 'chunk-load' : input.type;
    const message = normalizeText(input.message) ?? normalized.message;
    const stack = normalizeText(input.stack, 12000) ?? normalized.stack;
    const source = sanitizeUrl(input.source);
    const route = this.router.url || window.location.pathname;

    const dedupeKey = [type, message, source ?? '', route].join('|');
    if (this.isDuplicate(dedupeKey)) {
      return;
    }

    const basePayload: ClientErrorReportPayload = {
      level: input.level ?? 'error',
      type,
      message,
      stack,
      source,
      lineno: input.lineno ?? null,
      colno: input.colno ?? null,
      url: sanitizeUrl(window.location.href),
      route: sanitizeUrl(route),
      appVersion: this.versionInfo?.version ?? null,
      buildHash: this.resolveBuildHash(this.versionInfo),
      requestMethod: normalizeText(input.requestMethod, 20)?.toUpperCase() ?? null,
      requestUrl: sanitizeUrl(input.requestUrl),
      statusCode: input.statusCode ?? null,
      extra: sanitizeExtra({
        ...(input.extra ?? {}),
        errorName: normalized.name,
        environment: APP_CONFIG.environment,
      }),
    };

    void this.dispatchWithVersion(basePayload);

    if (isChunkError) {
      this.appUpdate.notifyAssetUpdateFromError();
    }
  }

  isReportEndpoint(url: string): boolean {
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.pathname === ERROR_REPORT_ENDPOINT;
    } catch {
      return url.includes(ERROR_REPORT_ENDPOINT);
    }
  }

  private async dispatchWithVersion(payload: ClientErrorReportPayload): Promise<void> {
    const version = await this.loadVersionInfo();
    const enriched: ClientErrorReportPayload = {
      ...payload,
      appVersion: payload.appVersion ?? version?.version ?? null,
      buildHash: payload.buildHash ?? this.resolveBuildHash(version),
    };
    await this.send(enriched);
  }

  private async send(payload: ClientErrorReportPayload): Promise<void> {
    try {
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(ERROR_REPORT_ENDPOINT, blob)) {
          return;
        }
      }

      await fetch(ERROR_REPORT_ENDPOINT, {
        method: 'POST',
        body,
        credentials: 'same-origin',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch {
      // Client diagnostics must never affect business flows.
    }
  }

  private async loadVersionInfo(): Promise<AppVersionManifest | null> {
    if (this.versionInfo) {
      return this.versionInfo;
    }
    if (!this.versionPromise) {
      this.versionPromise = fetch('/version.json', {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((value: unknown) => {
          this.versionInfo = this.isVersionManifest(value) ? value : null;
          return this.versionInfo;
        })
        .catch(() => null);
    }
    return this.versionPromise;
  }

  private resolveBuildHash(version: AppVersionManifest | null): string | null {
    return normalizeText(version?.buildId) ?? normalizeText(version?.commit);
  }

  private isDuplicate(key: string): boolean {
    const now = Date.now();
    for (const [reportKey, timestamp] of this.recentReports) {
      if (now - timestamp > DEDUPE_WINDOW_MS) {
        this.recentReports.delete(reportKey);
      }
    }
    const lastSeen = this.recentReports.get(key);
    if (lastSeen && now - lastSeen <= DEDUPE_WINDOW_MS) {
      return true;
    }
    this.recentReports.set(key, now);
    return false;
  }

  private isVersionManifest(value: unknown): value is AppVersionManifest {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const record = value as Record<string, unknown>;
    return (
      record['app'] === 'hub-v2' &&
      typeof record['version'] === 'string' &&
      typeof record['buildTime'] === 'string' &&
      typeof record['commit'] === 'string' &&
      typeof record['buildId'] === 'string'
    );
  }
}
