import { APP_INITIALIZER, ErrorHandler, Provider } from '@angular/core';

import { GlobalErrorHandler } from './global-error.handler';
import { ResourceErrorListener } from './resource-error.listener';
import { UnhandledRejectionListener } from './unhandled-rejection.listener';

export function provideClientErrorReporting(): Provider[] {
  return [
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [UnhandledRejectionListener, ResourceErrorListener],
      useFactory:
        (unhandledRejection: UnhandledRejectionListener, resourceError: ResourceErrorListener) => () => {
          unhandledRejection.start();
          resourceError.start();
        },
    },
  ];
}
