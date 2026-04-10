import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
        [nzVisible]="menuVisible()"
        nzTrigger="click"
        nzPlacement="bottomRight"
        (nzVisibleChange)="onVisibleChange($event)"
      >
        <span nz-icon nzType="bell"></span>
      </button>
    </nz-badge>

    <nz-dropdown-menu #notificationMenu="nzDropdownMenu">
      <app-notification-dropdown
        [items]="store.previewItems()"
        [totalCount]="store.previewTotal()"
        (closeRequested)="closeMenu()"
      />
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
  readonly menuVisible = signal(false);
  readonly badgeCount = () => this.store.unreadCount();

  onVisibleChange(visible: boolean): void {
    this.menuVisible.set(visible);
    if (visible) {
      this.store.loadPreview();
    }
  }

  closeMenu(): void {
    this.menuVisible.set(false);
  }
}
