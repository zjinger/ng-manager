import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { PAGE_SHELL_STYLES } from '../../shared/styles/page-shell.styles';
import type { ProjectMemberItem } from '../projects/projects.model';
import { RdDetailComponent } from './components/rd-detail.component';
import { RdItemFormComponent } from './components/rd-item-form.component';
import { RdStageManagerComponent } from './components/rd-stage-manager.component';
import {
  memberDisplay,
  RD_PRIORITY_OPTIONS,
  RD_STATUS_OPTIONS,
  RD_TYPE_OPTIONS,
  rdPriorityColor,
  rdPriorityLabel,
  rdStatusColor,
  rdStatusLabel,
  rdTypeColor,
  rdTypeLabel,
  type RdFilterValue,
  type RdItem,
  type RdItemDetailResult,
  type RdItemFormValue,
  type RdOverview,
  type RdStageFormValue,
  type RdStageItem,
  type RdStatusChangeValue,
} from './models/rd.model';
import { RdManagementApiService } from './services/rd.api';
import { ProjectContextService } from '../../core/services/project-context.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-rd-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzEmptyModule,
    NzFormModule,
    NzInputModule,
    NzModalModule,
    NzProgressModule,
    NzSelectModule,
    NzSpinModule,
    NzTableModule,
    NzTagModule,
    PageHeaderComponent,
    RdDetailComponent,
    RdItemFormComponent,
    RdStageManagerComponent,
  ],
  templateUrl: './rd.component.html',
  styleUrls: ['./rd.component.less'],
  styles: [PAGE_SHELL_STYLES],
})
export class RdPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(RdManagementApiService);
  private readonly auth = inject(AdminAuthService);
  private readonly message = inject(NzMessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly projectContext = inject(ProjectContextService);

  protected readonly projects = this.projectContext.allProjects;
  protected readonly projectOpts = this.projectContext.projectOpts;
  protected readonly currentProjectId = signal<string | null>(null);
  protected readonly projectMembers = signal<ProjectMemberItem[]>([]);
  protected readonly stages = signal<RdStageItem[]>([]);
  protected readonly items = signal<RdItem[]>([]);
  protected readonly overview = signal<RdOverview | null>(null);
  protected readonly detail = signal<RdItemDetailResult | null>(null);
  protected readonly selectedItemId = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly itemSubmitting = signal(false);
  protected readonly stageSaving = signal(false);
  protected readonly actionSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = 20;
  protected readonly itemModalVisible = signal(false);
  protected readonly stageManagerVisible = signal(false);
  protected readonly editingItem = signal<RdItem | null>(null);
  protected readonly onlyMine = signal(false);
  protected readonly onlyMineBlocked = signal(false);
  protected readonly onlyOverdue = signal(false);
  protected readonly onlyMineToReview = signal(false);
  protected readonly formProjectId = signal('');
  protected readonly formProjectMembers = signal<ProjectMemberItem[]>([]);
  protected readonly formStages = signal<RdStageItem[]>([]);

  private readonly projectMemberCache = signal<Record<string, ProjectMemberItem[]>>({});
  private readonly projectStageCache = signal<Record<string, RdStageItem[]>>({});

  protected readonly statusOptions = RD_STATUS_OPTIONS;
  protected readonly priorityOptions = RD_PRIORITY_OPTIONS;
  protected readonly typeOptions = RD_TYPE_OPTIONS;
  protected readonly statusLabel = rdStatusLabel;
  protected readonly statusColor = rdStatusColor;
  protected readonly priorityLabel = rdPriorityLabel;
  protected readonly priorityColor = rdPriorityColor;
  protected readonly typeLabel = rdTypeLabel;
  protected readonly typeColor = rdTypeColor;
  protected readonly memberDisplay = memberDisplay;

  // 路由参数
  private pendingStatus: string | null = null;
  private pendingAssigneeId: string | null = null;
  private pendingProjectId: string | null = null;
  private pendingReviewerId: string | null = null;
  private hasClearedPending = false;

  protected readonly filters = this.fb.nonNullable.group({
    projectId: [''],
    stageId: [''],
    status: [''],
    priority: [''],
    type: [''],
    assigneeId: [''],
    keyword: [''],
  });

  protected readonly currentProject = computed(() => {
    const current = this.currentProjectId();
    return this.projects().find((item) => item.id === current) ?? null;
  });

  protected readonly enabledStages = computed(() => this.stages().filter((item) => item.enabled));
  protected readonly formEnabledStages = computed(() =>
    this.formStages().filter((item) => item.enabled),
  );

  protected readonly currentUserId = computed(() => {
    const profile = this.auth.profile();
    if (!profile) return null;
    return profile.userId?.trim() || profile.id;
  });

  protected readonly isAdmin = computed(() => this.auth.profile()?.role === 'admin');

  protected readonly currentMember = computed(() => {
    const projectId = this.filters.controls.projectId.value;
    if (!projectId) return null;
    return this.findProjectMember(projectId);
  });

  protected readonly canCreateItem = computed(() => this.isAdmin() || this.projects().length > 0);
  protected readonly canManageStages = computed(() => {
    const projectId = this.filters.controls.projectId.value;
    if (!projectId) return false;
    if (this.isAdmin()) return true;
    return !!this.findProjectMember(projectId)?.roles.includes('project_admin');
  });
  protected readonly canEditSelected = computed(() =>
    this.canEditItem(this.detail()?.item ?? null),
  );
  protected readonly canDeleteSelected = computed(() =>
    this.canDeleteItem(this.detail()?.item ?? null),
  );
  protected readonly quickFilterCount = computed(
    () =>
      [this.onlyMine(), this.onlyMineBlocked(), this.onlyOverdue(), this.onlyMineToReview()].filter(
        Boolean,
      ).length,
  );
  protected readonly formProjectLocked = computed(() => !!this.editingItem());

  public constructor() {
    // 优先从路径上获取参数
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.pendingProjectId = params.get('projectId')?.trim() || null;
      this.pendingAssigneeId = params.get('assigneeId')?.trim() || null;
      this.pendingStatus = params.get('status')?.trim() || null;
      this.pendingReviewerId = params.get('reviewerId')?.trim() || null;
    });

    this.filters.controls.projectId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((projectId) => {
        this.page.set(1);
        this.selectedItemId.set(null);
        this.detail.set(null);
        this.currentProjectId.set(projectId);
        void this.loadProjectContext(projectId);
      });

    this.filters.valueChanges.pipe(debounceTime(250), takeUntilDestroyed()).subscribe(() => {
      this.page.set(1);
      this.clearAllPending();
      void this.loadItems();
    });

    void this.initialize();
  }

  protected async reload(): Promise<void> {
    await this.loadProjectContext(this.filters.controls.projectId.value);
    await this.loadItems();
  }

  protected async toggleOnlyMine(): Promise<void> {
    if (!this.currentUserId()) {
      this.message.warning('当前账号未关联用户标识，不能按我的研发项筛选');
      return;
    }
    this.onlyMine.update((value) => !value);
    this.page.set(1);
    this.clearAllPending();
    this.applyOnlyMineFilters();
    await this.loadItems();
  }

  protected async toggleOnlyMineBlocked(): Promise<void> {
    if (!this.currentUserId()) {
      this.message.warning('当前账号未关联用户标识，不能按我的待审核项筛选');
      return;
    }
    this.onlyMineBlocked.update((value) => !value);
    this.page.set(1);
    this.clearAllPending();
    this.applyOnlyMineBlockedFilters();
    await this.loadItems();
  }

  protected async toggleOnlyOverdue(): Promise<void> {
    this.onlyOverdue.update((value) => !value);
    this.page.set(1);
    this.clearAllPending();
    await this.loadItems();
  }

  protected async toggleOnlyMineToReview(): Promise<void> {
    if (!this.currentUserId()) {
      this.message.warning('当前账号未关联用户标识，不能按我的待审核项筛选');
      return;
    }
    this.onlyMineToReview.update((value) => !value);
    this.page.set(1);
    this.clearAllPending();
    this.applyOnlyMineToReviewFilters();
    await this.loadItems();
  }

  protected async changePage(page: number): Promise<void> {
    this.page.set(page);
    await this.loadItems();
  }

  protected async selectItem(item: RdItem): Promise<void> {
    this.selectedItemId.set(item.id);
    this.currentProjectId.set(item.projectId);
    await this.loadDetail(item.projectId, item.id);
  }

  protected async openCreateModal(): Promise<void> {
    if (!this.canCreateItem()) {
      this.message.warning('当前账号还没有可用项目，不能创建研发项');
      return;
    }

    const defaultProjectId =
      this.filters.controls.projectId.value ||
      this.currentProjectId() ||
      this.projects()[0]?.id ||
      '';
    if (!defaultProjectId) {
      this.message.warning('请先加入至少一个项目后再创建研发项');
      return;
    }

    this.editingItem.set(null);
    await this.loadFormProjectContext(defaultProjectId);
    this.itemModalVisible.set(true);
  }

  protected async openEditModal(): Promise<void> {
    const item = this.detail()?.item ?? null;
    if (!this.canEditItem(item)) {
      this.message.warning('当前账号没有编辑该研发项的权限');
      return;
    }
    if (!item) {
      return;
    }

    this.editingItem.set(item);
    await this.loadFormProjectContext(item.projectId);
    this.itemModalVisible.set(true);
  }

  protected closeItemModal(): void {
    this.itemModalVisible.set(false);
    this.editingItem.set(null);
  }

  protected openStageManager(): void {
    if (!this.filters.controls.projectId.value) {
      this.message.warning('请先选择项目后再管理研发阶段');
      return;
    }
    if (!this.canManageStages()) {
      this.message.warning('当前账号没有管理研发阶段的权限');
      return;
    }
    this.stageManagerVisible.set(true);
  }

  protected async handleFormProjectChange(projectId: string): Promise<void> {
    if (this.editingItem()) {
      return;
    }
    await this.loadFormProjectContext(projectId);
  }

  protected async submitItemForm(value: RdItemFormValue): Promise<void> {
    const editingItem = this.editingItem();
    const projectId = (editingItem?.projectId ?? value.projectId).trim();
    if (!projectId) {
      this.message.warning('请选择所属项目');
      return;
    }

    this.itemSubmitting.set(true);
    try {
      if (editingItem) {
        const updated = await this.api.updateItem(projectId, editingItem.id, value);
        this.message.success('研发项已更新');
        this.selectedItemId.set(updated.id);
        this.closeItemModal();
        await this.refreshCurrentProjectView(updated.id);
      } else {
        const created = await this.api.createItem(value);
        this.message.success('研发项已创建');
        this.closeItemModal();
        await this.refreshAfterCreate(created);
      }
    } catch (error) {
      this.message.error(this.resolveErrorMessage(error, '保存研发项失败'));
    } finally {
      this.itemSubmitting.set(false);
    }
  }

  protected async handleStatusChange(value: RdStatusChangeValue): Promise<void> {
    const detail = this.detail();
    if (!detail) return;

    this.actionSaving.set(true);
    try {
      await this.api.changeStatus(detail.item.projectId, detail.item.id, value);
      this.message.success('研发项状态已更新');
      await this.refreshCurrentProjectView(detail.item.id);
    } catch (error) {
      this.message.error(this.resolveErrorMessage(error, '更新研发项状态失败'));
    } finally {
      this.actionSaving.set(false);
    }
  }

  protected async handleProgressUpdate(progress: number): Promise<void> {
    const detail = this.detail();
    if (!detail) return;

    this.actionSaving.set(true);
    try {
      await this.api.updateProgress(detail.item.projectId, detail.item.id, progress);
      this.message.success('研发项进度已更新');
      await this.refreshCurrentProjectView(detail.item.id);
    } catch (error) {
      this.message.error(this.resolveErrorMessage(error, '更新研发项进度失败'));
    } finally {
      this.actionSaving.set(false);
    }
  }

  protected async handleDeleteItem(): Promise<void> {
    const detail = this.detail();
    if (!detail) return;

    this.actionSaving.set(true);
    try {
      await this.api.deleteItem(detail.item.projectId, detail.item.id);
      this.message.success('研发项已删除');
      this.selectedItemId.set(null);
      this.detail.set(null);
      await this.refreshCurrentProjectView();
    } catch (error) {
      this.message.error(this.resolveErrorMessage(error, '删除研发项失败'));
    } finally {
      this.actionSaving.set(false);
    }
  }

  protected async createStage(value: RdStageFormValue): Promise<void> {
    const projectId = this.filters.controls.projectId.value;
    if (!projectId) return;

    this.stageSaving.set(true);
    try {
      await this.api.createStage(projectId, value);
      this.message.success('研发阶段已创建');
      this.invalidateProjectStageCache(projectId);
      await this.loadProjectContext(projectId);
      await this.loadItems();
    } catch (error) {
      this.message.error(this.resolveErrorMessage(error, '创建研发阶段失败'));
    } finally {
      this.stageSaving.set(false);
    }
  }

  protected async updateStage(event: { id: string; value: RdStageFormValue }): Promise<void> {
    const projectId = this.filters.controls.projectId.value;
    if (!projectId) return;

    this.stageSaving.set(true);
    try {
      await this.api.updateStage(projectId, event.id, event.value);
      this.message.success('研发阶段已更新');
      this.invalidateProjectStageCache(projectId);
      await this.loadProjectContext(projectId);
      await this.loadItems();
    } catch (error) {
      this.message.error(this.resolveErrorMessage(error, '更新研发阶段失败'));
    } finally {
      this.stageSaving.set(false);
    }
  }

  protected async deleteStage(stageId: string): Promise<void> {
    const projectId = this.filters.controls.projectId.value;
    if (!projectId) return;

    this.stageSaving.set(true);
    try {
      await this.api.deleteStage(projectId, stageId);
      this.message.success('研发阶段已删除');
      this.invalidateProjectStageCache(projectId);
      await this.loadProjectContext(projectId);
      await this.loadItems();
    } catch (error) {
      this.message.error(this.resolveErrorMessage(error, '删除研发阶段失败'));
    } finally {
      this.stageSaving.set(false);
    }
  }

  private async initialize(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const projectId = this.pendingAssigneeId ?? this.projectContext.currentProject()?.id ?? '';
      const assigneeId = this.pendingAssigneeId ?? '';
      const reviewerId = this.pendingReviewerId ?? '';
      const status = this.pendingStatus ?? '';

      // 路径参数(优先级最大）都设置在表单里
      this.filters.patchValue({ projectId, assigneeId, status }, { emitEvent: false });
      this.currentProjectId.set(projectId || null);

      // 快捷筛选（检查是否满足快捷筛选条件）
      // 仅看我的研发项目
      if (status === 'doing' && this.currentUserId() === assigneeId) {
        this.onlyMine.set(true);
        this.applyOnlyMineFilters();
      }
      // 仅看我的阻塞项目
      if (status === 'blocked' && this.currentUserId() === assigneeId) {
        this.onlyMineBlocked.set(true);
        this.applyOnlyMineBlockedFilters();
      }
      // 仅看待我验收
      if(status === 'done' && this.currentUserId() === reviewerId) {
        this.onlyMineToReview.set(true);
        this.applyOnlyMineToReviewFilters();
      }

      await this.loadProjectContext(projectId);
      await this.loadItems();
    } catch (error) {
      this.errorMessage.set(this.resolveErrorMessage(error, '加载研发管理失败'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadProjectContext(projectId: string): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      if (!projectId) {
        this.projectMembers.set([]);
        this.stages.set([]);
        this.overview.set(null);
        return;
      }

      const [members, stages, overview] = await Promise.all([
        this.getProjectMembers(projectId),
        this.getProjectStages(projectId),
        this.api.getOverview(projectId),
      ]);
      this.projectMembers.set(members);
      this.stages.set(stages);
      this.overview.set(overview);
    } catch (error) {
      this.errorMessage.set(this.resolveErrorMessage(error, '加载项目研发上下文失败'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadFormProjectContext(projectId: string): Promise<void> {
    this.formProjectId.set(projectId);
    if (!projectId) {
      this.formProjectMembers.set([]);
      this.formStages.set([]);
      return;
    }

    const [members, stages] = await Promise.all([
      this.getProjectMembers(projectId),
      this.getProjectStages(projectId),
    ]);
    this.formProjectMembers.set(members);
    this.formStages.set(stages);
  }

  private async loadItems(): Promise<void> {
    const filter = this.filters.getRawValue() as RdFilterValue;

    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const params: Record<string, string | number | boolean> = {
        page: this.page(),
        pageSize: this.pageSize,
      };
      if (filter.projectId) params['projectId'] = filter.projectId;
      if (filter.stageId) params['stageId'] = filter.stageId;
      if (filter.status) params['status'] = filter.status;
      if (filter.priority) params['priority'] = filter.priority;
      if (filter.type) params['type'] = filter.type;
      if (filter.assigneeId) params['assigneeId'] = filter.assigneeId;
      if (filter.keyword.trim()) params['keyword'] = filter.keyword.trim();
      const currentUserId = this.currentUserId();

      // 快捷键（优先级高，覆盖选项）
      if (this.onlyMine() && currentUserId) params['assigneeId'] = currentUserId;
      if (this.onlyMineBlocked()) params['status'] = 'blocked';
      if (this.onlyOverdue()) params['overdue'] = true;
      if (this.onlyMineToReview() && currentUserId) {
        params['reviewerId'] = currentUserId;
        params['status'] = 'done';
      }

      const result = await this.api.getListItems(params);
      this.items.set(result.items);
      this.total.set(result.total);

      const selectedId = this.selectedItemId();
      const nextSelected =
        selectedId && result.items.some((item) => item.id === selectedId)
          ? selectedId
          : (result.items[0]?.id ?? null);
      const projectId = filter.projectId
        ? filter.projectId
        : (result.items?.[0]?.projectId ?? null);
      this.currentProjectId.set(projectId);
      this.selectedItemId.set(nextSelected);
      if (nextSelected && projectId) {
        await this.loadDetail(projectId, nextSelected);
      } else {
        this.detail.set(null);
      }
    } catch (error) {
      this.errorMessage.set(this.resolveErrorMessage(error, '加载研发项列表失败'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDetail(projectId: string, itemId: string): Promise<void> {
    this.detailLoading.set(true);
    try {
      await this.primeProjectLookup(projectId);
      const detail = await this.api.getItemDetail(projectId, itemId);
      this.detail.set(detail);
    } catch (error) {
      this.errorMessage.set(this.resolveErrorMessage(error, '加载研发项详情失败'));
    } finally {
      this.detailLoading.set(false);
    }
  }

  private async refreshCurrentProjectView(preferredItemId?: string): Promise<void> {
    if (preferredItemId) {
      this.selectedItemId.set(preferredItemId);
    }
    await this.loadProjectContext(this.filters.controls.projectId.value);
    await this.loadItems();
  }

  private async refreshAfterCreate(item: RdItem): Promise<void> {
    this.selectedItemId.set(item.id);
    this.currentProjectId.set(item.projectId);

    const filterProjectId = this.filters.controls.projectId.value;
    if (filterProjectId && filterProjectId !== item.projectId) {
      this.filters.patchValue({ projectId: item.projectId, stageId: '', assigneeId: '' });
      return;
    }

    await this.refreshCurrentProjectView(item.id);
  }

  private async primeProjectLookup(projectId: string): Promise<void> {
    await Promise.all([this.getProjectMembers(projectId), this.getProjectStages(projectId)]);
  }

  private async getProjectMembers(projectId: string): Promise<ProjectMemberItem[]> {
    const cached = this.projectMemberCache()[projectId];
    if (cached) {
      return cached;
    }

    const members = await this.api.listProjectMembers(projectId);
    this.projectMemberCache.update((cache) => ({ ...cache, [projectId]: members }));
    return members;
  }

  private async getProjectStages(projectId: string): Promise<RdStageItem[]> {
    const cached = this.projectStageCache()[projectId];
    if (cached) {
      return cached;
    }

    const stages = await this.api.listStages(projectId);
    this.projectStageCache.update((cache) => ({ ...cache, [projectId]: stages }));
    return stages;
  }

  private invalidateProjectStageCache(projectId: string): void {
    this.projectStageCache.update((cache) => {
      const next = { ...cache };
      delete next[projectId];
      return next;
    });
  }

  private findProjectMember(projectId: string): ProjectMemberItem | null {
    const currentUserId = this.currentUserId();
    if (!currentUserId || !projectId) {
      return null;
    }
    const members = this.projectMemberCache()[projectId] ?? [];
    return members.find((item) => item.userId === currentUserId) ?? null;
  }

  private canEditItem(item: RdItem | null): boolean {
    if (!item) return false;
    if (this.isAdmin()) return true;
    const currentUserId = this.currentUserId();
    if (!currentUserId) return false;
    return item.creatorId === currentUserId || item.assigneeId === currentUserId;
  }

  private canDeleteItem(item: RdItem | null): boolean {
    if (!item) return false;
    if (this.isAdmin()) return true;
    if (this.findProjectMember(item.projectId)?.roles.includes('project_admin')) return true;
    const currentUserId = this.currentUserId();
    if (!currentUserId) return false;
    return item.creatorId === currentUserId;
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HubApiError) {
      return error.message;
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return fallback;
  }

  /**进看我的研发项后，表单状态更新 */
  private applyOnlyMineFilters() {
    if (this.onlyMine()) {
      this.filters.patchValue({ assigneeId: this.currentUserId() ?? '' }, { emitEvent: false });
      this.filters.controls.assigneeId.disable({ emitEvent: false });
    } else {
      this.filters.patchValue({ assigneeId: '' }, { emitEvent: false });
      this.filters.enable({ emitEvent: false });
    }
  }

  /**仅看阻塞项后，表单状态更新 */
  private applyOnlyMineBlockedFilters() {
    if (this.onlyMineBlocked()) {
      this.filters.patchValue(
        { assigneeId: this.currentUserId() ?? '', status: 'blocked' },
        { emitEvent: false },
      );
      this.filters.controls.status.disable({ emitEvent: false });
      this.filters.controls.assigneeId.disable({ emitEvent: false });
    } else {
      this.filters.patchValue({ assigneeId: '', status: '' }, { emitEvent: false });
      this.filters.enable({ emitEvent: false });
    }
  }

  /**仅看待我验收后，表单状态更新 */
  private applyOnlyMineToReviewFilters() {
    if (this.onlyMineToReview()) {
      this.filters.patchValue({ status: 'done' }, { emitEvent: false });
      this.filters.controls.status.disable({ emitEvent: false });
    } else {
      this.filters.patchValue({ status: '' }, { emitEvent: false });
      this.filters.enable({ emitEvent: false });
    }
  }

  private clearAllPending() {
    if (this.hasClearedPending) {
      return;
    }
    this.pendingProjectId = null;
    this.pendingAssigneeId = null;
    this.pendingStatus = null;
    this.hasClearedPending = true;
    this.router.navigate([], {
      queryParams: {},
    });
  }
}
