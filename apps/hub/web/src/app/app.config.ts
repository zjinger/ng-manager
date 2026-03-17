import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
  BellOutline,
  BranchesOutline,
  BugOutline,
  ClockCircleOutline,
  DashboardOutline,
  DownOutline,
  EyeInvisibleOutline,
  EyeOutline,
  FileTextOutline,
  MessageOutline,
  NotificationOutline,
  RocketOutline
} from '@ant-design/icons-angular/icons';
import { provideNzIcons } from 'ng-zorro-antd/icon';

import { registerLocaleData } from '@angular/common';
import zh from '@angular/common/locales/zh';
import { routes } from './app.routes';
import { HUB_API_BASE_URL } from './core/http/api-base-url.token';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';
import { apiUrlInterceptor } from './core/http/api-url.interceptor';
import { authRedirectInterceptor } from './core/http/auth-redirect.interceptor';
import { HUB_WS_URL } from './core/services/hub-websocket.service';
import { HUB_LOGIN_AES_KEY } from './core/utils/crypto.util';
registerLocaleData(zh);
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptors([apiUrlInterceptor, apiErrorInterceptor, authRedirectInterceptor])),
    provideNzIcons([
      DashboardOutline,
      NotificationOutline,
      FileTextOutline,
      MessageOutline,
      RocketOutline,
      BellOutline,
      BugOutline,
      DownOutline,
      ClockCircleOutline,
      BranchesOutline,
      EyeOutline,
      EyeInvisibleOutline
    ]),
    { provide: HUB_API_BASE_URL, useValue: '' },
    { provide: HUB_LOGIN_AES_KEY, useValue: 'ngm_hub_login_aes_2026' },
    { provide: HUB_WS_URL, useValue: 'ws://localhost:19527/ws' }
  ]
};
