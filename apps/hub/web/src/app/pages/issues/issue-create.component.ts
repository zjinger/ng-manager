import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import type { ProjectConfigItem, ProjectMemberItem, ProjectVersionItem } from '../projects/projects.model';
import { IssueFormComponent } from './components/issue-form/issue-form.component';
import { IssueManagementApiService } from './issue-management.api';
import type { IssueFormValue, ProjectOption } from './issues.model';

@Component({
  selector: 'app-issue-create-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzIconModule,
    NzSelectModule,
    AttachmentCardListComponent,
    PageHeaderComponent,
    IssueFormComponent,
    RouterModule
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

  protected readonly projects = signal<ProjectOption[]>([]);
  protected readonly projectMembers = signal<ProjectMemberItem[]>([]);
  protected readonly moduleOptions = signal<ProjectConfigItem[]>([]);
  protected readonly versionOptions = signal<ProjectVersionItem[]>([]);
  protected readonly environmentOptions = signal<ProjectConfigItem[]>([]);
  protected readonly pendingFiles = signal<File[]>([]);
  protected readonly pendingAttachmentItems = computed<AttachmentCardItem[]>(() =>
    this.pendingFiles().map((file, index) => ({
      id: String(index),
      name: file.name,
      size: file.size,
      mimeType: file.type || null,
      fileExt: this.extractFileExt(file.name),
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      url: null
    }))
  );
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    projectId: ['', [Validators.required]]
  });

  public constructor() {
    this.form.controls.projectId.valueChanges.pipe(takeUntilDestroyed()).subscribe((projectId) => {
      void this.loadProjectContext(projectId);
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
      const ext = raw.type === 'image/png' ? '.png' : raw.type === 'image/jpeg' ? '.jpg' : '';
      const fileName = raw.name?.trim() || `pasted-${Date.now()}-${i + 1}${ext}`;
      files.push(new File([raw], fileName, { type: raw.type || 'application/octet-stream' }));
    }

    if (files.length > 0) {
      event.preventDefault();
      this.addFiles(files);
      this.message.success(`已添加 ${files.length} 个粘贴附件`);
    }
  }

  protected async submitIssue(value: IssueFormValue): Promise<void> {
    const projectId = this.form.controls.projectId.value.trim();
    if (!projectId) {
      this.form.controls.projectId.markAsDirty();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    try {
      const created = await this.api.createIssue(projectId, value);
      const files = this.pendingFiles();
      if (files.length > 0) {
        try {
          await this.api.uploadAttachments(projectId, created.id, files);
        } catch (uploadError) {
          this.message.warning(this.getErrorMessage(uploadError, 'Issue 已创建，但附件上传失败'));
        }
      }
      await this.router.navigate(['/issues'], {
        queryParams: {
          projectId,
          issueId: created.id
        }
      });
    } catch (error) {
      this.error.set(this.getErrorMessage(error, '创建 Issue 失败'));
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
    return `${project.name}`;
  }

  protected selectFiles(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    if (files.length > 0) {
      this.addFiles(files);
    }
    input.value = '';
  }

  protected removePendingFile(id: string): void {
    const index = Number(id);
    if (Number.isNaN(index) || index < 0) {
      return;
    }
    const next = [...this.pendingFiles()];
    next.splice(index, 1);
    this.pendingFiles.set(next);
  }

  private async initialize(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const projects = await this.api.listProjects();
      this.projects.set(projects);
      const preferredProjectId = this.route.snapshot.queryParamMap.get('projectId')?.trim() || '';
      const nextProjectId = preferredProjectId && projects.some((item) => item.id === preferredProjectId)
        ? preferredProjectId
        : projects[0]?.id ?? '';
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

    try {
      const [members, modules, versions, environments] = await Promise.all([
        this.api.listProjectMembers(projectId),
        this.api.listProjectModules(projectId),
        this.api.listProjectVersions(projectId),
        this.api.listProjectEnvironments(projectId)
      ]);
      this.projectMembers.set(members);
      this.moduleOptions.set(modules);
      this.versionOptions.set(versions);
      this.environmentOptions.set(environments);
    } catch {
      this.projectMembers.set([]);
      this.moduleOptions.set([]);
      this.versionOptions.set([]);
      this.environmentOptions.set([]);
    }
  }

  private addFiles(files: File[]): void {
    this.pendingFiles.set([...this.pendingFiles(), ...files]);
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
}