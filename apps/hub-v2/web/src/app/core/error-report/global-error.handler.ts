import { ErrorHandler, Injectable, inject } from '@angular/core';

import { ErrorReportService } from './error-report.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly reporter = inject(ErrorReportService);

  handleError(error: unknown): void {
    this.reporter.report({
      type: 'runtime',
      error,
    });
    console.error(error);
  }
}
