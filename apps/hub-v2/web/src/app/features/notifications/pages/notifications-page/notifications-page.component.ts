import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ProjectContextStore } from '../../../../core/state/project-context.store';
import { FilterBarComponent } from '../../../../shared/ui/filter-bar/filter-bar.component';
import { ListStateComponent } from '../../../../shared/ui/list-state/list-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { SearchBoxComponent } from '../../../../shared/ui/search-box/search-box.component';
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
    PageHeaderComponent,
    FilterBarComponent,
    SearchBoxComponent,
    ListStateComponent,
    NotificationListComponent,
  ],
  template: `
    <app-page-header title="通知中心" subtitle="查看最近的待办、动态与公告提醒" />

    <app-filter-bar class="notifications-page__filters">
      <app-search-box
        class="notifications-page__search"
        [placeholder]="'搜索通知标题、项目或来源'"
        [value]="store.query().keyword || ''"
        (valueChange)="store.updateQuery({ keyword: $event || undefined })"
      />

      <nz-select
        nzPlaceHolder="全部类型"
        class="toolbar-select notifications-page__select"
        [ngModel]="store.query().kind || ''"
        (ngModelChange)="store.updateQuery({ kind: $event || '' })"
      >
        <nz-option nzLabel="全部类型" nzValue=""></nz-option>
        <nz-option nzLabel="待办" nzValue="todo"></nz-option>
        <nz-option nzLabel="动态" nzValue="activity"></nz-option>
        <nz-option nzLabel="公告" nzValue="announcement"></nz-option>
      </nz-select>

      <nz-select
        nzPlaceHolder="全部项目"
        class="toolbar-select notifications-page__select"
        [ngModel]="store.query().projectId || ''"
        (ngModelChange)="store.updateQuery({ projectId: $event || undefined })"
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
    </app-filter-bar>

    <app-list-state
      [loading]="store.loading()"
      [empty]="store.filteredItems().length === 0"
      loadingText="正在加载通知…"
      emptyTitle="当前没有通知"
    >
      <app-notification-list [items]="pagedItems()" />

      @if (total() > 0) {
        <div class="notifications-page__pagination">
          <nz-pagination
            [nzTotal]="total()"
            [nzPageIndex]="page()"
            [nzPageSize]="pageSize()"
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
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition:
          border-color 0.2s ease,
          background-color 0.2s ease,
          color 0.2s ease,
          box-shadow 0.2s ease;
      }

      .notifications-page__toggle:hover {
        border-color: var(--primary-400);
      }

      .notifications-page__toggle.ant-checkbox-wrapper-checked {
        border-color: var(--primary-300);
        background: color-mix(in srgb, var(--primary-50) 72%, var(--surface-elevated));
      }

      :host-context(html[data-theme='dark']) .notifications-page__toggle.ant-checkbox-wrapper-checked {
        background: rgba(79, 70, 229, 0.14);
        border-color: rgba(99, 102, 241, 0.34);
      }

      .notifications-page__filters {
        align-items: center;
      }

      .notifications-page__search {
        flex: 1 1 320px;
        min-width: min(320px, 100%);
      }

      .notifications-page__select {
        flex: 0 0 152px;
      }
      .notifications-page__pagination {
        display: flex;
        justify-content: flex-end;
        padding: 16px 0 4px;
      }

      @media (max-width: 960px) {
        .notifications-page__search,
        .notifications-page__select,
        .notifications-page__toggle {
          flex: 1 1 100%;
          width: 100%;
        }

        .notifications-page__toggle {
          justify-content: flex-start;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPageComponent {
  readonly store = inject(NotificationStore);
  private readonly projectContext = inject(ProjectContextStore);
  readonly projects = this.projectContext.projects;
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly total = computed(() => this.store.filteredItems().length);
  readonly pagedItems = computed(() => {
    const all = this.store.filteredItems();
    const page = this.page();
    const pageSize = this.pageSize();
    const start = (page - 1) * pageSize;
    return all.slice(start, start + pageSize);
  });

  constructor() {
    effect(() => {
      this.store.query();
      this.store.unreadOnly();
      this.page.set(1);
    });
  }

  onPageIndexChange(page: number): void {
    this.page.set(page);
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(Number(pageSize) || 20);
    this.page.set(1);
  }
}
