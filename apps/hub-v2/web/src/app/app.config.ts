import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';

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

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
    provideAnimations(),
   
    // { provide: NZ_CONFIG, useValue: ngZorroConfig },
  ],
};
