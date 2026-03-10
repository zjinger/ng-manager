import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, firstValueFrom } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { HubApiService } from '../../core/http/hub-api.service';

type FeedbackStatus = 'open' | 'processing' | 'resolved' | 'closed';
type FeedbackCategory = 'bug' | 'suggestion' | 'feature' | 'other';
type FeedbackSource = 'desktop' | 'cli' | 'web';

interface FeedbackItem {
  id: string;
  projectKey?: string | null;
  source: FeedbackSource;
  category: FeedbackCategory;
  title: string;
  content: string;
  contact?: string | null;
  clientName?: string | null;
  clientVersion?: string | null;
  osInfo?: string | null;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackListResult {
  items: FeedbackItem[];
  page: number;
  pageSize: number;
  total: number;
}

@Component({
  selector: 'app-feedback-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzDescriptionsModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule
  ],
  template: `
    <section class="page">
      <div class="header">
        <div class="header-row">
          <h1 class="header-title">反馈</h1>
          <div class="header-desc">查看和处理用户反馈</div>
        </div>
      </div>

      <nz-card nzTitle="筛选条件">
        <form nz-form [formGroup]="filters" class="filter-grid">
          <nz-form-item>
            <nz-form-label>项目 Key</nz-form-label>
            <nz-form-control>
              <input nz-input formControlName="projectKey" placeholder="可选" />
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>状态</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="status" nzAllowClear>
                <nz-option nzValue="open" nzLabel="待处理"></nz-option>
                <nz-option nzValue="processing" nzLabel="处理中"></nz-option>
                <nz-option nzValue="resolved" nzLabel="已解决"></nz-option>
                <nz-option nzValue="closed" nzLabel="已关闭"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>类型</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="category" nzAllowClear>
                <nz-option nzValue="bug" nzLabel="缺陷"></nz-option>
                <nz-option nzValue="suggestion" nzLabel="建议"></nz-option>
                <nz-option nzValue="feature" nzLabel="功能需求"></nz-option>
                <nz-option nzValue="other" nzLabel="其他"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>关键词</nz-form-label>
            <nz-form-control>
              <input nz-input formControlName="keyword" placeholder="标题 / 内容" />
            </nz-form-control>
          </nz-form-item>
        </form>
      </nz-card>

      @if (listError()) {
        <nz-alert class="section" nzType="error" [nzMessage]="listError()!" nzShowIcon></nz-alert>
      }

      <div class="content-grid section">
        <nz-card nzTitle="反馈列表">
          <div class="table-head">
            <span>共 {{ total() }} 条</span>
            <button nz-button nzType="default" (click)="reload()" [disabled]="listLoading()">刷新</button>
          </div>
          <nz-table #table [nzData]="feedback()" [nzFrontPagination]="false" [nzLoading]="listLoading()">
            <thead>
              <tr>
                <th>ID</th>
                <th>项目</th>
                <th>类型</th>
                <th>标题</th>
                <th>状态</th>
                <th>来源</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              @for (item of table.data; track item.id) {
                <tr (click)="selectFeedback(item)" [class.selected]="selected()?.id === item.id">
                  <td>{{ item.id }}</td>
                  <td>{{ item.projectKey || '-' }}</td>
                  <td>{{ categoryLabel(item.category) }}</td>
                  <td>{{ item.title }}</td>
                  <td><nz-tag [nzColor]="statusColor(item.status)">{{ statusLabel(item.status) }}</nz-tag></td>
                  <td>{{ sourceLabel(item.source) }}</td>
                  <td>{{ item.createdAt }}</td>
                </tr>
              }
            </tbody>
          </nz-table>
        </nz-card>

        <nz-card nzTitle="反馈详情">
          @if (selected(); as item) {
            <nz-descriptions nzBordered nzSize="small" [nzColumn]="1">
              <nz-descriptions-item nzTitle="反馈内容">{{ item.content }}</nz-descriptions-item>
              <nz-descriptions-item nzTitle="客户端信息">{{ environmentText(item) }}</nz-descriptions-item>
              <nz-descriptions-item nzTitle="联系方式">{{ item.contact || '-' }}</nz-descriptions-item>
              <nz-descriptions-item nzTitle="更新时间">{{ item.updatedAt }}</nz-descriptions-item>
            </nz-descriptions>

            <div class="status-editor">
              <label>状态</label>
              <nz-select [(ngModel)]="pendingStatus" [ngModelOptions]="{ standalone: true }">
                <nz-option nzValue="open" nzLabel="待处理"></nz-option>
                <nz-option nzValue="processing" nzLabel="处理中"></nz-option>
                <nz-option nzValue="resolved" nzLabel="已解决"></nz-option>
                <nz-option nzValue="closed" nzLabel="已关闭"></nz-option>
              </nz-select>
              <button nz-button nzType="primary" (click)="saveStatus()" [disabled]="statusSaving()">
                保存状态
              </button>
            </div>
          } @else {
            <div class="empty-tip">请选择一条反馈查看详情</div>
          }
        </nz-card>
      </div>
    </section>
  `,
  styles: `
    .page { background: #fff; border-radius: 10px; padding: 20px; }
    .section { margin-top: 16px; }
    .filter-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .content-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    .table-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .selected { background: #e6f4ff; }
    .status-editor { margin-top: 16px; display: grid; gap: 8px; }
    .empty-tip { color: #6b7280; }
  `
})
export class FeedbackPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HubApiService);

  protected readonly feedback = signal<FeedbackItem[]>([]);
  protected readonly selected = signal<FeedbackItem | null>(null);
  protected readonly total = signal(0);

  protected readonly listLoading = signal(false);
  protected readonly listError = signal<string | null>(null);
  protected readonly statusSaving = signal(false);

  protected pendingStatus: FeedbackStatus = 'open';

  protected readonly filters = this.fb.nonNullable.group({
    projectKey: [''],
    status: [''],
    category: [''],
    keyword: ['']
  });

  public constructor() {
    this.filters.valueChanges.pipe(debounceTime(250), takeUntilDestroyed()).subscribe(() => {
      void this.loadFeedbacks();
    });

    void this.loadFeedbacks();
  }

  protected async reload(): Promise<void> {
    await this.loadFeedbacks();
  }

  protected selectFeedback(item: FeedbackItem): void {
    this.selected.set(item);
    this.pendingStatus = item.status;
  }

  protected async saveStatus(): Promise<void> {
    const current = this.selected();
    if (!current) {
      return;
    }

    this.statusSaving.set(true);
    this.listError.set(null);

    try {
      const updated = await firstValueFrom(
        this.api.put<FeedbackItem, { status: FeedbackStatus }>(
          `/api/admin/feedbacks/${current.id}/status`,
          { status: this.pendingStatus }
        )
      );

      this.feedback.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      this.selected.set(updated);
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '更新状态失败'));
    } finally {
      this.statusSaving.set(false);
    }
  }

  protected statusColor(status: FeedbackStatus): string {
    if (status === 'resolved') return 'green';
    if (status === 'processing') return 'blue';
    if (status === 'closed') return 'default';
    return 'orange';
  }

  protected statusLabel(status: FeedbackStatus): string {
    if (status === 'processing') return '处理中';
    if (status === 'resolved') return '已解决';
    if (status === 'closed') return '已关闭';
    return '待处理';
  }

  protected categoryLabel(category: FeedbackCategory): string {
    if (category === 'bug') return '缺陷';
    if (category === 'suggestion') return '建议';
    if (category === 'feature') return '功能需求';
    return '其他';
  }

  protected sourceLabel(source: FeedbackSource): string {
    if (source === 'desktop') return '桌面端';
    if (source === 'cli') return 'CLI';
    return 'Web';
  }
  protected environmentText(item: FeedbackItem): string {
    const parts = [item.clientName, item.clientVersion, item.osInfo].filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 0
    );

    return parts.length > 0 ? parts.join(' / ') : '-';
  }

  private async loadFeedbacks(): Promise<void> {
    this.listLoading.set(true);
    this.listError.set(null);

    try {
      const filter = this.filters.getRawValue();
      const params: Record<string, string | number | boolean> = { page: 1, pageSize: 50 };

      if (filter.projectKey.trim()) params['projectKey'] = filter.projectKey.trim();
      if (filter.status) params['status'] = filter.status;
      if (filter.category) params['category'] = filter.category;
      if (filter.keyword.trim()) params['keyword'] = filter.keyword.trim();

      const result = await firstValueFrom(this.api.get<FeedbackListResult>('/api/admin/feedbacks', { params }));

      this.feedback.set(result.items);
      this.total.set(result.total);

      const selectedId = this.selected()?.id;
      if (selectedId) {
        const nextSelected = result.items.find((item) => item.id === selectedId) ?? null;
        this.selected.set(nextSelected);
        if (nextSelected) this.pendingStatus = nextSelected.status;
      }
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '加载反馈失败'));
    } finally {
      this.listLoading.set(false);
    }
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HubApiError) return `${fallback}: ${error.message}`;
    if (error instanceof Error) return `${fallback}: ${error.message}`;
    return fallback;
  }
}


