import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, APP_INITIALIZER, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { registerLocaleData } from '@angular/common';
import zh from '@angular/common/locales/zh';
import { MARKED_OPTIONS, provideMarkdown } from 'ngx-markdown';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';
import { UiStore } from './core/state/ui.store';
// const ngZorroConfig: NzConfig = {
//   theme: {
//     primaryColor: '#4f46e5',
//   },
//   message: {
//     nzTop: 60,
//   },
//   notification: {
//     nzTop: 60,
//   },
// };
registerLocaleData(zh);
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
    provideMarkdown({
      markedOptions: {
        provide: MARKED_OPTIONS,
        useValue: {
          gfm: true,
          breaks: true,
        },
      },
    }),
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [UiStore],
      useFactory: (uiStore: UiStore) => () => uiStore.initTheme(),
    },

    // { provide: NZ_CONFIG, useValue: ngZorroConfig },
  ],
};
