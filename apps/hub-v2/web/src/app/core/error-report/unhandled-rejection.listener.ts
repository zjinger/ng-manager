import { DestroyRef, Injectable, inject } from '@angular/core';

import { ErrorReportService } from './error-report.service';

@Injectable({ providedIn: 'root' })
export class UnhandledRejectionListener {
  private readonly reporter = inject(ErrorReportService);
  private readonly destroyRef = inject(DestroyRef);
  private started = false;

  start(): void {
    if (this.started || typeof window === 'undefined') {
      return;
    }

    this.started = true;
    const handler = (event: PromiseRejectionEvent): void => {
      this.reporter.report({
        type: 'unhandledrejection',
        error: event.reason,
        extra: {
          eventType: 'unhandledrejection',
        },
      });
    };

    window.addEventListener('unhandledrejection', handler);
    this.destroyRef.onDestroy(() => window.removeEventListener('unhandledrejection', handler));
  }
}
