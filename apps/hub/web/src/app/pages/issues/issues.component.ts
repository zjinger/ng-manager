import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { HubWebsocketService } from '../../core/services/hub-websocket.service';
import { ProjectContextService } from '../../core/services/project-context.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { PAGE_SHELL_STYLES } from '../../shared/styles/page-shell.styles';
import type {
  ProjectConfigItem,
  ProjectMemberItem,
  ProjectVersionItem,
} from '../projects/projects.model';
import { IssueDetailComponent } from './components/issue-detail/issue-detail.component';
import { IssueFormComponent } from './components/issue-form/issue-form.component';
import { IssueListComponent } from './components/issue-list/issue-list.component';
import { IssueManagementApiService } from './issue-management.api';
import {
  isIssueStatus,
  ISSUE_PRIORITY_OPTIONS,
  ISSUE_STATUS_OPTIONS,
  ISSUE_TYPE_OPTIONS,
  IssueListResult,
  IssueFormSubmitEvent,
  type IssueActionPanelSubmit,
  type IssueCommentMention,
  type IssueDetailResult,
  type IssueFilterValue,
  type IssueItem,
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
    IssueFormComponent,
  ],
  templateUrl: './issues.component.html',
  styleUrls: ['./issues.component.less'],
  styles: [PAGE_SHELL_STYLES],
})
export class IssuesPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(IssueManagementApiService);
  private readonly auth = inject(AdminAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly ws = inject(HubWebsocketService);

  protected readonly projectOpts = this.projectContextService.projectOpts;
  protected readonly currentProject = this.projectContextService.currentProject;
  protected readonly projectMembers = signal<ProjectMemberItem[]>([]);
  protected readonly moduleOptions = signal<ProjectConfigItem[]>([]);
  protected readonly versionOptions = signal<ProjectVersionItem[]>([]);
  protected readonly environmentOptions = signal<ProjectConfigItem[]>([]);
  protected readonly issues = signal<IssueItem[]>([]);
  protected readonly selectedIssueId = signal<string | null>(null);
  protected readonly selectedProjectId = signal<string | null>(null);
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
  protected readonly pageSize = signal(20);
  protected readonly total = signal(0);

  protected readonly formVisible = signal(false);
  protected readonly editingIssue = signal<IssueItem | null>(null);
  protected readonly statusOptions = ISSUE_STATUS_OPTIONS;
  protected readonly priorityOptions = ISSUE_PRIORITY_OPTIONS;
  protected readonly typeOptions = ISSUE_TYPE_OPTIONS;

  // 快捷按钮
  protected readonly onlyMineTodo = signal(false);
  protected readonly onlyMineToVerify = signal(false);
  protected readonly onlyMineReported = signal(false);
  protected readonly onlyMineReportedActive = signal(false);

  // 路径参数（优先设置到搜索条件中）
  private pendingIssueId: string | null = null;
  private pendingAssigneeId: string | null = null;
  private pendingProjectId: string | null = null;
  private pendingStatus: string | null = null;
  private pendingVerifierId: string | null = null;
  private pendingReporterId: string | null = null;
  private hasClearedPending = false;

  protected readonly filters = this.fb.nonNullable.group({
    projectId: [''],
    status: [''],
    priority: [''],
    type: [''],
    assigneeId: [''],
    keyword: [''],
  });

  protected readonly currentUserId = computed(() => {
    const profile = this.auth.profile();
    if (!profile) {
      return null;
    }
    return profile.userId?.trim() || profile.id;
  });

  protected readonly isAdmin = computed(() => this.auth.profile()?.role === 'admin');
  protected readonly projectName = signal<string | null>(null);
  protected readonly selectedProjectName = computed(() => {
    const projectId = this.selectedProjectId();
    const project = this.projectOpts().find((p) => p.value === projectId);
    return project ? project.label : null;
  });

  protected readonly quickFilterCount = computed(
    () =>
      [this.onlyMineTodo(), this.onlyMineToVerify(), this.onlyMineReportedActive(),this.onlyMineReported()].filter(Boolean)
        .length,
  );

  public constructor() {
    // 优先从路径上获取参数
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.pendingProjectId = params.get('projectId')?.trim() || null;
      this.pendingAssigneeId = params.get('assigneeId')?.trim() || null;
      this.pendingIssueId = params.get('issueId')?.trim() || null;
      this.pendingStatus = params.get('status')?.trim() || null;
      this.pendingVerifierId = params.get('verifierId')?.trim() || null;
      this.pendingReporterId = params.get('reporterId')?.trim() || null;
    });

    this.filters.controls.projectId.valueChanges
      // distinctUntilChanged避免重复加载，避免循环变动（关键）
      .pipe(takeUntilDestroyed(), distinctUntilChanged())
      .subscribe((projectId) => {
        this.page.set(1);
        this.selectedIssueId.set(null);
        this.selectedDetail.set(null);
        void this.loadProjectContext(projectId);
        const project = this.projectOpts().find((p) => p.value === projectId);
        this.projectName.set(project ? project.label : null);
      });

    this.filters.valueChanges.pipe(debounceTime(250), takeUntilDestroyed()).subscribe(() => {
      this.page.set(1);
      // 只要手动修改了搜索条件就清空路由参数
      this.clearAllPending();
      void this.loadIssues();
    });

    this.ws.events$
      .pipe(
        filter((event) => event.type === 'issue.created' || event.type === 'issue.updated'),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        void this.handleRealtimeIssueEvent();
      });

    void this.initialize();
  }

  protected async reload(): Promise<void> {
    await this.refreshCurrentView({ reloadList: true, reloadDetail: true });
  }

  protected async toggleOnlyMineTodo(): Promise<void> {
    if (!this.currentUserId()) {
      this.message.warning('当前账号未关联用户标识，不能按我的我的代办筛选');
      return;
    }
    this.onlyMineTodo.update((value) => !value);
    this.page.set(1);
    this.clearAllPending();
    this.applyOnlyMineFilters();
    await this.loadIssues();
  }

  protected async toggleOnlyMineToVerify(): Promise<void> {
    if (!this.currentUserId()) {
      this.message.warning('当前账号未关联用户标识，不能按我的待验证项筛选');
      return;
    }
    this.onlyMineToVerify.update((value) => !value);
    this.page.set(1);
    this.clearAllPending();
    this.applyOnlyMineToVerifyFilters();
    await this.loadIssues();
  }

  protected async toggleOnlyMineReportedActive(): Promise<void> {
    if (!this.currentUserId()) {
      this.message.warning('当前账号未关联用户标识，不能按我的待我跟进提报筛选');
      return;
    }
    this.onlyMineReportedActive.update((value) => !value);
    this.page.set(1);
    this.clearAllPending();
    this.applyOnlyMineReportedActiveFilters();
    await this.loadIssues();
  }

  protected async toggleOnlyMineReported() {
    if (!this.currentUserId()) {
      this.message.warning('当前账号未关联用户标识，不能按我的提报筛选');
      return;
    }
    this.onlyMineReported.update((value) => !value);
    this.page.set(1);
    this.clearAllPending();
    await this.loadIssues();
  }

  protected openCreatePage(): void {
    void this.router.navigate(['/issues/new'], {
      queryParams: {
        projectId: this.filters.controls.projectId.value || undefined,
      },
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

    await this.loadIssueDetail(item.id, item.projectId);
  }

  protected async changePage(page: number): Promise<void> {
    this.page.set(page);
    await this.loadIssues();
  }

  protected async changePageSize(pageSize: number): Promise<void> {
    this.pageSize.set(pageSize);
    await this.loadIssues();
  }

  protected async submitForm(event: IssueFormSubmitEvent): Promise<void> {
    const projectId = this.selectedProjectId();
    if (!projectId) {
      this.message.error('请先选择项目');
      return;
    }

    this.formSubmitting.set(true);
    try {
      const editing = this.editingIssue();
      if (!editing) {
        return;
      }

      await this.api.updateIssue(projectId, editing.id, event.value);
      this.message.success('工单已更新');
      this.closeFormModal();
      await this.refreshCurrentView({ reloadList: true, reloadDetail: true });
    } catch (error) {
      this.message.error(this.getErrorMessage(error, '更新工单失败'));
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
      this.detailError.set(this.getErrorMessage(error, '执行工单操作失败'));
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

  protected async submitComment(payload: {
    content: string;
    mentions: IssueCommentMention[];
  }): Promise<void> {
    const detail = this.selectedDetail();
    if (!detail) {
      return;
    }

    this.commentSubmitting.set(true);
    this.detailError.set(null);
    try {
      await this.api.createComment(
        detail.issue.projectId,
        detail.issue.id,
        payload.content,
        payload.mentions,
      );
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
    this.listLoading.set(true);
    this.detailLoading.set(true);
    // 不加载数据，让filters.controls.projectId.valueChanges触发
    const projectId = this.pendingProjectId ?? this.currentProject()?.id ?? '';
    const status = this.pendingStatus ?? '';
    const assigneeId = this.pendingAssigneeId ?? '';
    const issueId = this.pendingIssueId ?? '';
    const verifierId = this.pendingVerifierId ?? '';
    const reporterId = this.pendingReporterId ?? '';

    // 初次加载
    try {
      // 锁定某一条工单（函数内已有加载上下文），否则只加载上下文
      this.filters.patchValue({ projectId }, { emitEvent: false });
      if (issueId && projectId) await this.loadIssueDetail(issueId, projectId);
      else if (!issueId && projectId) await this.loadProjectContext(projectId);

      // 当前选中的工单的关键字
      const keyword = this.selectedDetail()?.issue.issueNo ?? '';
      this.selectedIssueId.set(issueId);
      // 路径参数(优先级最大）都设置在表单里
      this.filters.patchValue(
        { projectId, status, assigneeId, keyword: keyword },
        { emitEvent: false },
      );

      // 快捷按钮处理
      const userId = this.currentUserId();
      if (status === 'todo' && userId === assigneeId) {
        this.onlyMineTodo.set(true);
        this.applyOnlyMineFilters();
      } else if (status === 'verify' && userId === verifierId) {
        this.onlyMineToVerify.set(true);
        this.applyOnlyMineToVerifyFilters();
      } else if (status === 'reported_active' && userId === reporterId) {
        this.onlyMineReportedActive.set(true);
        this.applyOnlyMineReportedActiveFilters();
      } else if (status === 'reported' && userId === reporterId) {
        this.onlyMineReported.set(true);
      }

      await this.loadIssues();
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '加载工单失败'));
    } finally {
      this.listLoading.set(false);
      this.detailLoading.set(false);
    }
  }

  private async refreshCurrentView(options: {
    reloadList: boolean;
    reloadDetail: boolean;
  }): Promise<void> {
    if (options.reloadList) {
      await this.loadIssues();
    }
    if (options.reloadDetail) {
      const selectedId = this.selectedIssueId();
      const selectedProjectId = this.selectedProjectId();
      if (selectedId && selectedProjectId) {
        await this.loadIssueDetail(selectedId, selectedProjectId);
      }
    }
  }

  private async handleRealtimeIssueEvent(): Promise<void> {
    // await this.refreshCurrentView({ reloadList: true, reloadDetail: true });
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
        this.api.listProjectEnvironments(projectId),
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

  /**
   * 加载 Issue 列表
   */
  private async loadIssues(): Promise<void> {
    const filter = this.filters.getRawValue() as IssueFilterValue;

    this.listLoading.set(true);
    this.listError.set(null);

    try {
      const params: Record<string, string | number> = {
        page: this.page(),
        pageSize: this.pageSize(),
      };
      if (filter.status) params['status'] = filter.status;
      if (filter.priority) params['priority'] = filter.priority;
      if (filter.type) params['type'] = filter.type;
      if (filter.assigneeId) params['assigneeId'] = filter.assigneeId;
      if (filter.keyword.trim()) params['keyword'] = filter.keyword.trim();
      if (filter.projectId) params['projectId'] = filter.projectId;

      // 快捷选项(优先级高，直接覆盖部分搜索条件)
      const currentUserId = this.currentUserId();
      if (this.onlyMineTodo() && currentUserId) {
        params['assigneeId'] = currentUserId;
        params['status'] = 'todo';
      }
      if (this.onlyMineToVerify() && currentUserId) {
        params['verifierId'] = currentUserId;
        params['status'] = 'verify';
      }
      if (this.onlyMineReported() && currentUserId) {
        params['reporterId'] = currentUserId;
      }
      if (this.onlyMineReportedActive() && currentUserId) {
        params['reporterId'] = currentUserId;
        params['status'] = 'reported_active';
      }

      const result = await this.api.listAllIssues(params);
      this.issues.set(result.items);
      this.total.set(result.total);

      const selectedId = this.selectedIssueId();
      const nextSelected =
        selectedId && result.items.some((item) => item.id === selectedId)
          ? selectedId
          : (result.items[0]?.id ?? null);
      const projectId = this.issues().find((issue) => issue.id === nextSelected)?.projectId ?? null;
      this.selectedIssueId.set(nextSelected);
      if (nextSelected && projectId) {
        await this.loadIssueDetail(nextSelected, projectId);
      } else {
        this.selectedDetail.set(null);
      }
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '加载 Issue 列表失败'));
    } finally {
      this.listLoading.set(false);
    }
  }

  private async loadIssueDetail(issueId: string, projectId: string): Promise<void> {
    const oldProjectId = this.selectedProjectId();
    if (oldProjectId !== projectId) {
      this.selectedProjectId.set(projectId);
      await this.loadProjectContext(projectId);
    }

    this.detailLoading.set(true);
    this.detailError.set(null);
    try {
      this.selectedDetail.set(await this.api.getIssueDetail(projectId, issueId));
    } catch (error) {
      this.detailError.set(this.getErrorMessage(error, '加载工单详情失败'));
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

  /**仅看待我处理后，表单状态变化 */
  private applyOnlyMineFilters(): void {
    if (this.onlyMineTodo()) {
      this.filters.patchValue(
        { assigneeId: this.currentUserId() ?? '', status: '' },
        { emitEvent: false },
      );
      this.filters.controls.assigneeId.disable({ emitEvent: false });
      this.filters.controls.status.disable({ emitEvent: false });
    } else {
      this.filters.patchValue({ assigneeId: '', status: '' }, { emitEvent: false });
      this.filters.enable({ emitEvent: false });
    }
  }

  /**仅看待我验证，表单状态变化 */
  private applyOnlyMineToVerifyFilters(): void {
    if (this.onlyMineToVerify()) {
      this.filters.patchValue({ status: '' }, { emitEvent: false });
      this.filters.controls.status.disable({ emitEvent: false });
    } else {
      this.filters.enable({ emitEvent: false });
    }
  }

  /**仅看待我跟进提报后，表单状态变化 */
  private applyOnlyMineReportedActiveFilters(): void {
    if (this.onlyMineReportedActive()) {
      this.filters.patchValue({ status: '' }, { emitEvent: false });
      this.filters.controls.status.disable({ emitEvent: false });
    } else {
      this.filters.enable({ emitEvent: false });
    }
  }

  private clearAllPending() {
    if (this.hasClearedPending) {
      return;
    }
    this.pendingIssueId = null;
    this.pendingProjectId = null;
    this.pendingAssigneeId = null;
    this.pendingStatus = null;
    this.hasClearedPending = true;
    this.router.navigate([], {
      queryParams: {},
    });
  }
}
