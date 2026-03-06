import { Component, computed, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTypographyModule } from 'ng-zorro-antd/typography';

type FeedbackStatus = 'new' | 'in_progress' | 'resolved';
type FeedbackType = 'bug' | 'feature' | 'question';
type FeedbackSource = 'CLI' | 'Desktop';

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  title: string;
  status: FeedbackStatus;
  source: FeedbackSource;
  projectName: string;
  createdAt: string;
  content: string;
  environment: string;
  attachments: string[];
  adminNote: string;
}

@Component({
  selector: 'app-feedback-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NzButtonModule,
    NzCardModule,
    NzDescriptionsModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
    NzTypographyModule
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
            <nz-form-label>状态</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="status" nzAllowClear>
                <nz-option nzValue="new" nzLabel="new"></nz-option>
                <nz-option nzValue="in_progress" nzLabel="in_progress"></nz-option>
                <nz-option nzValue="resolved" nzLabel="resolved"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>类型</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="type" nzAllowClear>
                <nz-option nzValue="bug" nzLabel="bug"></nz-option>
                <nz-option nzValue="feature" nzLabel="feature"></nz-option>
                <nz-option nzValue="question" nzLabel="question"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>来源</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="source" nzAllowClear>
                <nz-option nzValue="CLI" nzLabel="CLI"></nz-option>
                <nz-option nzValue="Desktop" nzLabel="Desktop"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>关键词</nz-form-label>
            <nz-form-control>
              <input nz-input formControlName="keyword" placeholder="标题 / 项目名" />
            </nz-form-control>
          </nz-form-item>
        </form>
      </nz-card>

      <div class="content-grid">
        <nz-card nzTitle="反馈列表">
          <nz-table #table [nzData]="filteredFeedback()" [nzFrontPagination]="false">
            <thead>
              <tr>
                <th>ID</th>
                <th>类型</th>
                <th>标题</th>
                <th>状态</th>
                <th>来源</th>
                <th>项目名称</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              @for (item of table.data; track item.id) {
                <tr (click)="selectFeedback(item)" [class.selected]="selected()?.id === item.id">
                  <td>{{ item.id }}</td>
                  <td>{{ item.type }}</td>
                  <td>{{ item.title }}</td>
                  <td><nz-tag [nzColor]="statusColor(item.status)">{{ item.status }}</nz-tag></td>
                  <td>{{ item.source }}</td>
                  <td>{{ item.projectName }}</td>
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
              <nz-descriptions-item nzTitle="客户端环境信息">{{ item.environment }}</nz-descriptions-item>
              <nz-descriptions-item nzTitle="附件">{{ item.attachments.join(', ') || '无' }}</nz-descriptions-item>
            </nz-descriptions>

            <div class="note-editor">
              <label>管理员备注</label>
              <textarea
                nz-input
                rows="5"
                [ngModel]="item.adminNote"
                (ngModelChange)="updateNote($event)"
                [ngModelOptions]="{ standalone: true }"
              ></textarea>
              <button nz-button nzType="primary" (click)="saveNote()">保存备注</button>
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
    .filter-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .content-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-top: 16px; }
    .selected { background: #e6f4ff; }
    .note-editor { margin-top: 16px; display: grid; gap: 8px; }
    .empty-tip { color: #6b7280; }
  `
})
export class FeedbackPageComponent {
  private readonly fb = new FormBuilder();
  private pendingNote = '';

  protected readonly feedback = signal<FeedbackItem[]>([
    {
      id: 'FB-2031',
      type: 'bug',
      title: 'CLI init 在 monorepo 下报错',
      status: 'new',
      source: 'CLI',
      projectName: 'workspace-a',
      createdAt: '2026-03-06 10:00',
      content: '执行 ngm init 时，提示 cannot resolve workspace config。',
      environment: 'Windows 11 / Node 20.19 / npm 10.8',
      attachments: ['error-log.txt'],
      adminNote: ''
    },
    {
      id: 'FB-2028',
      type: 'feature',
      title: 'Desktop 希望支持代理配置',
      status: 'in_progress',
      source: 'Desktop',
      projectName: 'ngm-client',
      createdAt: '2026-03-05 17:20',
      content: '企业内网环境下载资源超时，希望支持代理设置。',
      environment: 'macOS 15 / Desktop 2.6.0',
      attachments: [],
      adminNote: '已安排到 2.7 迭代评估。'
    },
    {
      id: 'FB-2010',
      type: 'question',
      title: '如何切换 release channel',
      status: 'resolved',
      source: 'CLI',
      projectName: 'docs-site',
      createdAt: '2026-03-02 08:30',
      content: '请问 beta 渠道如何回到 stable？',
      environment: 'Ubuntu 24.04 / Node 20.18',
      attachments: [],
      adminNote: '已通过文档回复。'
    }
  ]);

  protected readonly selected = signal<FeedbackItem | null>(null);

  protected readonly filters = this.fb.nonNullable.group({
    status: [''],
    type: [''],
    source: [''],
    keyword: ['']
  });

  protected readonly filteredFeedback = computed<FeedbackItem[]>(() => {
    const filter = this.filters.getRawValue();
    const keyword = filter.keyword.trim().toLowerCase();

    return this.feedback().filter((item) => {
      const matchesStatus = !filter.status || item.status === filter.status;
      const matchesType = !filter.type || item.type === filter.type;
      const matchesSource = !filter.source || item.source === filter.source;
      const matchesKeyword =
        keyword.length === 0 ||
        item.title.toLowerCase().includes(keyword) ||
        item.projectName.toLowerCase().includes(keyword);
      return matchesStatus && matchesType && matchesSource && matchesKeyword;
    });
  });

  protected selectFeedback(item: FeedbackItem): void {
    this.selected.set({ ...item });
    this.pendingNote = item.adminNote;
  }

  protected updateNote(note: string): void {
    const current = this.selected();
    if (current === null) {
      return;
    }
    this.pendingNote = note;
    this.selected.set({ ...current, adminNote: note });
  }

  protected saveNote(): void {
    const selected = this.selected();
    if (selected === null) {
      return;
    }
    this.feedback.update((list) =>
      list.map((item) => (item.id === selected.id ? { ...item, adminNote: this.pendingNote } : item))
    );
  }

  protected statusColor(status: FeedbackStatus): string {
    if (status === 'resolved') {
      return 'green';
    }
    if (status === 'in_progress') {
      return 'blue';
    }
    return 'orange';
  }
}
