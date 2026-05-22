import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmptyStateComponent, LoadingStateComponent, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import type { AuditLogAction, AuditLogEntity, AuditLogLevel, AuditLogModule } from '../../models/audit-log.model';
import { AUDIT_ACTION_LABELS, AUDIT_LEVEL_LABELS, AUDIT_MODULE_LABELS } from '../../models/audit-log.model';
import { AuditLogApiService } from '../../services/audit-log-api.service';
import { buildAuditChangeRows, formatAuditLogJson } from './audit-log-diff.util';

@Component({
  selector: 'app-audit-log-page',
  imports: [
    DatePipe,
    FormsModule,
    NzButtonModule,
    NzCollapseModule,
    NzDatePickerModule,
    NzDrawerModule,
    NzIconModule,
    NzPaginationModule,
    NzSelectModule,
    NzTagModule,
    NzTooltipModule,
    PageHeaderComponent,
    PageToolbarComponent,
    SearchBoxComponent,
    LoadingStateComponent,
    EmptyStateComponent,
  ],
  template: `
    <app-page-header title="审计日志" [subtitle]="subtitle()" />

    <app-page-toolbar>
      <button toolbar-primary nz-button nzType="primary" (click)="load()">
        <nz-icon nzType="reload" /> 刷新
      </button>
      <button toolbar-primary nz-button disabled nz-tooltip nzTooltipTitle="导出日志暂未开放">
        <nz-icon nzType="download" /> 导出日志
      </button>

      <nz-select toolbar-filters style="width: 140px" [ngModel]="moduleFilter()" (ngModelChange)="setModule($event)">
        <nz-option nzLabel="全部模块" nzValue="" />
        @for (item of moduleOptions; track item.value) {
          <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
        }
      </nz-select>
      <nz-select toolbar-filters style="width: 120px" [ngModel]="actionFilter()" (ngModelChange)="setAction($event)">
        <nz-option nzLabel="全部动作" nzValue="" />
        @for (item of actionOptions; track item.value) {
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
        placeholder="搜索内容、操作人、对象、IP…"
        [value]="keyword()"
        (valueChange)="keyword.set($event)"
        (submitted)="search()"
      />
    </app-page-toolbar>

    @if (loading()) {
      <app-loading-state text="正在加载审计日志…" />
    } @else if (items().length === 0) {
      <app-empty-state title="暂无审计日志" description="后台管理写操作成功后会自动记录在这里" />
    } @else {
      <div class="audit-table">
        <div class="audit-table__head">
          <span>级别</span>
          <span>时间</span>
          <span>操作人</span>
          <span>模块</span>
          <span>动作</span>
          <span>目标对象</span>
          <span>操作内容</span>
          <span>IP</span>
        </div>
        @for (item of items(); track item.id) {
          <button type="button" class="audit-table__row" (click)="openDetail(item)">
            <span><nz-tag [nzColor]="levelColor(item.level)">{{ levelLabel(item.level) }}</nz-tag></span>
            <span class="mono">{{ item.createdAt | date: 'yyyy-MM-dd HH:mm:ss' }}</span>
            <span class="strong">{{ item.actorName || item.actorId || '-' }}</span>
            <span>{{ moduleLabel(item.module) }}</span>
            <span>{{ actionLabel(item.action) }}</span>
            <span class="target">{{ item.targetName || item.targetId || '-' }}</span>
            <span class="summary">{{ item.summary }}</span>
            <span class="mono">{{ item.ip || '-' }}</span>
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
      [nzWidth]="720"
      [nzBodyStyle]="drawerBodyStyle"
      [nzTitle]="drawerTitleTpl"
      (nzOnClose)="closeDetail()"
    >
      <ng-template #drawerTitleTpl>
        <div class="drawer-title">
          <strong>审计详情</strong>
          @if (selected(); as current) {
            <span>{{ current.id }}</span>
          }
        </div>
      </ng-template>
      <ng-container *nzDrawerContent>
        @if (selected(); as current) {
          <div class="detail-grid">
            <div><label>模块</label><span>{{ moduleLabel(current.module) }}</span></div>
            <div><label>动作</label><span>{{ actionLabel(current.action) }}</span></div>
            <div><label>操作人</label><span>{{ current.actorName || current.actorId || '-' }}</span></div>
            <div><label>用户 ID</label><span class="mono">{{ current.actorUserId || '-' }}</span></div>
            <div><label>目标类型</label><span class="mono">{{ current.targetType || '-' }}</span></div>
            <div><label>目标 ID</label><span class="mono">{{ current.targetId || '-' }}</span></div>
            <div><label>IP</label><span class="mono">{{ current.ip || '-' }}</span></div>
            <div><label>Request ID</label><span class="mono">{{ current.requestId || '-' }}</span></div>
            <div class="detail-grid__wide"><label>User-Agent</label><span class="mono wrap">{{ current.userAgent || '-' }}</span></div>
            <div class="detail-grid__wide"><label>摘要</label><span>{{ current.summary }}</span></div>
          </div>

          <section class="change-section">
            <div class="section-title">
              <h3>变更内容</h3>
              <span>{{ changeSummary() }}</span>
            </div>
            @if (changeRows().length > 0) {
              <div class="change-table">
                <div class="change-table__head">
                  <span>字段</span>
                  <span>变更前</span>
                  <span>变更后</span>
                </div>
                @for (row of changeRows(); track row.key) {
                  <div class="change-table__row" [class.change-table__row--added]="row.kind === 'added'" [class.change-table__row--removed]="row.kind === 'removed'">
                    <span class="change-field">{{ row.label }}</span>
                    <span class="change-value">{{ row.before }}</span>
                    <span class="change-value">{{ row.after }}</span>
                  </div>
                }
              </div>
            } @else {
              <div class="change-empty">本次操作未记录字段级变更</div>
            }
          </section>

          <section class="raw-section">
            <nz-collapse nzGhost>
              <nz-collapse-panel nzHeader="Meta 原始数据">
                <pre>{{ rawData().meta }}</pre>
              </nz-collapse-panel>
              <nz-collapse-panel nzHeader="Before 原始数据">
                <pre>{{ rawData().before }}</pre>
              </nz-collapse-panel>
              <nz-collapse-panel nzHeader="After 原始数据">
                <pre>{{ rawData().after }}</pre>
              </nz-collapse-panel>
            </nz-collapse>
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
      .audit-table {
        overflow-x: auto;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-container);
      }
      .audit-table__head,
      .audit-table__row {
        display: grid;
        grid-template-columns: 84px 170px 130px 110px 90px 150px minmax(260px, 1fr) 130px;
        gap: 12px;
        min-width: 1220px;
        align-items: center;
        padding: 12px 16px;
      }
      .audit-table__head {
        color: var(--text-muted);
        background: var(--bg-subtle);
        font-size: 12px;
        font-weight: 700;
      }
      .audit-table__row {
        width: 100%;
        border: 0;
        border-top: 1px solid var(--border-color-soft);
        background: transparent;
        color: var(--text-secondary);
        text-align: left;
        cursor: pointer;
      }
      .audit-table__row:hover {
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
      .target {
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
      .change-section,
      .raw-section {
        margin-top: 16px;
      }
      .section-title {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
      }
      .section-title h3 {
        margin: 0 0 8px;
        color: var(--text-heading);
        font-size: 14px;
      }
      .section-title span {
        color: var(--text-muted);
        font-size: 12px;
      }
      .change-table {
        overflow: hidden;
        border: 1px solid var(--border-color-soft);
        border-radius: 8px;
        background: var(--bg-container);
      }
      .change-table__head,
      .change-table__row {
        display: grid;
        grid-template-columns: 150px minmax(0, 1fr) minmax(0, 1fr);
        gap: 12px;
        align-items: start;
        padding: 10px 12px;
      }
      .change-table__head {
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }
      .change-table__row {
        border-top: 1px solid var(--border-color-soft);
        color: var(--text-secondary);
      }
      .change-table__row--added .change-value:last-child {
        color: var(--color-success);
      }
      .change-table__row--removed .change-value:nth-child(2) {
        color: var(--color-danger);
      }
      .change-field {
        color: var(--text-heading);
        font-weight: 700;
      }
      .change-value {
        min-width: 0;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      .change-empty {
        padding: 18px;
        border: 1px dashed var(--border-color);
        border-radius: 8px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        text-align: center;
      }
      .raw-section {
        border: 1px solid var(--border-color-soft);
        border-radius: 8px;
        background: var(--bg-container);
      }
      .raw-section ::ng-deep .ant-collapse {
        background: transparent;
      }
      .raw-section ::ng-deep .ant-collapse-header {
        color: var(--text-heading);
        font-weight: 700;
      }
      pre {
        max-height: 260px;
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
        .change-table__head {
          display: none;
        }
        .change-table__row {
          grid-template-columns: 1fr;
          gap: 6px;
        }
        .change-value::before {
          display: block;
          margin-bottom: 2px;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 700;
        }
        .change-value:nth-child(2)::before {
          content: '变更前';
        }
        .change-value:nth-child(3)::before {
          content: '变更后';
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogPageComponent {
  private readonly api = inject(AuditLogApiService);
  private readonly message = inject(NzMessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<AuditLogEntity[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly loading = signal(false);
  readonly keyword = signal('');
  readonly moduleFilter = signal<AuditLogModule | ''>('');
  readonly actionFilter = signal<AuditLogAction | ''>('');
  readonly levelFilter = signal<AuditLogLevel | ''>('');
  readonly dateFrom = signal<Date | null>(null);
  readonly dateTo = signal<Date | null>(null);
  readonly selected = signal<AuditLogEntity | null>(null);
  readonly detailOpen = signal(false);
  readonly subtitle = computed(() => `共 ${this.total()} 条后台管理操作记录，支持按模块、动作、级别和时间筛选`);
  readonly changeRows = computed(() => buildAuditChangeRows(this.selected()));
  readonly changeSummary = computed(() => {
    const total = this.changeRows().length;
    return total > 0 ? `共 ${total} 项变化` : '无字段变化';
  });
  readonly rawData = computed(() => {
    const current = this.selected();
    return {
      meta: formatAuditLogJson(current?.metaJson ?? null),
      before: formatAuditLogJson(current?.beforeJson ?? null),
      after: formatAuditLogJson(current?.afterJson ?? null),
    };
  });
  readonly drawerBodyStyle = { padding: '18px 20px 24px', overflow: 'auto' };

  readonly moduleOptions = Object.entries(AUDIT_MODULE_LABELS).map(([value, label]) => ({ value: value as AuditLogModule, label }));
  readonly actionOptions = Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value: value as AuditLogAction, label }));
  readonly levelOptions = Object.entries(AUDIT_LEVEL_LABELS).map(([value, label]) => ({ value: value as AuditLogLevel, label }));

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.keyword.set(params.get('keyword') ?? '');
      this.page.set(1);
      this.load();
    });
  }

  load(): void {
    this.loading.set(true);
    this.api.list({
      page: this.page(),
      pageSize: this.pageSize(),
      keyword: this.keyword().trim() || undefined,
      module: this.moduleFilter() || undefined,
      action: this.actionFilter() || undefined,
      level: this.levelFilter() || undefined,
      dateFrom: this.toStartIso(this.dateFrom()),
      dateTo: this.toEndIso(this.dateTo()),
    }).subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.page.set(result.page);
        this.pageSize.set(result.pageSize);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.message.error('加载审计日志失败');
      },
    });
  }

  search(): void {
    this.page.set(1);
    this.load();
  }

  setModule(value: AuditLogModule | ''): void {
    this.moduleFilter.set(value);
    this.search();
  }

  setAction(value: AuditLogAction | ''): void {
    this.actionFilter.set(value);
    this.search();
  }

  setLevel(value: AuditLogLevel | ''): void {
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

  openDetail(item: AuditLogEntity): void {
    this.selected.set(item);
    this.detailOpen.set(true);
  }

  closeDetail(): void {
    this.detailOpen.set(false);
    this.selected.set(null);
  }

  moduleLabel(value: AuditLogModule): string {
    return AUDIT_MODULE_LABELS[value];
  }

  actionLabel(value: AuditLogAction): string {
    return AUDIT_ACTION_LABELS[value];
  }

  levelLabel(value: AuditLogLevel): string {
    return AUDIT_LEVEL_LABELS[value];
  }

  levelColor(value: AuditLogLevel): string {
    return value === 'error' ? 'red' : value === 'warn' ? 'orange' : 'blue';
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
