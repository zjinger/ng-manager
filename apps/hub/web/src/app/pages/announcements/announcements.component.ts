import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { HubApiService } from '../../core/http/hub-api.service';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { HubDateTimePipe } from '../../shared/pipes/date-time.pipe';
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
  createdAt?: string;
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
  currentUserCanManage?: boolean;
}

@Component({
  selector: 'app-announcement',
  imports: [
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzSwitchModule,
    NzTableModule,
    NzTagModule,
    PageHeaderComponent,
    HubDateTimePipe
  ],
  template: `
    <div class="page">
      <app-page-header title="公告管理" subtitle="创建和管理公告">
        @if (canCreateAnnouncement()) {
          <button page-header-actions nz-button nzType="primary" (click)="createAnnouncement()">
            <i nz-icon nzType="plus"></i> 新建公告
          </button>
        }
      </app-page-header>

      @if (!isAdmin() && !canCreateAnnouncement()) {
        <nz-alert
          class="section"
          nzType="info"
          nzMessage="当前账号不是任何项目的项目管理员，只能查看自己所在项目和全员广播的公告。"
          nzShowIcon
        ></nz-alert>
      }

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
                <td>{{ item.publishAt | hubDateTime }}</td>
                <td>{{ item.updatedAt | hubDateTime }}</td>
                <td>
                  <a nz-button nzType="link" (click)="viewAnnouncement(item)">查看</a>
                  @if (canManageAnnouncement(item)) {
                    <a nz-button nzType="link" (click)="editAnnouncement(item)">编辑</a>
                    @if (item.status !== 'archived') {
                      <a nz-button nzType="link" nzDanger (click)="archiveAnnouncement(item)">归档</a>
                    }
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
              <nz-form-label [nzRequired]="!isAdmin()">{{ isAdmin() ? '项目（管理员可不选）' : '项目' }}</nz-form-label>
              <nz-form-control>
                <nz-select
                  formControlName="projectId"
                  [nzAllowClear]="isAdmin()"
                  [nzPlaceHolder]="isAdmin() ? '不关联项目时为全员广播' : '请选择你有管理权限的项目'"
                >
                  @for (project of editableProjectOptions(); track project.id) {
                    <nz-option [nzValue]="project.id" [nzLabel]="project.name + ' (' + project.projectKey + ')'" />
                  }
                </nz-select>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzRequired>Markdown 正文</nz-form-label>
              <nz-form-control>
                <textarea nz-input rows="12" formControlName="contentMd"></textarea>
              </nz-form-control>
            </nz-form-item>

            <div class="split-row">
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

              <nz-form-item>
                <nz-form-label>是否置顶</nz-form-label>
                <nz-form-control>
                  <nz-switch formControlName="pinned"></nz-switch>
                </nz-form-control>
              </nz-form-item>
            </div>

            <button nz-button nzType="primary" (click)="saveAnnouncement()" [disabled]="form.invalid || saving()">
              保存公告
            </button>
          </form>
        </ng-container>
      </nz-modal>

      <nz-modal
        nzTitle="公告详情"
        [(nzVisible)]="detailVisible"
        [nzMaskClosable]="true"
        [nzWidth]="760"
        [nzFooter]="detailFooter"
        (nzOnCancel)="closeDetail()"
      >
        <ng-container *nzModalContent>
          @if (detailError()) {
            <nz-alert nzType="error" [nzMessage]="detailError()!" nzShowIcon></nz-alert>
          }

          @if (detailLoading()) {
            <div class="detail-empty">公告详情加载中...</div>
          } @else if (selectedDetail(); as detail) {
            <div class="detail-panel">
              <div class="detail-header">
                <div>
                  <div class="detail-title">{{ detail.title }}</div>
                  <div class="detail-meta">
                    <span>{{ statusLabel(detail.status) }}</span>
                    <span>{{ detail.publishAt ? ('发布时间：' + (detail.publishAt | hubDateTime)) : '未发布' }}</span>
                    <span>更新时间：{{ detail.updatedAt | hubDateTime }}</span>
                  </div>
                </div>
                @if (detail.pinned) {
                  <nz-tag nzColor="gold">置顶</nz-tag>
                }
              </div>

              <div class="detail-content">{{ detail.contentMd }}</div>
            </div>
          } @else {
            <div class="detail-empty">暂无公告详情</div>
          }
        </ng-container>

        <ng-template #detailFooter>
          <div class="detail-footer">
            @if (selectedDetail() && canManageDetail()) {
              <button nz-button type="button" (click)="editSelectedAnnouncement()">编辑</button>
              @if (selectedDetail()!.status !== 'archived') {
                <button nz-button nzDanger type="button" (click)="archiveSelectedAnnouncement()">归档</button>
              }
            }
            <button nz-button nzType="primary" type="button" (click)="closeDetail()">关闭</button>
          </div>
        </ng-template>
      </nz-modal>
    </div>
  `,
  styles: [
    PAGE_SHELL_STYLES,
    `
      .split-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
      .form { display: grid; gap: 4px; }
      .detail-panel { display: grid; gap: 16px; }
      .detail-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
      .detail-title { font-size: 20px; font-weight: 600; color: #262626; }
      .detail-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; color: #8c8c8c; font-size: 12px; }
      .detail-content { white-space: pre-wrap; line-height: 1.7; color: #262626; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 12px; padding: 16px; max-height: 60vh; overflow: auto; }
      .detail-empty { padding: 32px 0; text-align: center; color: #8c8c8c; }
      .detail-footer { display: flex; justify-content: flex-end; gap: 8px; }
    `
  ]
})
export class AnnouncementsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HubApiService);
  private readonly auth = inject(AdminAuthService);

  protected readonly visible = signal(false);
  protected readonly detailVisible = signal(false);
  protected readonly saving = signal(false);
  protected readonly listLoading = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly listError = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly detailError = signal<string | null>(null);
  protected readonly editingId = signal<string | null>(null);
  protected readonly announcements = signal<AnnouncementListItem[]>([]);
  protected readonly projectOptions = signal<ProjectOption[]>([]);
  protected readonly selectedDetail = signal<AnnouncementDetail | null>(null);
  protected readonly isAdmin = computed(() => this.auth.profile()?.role === 'admin');
  protected readonly editableProjectOptions = computed(() => {
    if (this.isAdmin()) {
      return this.projectOptions();
    }
    return this.projectOptions().filter((item) => item.currentUserCanManage);
  });
  protected readonly manageableProjectIds = computed(() => new Set(this.editableProjectOptions().map((item) => item.id)));
  protected readonly canCreateAnnouncement = computed(() => this.isAdmin() || this.editableProjectOptions().length > 0);
  protected readonly canManageDetail = computed(() => {
    const detail = this.selectedDetail();
    return !!detail && this.canManageAnnouncement(detail);
  });

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    projectId: [''],
    contentMd: ['', [Validators.required]],
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

  protected canManageAnnouncement(item: Pick<AnnouncementListItem, 'projectId'>): boolean {
    if (this.isAdmin()) {
      return true;
    }

    return !!item.projectId && this.manageableProjectIds().has(item.projectId);
  }

  protected createAnnouncement(): void {
    if (!this.canCreateAnnouncement()) {
      return;
    }

    this.editingId.set(null);
    this.formError.set(null);
    this.form.reset({
      title: '',
      projectId: '',
      contentMd: '',
      status: 'draft',
      pinned: false
    });
    this.visible.set(true);
  }

  protected async viewAnnouncement(item: AnnouncementListItem): Promise<void> {
    this.detailVisible.set(true);
    this.detailLoading.set(true);
    this.detailError.set(null);

    try {
      const detail = await this.loadAnnouncementDetail(item.id);
      this.selectedDetail.set(detail);
    } catch (error) {
      this.detailError.set(this.getErrorMessage(error, '加载公告详情失败'));
      this.selectedDetail.set(null);
    } finally {
      this.detailLoading.set(false);
    }
  }

  protected closeDetail(): void {
    this.detailVisible.set(false);
    this.detailError.set(null);
  }

  protected async editAnnouncement(item: AnnouncementListItem): Promise<void> {
    if (!this.canManageAnnouncement(item)) {
      return;
    }

    this.formError.set(null);

    try {
      const detail = await this.loadAnnouncementDetail(item.id);
      this.openEditModal(detail);
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '加载公告详情失败'));
    }
  }

  protected editSelectedAnnouncement(): void {
    const detail = this.selectedDetail();
    if (!detail || !this.canManageAnnouncement(detail)) {
      return;
    }

    this.openEditModal(detail);
    this.detailVisible.set(false);
  }

  protected async archiveSelectedAnnouncement(): Promise<void> {
    const detail = this.selectedDetail();
    if (!detail) {
      return;
    }

    await this.archiveAnnouncement(detail);
    this.detailVisible.set(false);
  }

  protected async archiveAnnouncement(item: Pick<AnnouncementListItem, 'id' | 'projectId'>): Promise<void> {
    if (!this.canManageAnnouncement(item)) {
      return;
    }

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

    const value = this.form.getRawValue();
    if (!this.isAdmin()) {
      if (!value.projectId) {
        this.formError.set('请选择你有管理权限的项目');
        return;
      }
      if (!this.manageableProjectIds().has(value.projectId)) {
        this.formError.set('当前项目没有公告管理权限');
        return;
      }
    }

    this.saving.set(true);
    this.formError.set(null);

    try {
      const editingDetail = this.selectedDetail();
      const basePayload = this.editingId()
        ? {
            projectId: value.projectId || null,
            title: value.title,
            contentMd: value.contentMd,
            pinned: value.pinned,
            summary: editingDetail?.summary,
            scope: editingDetail?.scope ?? 'all'
          }
        : {
            projectId: value.projectId || null,
            title: value.title,
            contentMd: value.contentMd,
            pinned: value.pinned,
            scope: 'all' as AnnouncementScope
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

      this.selectedDetail.set(item);
      this.visible.set(false);
      await this.loadAnnouncements();
    } catch (error) {
      this.formError.set(this.getErrorMessage(error, '保存公告失败'));
    } finally {
      this.saving.set(false);
    }
  }

  private openEditModal(detail: AnnouncementDetail): void {
    this.selectedDetail.set(detail);
    this.editingId.set(detail.id);
    this.form.reset({
      title: detail.title,
      projectId: detail.projectId || '',
      contentMd: detail.contentMd,
      status: detail.status,
      pinned: detail.pinned
    });
    this.visible.set(true);
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
      this.projectOptions.set(result.items ?? []);
    } catch {
      this.projectOptions.set([]);
    }
  }

  private async loadAnnouncementDetail(id: string): Promise<AnnouncementDetail> {
    return firstValueFrom(this.api.get<AnnouncementDetail>(`/api/admin/announcements/${id}`));
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HubApiError) return `${fallback}: ${error.message}`;
    if (error instanceof Error) return `${fallback}: ${error.message}`;
    return fallback;
  }
}
