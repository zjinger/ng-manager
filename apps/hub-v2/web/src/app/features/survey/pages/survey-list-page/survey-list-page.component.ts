import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';

import {
  DataTableComponent,
  FilterBarComponent,
  ListStateComponent,
  PageHeaderComponent,
  PageToolbarComponent,
  SearchBoxComponent,
} from '@shared/ui';
import type { SurveyEntity, SurveyStatus } from '../../models/survey.model';
import { SurveyApiService } from '../../services/survey-api.service';

@Component({
  selector: 'app-survey-list-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    NzButtonModule,
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
  template: `
    <app-page-header title="问卷调查" [subtitle]="'共 ' + total() + ' 份问卷'" />

    <app-page-toolbar>
      <button toolbar-primary nz-button nzType="primary" (click)="createSurvey()">新建问卷</button>

      <app-filter-bar toolbar-filters class="toolbar__filters">
        <nz-select style="width: 220px;" [ngModel]="status()" (ngModelChange)="status.set($event)">
          <nz-option nzLabel="全部状态" nzValue=""></nz-option>
          <nz-option nzLabel="草稿" nzValue="draft"></nz-option>
          <nz-option nzLabel="已发布" nzValue="published"></nz-option>
          <nz-option nzLabel="已归档" nzValue="archived"></nz-option>
        </nz-select>
        <button nz-button (click)="applyFilters()">筛选</button>
      </app-filter-bar>

      <app-search-box
        toolbar-search
        placeholder="搜索问卷标题或 slug"
        [value]="keyword()"
        (valueChange)="keyword.set($event)"
        (submitted)="applyFilters()"
      />
    </app-page-toolbar>

    <app-list-state
      [loading]="loading()"
      [empty]="items().length === 0"
      loadingText="正在加载问卷列表…"
      emptyTitle="暂无问卷"
      emptyDescription="先创建一个可公开填写的问卷。"
    >
      <app-data-table>
        <div table-head class="survey-table__head">
          <div>标题</div>
          <div>Slug</div>
          <div>状态</div>
          <div>更新时间</div>
          <div>操作</div>
        </div>
        <div table-body class="survey-table__body">
          @for (item of items(); track item.id) {
            <div class="survey-row">
              <div class="survey-row__title">
                <div>{{ item.title }}</div>
                <small>{{ item.description || '无描述' }}</small>
              </div>
              <div>{{ item.slug }}</div>
              <div><nz-tag [nzColor]="statusColor(item.status)">{{ statusLabel(item.status) }}</nz-tag></div>
              <div>{{ item.updatedAt | date: 'yyyy-MM-dd HH:mm' }}</div>
              <div class="survey-row__actions">
                <button nz-button nzSize="small" (click)="editSurvey(item.id)">编辑</button>
                <button nz-button nzSize="small" (click)="viewSubmissions(item.id)">答卷</button>
                <button nz-button nzSize="small" (click)="copyPublicLink(item.slug)">链接</button>
                @if (item.status !== 'published') {
                  <button nz-button nzType="primary" nzSize="small" (click)="changeStatus(item, 'published')">发布</button>
                }
                @if (item.status !== 'draft') {
                  <button nz-button nzSize="small" (click)="changeStatus(item, 'draft')">草稿</button>
                }
                @if (item.status !== 'archived') {
                  <button nz-button nzSize="small" (click)="changeStatus(item, 'archived')">归档</button>
                }
              </div>
            </div>
          }
        </div>
      </app-data-table>

      @if (total() > 0) {
        <div class="survey-pagination">
          <nz-pagination
            [nzTotal]="total()"
            [nzPageIndex]="page()"
            [nzPageSize]="pageSize()"
            [nzShowSizeChanger]="true"
            [nzShowQuickJumper]="true"
            [nzPageSizeOptions]="[10, 20, 50]"
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
      .toolbar__filters {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .survey-table__head,
      .survey-row {
        display: grid;
        grid-template-columns: minmax(0, 2fr) 200px 120px 180px minmax(0, 2fr);
        gap: 12px;
        align-items: center;
      }
      .survey-table__head {
        padding: 10px 14px;
        font-size: 12px;
        color: var(--text-muted);
        font-weight: 700;
        background: var(--bg-subtle);
        border-bottom: 1px solid var(--border-color-soft);
      }
      .survey-row {
        padding: 12px 14px;
        border-bottom: 1px solid var(--border-color-soft);
      }
      .survey-row__title {
        min-width: 0;
      }
      .survey-row__title > div {
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .survey-row__title small {
        color: var(--text-muted);
      }
      .survey-row__actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .survey-pagination {
        display: flex;
        justify-content: flex-end;
        margin-top: 14px;
      }
      @media (max-width: 1100px) {
        .survey-table__head {
          display: none;
        }
        .survey-row {
          grid-template-columns: 1fr;
          gap: 8px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyListPageComponent {
  private readonly api = inject(SurveyApiService);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);

  readonly loading = signal(false);
  readonly items = signal<SurveyEntity[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly keyword = signal('');
  readonly status = signal<SurveyStatus | ''>('');

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api
      .list({
        page: this.page(),
        pageSize: this.pageSize(),
        keyword: this.keyword().trim(),
        status: this.status() || undefined,
      })
      .subscribe({
        next: (result) => {
          this.loading.set(false);
          this.items.set(result.items);
          this.total.set(result.total);
        },
        error: () => {
          this.loading.set(false);
          this.items.set([]);
          this.total.set(0);
        },
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  onPageIndexChange(page: number): void {
    this.page.set(page);
    this.load();
  }

  onPageSizeChange(pageSize: number): void {
    this.page.set(1);
    this.pageSize.set(pageSize);
    this.load();
  }

  createSurvey(): void {
    this.router.navigateByUrl('/surveys/new');
  }

  editSurvey(surveyId: string): void {
    this.router.navigateByUrl(`/surveys/${surveyId}`);
  }

  viewSubmissions(surveyId: string): void {
    this.router.navigateByUrl(`/surveys/${surveyId}/submissions`);
  }

  copyPublicLink(slug: string): void {
    const url = `${window.location.origin}/public/surveys/${encodeURIComponent(slug)}`;
    navigator.clipboard
      .writeText(url)
      .then(() => this.message.success('问卷公开链接已复制'))
      .catch(() => this.message.error('复制失败，请手动复制'));
  }

  changeStatus(item: SurveyEntity, status: SurveyStatus): void {
    const request$ =
      status === 'published' ? this.api.publish(item.id) : status === 'archived' ? this.api.archive(item.id) : this.api.draft(item.id);
    request$.subscribe({
      next: () => {
        this.message.success('状态已更新');
        this.load();
      },
      error: () => {
        this.message.error('状态更新失败');
      },
    });
  }

  statusLabel(status: SurveyStatus): string {
    if (status === 'published') return '已发布';
    if (status === 'archived') return '已归档';
    return '草稿';
  }

  statusColor(status: SurveyStatus): string {
    if (status === 'published') return 'success';
    if (status === 'archived') return 'default';
    return 'warning';
  }
}
