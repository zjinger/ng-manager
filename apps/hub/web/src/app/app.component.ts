import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterModule, RouterOutlet } from '@angular/router';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { HubWsEventType, HubWebsocketService } from './core/services/hub-websocket.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterModule,
    NzLayoutModule,
    NzMenuModule,
    NzIconModule,
    NzBadgeModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class App {
  protected readonly title = signal('NGM Admin');
  protected readonly unreadCount = signal(3);
  protected readonly ws = inject(HubWebsocketService);
  private readonly notification = inject(NzNotificationService);

  public constructor() {
    this.ws.events$.pipe(takeUntilDestroyed()).subscribe((event) => {
      const title = this.mapNotificationTitle(event.type);
      this.notification.info(title, event.message);
      this.unreadCount.update((count) => count + 1);
    });
  }

  private mapNotificationTitle(type: HubWsEventType): string {
    switch (type) {
      case 'feedback.created':
        return '新反馈通知';
      case 'announcement.created':
        return '新公告通知';
      case 'release.published':
        return '新版本发布';
      default:
        return '系统通知';
    }
  }
}
