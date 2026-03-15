import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { PAGE_SHELL_STYLES } from '../../shared/styles/page-shell.styles';
import type { ProjectConfigItem, ProjectMemberItem, ProjectVersionItem } from '../projects/projects.model';
import { IssueDetailComponent } from './components/issue-detail/issue-detail.component';
import { IssueFormComponent } from './components/issue-form/issue-form.component';
import { IssueListComponent } from './components/issue-list/issue-list.component';
import { IssueManagementApiService } from './issue-management.api';
import {
  ISSUE_PRIORITY_OPTIONS,
  ISSUE_STATUS_OPTIONS,
  ISSUE_TYPE_OPTIONS,
  type IssueActionPanelSubmit,
  type IssueCommentMention,
  type IssueDetailResult,
  type IssueFilterValue,
  type IssueFormValue,
  type IssueItem,
  type ProjectOption
} from './issues.model';

@Component({
  selector: 'app-issues-page',
  imports: [
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    PageHeaderComponent,
    IssueListComponent,
    IssueDetailComponent,
    IssueFormComponent
  ],
  templateUrl: './issues.component.html',
  styleUrls: ['./issues.component.less'],
  styles: [PAGE_SHELL_STYLES]
})
export class IssuesPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(IssueManagementApiService);
  private readonly auth = inject(AdminAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);

  protected readonly projects = signal<ProjectOption[]>([]);
  protected readonly projectMembers = signal<ProjectMemberItem[]>([]);
  protected readonly moduleOptions = signal<ProjectConfigItem[]>([]);
  protected readonly versionOptions = signal<ProjectVersionItem[]>([]);
  protected readonly environmentOptions = signal<ProjectConfigItem[]>([]);
  protected readonly issues = signal<IssueItem[]>([]);
  protected readonly selectedIssueId = signal<string | null>(null);
  protected readonly selectedDetail = signal<IssueDetailResult | null>(null);

  protected readonly listLoading = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly formSubmitting = signal(false);
  protected readonly actionLoading = signal(false);
  protected readonly participantSaving = signal(false);
  protected readonly commentSubmitting = signal(false);
  protected readonly attachmentUploading = signal(false);

  protected readonly listError = signal<string | null>(null);
  protected readonly detailError = signal<string | null>(null);

  protected readonly page = signal(1);
  protected readonly pageSize = 20;
  protected readonly total = signal(0);

  protected readonly formVisible = signal(false);
  protected readonly editingIssue = signal<IssueItem | null>(null);
  protected readonly statusOptions = ISSUE_STATUS_OPTIONS;
  protected readonly priorityOptions = ISSUE_PRIORITY_OPTIONS;
  protected readonly typeOptions = ISSUE_TYPE_OPTIONS;

  private pendingIssueId: string | null = null;
  private pendingProjectId: string | null = null;

  protected readonly filters = this.fb.nonNullable.group({
    projectId: [''],
    status: [''],
    priority: [''],
    type: [''],
    assigneeId: [''],
    keyword: ['']
  });

  protected readonly currentUserId = computed(() => {
    const profile = this.auth.profile();
    if (!profile) {
      return null;
    }
    return profile.userId?.trim() || profile.id;
  });

  protected readonly isAdmin = computed(() => this.auth.profile()?.role === 'admin');

  public constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.pendingProjectId = params.get('projectId')?.trim() || null;
      this.pendingIssueId = params.get('issueId')?.trim() || null;
    });

    this.filters.controls.projectId.valueChanges.pipe(takeUntilDestroyed()).subscribe((projectId) => {
      this.page.set(1);
      this.selectedIssueId.set(null);
      this.selectedDetail.set(null);
      void this.loadProjectContext(projectId);
    });

    this.filters.valueChanges.pipe(debounceTime(250), takeUntilDestroyed()).subscribe(() => {
      this.page.set(1);
      void this.loadIssues();
    });

    void this.initialize();
  }

  protected async reload(): Promise<void> {
    await this.refreshCurrentView({ reloadList: true, reloadDetail: true });
  }

  protected openCreatePage(): void {
    void this.router.navigate(['/issues/new'], {
      queryParams: {
        projectId: this.filters.controls.projectId.value || undefined
      }
    });
  }

  protected openEditModal(): void {
    const detail = this.selectedDetail();
    if (!detail) {
      return;
    }
    this.editingIssue.set(detail.issue);
    this.formVisible.set(true);
  }

  protected closeFormModal(): void {
    this.formVisible.set(false);
    this.editingIssue.set(null);
  }

  protected async selectIssue(item: IssueItem): Promise<void> {
    this.selectedIssueId.set(item.id);
    await this.loadIssueDetail(item.id);
  }

  protected async changePage(page: number): Promise<void> {
    this.page.set(page);
    await this.loadIssues();
  }

  protected async submitForm(value: IssueFormValue): Promise<void> {
    const projectId = this.filters.controls.projectId.value;
    if (!projectId) {
      return;
    }

    this.formSubmitting.set(true);
    try {
      const editing = this.editingIssue();
      if (!editing) {
        return;
      }

      await this.api.updateIssue(projectId, editing.id, value);
      this.message.success('Issue 已更新');
      this.closeFormModal();
      await this.refreshCurrentView({ reloadList: true, reloadDetail: true });
    } catch (error) {
      this.message.error(this.getErrorMessage(error, '更新 Issue 失败'));
    } finally {
      this.formSubmitting.set(false);
    }
  }

  protected async handleAction(payload: IssueActionPanelSubmit): Promise<void> {
    const detail = this.selectedDetail();
    if (!detail) {
      return;
    }

    this.actionLoading.set(true);
    this.detailError.set(null);

    try {
      await this.api.runAction(detail.issue.projectId, detail.issue.id, payload);
      await this.refreshCurrentView({ reloadList: true, reloadDetail: true });
    } catch (error) {
      this.detailError.set(this.getErrorMessage(error, '执行 Issue 操作失败'));
    } finally {
      this.actionLoading.set(false);
    }
  }

  protected async addParticipant(userId: string): Promise<void> {
    const detail = this.selectedDetail();
    if (!detail) {
      return;
    }

    this.participantSaving.set(true);
    this.detailError.set(null);
    try {
      await this.api.addParticipant(detail.issue.projectId, detail.issue.id, userId);
      await this.refreshCurrentView({ reloadList: true, reloadDetail: true });
    } catch (error) {
      this.detailError.set(this.getErrorMessage(error, '添加参与人失败'));
    } finally {
      this.participantSaving.set(false);
    }
  }

  protected async removeParticipant(userId: string): Promise<void> {
    const detail = this.selectedDetail();
    if (!detail) {
      return;
    }

    this.participantSaving.set(true);
    this.detailError.set(null);
    try {
      await this.api.removeParticipant(detail.issue.projectId, detail.issue.id, userId);
      await this.refreshCurrentView({ reloadList: true, reloadDetail: true });
    } catch (error) {
      this.detailError.set(this.getErrorMessage(error, '移除参与人失败'));
    } finally {
      this.participantSaving.set(false);
    }
  }

  protected async submitComment(payload: { content: string; mentions: IssueCommentMention[] }): Promise<void> {
    const detail = this.selectedDetail();
    if (!detail) {
      return;
    }

    this.commentSubmitting.set(true);
    this.detailError.set(null);
    try {
      await this.api.createComment(detail.issue.projectId, detail.issue.id, payload.content, payload.mentions);
      await this.refreshCurrentView({ reloadList: true, reloadDetail: true });
    } catch (error) {
      this.detailError.set(this.getErrorMessage(error, '提交评论失败'));
    } finally {
      this.commentSubmitting.set(false);
    }
  }

  protected async uploadAttachments(files: File[]): Promise<void> {
    const detail = this.selectedDetail();
    if (!detail || files.length === 0) {
      return;
    }

    this.attachmentUploading.set(true);
    this.detailError.set(null);
    try {
      await this.api.uploadAttachments(detail.issue.projectId, detail.issue.id, files);
      await this.refreshCurrentView({ reloadList: true, reloadDetail: true });
    } catch (error) {
      this.detailError.set(this.getErrorMessage(error, '上传附件失败'));
    } finally {
      this.attachmentUploading.set(false);
    }
  }

  protected async deleteAttachment(attachmentId: string): Promise<void> {
    const detail = this.selectedDetail();
    if (!detail) {
      return;
    }

    this.attachmentUploading.set(true);
    this.detailError.set(null);
    try {
      await this.api.deleteAttachment(detail.issue.projectId, detail.issue.id, attachmentId);
      await this.refreshCurrentView({ reloadList: true, reloadDetail: true });
    } catch (error) {
      this.detailError.set(this.getErrorMessage(error, '删除附件失败'));
    } finally {
      this.attachmentUploading.set(false);
    }
  }

  private async initialize(): Promise<void> {
    try {
      const items = await this.api.listProjects();
      this.projects.set(items);
      const initialProjectId = this.resolveInitialProjectId(items);
      this.filters.patchValue({ projectId: initialProjectId }, { emitEvent: true });
      if (!initialProjectId) {
        await this.loadIssues();
      }
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '加载项目失败'));
    }
  }

  private resolveInitialProjectId(items: ProjectOption[]): string {
    if (this.pendingProjectId && items.some((item) => item.id === this.pendingProjectId)) {
      return this.pendingProjectId;
    }
    return this.filters.controls.projectId.value || items[0]?.id || '';
  }

  private async refreshCurrentView(options: { reloadList: boolean; reloadDetail: boolean }): Promise<void> {
    if (options.reloadList) {
      await this.loadIssues();
    }
    if (options.reloadDetail) {
      const selectedId = this.selectedIssueId();
      if (selectedId) {
        await this.loadIssueDetail(selectedId);
      }
    }
  }

  private async loadProjectContext(projectId: string): Promise<void> {
    if (!projectId) {
      this.projectMembers.set([]);
      this.moduleOptions.set([]);
      this.versionOptions.set([]);
      this.environmentOptions.set([]);
      this.issues.set([]);
      this.total.set(0);
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

  private async loadIssues(): Promise<void> {
    const filter = this.filters.getRawValue() as IssueFilterValue;
    if (!filter.projectId) {
      this.issues.set([]);
      this.total.set(0);
      return;
    }

    this.listLoading.set(true);
    this.listError.set(null);

    try {
      const params: Record<string, string | number> = {
        page: this.page(),
        pageSize: this.pageSize
      };
      if (filter.status) params['status'] = filter.status;
      if (filter.priority) params['priority'] = filter.priority;
      if (filter.type) params['type'] = filter.type;
      if (filter.assigneeId) params['assigneeId'] = filter.assigneeId;
      if (filter.keyword.trim()) params['keyword'] = filter.keyword.trim();

      const result = await this.api.listIssues(filter.projectId, params);
      this.issues.set(result.items);
      this.total.set(result.total);

      const selectedId = this.selectedIssueId();
      if (selectedId && !result.items.some((item) => item.id === selectedId)) {
        this.selectedIssueId.set(null);
        this.selectedDetail.set(null);
      }

      if (this.pendingIssueId) {
        const pending = result.items.find((item) => item.id === this.pendingIssueId);
        if (pending) {
          this.selectedIssueId.set(pending.id);
          this.pendingIssueId = null;
          await this.loadIssueDetail(pending.id);
        }
      }
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '加载 Issue 列表失败'));
    } finally {
      this.listLoading.set(false);
    }
  }

  private async loadIssueDetail(issueId: string): Promise<void> {
    const projectId = this.filters.controls.projectId.value;
    if (!projectId) {
      return;
    }

    this.detailLoading.set(true);
    this.detailError.set(null);
    try {
      this.selectedDetail.set(await this.api.getIssueDetail(projectId, issueId));
      if (this.route.snapshot.queryParamMap.get('issueId')) {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { issueId: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
    } catch (error) {
      this.detailError.set(this.getErrorMessage(error, '加载 Issue 详情失败'));
    } finally {
      this.detailLoading.set(false);
    }
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


