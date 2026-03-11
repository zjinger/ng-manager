import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import zh from '@angular/common/locales/zh';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNzI18n, zh_CN } from 'ng-zorro-antd/i18n';
import { AppInitializerProvider } from './app-initializer.service';
import { routes } from './app.routes';
import { httpErrorInterceptor } from './core/http/http-error.interceptor';

registerLocaleData(zh);

export const appConfig: ApplicationConfig = {
  providers: [
    AppInitializerProvider,
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideNzI18n(zh_CN),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
  ],
};
