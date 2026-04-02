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
    <nz-badge [nzCount]="badgeCount()" [nzShowZero]="false" [nzOverflowCount]="99">
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
      </button>
    </nz-badge>

    <nz-dropdown-menu #notificationMenu="nzDropdownMenu">
      <app-notification-dropdown [items]="dropdownItems()" [totalCount]="store.items().length" />
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellComponent {
  readonly store = inject(NotificationStore);
  readonly badgeCount = () => this.store.unreadCount();
  readonly dropdownItems = () => this.store.items().slice(0, 20);

  onVisibleChange(visible: boolean): void {
    if (visible) {
      this.store.updateQuery({ limit: 50, page: undefined, pageSize: undefined });
    }
  }
}
