import { Component, HostListener, OnDestroy, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { HubApiService } from '../../core/http/hub-api.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { AttachmentCardItem, AttachmentCardListComponent } from '../../shared/components';
import { PAGE_SHELL_STYLES } from '../../shared/styles/page-shell.styles';

export type IssueType =
  | 'bug'
  | 'requirement_change'
  | 'feature'
  | 'improvement'
  | 'task'
  | 'test_record';
type IssuePriority = 'low' | 'medium' | 'high' | 'critical';

interface ProjectOption {
  id: string;
  name: string;
  projectKey: string;
}

interface IssueItem {
  id: string;
  projectId: string;
  issueNo: string;
  title: string;
}

interface IssueAttachmentDto {
  id: string;
  originalName: string;
}

interface ProjectConfigItem {
  id: string;
  name?: string | null;
  version?: string | null;
  enabled: boolean;
}

interface AttachmentPolicyResult {
  accept: string;
  mimePrefixes: string[];
  exts: string[];
}

@Component({
  selector: 'app-issue-create-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzUploadModule,
    AttachmentCardListComponent,
    PageHeaderComponent
  ],
  template: `
    <section class="page" (paste)="onCreateAttachmentPaste($event)">
      <app-page-header title="新建问题" subtitle="填写问题信息并上传附件（支持拖拽与截图粘贴）">
        <button page-header-actions nz-button nzType="default" (click)="goBack()">返回列表</button>
      </app-page-header>

      @if (submitError()) {
        <nz-alert class="section" nzType="error" [nzMessage]="submitError()!" nzShowIcon></nz-alert>
      }

      <nz-card nzTitle="问题信息" class="section">
        <form nz-form [formGroup]="createForm" nzLayout="vertical" class="form" (ngSubmit)="submitCreate()">
          <div class="row-two">
            <nz-form-item>
              <nz-form-label nzRequired>项目</nz-form-label>
              <nz-form-control>
                <nz-select formControlName="projectId" nzPlaceHolder="选择项目">
                  @for (project of projectOptions(); track project.id) {
                    <nz-option [nzValue]="project.id" [nzLabel]="project.name + ' (' + project.projectKey + ')'"> </nz-option>
                  }
                </nz-select>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzRequired>标题</nz-form-label>
              <nz-form-control>
                <input nz-input formControlName="title" placeholder="一句话描述问题" />
              </nz-form-control>
            </nz-form-item>
          </div>

          <div class="row-two">
            <nz-form-item>
              <nz-form-label>类型</nz-form-label>
              <nz-form-control>
                <nz-select formControlName="type">
                  <nz-option nzValue="bug" nzLabel="缺陷"></nz-option>
                  <nz-option nzValue="requirement_change" nzLabel="需求变更"></nz-option>
                  <nz-option nzValue="feature" nzLabel="新功能"></nz-option>
                  <nz-option nzValue="improvement" nzLabel="改进"></nz-option>
                  <nz-option nzValue="task" nzLabel="任务"></nz-option>
                  <nz-option nzValue="test_record" nzLabel="测试记录"></nz-option>
                </nz-select>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label>优先级</nz-form-label>
              <nz-form-control>
                <nz-select formControlName="priority">
                  <nz-option nzValue="low" nzLabel="低"></nz-option>
                  <nz-option nzValue="medium" nzLabel="中"></nz-option>
                  <nz-option nzValue="high" nzLabel="高"></nz-option>
                  <nz-option nzValue="critical" nzLabel="紧急"></nz-option>
                </nz-select>
              </nz-form-control>
            </nz-form-item>
          </div>

          <div class="row-three">
            <nz-select formControlName="module" nzAllowClear nzPlaceHolder="模块（可选）">
              @for (item of moduleOptions(); track item.id) {
                <nz-option [nzValue]="item.name" [nzLabel]="item.name || '-'"> </nz-option>
              }
            </nz-select>
            <nz-select formControlName="version" nzAllowClear nzPlaceHolder="版本（可选）">
              @for (item of versionOptions(); track item.id) {
                <nz-option [nzValue]="item.version" [nzLabel]="item.version || '-'"> </nz-option>
              }
            </nz-select>
            <nz-select formControlName="environment" nzAllowClear nzPlaceHolder="环境（可选）">
              @for (item of environmentOptions(); track item.id) {
                <nz-option [nzValue]="item.name" [nzLabel]="item.name || '-'"> </nz-option>
              }
            </nz-select>
          </div>

          <textarea nz-input rows="7" formControlName="description" placeholder="问题描述 / 复现步骤"></textarea>

          <div class="create-attachments">
            <label>附件（支持点击、拖拽、粘贴截图）</label>
            <nz-upload
              nzType="drag"
              [nzMultiple]="true"
              [nzAccept]="attachmentAccept"
              [nzFileList]="createUploadFileList()"
              [nzBeforeUpload]="beforeCreateUpload"
              [nzShowUploadList]="false"
              (nzChange)="onCreateUploadChange($event)"
            >
              <p class="ant-upload-text">点击或拖拽文件到此区域</p>
              <p class="ant-upload-hint">支持 Ctrl+V 粘贴截图，文件会在提交问题后上传</p>
            </nz-upload>
            <app-attachment-card-list
              [items]="createAttachmentItems()"
              [loading]="submitting()"
              [showDownload]="false"
              [showRemove]="true"
              (remove)="removeCreateAttachment($event)"
            ></app-attachment-card-list>
          </div>

          <div class="form-actions">
            <button nz-button nzType="default" type="button" (click)="goBack()" [disabled]="submitting()">取消</button>
            <button nz-button nzType="primary" [disabled]="submitting() || createForm.invalid">提交问题</button>
          </div>
        </form>
      </nz-card>
    </section>
  `,
  styles: [
    PAGE_SHELL_STYLES,
    `
      .form { display: grid; gap: 12px; }
      .row-two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .row-three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .create-attachments { display: grid; gap: 8px; }
      .create-attachments label { font-weight: 500; }
      .muted { color: #6b7280; }
      .form-actions { display: flex; justify-content: flex-end; gap: 8px; }
      :host ::ng-deep .create-attachments .ant-upload-list { max-height: 240px; overflow-y: auto; }

      @media (max-width: 900px) {
        .row-two, .row-three { grid-template-columns: 1fr; }
      }
    `
  ]
})
export class IssueCreatePageComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HubApiService);
  private readonly router = inject(Router);
  private attachmentMimePrefixes = ['image/', 'video/'];
  private attachmentExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.3gp', '.flv', '.wmv', '.mpeg', '.mpg'];

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly projectOptions = signal<ProjectOption[]>([]);
  protected readonly moduleOptions = signal<ProjectConfigItem[]>([]);
  protected readonly environmentOptions = signal<ProjectConfigItem[]>([]);
  protected readonly versionOptions = signal<ProjectConfigItem[]>([]);
  protected attachmentAccept = 'image/*,video/*';
  protected readonly createUploadFileList = signal<NzUploadFile[]>([]);
  protected readonly createAttachmentItems = signal<AttachmentCardItem[]>([]);
  private readonly createAttachmentFileMap = new Map<string, File>();
  private readonly createAttachmentPreviewUrlMap = new Map<string, string>();

  protected readonly createForm = this.fb.nonNullable.group({
    projectId: ['', [Validators.required]],
    title: ['', [Validators.required]],
    description: [''],
    type: ['bug' as IssueType],
    priority: ['medium' as IssuePriority],
    module: [''],
    version: [''],
    environment: ['']
  });

  public constructor() {
    this.createForm.controls.projectId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((projectId) => {
        void this.loadProjectConfigs(projectId);
      });

    void this.loadProjectOptions();
    void this.loadAttachmentPolicy();
  }

  protected goBack(): void {
    void this.router.navigate(['/issues']);
  }

  public ngOnDestroy(): void {
    this.cleanupAllAttachmentPreviewUrls();
  }

  protected readonly beforeCreateUpload = (file: NzUploadFile): boolean => {
    const raw = file.originFileObj as File | undefined;
    if (!raw) return false;
    if (!this.isAllowedAttachmentFile(raw)) {
      this.submitError.set('仅支持图片和视频文件：' + raw.name);
      return false;
    }
    this.submitError.set(null);
    this.createAttachmentFileMap.set(file.uid, raw);
    this.syncCreateAttachmentFiles();
    return false;
  };

  protected onCreateUploadChange(event: { fileList: NzUploadFile[] }): void {
    const nextList = event.fileList ?? [];
    const activeUids = new Set(nextList.map((item) => item.uid));
    for (const uid of Array.from(this.createAttachmentFileMap.keys())) {
      if (!activeUids.has(uid)) {
        this.createAttachmentFileMap.delete(uid);
        this.revokeAttachmentPreviewUrl(uid);
      }
    }
    const filteredList = nextList.filter((item) => this.createAttachmentFileMap.has(item.uid));
    this.createUploadFileList.set(filteredList);
    this.syncCreateAttachmentFiles();
  }

  protected onCreateAttachmentPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items || items.length === 0) return;

    const pastedFiles: Array<{ uid: string; file: File }> = [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.kind !== 'file') continue;
      const raw = item.getAsFile();
      if (!raw) continue;
      if (!this.isAllowedAttachmentFile(raw)) continue;

      const ext = this.extByMime(raw.type);
      const name = raw.name && raw.name.trim().length > 0 ? raw.name : `pasted-${Date.now()}-${i + 1}${ext}`;
      const normalized = new File([raw], name, { type: raw.type || 'application/octet-stream' });
      const uid = `paste-${Date.now()}-${i}`;
      pastedFiles.push({ uid, file: normalized });
    }

    if (pastedFiles.length === 0) {
      this.submitError.set('粘贴内容中没有可上传的图片或视频');
      return;
    }
    this.submitError.set(null);

    event.preventDefault();
    const current = [...this.createUploadFileList()];
    for (const item of pastedFiles) {
      this.createAttachmentFileMap.set(item.uid, item.file);
      current.push({
        uid: item.uid,
        name: item.file.name,
        size: item.file.size,
        type: item.file.type,
        originFileObj: item.file,
        status: 'done'
      });
    }
    this.createUploadFileList.set(current);
    this.syncCreateAttachmentFiles();
  }

  protected removeCreateAttachment(uid: string): void {
    this.createAttachmentFileMap.delete(uid);
    this.revokeAttachmentPreviewUrl(uid);
    this.createUploadFileList.set(this.createUploadFileList().filter((item) => item.uid !== uid));
    this.syncCreateAttachmentFiles();
  }

  @HostListener('document:paste', ['$event'])
  protected handleDocumentPaste(event: ClipboardEvent): void {
    if (event.defaultPrevented) return;
    this.onCreateAttachmentPaste(event);
  }

  protected async submitCreate(): Promise<void> {
    if (this.createForm.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    try {
      const value = this.createForm.getRawValue();
      const pendingFiles = [...this.createAttachmentFileMap.values()];

      const created = await firstValueFrom(
        this.api.post<IssueItem, Record<string, string>>('/api/admin/issues', {
          projectId: value.projectId,
          title: value.title.trim(),
          description: value.description.trim(),
          type: value.type,
          priority: value.priority,
          module: value.module.trim(),
          version: value.version.trim(),
          environment: value.environment.trim()
        })
      );

      if (pendingFiles.length > 0) {
        await this.uploadIssueAttachmentFiles(created.id, pendingFiles);
      }

      this.cleanupAllAttachmentPreviewUrls();
      await this.router.navigate(['/issues'], { queryParams: { createdId: created.id } });
    } catch (error) {
      this.submitError.set(this.getErrorMessage(error, '创建问题失败'));
    } finally {
      this.submitting.set(false);
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

  private async loadAttachmentPolicy(): Promise<void> {
    try {
      const result = await firstValueFrom(this.api.get<AttachmentPolicyResult>('/api/admin/issues/attachment-policy'));
      if (result.accept?.trim()) {
        this.attachmentAccept = result.accept.trim();
      }
      if (Array.isArray(result.mimePrefixes) && result.mimePrefixes.length > 0) {
        this.attachmentMimePrefixes = result.mimePrefixes.map((item) => item.toLowerCase());
      }
      if (Array.isArray(result.exts) && result.exts.length > 0) {
        this.attachmentExts = result.exts.map((item) => item.toLowerCase());
      }
    } catch {
      // fallback to local defaults
    }
  }

  private async loadProjectConfigs(projectId: string): Promise<void> {
    this.createForm.patchValue({ module: '', version: '', environment: '' });

    if (!projectId) {
      this.moduleOptions.set([]);
      this.environmentOptions.set([]);
      this.versionOptions.set([]);
      return;
    }

    try {
      const [modules, environments, versions] = await Promise.all([
        firstValueFrom(this.api.get<{ items: ProjectConfigItem[] }>(`/api/admin/projects/${projectId}/modules`)),
        firstValueFrom(this.api.get<{ items: ProjectConfigItem[] }>(`/api/admin/projects/${projectId}/environments`)),
        firstValueFrom(this.api.get<{ items: ProjectConfigItem[] }>(`/api/admin/projects/${projectId}/versions`))
      ]);

      this.moduleOptions.set((modules.items ?? []).filter((item) => item.enabled && !!item.name?.trim()));
      this.environmentOptions.set((environments.items ?? []).filter((item) => item.enabled && !!item.name?.trim()));
      this.versionOptions.set((versions.items ?? []).filter((item) => item.enabled && !!item.version?.trim()));
    } catch {
      this.moduleOptions.set([]);
      this.environmentOptions.set([]);
      this.versionOptions.set([]);
    }
  }

  private async uploadIssueAttachmentFiles(issueId: string, files: readonly File[]): Promise<void> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    await firstValueFrom(
      this.api.post<{ items: IssueAttachmentDto[] }, FormData>(`/api/admin/issues/${issueId}/attachments`, formData)
    );
  }

  private syncCreateAttachmentFiles(): void {
    const items: AttachmentCardItem[] = [];
    for (const [uid, file] of this.createAttachmentFileMap.entries()) {
      items.push({
        id: uid,
        name: file.name,
        size: file.size,
        mimeType: file.type || null,
        fileExt: this.getFileExt(file.name),
        previewUrl: this.ensureAttachmentPreviewUrl(uid, file)
      });
    }
    this.createAttachmentItems.set(items);
  }

  private isAllowedAttachmentFile(file: File): boolean {
    const mimeType = file.type.toLowerCase();
    if (mimeType && this.attachmentMimePrefixes.some((prefix) => mimeType.startsWith(prefix))) {
      return true;
    }

    const name = file.name.toLowerCase();
    return this.attachmentExts.some((ext) => name.endsWith(ext));
  }

  private ensureAttachmentPreviewUrl(uid: string, file: File): string {
    const existing = this.createAttachmentPreviewUrlMap.get(uid);
    if (existing) {
      return existing;
    }
    const url = URL.createObjectURL(file);
    this.createAttachmentPreviewUrlMap.set(uid, url);
    return url;
  }

  private revokeAttachmentPreviewUrl(uid: string): void {
    const url = this.createAttachmentPreviewUrlMap.get(uid);
    if (!url) {
      return;
    }
    URL.revokeObjectURL(url);
    this.createAttachmentPreviewUrlMap.delete(uid);
  }

  private cleanupAllAttachmentPreviewUrls(): void {
    for (const url of this.createAttachmentPreviewUrlMap.values()) {
      URL.revokeObjectURL(url);
    }
    this.createAttachmentPreviewUrlMap.clear();
  }

  private getFileExt(name: string): string | null {
    const index = name.lastIndexOf('.');
    if (index < 0) {
      return null;
    }
    return name.slice(index).toLowerCase();
  }

  private extByMime(mimeType: string): string {
    if (mimeType === 'image/png') return '.png';
    if (mimeType === 'image/jpeg') return '.jpg';
    if (mimeType === 'image/webp') return '.webp';
    if (mimeType === 'image/gif') return '.gif';
    return '';
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HubApiError) return `${fallback}: ${error.message}`;
    if (error instanceof Error) return `${fallback}: ${error.message}`;
    return fallback;
  }
}
