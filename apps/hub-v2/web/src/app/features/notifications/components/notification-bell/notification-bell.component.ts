import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { NotificationStore } from '../../store/notification.store';
import { NotificationDropdownComponent } from '../notification-dropdown/notification-dropdown.component';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [NzBadgeModule, NzButtonModule, NzDropDownModule, NzIconModule, NotificationDropdownComponent],
  template: `
    <button
      nz-button
      nzType="text"
      class="topbar__icon-btn topbar__notification-btn"
      nzShape="circle"
      nz-dropdown
      [nzDropdownMenu]="notificationMenu"
      nzTrigger="click"
      nzPlacement="bottomRight"
      (nzVisibleChange)="onVisibleChange($event)"
    >
      <span nz-icon nzType="bell"></span>
      @if (store.unreadCount() > 0) {
        <span class="badge-dot"></span>
      }
    </button>

    <nz-dropdown-menu #notificationMenu="nzDropdownMenu">
      <app-notification-dropdown [items]="store.items()" />
    </nz-dropdown-menu>
  `,
  styles: [
    `
      .topbar__notification-btn {
        position: relative;
        width: 36px;
        height: 36px;
        color: var(--text-muted);
      }
      .badge-dot {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 8px;
        height: 8px;
        border: 2px solid var(--bg-container);
        border-radius: 50%;
        background: var(--color-danger);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellComponent {
  readonly store = inject(NotificationStore);

  onVisibleChange(visible: boolean): void {
    if (visible) {
      this.store.markAllAsRead();
    }
  }
}
