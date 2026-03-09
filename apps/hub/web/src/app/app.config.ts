import { provideAnimations } from '@angular/platform-browser/animations';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import {
  BellOutline,
  BranchesOutline,
  ClockCircleOutline,
  DashboardOutline,
  DownOutline,
  FileTextOutline,
  MessageOutline,
  NotificationOutline,
  RocketOutline
} from '@ant-design/icons-angular/icons';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { HUB_WS_URL } from './core/services/hub-websocket.service';
import { HUB_API_BASE_URL } from './core/http/api-base-url.token';
import { apiUrlInterceptor } from './core/http/api-url.interceptor';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptors([apiUrlInterceptor, apiErrorInterceptor])),
    provideNzIcons([
      DashboardOutline,
      NotificationOutline,
      FileTextOutline,
      MessageOutline,
      RocketOutline,
      BellOutline,
      DownOutline,
      ClockCircleOutline,
      BranchesOutline
    ]),
    { provide: HUB_API_BASE_URL, useValue: '' },
    { provide: HUB_WS_URL, useValue: '' }
  ]
};