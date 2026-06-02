import { DestroyRef, Injectable, inject } from '@angular/core';

import { ErrorReportService } from './error-report.service';

@Injectable({ providedIn: 'root' })
export class ResourceErrorListener {
  private readonly reporter = inject(ErrorReportService);
  private readonly destroyRef = inject(DestroyRef);
  private started = false;

  start(): void {
    if (this.started || typeof window === 'undefined') {
      return;
    }

    this.started = true;
    const handler = (event: Event): void => {
      const target = event.target;
      if (!isReportableResource(target)) {
        return;
      }

      const source = getResourceUrl(target);
      this.reporter.report({
        type: 'resource',
        message: `${target.tagName.toLowerCase()} resource failed to load`,
        source,
        extra: {
          eventType: 'resource-error',
          tagName: target.tagName.toLowerCase(),
          rel: target instanceof HTMLLinkElement ? target.rel : null,
        },
      });
    };

    window.addEventListener('error', handler, true);
    this.destroyRef.onDestroy(() => window.removeEventListener('error', handler, true));
  }
}

function isReportableResource(target: EventTarget | null): target is HTMLScriptElement | HTMLLinkElement | HTMLImageElement {
  return target instanceof HTMLScriptElement || target instanceof HTMLLinkElement || target instanceof HTMLImageElement;
}

function getResourceUrl(target: HTMLScriptElement | HTMLLinkElement | HTMLImageElement): string | null {
  if (target instanceof HTMLScriptElement) {
    return target.src || null;
  }
  if (target instanceof HTMLLinkElement) {
    return target.href || null;
  }
  return target.src || null;
}
