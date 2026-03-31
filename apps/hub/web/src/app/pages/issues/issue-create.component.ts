import {
  Component,
  DestroyRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { AttachmentCardListComponent } from '../../shared/components/attachment-card-list/attachment-card-list.component';
import type { AttachmentCardItem } from '../../shared/components/attachment-card-list/attachment-card.model';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { PAGE_SHELL_STYLES } from '../../shared/styles/page-shell.styles';
import type {
  ProjectConfigItem,
  ProjectMemberItem,
  ProjectVersionItem
} from '../projects/projects.model';
import { IssueFormComponent } from './components/issue-form/issue-form.component';
import { IssueManagementApiService } from './issue-management.api';
import type { IssueFormSubmitEvent, ProjectOption } from './issues.model';

interface PendingAttachmentFile {
  id: string;
  file: File;
  previewUrl: string | null;
}

@Component({
  selector: 'app-issue-create-page',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzIconModule,
    NzSelectModule,
    AttachmentCardListComponent,
    PageHeaderComponent,
    IssueFormComponent
  ],
  templateUrl: './issue-create.component.html',
  styleUrls: ['./issue-create.component.less'],
  styles: [PAGE_SHELL_STYLES]
})
export class IssueCreatePageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(IssueManagementApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(IssueFormComponent)
  private issueFormComponent?: IssueFormComponent;

  protected readonly projects = signal<ProjectOption[]>([]);
  protected readonly projectMembers = signal<ProjectMemberItem[]>([]);
  protected readonly moduleOptions = signal<ProjectConfigItem[]>([]);
  protected readonly versionOptions = signal<ProjectVersionItem[]>([]);
  protected readonly environmentOptions = signal<ProjectConfigItem[]>([]);
  protected readonly pendingFiles = signal<PendingAttachmentFile[]>([]);
  protected readonly loading = signal(false);
  protected readonly contextLoading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly pendingAttachmentItems = computed<AttachmentCardItem[]>(() =>
    this.pendingFiles().map((item) => ({
      id: item.id,
      name: item.file.name,
      size: item.file.size,
      mimeType: item.file.type || null,
      fileExt: this.extractFileExt(item.file.name),
      previewUrl: item.previewUrl,
      url: null
    }))
  );

  protected readonly form = this.fb.nonNullable.group({
    projectId: ['', [Validators.required]]
  });



  public constructor() {
    this.form.controls.projectId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((projectId) => {
        void this.loadProjectContext(projectId);
      });

    this.destroyRef.onDestroy(() => {
      this.clearAllPreviewUrls();
    });

    void this.initialize();
  }

  @HostListener('document:paste', ['$event'])
  protected handlePaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items?.length) {
      return;
    }

    const files: File[] = [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.kind !== 'file') {
        continue;
      }

      const raw = item.getAsFile();
      if (!raw) {
        continue;
      }

      const ext =
        raw.type === 'image/png'
          ? '.png'
          : raw.type === 'image/jpeg'
            ? '.jpg'
            : raw.type === 'image/webp'
              ? '.webp'
              : '';

      const fileName = raw.name?.trim() || `pasted-${Date.now()}-${i + 1}${ext}`;
      files.push(new File([raw], fileName, { type: raw.type || 'application/octet-stream' }));
    }

    if (files.length > 0) {
      event.preventDefault();
      this.addFiles(files);
      this.message.success(`已添加 ${files.length} 个粘贴附件`);
    }
  }

  protected async submitIssue(event: IssueFormSubmitEvent): Promise<void> {
    const projectId = this.form.controls.projectId.value.trim();
    if (!projectId) {
      this.form.controls.projectId.markAsDirty();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    try {
      const created = await this.api.createIssue(projectId, event.value);

      const files = this.pendingFiles().map((item) => item.file);
      if (files.length > 0) {
        try {
          await this.api.uploadAttachments(projectId, created.id, files);
        } catch (uploadError) {
          this.message.warning(this.getErrorMessage(uploadError, '工单已创建，但附件上传失败'));
        }
      }

      if (event.continueCreate) {
        this.issueFormComponent?.resetForContinueCreate();
        this.clearPendingFiles();
        this.message.success('工单已创建，可继续新增');
        return;
      }

      this.message.success('工单创建成功');
      await this.router.navigate(['/issues'], {
        queryParams: {
          projectId,
          issueId: created.id
        }
      });
    } catch (error) {
      this.error.set(this.getErrorMessage(error, '创建工单失败'));
    } finally {
      this.submitting.set(false);
    }
  }

  protected async cancel(): Promise<void> {
    await this.router.navigate(['/issues'], {
      queryParams: {
        projectId: this.form.controls.projectId.value || undefined
      }
    });
  }

  protected projectLabel(project: ProjectOption): string {
    return project.name;
  }

  protected selectFiles(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    if (files.length > 0) {
      this.addFiles(files);
    }
    input.value = '';
  }

  protected removePendingFile(id: string): void {
    const target = this.pendingFiles().find((item) => item.id === id);
    if (!target) {
      return;
    }

    if (target.previewUrl) {
      URL.revokeObjectURL(target.previewUrl);
    }

    this.pendingFiles.update((list) => list.filter((item) => item.id !== id));
  }

  private async initialize(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const projects = await this.api.listProjects();
      this.projects.set(projects);

      const preferredProjectId = this.route.snapshot.queryParamMap.get('projectId')?.trim() || '';
      const nextProjectId =
        preferredProjectId && projects.some((item) => item.id === preferredProjectId)
          ? preferredProjectId
          : (projects[0]?.id ?? '');

      this.form.patchValue({ projectId: nextProjectId }, { emitEvent: true });
    } catch (error) {
      this.error.set(this.getErrorMessage(error, '加载新建页数据失败'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadProjectContext(projectId: string): Promise<void> {
    if (!projectId) {
      this.projectMembers.set([]);
      this.moduleOptions.set([]);
      this.versionOptions.set([]);
      this.environmentOptions.set([]);
      return;
    }

    this.contextLoading.set(true);

    try {
      const [members, modules, versions, environments] = await Promise.all([
        this.api.listProjectMembers(projectId),
        this.api.listProjectModules(projectId),
        this.api.listProjectVersions(projectId),
        this.api.listProjectEnvironments(projectId)
      ]);

      if (this.form.controls.projectId.value !== projectId) {
        return;
      }

      this.projectMembers.set(members);
      this.moduleOptions.set(modules);
      this.versionOptions.set(versions);
      this.environmentOptions.set(environments);
    } catch {
      if (this.form.controls.projectId.value === projectId) {
        this.projectMembers.set([]);
        this.moduleOptions.set([]);
        this.versionOptions.set([]);
        this.environmentOptions.set([]);
      }
    } finally {
      if (this.form.controls.projectId.value === projectId) {
        this.contextLoading.set(false);
      }
    }
  }

  private addFiles(files: File[]): void {
    const nextItems: PendingAttachmentFile[] = files.map((file, index) => ({
      id: `${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));

    this.pendingFiles.update((list) => [...list, ...nextItems]);
  }

  private clearAllPreviewUrls(): void {
    for (const item of this.pendingFiles()) {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    }
  }

  private extractFileExt(fileName: string): string | null {
    const index = fileName.lastIndexOf('.');
    if (index < 0) {
      return null;
    }
    return fileName.slice(index).toLowerCase();
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HubApiError) {
      return `${fallback}: ${error.message}`;
    }
    if (error instanceof Error) {
      return `${fallback}: ${error.message}`;
    }
    return fallback;
  }

  private clearPendingFiles(): void {
    for (const item of this.pendingFiles()) {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    }
    this.pendingFiles.set([]);
  }
}