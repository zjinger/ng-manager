import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';

type NoticeStatus = 'draft' | 'published' | 'archived' | 'in_progress';

interface Announcement {
  id: string;
  title: string;
  summary: string;
  content: string;
  status: NoticeStatus;
  pinned: boolean;
  publishedAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-announcement',
  imports: [
    ReactiveFormsModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzSwitchModule,
    NzTableModule,
    NzTagModule,
    NzModalModule,
  ],
  template: `
    <div class="page">
      <div class="header">
        <div class="header-row">
          <h1 class="header-title">公告管理</h1>
          <div class="header-desc">创建和管理公告</div>
        </div>
        <div class="actions">
          <button nz-button nzType="primary" (click)="createAnnouncement()">新建公告</button>
        </div>
      </div>
      <nz-card nzTitle="公告列表">
        <nz-table #table [nzData]="announcements()" [nzFrontPagination]="false" nzSize="middle">
          <thead>
            <tr>
              <th>标题</th>
              <th>状态</th>
              <th>发布时间</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            @for (item of table.data; track item.id) {
              <tr>
                <td>{{ item.title }}</td>
                <td><nz-tag [nzColor]="statusColor(item.status)">{{ statusLabel(item.status) }}</nz-tag></td>
                <td>{{ item.publishedAt }}</td>
                <td>{{ item.updatedAt }}</td>
                <td>
                  <a nz-button nzType="link" (click)="editAnnouncement(item)">编辑</a>
                  <a nz-button nzType="link" nzDanger (click)="deleteAnnouncement(item)">删除</a>
                </td>
              </tr>
            }
          </tbody>
        </nz-table>
      </nz-card>
          
      <nz-modal [nzTitle]="editingId() ? '编辑公告' : '新建公告'" class="editor-modal" 
        [(nzVisible)]="visible" [nzMaskClosable]="false" [nzWidth]="600" [nzFooter]="null" (nzOnCancel)="visible.set(false)">
        <ng-container *nzModalContent>
           <form nz-form [formGroup]="form" nzLayout="vertical">
          <nz-form-item>
            <nz-form-label nzRequired>标题</nz-form-label>
            <nz-form-control>
              <input nz-input formControlName="title" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>摘要</nz-form-label>
            <nz-form-control>
              <textarea nz-input rows="2" formControlName="summary"></textarea>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>Markdown 正文</nz-form-label>
            <nz-form-control>
              <textarea nz-input rows="8" formControlName="content"></textarea>
            </nz-form-control>
          </nz-form-item>

          <div class="split-row">
            <nz-form-item>
              <nz-form-label>状态</nz-form-label>
              <nz-form-control>
                <nz-select formControlName="status">
                  <nz-option nzValue="draft" nzLabel="草稿"></nz-option>
                  <nz-option nzValue="published" nzLabel="已发布"></nz-option>
                  <nz-option nzValue="in_progress" nzLabel="进行中"></nz-option>
                  <nz-option nzValue="archived" nzLabel="已归档"></nz-option>
                </nz-select>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label>是否置顶</nz-form-label>
              <nz-form-control>
                <nz-switch formControlName="pinned"></nz-switch>
              </nz-form-control>
            </nz-form-item>
          </div>

          <button nz-button nzType="primary" (click)="saveAnnouncement()" [disabled]="form.invalid">
            保存公告
          </button>
        </form>
        </ng-container>
      </nz-modal>
    </div>
  `,
  styles: `
    .split-row { display: grid; grid-template-columns: repeat(2, minmax(0, 280px)); gap: 16px; }
    nz-tag{
      text-transform: capitalize;
      width: 60px;
      text-align: center;
    }
    nz-table{
      border-radius: 4px;

    }
  `
})
export class AnnouncementsPageComponent {
  private readonly fb = new FormBuilder();
  private readonly modalService = inject(NzModalService);
  protected readonly visible = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly announcements = signal<Announcement[]>([
    {
      id: 'notice-1',
      title: 'Desktop 2.6.1 已发布',
      summary: '修复构建缓存异常问题',
      content: '## 更新说明\n- 修复缓存问题\n- 优化下载速度',
      status: 'published',
      pinned: true,
      publishedAt: '2026-03-05 14:20',
      updatedAt: '2026-03-05 14:20'
    },
    {
      id: 'notice-2',
      title: 'CLI 文档结构调整',
      summary: '迁移到 docs 中心',
      content: '文档迁移将在本周完成。',
      status: 'draft',
      pinned: false,
      publishedAt: '-',
      updatedAt: '2026-03-04 10:10'
    }
  ]);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    summary: [''],
    content: [''],
    status: ['draft' as NoticeStatus],
    pinned: [false]
  });

  protected statusColor(status: NoticeStatus): string {
    if (status === 'published') {
      return '#389E0D';
    }
    if (status === 'archived') {
      return '#d9d9d9';
    }
    if (status === 'in_progress') {
      return '#0958D9';
    }
    return '#FA8C16';
  }

  protected statusLabel(status: NoticeStatus): string {
    if (status === 'published') {
      return '已发布';
    }
    if (status === 'archived') {
      return '已归档';
    }
    if (status === 'in_progress') {
      return '进行中';
    }
    return '草稿';
  }

  protected createAnnouncement(): void {
    this.editingId.set(null);
    this.visible.set(true);
    this.form.reset({ title: '', summary: '', content: '', status: 'draft', pinned: false });
  }

  protected editAnnouncement(item: Announcement): void {
    this.editingId.set(item.id);
    this.visible.set(true);
    this.form.reset({
      title: item.title,
      summary: item.summary,
      content: item.content,
      status: item.status,
      pinned: item.pinned
    });
  }

  protected deleteAnnouncement(item: Announcement): void {
    this.announcements.update((list) => list.filter((i) => i.id !== item.id));
    if (this.editingId() === item.id) {
      this.createAnnouncement();
    }
  }

  protected saveAnnouncement(): void {
    if (this.form.invalid) {
      return;
    }
    const now = this.formatNow();
    const value = this.form.getRawValue();

    if (this.editingId() !== null) {
      this.announcements.update((list) =>
        list.map((item) =>
          item.id === this.editingId()
            ? {
              ...item,
              ...value,
              publishedAt: value.status === 'published' ? item.publishedAt : '-',
              updatedAt: now
            }
            : item
        )
      );
      return;
    }

    const id = `notice-${Date.now()}`;
    this.announcements.update((list) => [
      {
        id,
        ...value,
        publishedAt: value.status === 'published' ? now : '-',
        updatedAt: now
      },
      ...list
    ]);
    this.editingId.set(id);

    this.visible.set(true);
  }

  private formatNow(): string {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }
}
