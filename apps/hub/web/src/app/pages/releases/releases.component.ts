import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { debounceTime, firstValueFrom } from 'rxjs';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { HubApiService } from '../../core/http/hub-api.service';

type ReleaseChannel = 'desktop' | 'cli';
type ReleaseStatus = 'draft' | 'published' | 'deprecated';

interface ReleaseItem {
  id: string;
  projectId?: string | null;
  channel: ReleaseChannel;
  version: string;
  title: string;
  notes?: string | null;
  downloadUrl?: string | null;
  status: ReleaseStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReleaseListResult {
  items: ReleaseItem[];
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
  selector: 'app-releases-page',
  imports: [
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
    NzModalModule
  ],
  template: `
    <section class="page">
      <div class="header">
        <div class="header-row">
          <h1 class="header-title">版本管理</h1>
          <div class="header-desc">客户端版本发布管理</div>
        </div>
        <div class="actions">
          <button nz-button nzType="primary" (click)="createRelease()">
            <nz-icon nzType="plus" nzTheme="outline" />
            <span>新增版本</span>
          </button>
        </div>
      </div>

      <nz-card nzTitle="筛选条件" class="section">
        <form nz-form [formGroup]="filters" class="filter-grid">
          <nz-form-item>
            <nz-form-label>项目</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="projectId" nzAllowClear nzPlaceHolder="全部项目">
                @for (project of projectOptions(); track project.id) {
                  <nz-option [nzValue]="project.id" [nzLabel]="project.name + ' (' + project.projectKey + ')'" />
                }
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>渠道</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="channel" nzAllowClear>
                <nz-option nzValue="desktop" nzLabel="桌面端"></nz-option>
                <nz-option nzValue="cli" nzLabel="CLI"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>状态</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="status" nzAllowClear>
                <nz-option nzValue="draft" nzLabel="草稿"></nz-option>
                <nz-option nzValue="published" nzLabel="已发布"></nz-option>
                <nz-option nzValue="deprecated" nzLabel="已废弃"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>关键词</nz-form-label>
            <nz-form-control>
              <input nz-input formControlName="keyword" placeholder="版本号 / 标题 / 说明" />
            </nz-form-control>
          </nz-form-item>
        </form>
      </nz-card>

      @if (listError()) {
        <nz-alert class="section" nzType="error" [nzMessage]="listError()!" nzShowIcon></nz-alert>
      }

      <nz-card nzTitle="发布列表" class="section">
        <div class="table-head">
          <span>共 {{ total() }} 条</span>
          <button nz-button nzType="default" (click)="reload()" [disabled]="listLoading()">刷新</button>
        </div>

        <nz-table #table [nzData]="releases()" [nzFrontPagination]="false" [nzLoading]="listLoading()">
          <thead>
            <tr>
              <th>渠道</th>
              <th>版本号</th>
              <th>标题</th>
              <th>状态</th>
              <th>发布时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            @for (item of table.data; track item.id) {
              <tr>
                <td>{{ channelLabel(item.channel) }}</td>
                <td>{{ item.version }}</td>
                <td>{{ item.title }}</td>
                <td><nz-tag [nzColor]="statusColor(item.status)">{{ statusLabel(item.status) }}</nz-tag></td>
                <td>{{ item.publishedAt || '-' }}</td>
                <td>
                  <a nz-button nzType="link" (click)="edit(item)">编辑</a>
                  @if (item.status !== 'published') {
                    <a nz-button nzType="link" (click)="publish(item)">发布</a>
                  }
                  @if (item.status !== 'deprecated') {
                    <a nz-button nzType="link" nzDanger (click)="deprecate(item)">废弃</a>
                  }
                  <a nz-button nzType="link" nzDanger (click)="remove(item)">删除</a>
                </td>
              </tr>
            }
          </tbody>
        </nz-table>
      </nz-card>

      <nz-modal
        [nzTitle]="editingId() ? '编辑版本' : '新建版本'"
        [(nzVisible)]="visible"
        [nzMaskClosable]="false"
        [nzWidth]="720"
        [nzFooter]="null"
        (nzOnCancel)="visible.set(false)"
      >
        <ng-container *nzModalContent>
          @if (formError()) {
            <nz-alert nzType="error" [nzMessage]="formError()!" nzShowIcon></nz-alert>
          }

          <form nz-form [formGroup]="form" nzLayout="vertical" class="form">
            <div class="grid-2">
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
                <nz-form-label nzRequired>渠道</nz-form-label>
                <nz-form-control>
                  <nz-select formControlName="channel">
                    <nz-option nzValue="desktop" nzLabel="桌面端"></nz-option>
                    <nz-option nzValue="cli" nzLabel="CLI"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>

            <div class="grid-2">
              <nz-form-item>
                <nz-form-label nzRequired>版本号</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="version" />
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label>目标状态</nz-form-label>
                <nz-form-control>
                  <nz-select formControlName="status">
                    <nz-option nzValue="draft" nzLabel="草稿"></nz-option>
                    <nz-option nzValue="published" nzLabel="已发布"></nz-option>
                    <nz-option nzValue="deprecated" nzLabel="已废弃"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>

            <nz-form-item>
              <nz-form-label nzRequired>标题</nz-form-label>
              <nz-form-control>
                <input nz-input formControlName="title" />
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label>下载地址</nz-form-label>
              <nz-form-control>
                <input nz-input formControlName="downloadUrl" />
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label>更新说明</nz-form-label>
              <nz-form-control>
                <textarea nz-input rows="6" formControlName="notes"></textarea>
              </nz-form-control>
            </nz-form-item>

            <button nz-button nzType="primary" (click)="save()" [disabled]="form.invalid || saving()">
              保存版本
            </button>
          </form>
        </ng-container>
      </nz-modal>
    </section>
  `,
  styles: `
    .page { background: #fff; border-radius: 10px; padding: 20px; }
    .section { margin-top: 16px; }
    .actions { display: flex; justify-content: flex-end; }
    .filter-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .table-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .form { display: grid; gap: 4px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  `
})
export class ReleasesPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HubApiService);

  protected readonly visible = signal(false);
  protected readonly saving = signal(false);
  protected readonly listLoading = signal(false);
  protected readonly listError = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);

  protected readonly releases = signal<ReleaseItem[]>([]);
  protected readonly total = signal(0);
  protected readonly editingId = signal<string | null>(null);
  protected readonly projectOptions = signal<ProjectOption[]>([]);

  protected readonly filters = this.fb.nonNullable.group({
    projectId: [''],
    channel: [''],
    status: [''],
    keyword: ['']
  });

  protected readonly form = this.fb.nonNullable.group({
    projectId: [''],
    channel: ['desktop' as ReleaseChannel, [Validators.required]],
    version: ['', [Validators.required]],
    title: ['', [Validators.required]],
    notes: [''],
    downloadUrl: [''],
    status: ['draft' as ReleaseStatus]
  });

  public constructor() {
    this.filters.valueChanges.pipe(debounceTime(250), takeUntilDestroyed()).subscribe(() => {
      void this.loadReleases();
    });

    void this.loadProjectOptions();
    void this.loadReleases();
  }

  protected async reload(): Promise<void> {
    await this.loadReleases();
  }

  protected createRelease(): void {
    this.editingId.set(null);
    this.formError.set(null);
    this.form.reset({
      projectId: '',
      channel: 'desktop',
      version: '',
      title: '',
      notes: '',
      downloadUrl: '',
      status: 'draft'
    });
    this.visible.set(true);
  }

  protected edit(item: ReleaseItem): void {
    this.editingId.set(item.id);
    this.formError.set(null);
    this.form.reset({
      projectId: item.projectId || '',
      channel: item.channel,
      version: item.version,
      title: item.title,
      notes: item.notes || '',
      downloadUrl: item.downloadUrl || '',
      status: item.status
    });
    this.visible.set(true);
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    try {
      const value = this.form.getRawValue();
      const basePayload = {
        projectId: value.projectId || null,
        channel: value.channel,
        version: value.version,
        title: value.title,
        notes: value.notes,
        downloadUrl: value.downloadUrl
      };

      let item: ReleaseItem;
      if (this.editingId()) {
        item = await firstValueFrom(
          this.api.put<ReleaseItem, typeof basePayload>(`/api/admin/releases/${this.editingId()!}`, basePayload)
        );
      } else {
        item = await firstValueFrom(
          this.api.post<ReleaseItem, typeof basePayload>('/api/admin/releases', basePayload)
        );
      }

      if (value.status === 'published' && item.status !== 'published') {
        item = await firstValueFrom(
          this.api.post<ReleaseItem, Record<string, never>>(`/api/admin/releases/${item.id}/publish`, {})
        );
      }

      if (value.status === 'deprecated' && item.status !== 'deprecated') {
        await firstValueFrom(
          this.api.post<ReleaseItem, Record<string, never>>(`/api/admin/releases/${item.id}/deprecate`, {})
        );
      }

      this.visible.set(false);
      await this.loadReleases();
    } catch (error) {
      this.formError.set(this.getErrorMessage(error, '保存版本失败'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async publish(item: ReleaseItem): Promise<void> {
    this.listError.set(null);

    try {
      await firstValueFrom(this.api.post<ReleaseItem, Record<string, never>>(`/api/admin/releases/${item.id}/publish`, {}));
      await this.loadReleases();
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '发布版本失败'));
    }
  }

  protected async deprecate(item: ReleaseItem): Promise<void> {
    this.listError.set(null);

    try {
      await firstValueFrom(this.api.post<ReleaseItem, Record<string, never>>(`/api/admin/releases/${item.id}/deprecate`, {}));
      await this.loadReleases();
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '废弃版本失败'));
    }
  }

  protected async remove(item: ReleaseItem): Promise<void> {
    this.listError.set(null);

    try {
      await firstValueFrom(this.api.delete<{ id: string }>(`/api/admin/releases/${item.id}`));
      await this.loadReleases();
      if (this.editingId() === item.id) {
        this.visible.set(false);
        this.editingId.set(null);
      }
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '删除版本失败'));
    }
  }

  protected statusColor(status: ReleaseStatus): string {
    if (status === 'published') return 'green';
    if (status === 'deprecated') return 'default';
    return 'orange';
  }

  protected statusLabel(status: ReleaseStatus): string {
    if (status === 'published') return '已发布';
    if (status === 'deprecated') return '已废弃';
    return '草稿';
  }

  protected channelLabel(channel: ReleaseChannel): string {
    return channel === 'cli' ? 'CLI' : '桌面端';
  }
  private async loadReleases(): Promise<void> {
    this.listLoading.set(true);
    this.listError.set(null);

    try {
      const filter = this.filters.getRawValue();
      const params: Record<string, string | number | boolean> = { page: 1, pageSize: 50 };

      if (filter.projectId) params['projectId'] = filter.projectId;
      if (filter.channel) params['channel'] = filter.channel;
      if (filter.status) params['status'] = filter.status;
      if (filter.keyword.trim()) params['keyword'] = filter.keyword.trim();

      const result = await firstValueFrom(this.api.get<ReleaseListResult>('/api/admin/releases', { params }));
      this.releases.set(result.items);
      this.total.set(result.total);
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '加载版本列表失败'));
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



