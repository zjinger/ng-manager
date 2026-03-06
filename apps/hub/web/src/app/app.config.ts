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

import { routes } from './app.routes';
import { HUB_WS_URL } from './core/services/hub-websocket.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAnimations(),
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
    { provide: HUB_WS_URL, useValue: 'ws://localhost:3000/api/ws/admin' }
  ]
};
