import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { ProjectContextStore } from '@core/state';
import { DataTableComponent, FilterBarComponent, ListStateComponent, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import type { FeedbackCategory, FeedbackSource, FeedbackStatus } from '../../models/feedback.model';
import { FeedbackStore } from '../../store/feedback.store';

@Component({
  selector: 'app-feedback-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    NzButtonModule,
    NzDrawerModule,
    NzIconModule,
    NzPaginationModule,
    NzSelectModule,
    NzTagModule,
    DataTableComponent,
    FilterBarComponent,
    ListStateComponent,
    PageHeaderComponent,
    PageToolbarComponent,
    SearchBoxComponent,
  ],
  providers: [FeedbackStore],
  template: `
    <app-page-header title="反馈管理" [subtitle]="subtitle()" />

    <app-page-toolbar>
      <app-filter-bar toolbar-filters class="toolbar__filters">
        <nz-select class="toolbar__status" [ngModel]="status()" (ngModelChange)="status.set($event)">
          <nz-option nzLabel="全部状态" nzValue=""></nz-option>
          <nz-option nzLabel="待处理" nzValue="open"></nz-option>
          <nz-option nzLabel="处理中" nzValue="processing"></nz-option>
          <nz-option nzLabel="已解决" nzValue="resolved"></nz-option>
          <nz-option nzLabel="已关闭" nzValue="closed"></nz-option>
        </nz-select>

        <nz-select class="toolbar__category" [ngModel]="category()" (ngModelChange)="category.set($event)">
          <nz-option nzLabel="全部类型" nzValue=""></nz-option>
          <nz-option nzLabel="缺陷" nzValue="bug"></nz-option>
          <nz-option nzLabel="建议" nzValue="suggestion"></nz-option>
          <nz-option nzLabel="功能需求" nzValue="feature"></nz-option>
          <nz-option nzLabel="其他" nzValue="other"></nz-option>
        </nz-select>

        <nz-select class="toolbar__source" [ngModel]="source()" (ngModelChange)="source.set($event)">
          <nz-option nzLabel="全部来源" nzValue=""></nz-option>
          <nz-option nzLabel="Web" nzValue="web"></nz-option>
          <nz-option nzLabel="桌面端" nzValue="desktop"></nz-option>
          <nz-option nzLabel="CLI" nzValue="cli"></nz-option>
          <nz-option nzLabel="移动端" nzValue="mobile"></nz-option>
          <nz-option nzLabel="小程序" nzValue="applet"></nz-option>
        </nz-select>

        <button nz-button class="toolbar__filter-btn" (click)="applyFilters()">筛选</button>
      </app-filter-bar>

      <app-search-box
        toolbar-search
        class="toolbar__search"
        placeholder="搜索反馈标题或内容"
        [value]="keyword()"
        (valueChange)="keyword.set($event)"
        (submitted)="applyFilters()"
      />
    </app-page-toolbar>

    <app-list-state
      [loading]="store.loading()"
      [empty]="store.items().length === 0"
      loadingText="正在加载反馈列表…"
      emptyTitle="当前筛选条件下没有反馈"
      emptyDescription="可从线上项目通过 public feedback 接口提交反馈。"
    >
      <app-data-table>
        <div table-head class="feedback-table__head">
          <div>序号</div>
          <div>标题</div>
          <div>类型</div>
          <div>状态</div>
          <div>来源</div>
          <div>创建时间</div>
        </div>

        <div table-body class="feedback-table__body">
          @for (item of store.items(); track item.id; let i = $index) {
            <button type="button" class="feedback-row" [class.is-active]="store.selectedId() === item.id" (click)="openDetail(item.id)">
              <div>{{ sequence(i) }}</div>
              <div class="feedback-row__title">
                <div class="feedback-row__title-main">{{ item.title }}</div>
                <div class="feedback-row__title-sub">{{ item.id }}</div>
              </div>
              <div><nz-tag>{{ categoryLabel(item.category) }}</nz-tag></div>
              <div><nz-tag [nzColor]="statusColor(item.status)">{{ statusLabel(item.status) }}</nz-tag></div>
              <div>{{ sourceLabel(item.source) }}</div>
              <div>{{ item.createdAt | date: 'MM-dd HH:mm' }}</div>
            </button>
          }
        </div>
      </app-data-table>

      @if (store.total() > 0) {
        <div class="feedback-pagination">
          <nz-pagination
            [nzTotal]="store.total()"
            [nzPageIndex]="store.page()"
            [nzPageSize]="store.pageSize()"
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

    <nz-drawer
      [nzVisible]="!!store.selectedId()"
      [nzWidth]="560"
      [nzClosable]="true"
      nzPlacement="right"
      [nzTitle]="drawerTitle"
      (nzOnClose)="closeDetail()"
    >
      <ng-template #drawerTitle>
        <div class="drawer-title">
          <div class="drawer-title__main">反馈详情</div>
          @if (store.selected(); as current) {
            <div class="drawer-title__sub">{{ current.id }}</div>
          }
        </div>
      </ng-template>

      <ng-template nzDrawerContent>
        @if (store.detailLoading()) {
          <div class="drawer-placeholder">正在加载详情…</div>
        } @else if (store.selected(); as current) {
          <div class="feedback-detail">
            <div class="feedback-detail__title">{{ current.title }}</div>
            <div class="feedback-detail__content">{{ current.content }}</div>

            <div class="feedback-detail__meta">
              <div><span>状态</span><nz-tag [nzColor]="statusColor(current.status)">{{ statusLabel(current.status) }}</nz-tag></div>
              <div><span>类型</span><span>{{ categoryLabel(current.category) }}</span></div>
              <div><span>来源</span><span>{{ sourceLabel(current.source) }}</span></div>
              <div><span>项目 Key</span><span>{{ current.projectKey || '-' }}</span></div>
              <div><span>联系方式</span><span>{{ current.contact || '-' }}</span></div>
              <div><span>客户端</span><span>{{ current.clientName || '-' }} / {{ current.clientVersion || '-' }}</span></div>
              <div><span>系统</span><span>{{ current.osInfo || '-' }}</span></div>
              <div><span>IP</span><span>{{ current.clientIp || '-' }}</span></div>
              <div><span>创建时间</span><span>{{ current.createdAt | date: 'yyyy-MM-dd HH:mm:ss' }}</span></div>
              <div><span>更新时间</span><span>{{ current.updatedAt | date: 'yyyy-MM-dd HH:mm:ss' }}</span></div>
            </div>

            <div class="feedback-detail__actions">
              <nz-select [ngModel]="pendingStatus()" (ngModelChange)="pendingStatus.set($event)">
                <nz-option nzLabel="待处理" nzValue="open"></nz-option>
                <nz-option nzLabel="处理中" nzValue="processing"></nz-option>
                <nz-option nzLabel="已解决" nzValue="resolved"></nz-option>
                <nz-option nzLabel="已关闭" nzValue="closed"></nz-option>
              </nz-select>
              <button nz-button nzType="primary" [disabled]="store.saving()" (click)="saveStatus()">保存状态</button>
            </div>
          </div>
        } @else {
          <div class="drawer-placeholder">请选择一条反馈查看详情</div>
        }
      </ng-template>
    </nz-drawer>
  `,
  styles: [
    `
      .toolbar__filters {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .toolbar__search {
        min-width: min(320px, 100%);
        flex: 1 1 320px;
      }
      .feedback-table__head,
      .feedback-row {
        display: grid;
        grid-template-columns: 64px minmax(0, 1.8fr) 110px 110px 110px 150px;
        gap: 12px;
        align-items: center;
      }
      .feedback-table__head {
        padding: 10px 16px;
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
        background: var(--bg-subtle);
        border-bottom: 1px solid var(--border-color-soft);
      }
      .feedback-row {
        width: 100%;
        padding: 12px 16px;
        border: 0;
        background: transparent;
        color: inherit;
        text-align: left;
        border-bottom: 1px solid var(--border-color-soft);
        cursor: pointer;
      }
      .feedback-row:hover {
        background: var(--bg-subtle);
      }
      .feedback-row.is-active {
        background: linear-gradient(90deg, rgba(99, 102, 241, 0.14), rgba(99, 102, 241, 0.04)), var(--bg-subtle);
        box-shadow: inset 3px 0 0 var(--primary-600);
      }
      .feedback-row__title {
        min-width: 0;
      }
      .feedback-row__title-main {
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .feedback-row__title-sub {
        margin-top: 4px;
        font-size: 12px;
        color: var(--text-muted);
      }
      .feedback-pagination {
        display: flex;
        justify-content: flex-end;
        padding: 16px 0 4px;
      }
      .drawer-title__main {
        font-weight: 700;
      }
      .drawer-title__sub {
        margin-top: 4px;
        font-size: 12px;
        color: var(--text-muted);
      }
      .drawer-placeholder {
        color: var(--text-muted);
      }
      .feedback-detail__title {
        font-size: 18px;
        font-weight: 700;
      }
      .feedback-detail__content {
        margin-top: 12px;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid var(--border-color);
        background: var(--bg-subtle);
        white-space: pre-wrap;
        line-height: 1.6;
      }
      .feedback-detail__meta {
        margin-top: 16px;
        display: grid;
        gap: 8px;
      }
      .feedback-detail__meta > div {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        font-size: 13px;
      }
      .feedback-detail__meta > div > span:first-child {
        color: var(--text-muted);
      }
      .feedback-detail__actions {
        margin-top: 16px;
        display: flex;
        gap: 12px;
      }
      .feedback-detail__actions nz-select {
        flex: 1;
      }
      @media (max-width: 960px) {
        .feedback-table__head {
          display: none;
        }
        .feedback-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedbackPageComponent {
  readonly store = inject(FeedbackStore);
  readonly projectContext = inject(ProjectContextStore);

  readonly keyword = signal('');
  readonly status = signal<FeedbackStatus | ''>('');
  readonly category = signal<FeedbackCategory | ''>('');
  readonly source = signal<FeedbackSource | ''>('');
  readonly pendingStatus = signal<FeedbackStatus>('open');

  readonly subtitle = computed(() => {
    const projectName = this.projectContext.currentProject()?.name ?? '当前项目';
    return `${projectName} · 共 ${this.store.total()} 条反馈`;
  });

  private lastProjectId: string | null | undefined = undefined;

  constructor() {
    effect(() => {
      const projectId = this.projectContext.currentProject()?.id ?? null;
      const isFirstRun = this.lastProjectId === undefined;
      const projectChanged = !isFirstRun && projectId !== this.lastProjectId;
      this.lastProjectId = projectId;
      if (isFirstRun) {
        this.store.initialize(projectId);
        return;
      }
      if (projectChanged) {
        this.store.refreshForProject(projectId);
      }
    });

    effect(() => {
      const selected = this.store.selected();
      if (selected) {
        this.pendingStatus.set(selected.status);
      }
    });
  }

  applyFilters(): void {
    this.store.updateQuery({
      page: 1,
      keyword: this.keyword().trim(),
      status: this.status(),
      category: this.category(),
      source: this.source(),
    });
  }

  onPageIndexChange(page: number): void {
    this.store.updateQuery({ page });
  }

  onPageSizeChange(pageSize: number): void {
    const nextPageSize = Number(pageSize) || this.store.pageSize();
    if (nextPageSize === this.store.pageSize()) {
      return;
    }
    this.store.updateQuery({ page: 1, pageSize: nextPageSize });
  }

  openDetail(feedbackId: string): void {
    this.store.select(feedbackId);
  }

  closeDetail(): void {
    this.store.select(null);
  }

  saveStatus(): void {
    this.store.updateStatus(this.pendingStatus());
  }

  sequence(index: number): number {
    return (this.store.page() - 1) * this.store.pageSize() + index + 1;
  }

  statusLabel(status: FeedbackStatus): string {
    if (status === 'processing') return '处理中';
    if (status === 'resolved') return '已解决';
    if (status === 'closed') return '已关闭';
    return '待处理';
  }

  statusColor(status: FeedbackStatus): string {
    if (status === 'processing') return 'processing';
    if (status === 'resolved') return 'success';
    if (status === 'closed') return 'default';
    return 'warning';
  }

  categoryLabel(category: FeedbackCategory): string {
    if (category === 'bug') return '缺陷';
    if (category === 'suggestion') return '建议';
    if (category === 'feature') return '功能需求';
    return '其他';
  }

  sourceLabel(source: FeedbackSource): string {
    if (source === 'desktop') return '桌面端';
    if (source === 'cli') return 'CLI';
    if (source === 'mobile') return '移动端';
    if (source === 'applet') return '小程序';
    return 'Web';
  }
}
