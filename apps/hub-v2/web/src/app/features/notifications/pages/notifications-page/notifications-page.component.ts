import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { ProjectContextStore } from '@core/state';
import { FilterBarComponent, ListStateComponent, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import { NotificationListComponent } from '../../components/notification-list/notification-list.component';
import { NotificationStore } from '../../store/notification.store';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [
    FormsModule,
    NzCheckboxModule,
    NzPaginationModule,
    NzSelectModule,
    NzButtonModule,
    PageHeaderComponent,
    PageToolbarComponent,
    FilterBarComponent,
    SearchBoxComponent,
    ListStateComponent,
    NotificationListComponent,
  ],
  template: `
    <app-page-header title="通知中心" subtitle="查看最近的待办与动态提醒" />

    <app-page-toolbar>
      <app-search-box
        toolbar-primary
        class="notifications-page__search"
        [placeholder]="'搜索通知标题、项目或来源'"
        [value]="store.query().keyword || ''"
        (valueChange)="onFilterChange({ keyword: $event || undefined })"
      />

      <app-filter-bar toolbar-filters class="notifications-page__filters">
        <nz-select
          nzPlaceHolder="全部类型"
          class="toolbar-select notifications-page__select"
          [ngModel]="store.query().kind || ''"
          (ngModelChange)="onFilterChange({ kind: $event || '' })"
        >
          <nz-option nzLabel="全部类型" nzValue=""></nz-option>
          <nz-option nzLabel="待办" nzValue="todo"></nz-option>
          <nz-option nzLabel="动态" nzValue="activity"></nz-option>
        </nz-select>

        <nz-select
          nzPlaceHolder="全部项目"
          class="toolbar-select notifications-page__select"
          [ngModel]="store.query().projectId || ''"
          (ngModelChange)="onFilterChange({ projectId: $event || undefined })"
        >
          <nz-option nzLabel="全部项目" nzValue=""></nz-option>
          @for (project of projects(); track project.id) {
            <nz-option [nzLabel]="project.name" [nzValue]="project.id"></nz-option>
          }
        </nz-select>

        <label
          nz-checkbox
          class="notifications-page__toggle"
          [ngModel]="store.unreadOnly()"
          (ngModelChange)="store.setUnreadOnly($event)"
        >
          只看未读
        </label>

        <button
          nz-button
          nzType="default"
          class="notifications-page__mark-read"
          [disabled]="store.unreadCount() === 0"
          (click)="store.markAllAsRead()"
        >
          全部标记已读
        </button>
      </app-filter-bar>
    </app-page-toolbar>

    <app-list-state
      [loading]="store.loading()"
      [empty]="store.filteredItems().length === 0"
      loadingText="正在加载通知…"
      emptyTitle="当前没有通知"
    >
      <app-notification-list [items]="store.filteredItems()" />

      @if (store.total() > 0 && !store.unreadOnly()) {
        <div class="notifications-page__pagination">
          <nz-pagination
            [nzTotal]="store.total()"
            [nzPageIndex]="store.query().page || 1"
            [nzPageSize]="store.query().pageSize || 20"
            [nzPageSizeOptions]="[10, 20, 50, 100]"
            [nzShowSizeChanger]="true"
            [nzShowQuickJumper]="true"
            [nzShowTotal]="totalTpl"
            (nzPageIndexChange)="onPageIndexChange($event)"
            (nzPageSizeChange)="onPageSizeChange($event)"
          ></nz-pagination>
          <ng-template #totalTpl let-total>共 {{ total }} 条</ng-template>
        </div>
      }
    </app-list-state>
  `,
  styles: [
    `
      .notifications-page__toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        height: 36px;
        padding: 0 12px;
        border-radius: 10px;
        color: var(--text-primary);
        background: var(--surface-elevated);
        border: 1px solid var(--border-color);
        cursor: pointer;
        transition:
          border-color 0.2s ease,
          background-color 0.2s ease,
          color 0.2s ease,
          box-shadow 0.2s ease;
      }
      .notifications-page__toggle.ant-checkbox-wrapper {
        gap: 8px;
        line-height: 1;
      }
      .notifications-page__toggle.ant-checkbox-wrapper ::ng-deep .ant-checkbox {
        top: 0;
      }
      .notifications-page__toggle.ant-checkbox-wrapper ::ng-deep .ant-checkbox + span {
        display: inline-flex;
        align-items: center;
        padding-inline-start: 0;
      }

      .notifications-page__toggle:hover {
        border-color: var(--primary-400);
      }
      .notifications-page__mark-read {
        height: 36px;
        border-radius: 10px;
      }

      .notifications-page__select {
        flex: 0 0 152px;
      }
      .notifications-page__search {
        min-width: min(320px, 100%);
      }
      .notifications-page__pagination {
        display: flex;
        justify-content: flex-end;
        padding: 16px 0 4px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPageComponent {
  readonly store = inject(NotificationStore);
  private readonly projectContext = inject(ProjectContextStore);
  readonly projects = this.projectContext.projects;
  readonly pageSize = signal(20);

  constructor() {
    this.store.updateQuery({ page: 1, pageSize: this.pageSize(), limit: undefined });
  }

  onFilterChange(query: Record<string, string | number | boolean | null | undefined>): void {
    this.store.updateQuery({ ...query, page: 1, pageSize: this.store.query().pageSize || this.pageSize(), limit: undefined });
  }

  onPageIndexChange(page: number): void {
    this.store.updateQuery({ page, pageSize: this.store.query().pageSize || this.pageSize(), limit: undefined });
  }

  onPageSizeChange(pageSize: number): void {
    const next = Number(pageSize) || 20;
    this.pageSize.set(next);
    this.store.updateQuery({ page: 1, pageSize: next, limit: undefined });
  }
}
