import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { firstValueFrom } from 'rxjs';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { HubApiService } from '../../core/http/hub-api.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { PAGE_SHELL_STYLES } from '../../shared/styles/page-shell.styles';

type AnnouncementStatus = 'draft' | 'published' | 'archived';
type AnnouncementScope = 'all' | 'desktop' | 'cli';

interface AnnouncementListItem {
  id: string;
  projectId?: string | null;
  title: string;
  summary?: string | null;
  scope: AnnouncementScope;
  pinned: boolean;
  status: AnnouncementStatus;
  publishAt?: string | null;
  updatedAt: string;
}

interface AnnouncementDetail extends AnnouncementListItem {
  contentMd: string;
}

interface AnnouncementListResult {
  items: AnnouncementListItem[];
  page: number;
  pageSize: number;
  total: number;
}

interface ProjectOption {
  id: string;
  name: string;
  projectKey: string;
}

@Component({
  selector: 'app-announcement',
  imports: [
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzSwitchModule,
    NzTableModule,
    NzTagModule,
    NzModalModule,
    PageHeaderComponent
  ],
  template: `
    <div class="page">
      <app-page-header title="公告管理" subtitle="创建和管理公告">
        <button page-header-actions nz-button nzType="primary" (click)="createAnnouncement()">新建公告</button>
      </app-page-header>

      @if (listError()) {
        <nz-alert class="section" nzType="error" [nzMessage]="listError()!" nzShowIcon></nz-alert>
      }

      <nz-card nzTitle="公告列表" class="section">
        <nz-table #table [nzData]="announcements()" [nzFrontPagination]="false" nzSize="middle" [nzLoading]="listLoading()">
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
                <td>{{ item.publishAt || '-' }}</td>
                <td>{{ item.updatedAt }}</td>
                <td>
                  <a nz-button nzType="link" (click)="editAnnouncement(item)">编辑</a>
                  @if (item.status !== 'archived') {
                    <a nz-button nzType="link" nzDanger (click)="archiveAnnouncement(item)">归档</a>
                  }
                </td>
              </tr>
            }
          </tbody>
        </nz-table>
      </nz-card>

      <nz-modal
        [nzTitle]="editingId() ? '编辑公告' : '新建公告'"
        class="editor-modal"
        [(nzVisible)]="visible"
        [nzMaskClosable]="false"
        [nzWidth]="680"
        [nzFooter]="null"
        (nzOnCancel)="visible.set(false)"
      >
        <ng-container *nzModalContent>
          @if (formError()) {
            <nz-alert nzType="error" [nzMessage]="formError()!" nzShowIcon></nz-alert>
          }
          <form nz-form [formGroup]="form" nzLayout="vertical" class="form">
            <nz-form-item>
              <nz-form-label nzRequired>标题</nz-form-label>
              <nz-form-control>
                <input nz-input formControlName="title" />
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label>项目（可选）</nz-form-label>
              <nz-form-control>
                <nz-select formControlName="projectId" nzAllowClear nzPlaceHolder="不关联项目">
                  @for (project of projectOptions(); track project.id) {
                    <nz-option [nzValue]="project.id" [nzLabel]="project.name + ' (' + project.projectKey + ')'" />
                  }
                </nz-select>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label>摘要</nz-form-label>
              <nz-form-control>
                <textarea nz-input rows="2" formControlName="summary"></textarea>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzRequired>Markdown 正文</nz-form-label>
              <nz-form-control>
                <textarea nz-input rows="8" formControlName="contentMd"></textarea>
              </nz-form-control>
            </nz-form-item>

            <div class="split-row">
              <nz-form-item>
                <nz-form-label>范围</nz-form-label>
                <nz-form-control>
                  <nz-select formControlName="scope">
                    <nz-option nzValue="all" nzLabel="全部端"></nz-option>
                    <nz-option nzValue="desktop" nzLabel="桌面端"></nz-option>
                    <nz-option nzValue="cli" nzLabel="CLI"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label>目标状态</nz-form-label>
                <nz-form-control>
                  <nz-select formControlName="status">
                    <nz-option nzValue="draft" nzLabel="草稿"></nz-option>
                    <nz-option nzValue="published" nzLabel="已发布"></nz-option>
                    <nz-option nzValue="archived" nzLabel="已归档"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>

            <nz-form-item>
              <nz-form-label>是否置顶</nz-form-label>
              <nz-form-control>
                <nz-switch formControlName="pinned"></nz-switch>
              </nz-form-control>
            </nz-form-item>

            <button nz-button nzType="primary" (click)="saveAnnouncement()" [disabled]="form.invalid || saving()">
              保存公告
            </button>
          </form>
        </ng-container>
      </nz-modal>
    </div>
  `,
  styles: [PAGE_SHELL_STYLES, `

    .split-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .form { display: grid; gap: 4px; }
  `]
})
export class AnnouncementsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HubApiService);

  protected readonly visible = signal(false);
  protected readonly saving = signal(false);
  protected readonly listLoading = signal(false);
  protected readonly listError = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly editingId = signal<string | null>(null);
  protected readonly announcements = signal<AnnouncementListItem[]>([]);
  protected readonly projectOptions = signal<ProjectOption[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    projectId: [''],
    summary: [''],
    contentMd: ['', [Validators.required]],
    scope: ['all' as AnnouncementScope],
    status: ['draft' as AnnouncementStatus],
    pinned: [false]
  });

  public constructor() {
    void this.loadProjectOptions();
    void this.loadAnnouncements();
  }

  protected statusColor(status: AnnouncementStatus): string {
    if (status === 'published') return '#389E0D';
    if (status === 'archived') return '#8C8C8C';
    return '#FA8C16';
  }

  protected statusLabel(status: AnnouncementStatus): string {
    if (status === 'published') return '已发布';
    if (status === 'archived') return '已归档';
    return '草稿';
  }

  protected createAnnouncement(): void {
    this.editingId.set(null);
    this.formError.set(null);
    this.form.reset({
      title: '',
      projectId: '',
      summary: '',
      contentMd: '',
      scope: 'all',
      status: 'draft',
      pinned: false
    });
    this.visible.set(true);
  }

  protected async editAnnouncement(item: AnnouncementListItem): Promise<void> {
    this.formError.set(null);

    try {
      const detail = await firstValueFrom(this.api.get<AnnouncementDetail>(`/api/admin/announcements/${item.id}`));

      this.editingId.set(item.id);
      this.form.reset({
        title: detail.title,
        projectId: detail.projectId || '',
        summary: detail.summary || '',
        contentMd: detail.contentMd,
        scope: detail.scope,
        status: detail.status,
        pinned: detail.pinned
      });
      this.visible.set(true);
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '加载公告详情失败'));
    }
  }

  protected async archiveAnnouncement(item: AnnouncementListItem): Promise<void> {
    this.listError.set(null);

    try {
      await firstValueFrom(this.api.post<AnnouncementDetail, Record<string, never>>(`/api/admin/announcements/${item.id}/archive`, {}));
      await this.loadAnnouncements();
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '归档公告失败'));
    }
  }

  protected async saveAnnouncement(): Promise<void> {
    if (this.form.invalid) return;

    this.saving.set(true);
    this.formError.set(null);

    try {
      const value = this.form.getRawValue();
      const basePayload = {
        projectId: value.projectId || null,
        title: value.title,
        summary: value.summary,
        contentMd: value.contentMd,
        scope: value.scope,
        pinned: value.pinned
      };

      let item: AnnouncementDetail;

      if (this.editingId()) {
        item = await firstValueFrom(this.api.put<AnnouncementDetail, typeof basePayload>(`/api/admin/announcements/${this.editingId()!}`, basePayload));
      } else {
        item = await firstValueFrom(this.api.post<AnnouncementDetail, typeof basePayload>('/api/admin/announcements', basePayload));
      }

      if (value.status === 'published' && item.status !== 'published') {
        item = await firstValueFrom(this.api.post<AnnouncementDetail, Record<string, never>>(`/api/admin/announcements/${item.id}/publish`, {}));
      }

      if (value.status === 'archived' && item.status !== 'archived') {
        await firstValueFrom(this.api.post<AnnouncementDetail, Record<string, never>>(`/api/admin/announcements/${item.id}/archive`, {}));
      }

      this.visible.set(false);
      await this.loadAnnouncements();
    } catch (error) {
      this.formError.set(this.getErrorMessage(error, '保存公告失败'));
    } finally {
      this.saving.set(false);
    }
  }

  private async loadAnnouncements(): Promise<void> {
    this.listLoading.set(true);
    this.listError.set(null);

    try {
      const result = await firstValueFrom(this.api.get<AnnouncementListResult>('/api/admin/announcements', { params: { page: 1, pageSize: 50 } }));
      this.announcements.set(result.items);
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '加载公告列表失败'));
    } finally {
      this.listLoading.set(false);
    }
  }

  private async loadProjectOptions(): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.api.get<{ items: ProjectOption[] }>('/api/admin/projects', {
          params: { status: 'active', page: 1, pageSize: 100 }
        })
      );
      this.projectOptions.set(result.items);
    } catch {
      this.projectOptions.set([]);
    }
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HubApiError) return `${fallback}: ${error.message}`;
    if (error instanceof Error) return `${fallback}: ${error.message}`;
    return fallback;
  }
}




