import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EmptyStateComponent, LoadingStateComponent, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';

import type { ClientErrorReportEntity, ClientErrorReportLevel, ClientErrorReportType } from '../../models/client-error-report.model';
import { CLIENT_ERROR_LEVEL_LABELS, CLIENT_ERROR_TYPE_LABELS } from '../../models/client-error-report.model';
import { ClientErrorReportApiService } from '../../services/client-error-report-api.service';

@Component({
  selector: 'app-client-error-report-page',
  imports: [
    DatePipe,
    FormsModule,
    NzButtonModule,
    NzDatePickerModule,
    NzDrawerModule,
    NzIconModule,
    NzPaginationModule,
    NzSelectModule,
    NzTagModule,
    PageHeaderComponent,
    PageToolbarComponent,
    SearchBoxComponent,
    LoadingStateComponent,
    EmptyStateComponent,
  ],
  template: `
    <app-page-header title="前端错误日志" subtitle="查看浏览器运行时、资源、HTTP 和 Chunk 加载异常。" />

    <app-page-toolbar>
      <button toolbar-primary nz-button nzType="primary" (click)="load()">
        <nz-icon nzType="reload" /> 刷新
      </button>

      <nz-select toolbar-filters style="width: 140px" [ngModel]="typeFilter()" (ngModelChange)="setType($event)">
        <nz-option nzLabel="全部类型" nzValue="" />
        @for (item of typeOptions; track item.value) {
          <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
        }
      </nz-select>
      <nz-select toolbar-filters style="width: 120px" [ngModel]="levelFilter()" (ngModelChange)="setLevel($event)">
        <nz-option nzLabel="全部级别" nzValue="" />
        @for (item of levelOptions; track item.value) {
          <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
        }
      </nz-select>
      <nz-date-picker
        toolbar-filters
        class="date-input"
        nzPlaceHolder="开始日期"
        [ngModel]="dateFrom()"
        (ngModelChange)="setDateFrom($event)"
      />
      <nz-date-picker
        toolbar-filters
        class="date-input"
        nzPlaceHolder="结束日期"
        [ngModel]="dateTo()"
        (ngModelChange)="setDateTo($event)"
      />

      <app-search-box
        toolbar-search
        placeholder="搜索摘要、route、URL、用户、浏览器…"
        [value]="keyword()"
        (valueChange)="keyword.set($event)"
        (submitted)="search()"
      />
    </app-page-toolbar>

    @if (loading()) {
      <app-loading-state text="正在加载前端错误日志…" />
    } @else if (items().length === 0) {
      <app-empty-state title="暂无前端错误日志" description="生产环境捕获到浏览器异常后会显示在这里" />
    } @else {
      <div class="error-table">
        <div class="error-table__head">
          <span>最近出现时间</span>
          <span>错误类型</span>
          <span>级别</span>
          <span>错误摘要</span>
          <span>页面 route</span>
          <span>次数</span>
          <span>用户</span>
          <span>浏览器</span>
          <span>版本 / buildHash</span>
        </div>
        @for (item of items(); track item.id) {
          <button type="button" class="error-table__row" (click)="openDetail(item)">
            <span class="mono">{{ item.lastSeenAt | date: 'yyyy-MM-dd HH:mm:ss' }}</span>
            <span>{{ typeLabel(item.type) }}</span>
            <span><nz-tag [nzColor]="levelColor(item.level)">{{ levelLabel(item.level) }}</nz-tag></span>
            <span class="summary">{{ item.message }}</span>
            <span class="mono ellipsis">{{ item.route || '-' }}</span>
            <span class="strong">{{ item.occurrenceCount }}</span>
            <span class="ellipsis">{{ item.username || item.userId || '-' }}</span>
            <span class="ellipsis">{{ browserLabel(item.userAgent) }}</span>
            <span class="mono ellipsis">{{ versionLabel(item) }}</span>
          </button>
        }
      </div>

      <div class="pagination-bar">
        <span>共 {{ total() }} 条记录</span>
        <nz-pagination
          [nzPageIndex]="page()"
          [nzPageSize]="pageSize()"
          [nzTotal]="total()"
          [nzShowSizeChanger]="true"
          (nzPageIndexChange)="changePage($event)"
          (nzPageSizeChange)="changePageSize($event)"
        />
      </div>
    }

    <nz-drawer
      [nzVisible]="detailOpen()"
      [nzWidth]="760"
      [nzBodyStyle]="drawerBodyStyle"
      [nzTitle]="drawerTitleTpl"
      (nzOnClose)="closeDetail()"
    >
      <ng-template #drawerTitleTpl>
        <div class="drawer-title">
          <strong>前端错误详情</strong>
          @if (selected(); as current) {
            <span>{{ current.fingerprint }}</span>
          }
        </div>
      </ng-template>
      <ng-container *nzDrawerContent>
        @if (detailLoading()) {
          <app-loading-state text="正在加载错误详情…" />
        } @else if (selected(); as current) {
          <div class="detail-grid">
            <div class="detail-grid__wide"><label>message</label><span>{{ current.message }}</span></div>
            <div><label>type</label><span>{{ typeLabel(current.type) }}</span></div>
            <div><label>level</label><span>{{ levelLabel(current.level) }}</span></div>
            <div><label>source</label><span class="mono wrap">{{ current.source || '-' }}</span></div>
            <div><label>route</label><span class="mono wrap">{{ current.route || '-' }}</span></div>
            <div class="detail-grid__wide"><label>url</label><span class="mono wrap">{{ current.url || '-' }}</span></div>
            <div class="detail-grid__wide"><label>userAgent</label><span class="mono wrap">{{ current.userAgent || '-' }}</span></div>
            <div><label>user</label><span>{{ current.username || current.userId || '-' }}</span></div>
            <div><label>ip</label><span class="mono">{{ current.ip || '-' }}</span></div>
            <div><label>appVersion</label><span class="mono">{{ current.appVersion || '-' }}</span></div>
            <div><label>buildHash</label><span class="mono">{{ current.buildHash || '-' }}</span></div>
            <div><label>requestMethod</label><span class="mono">{{ current.requestMethod || '-' }}</span></div>
            <div><label>statusCode</label><span class="mono">{{ current.statusCode ?? '-' }}</span></div>
            <div class="detail-grid__wide"><label>requestUrl</label><span class="mono wrap">{{ current.requestUrl || '-' }}</span></div>
            <div><label>first_seen_at</label><span class="mono">{{ current.firstSeenAt | date: 'yyyy-MM-dd HH:mm:ss' }}</span></div>
            <div><label>last_seen_at</label><span class="mono">{{ current.lastSeenAt | date: 'yyyy-MM-dd HH:mm:ss' }}</span></div>
            <div><label>occurrence_count</label><span class="mono">{{ current.occurrenceCount }}</span></div>
            <div><label>位置</label><span class="mono">line {{ current.lineno ?? '-' }}, col {{ current.colno ?? '-' }}</span></div>
          </div>

          <section class="raw-section">
            <h3>stack</h3>
            <pre>{{ current.stack || '-' }}</pre>
          </section>
          <section class="raw-section">
            <h3>extra_json</h3>
            <pre>{{ formatJson(current.extraJson) }}</pre>
          </section>
        }
      </ng-container>
    </nz-drawer>
  `,
  styles: [
    `
      .date-input {
        width: 150px;
      }
      .error-table {
        overflow-x: auto;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-container);
      }
      .error-table__head,
      .error-table__row {
        display: grid;
        grid-template-columns: 170px 130px 86px minmax(260px, 1fr) 180px 70px 120px 150px 180px;
        gap: 12px;
        min-width: 1400px;
        align-items: center;
        padding: 12px 16px;
      }
      .error-table__head {
        color: var(--text-muted);
        background: var(--bg-subtle);
        font-size: 12px;
        font-weight: 700;
      }
      .error-table__row {
        width: 100%;
        border: 0;
        border-top: 1px solid var(--border-color-soft);
        background: transparent;
        color: var(--text-secondary);
        text-align: left;
        cursor: pointer;
      }
      .error-table__row:hover {
        background: var(--bg-subtle);
      }
      .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
      }
      .strong {
        color: var(--text-heading);
        font-weight: 700;
      }
      .summary,
      .ellipsis {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .pagination-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-top: 16px;
        color: var(--text-muted);
      }
      .drawer-title {
        display: grid;
        gap: 4px;
      }
      .drawer-title span {
        color: var(--text-muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        font-weight: 400;
        overflow-wrap: anywhere;
      }
      .detail-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .detail-grid > div {
        display: grid;
        gap: 5px;
        min-width: 0;
        padding: 10px 12px;
        border: 1px solid var(--border-color-soft);
        border-radius: 8px;
        background: var(--bg-subtle);
      }
      .detail-grid__wide {
        grid-column: 1 / -1;
      }
      label {
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }
      .wrap {
        overflow-wrap: anywhere;
      }
      .raw-section {
        margin-top: 16px;
      }
      .raw-section h3 {
        margin: 0 0 8px;
        color: var(--text-heading);
        font-size: 14px;
      }
      pre {
        max-height: 320px;
        overflow: auto;
        margin: 0;
        padding: 12px;
        border: 1px solid var(--border-color-soft);
        border-radius: 8px;
        background: var(--bg-subtle);
        color: var(--text-secondary);
        font-size: 12px;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      @media (max-width: 720px) {
        .pagination-bar {
          align-items: flex-start;
          flex-direction: column;
        }
        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientErrorReportPageComponent {
  private readonly api = inject(ClientErrorReportApiService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<ClientErrorReportEntity[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly keyword = signal('');
  readonly levelFilter = signal<ClientErrorReportLevel | ''>('');
  readonly typeFilter = signal<ClientErrorReportType | ''>('');
  readonly dateFrom = signal<Date | null>(null);
  readonly dateTo = signal<Date | null>(null);
  readonly selected = signal<ClientErrorReportEntity | null>(null);
  readonly detailOpen = signal(false);
  readonly drawerBodyStyle = { padding: '18px 20px 24px', overflow: 'auto' };

  readonly levelOptions = Object.entries(CLIENT_ERROR_LEVEL_LABELS).map(([value, label]) => ({ value: value as ClientErrorReportLevel, label }));
  readonly typeOptions = Object.entries(CLIENT_ERROR_TYPE_LABELS).map(([value, label]) => ({ value: value as ClientErrorReportType, label }));

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.list({
      page: this.page(),
      pageSize: this.pageSize(),
      keyword: this.keyword().trim() || undefined,
      level: this.levelFilter() || undefined,
      type: this.typeFilter() || undefined,
      dateFrom: this.toStartIso(this.dateFrom()),
      dateTo: this.toEndIso(this.dateTo()),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.page.set(result.page);
        this.pageSize.set(result.pageSize);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.message.error('加载前端错误日志失败');
      },
    });
  }

  search(): void {
    this.page.set(1);
    this.load();
  }

  setType(value: ClientErrorReportType | ''): void {
    this.typeFilter.set(value);
    this.search();
  }

  setLevel(value: ClientErrorReportLevel | ''): void {
    this.levelFilter.set(value);
    this.search();
  }

  setDateFrom(value: Date | null): void {
    this.dateFrom.set(value);
    this.search();
  }

  setDateTo(value: Date | null): void {
    this.dateTo.set(value);
    this.search();
  }

  changePage(page: number): void {
    this.page.set(page);
    this.load();
  }

  changePageSize(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.load();
  }

  openDetail(item: ClientErrorReportEntity): void {
    this.selected.set(item);
    this.detailOpen.set(true);
    this.detailLoading.set(true);
    this.api.getById(item.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (detail) => {
        this.selected.set(detail);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailLoading.set(false);
        this.message.error('加载错误详情失败');
      },
    });
  }

  closeDetail(): void {
    this.detailOpen.set(false);
    this.selected.set(null);
  }

  typeLabel(value: string): string {
    return CLIENT_ERROR_TYPE_LABELS[value as ClientErrorReportType] ?? value;
  }

  levelLabel(value: ClientErrorReportLevel): string {
    return CLIENT_ERROR_LEVEL_LABELS[value];
  }

  levelColor(value: ClientErrorReportLevel): string {
    return value === 'error' ? 'red' : value === 'warn' ? 'orange' : 'blue';
  }

  browserLabel(userAgent: string | null): string {
    if (!userAgent) {
      return '-';
    }
    if (/Edg\//.test(userAgent)) return 'Edge';
    if (/Chrome\//.test(userAgent)) return 'Chrome';
    if (/Firefox\//.test(userAgent)) return 'Firefox';
    if (/Safari\//.test(userAgent)) return 'Safari';
    return userAgent;
  }

  versionLabel(item: ClientErrorReportEntity): string {
    return [item.appVersion, item.buildHash].filter(Boolean).join(' / ') || '-';
  }

  formatJson(value: string | null): string {
    if (!value) {
      return '-';
    }
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  private toStartIso(value: Date | null): string | undefined {
    if (!value) {
      return undefined;
    }
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }

  private toEndIso(value: Date | null): string | undefined {
    if (!value) {
      return undefined;
    }
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }
}
