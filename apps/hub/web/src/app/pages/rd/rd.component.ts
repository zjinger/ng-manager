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
import { RdManagementApiService } from './services/rd.api';
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
  type RdItemFormValue,
  type RdItemDetailResult,
  type RdOverview,
  type RdProjectOption,
  type RdStageFormValue,
  type RdStageItem,
  type RdStatusChangeValue
} from './models/rd.model';

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
    RdStageManagerComponent
  ],
  templateUrl: './rd.component.html',
  styleUrls: ['./rd.component.less'],
  styles: [PAGE_SHELL_STYLES]
})
export class RdPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(RdManagementApiService);
  private readonly auth = inject(AdminAuthService);
  private readonly message = inject(NzMessageService);

  protected readonly projects = signal<RdProjectOption[]>([]);
  protected readonly projectMembers = signal<ProjectMemberItem[]>([]);
  protected readonly stages = signal<RdStageItem[]>([]);
  protected readonly items = signal<RdItem[]>([]);
  protected readonly overview = signal<RdOverview | null>(null);
  protected readonly selectedItemId = signal<string | null>(null);
  protected readonly detail = signal<RdItemDetailResult | null>(null);
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
  protected readonly onlyBlocked = signal(false);
  protected readonly onlyOverdue = signal(false);

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

  protected readonly filters = this.fb.nonNullable.group({
    projectId: [''],
    stageId: [''],
    status: [''],
    priority: [''],
    type: [''],
    assigneeId: [''],
    keyword: ['']
  });

  protected readonly currentProject = computed(() => {
    const projectId = this.filters.controls.projectId.value;
    return this.projects().find((item) => item.id === projectId) ?? null;
  });

  protected readonly enabledStages = computed(() => this.stages().filter((item) => item.enabled));

  protected readonly currentUserId = computed(() => {
    const profile = this.auth.profile();
    if (!profile) return null;
    return profile.userId?.trim() || profile.id;
  });

  protected readonly isAdmin = computed(() => this.auth.profile()?.role === 'admin');

  protected readonly currentMember = computed(() => {
    const currentUserId = this.currentUserId();
    if (!currentUserId) return null;
    return this.projectMembers().find((item) => item.userId === currentUserId) ?? null;
  });

  protected readonly canCreateItem = computed(() => this.isAdmin() || !!this.currentMember());
  protected readonly canManageStages = computed(() => this.isAdmin() || !!this.currentMember()?.roles.includes('project_admin'));
  protected readonly canEditSelected = computed(() => this.canEditItem(this.detail()?.item ?? null));
  protected readonly canDeleteSelected = computed(() => this.canDeleteItem(this.detail()?.item ?? null));
  protected readonly quickFilterCount = computed(() => [this.onlyMine(), this.onlyBlocked(), this.onlyOverdue()].filter(Boolean).length);

  public constructor() {
    this.filters.controls.projectId.valueChanges.pipe(takeUntilDestroyed()).subscribe((projectId) => {
      this.page.set(1);
      this.selectedItemId.set(null);
      this.detail.set(null);
      void this.loadProjectContext(projectId);
    });

    this.filters.valueChanges.pipe(debounceTime(250), takeUntilDestroyed()).subscribe(() => {
      this.page.set(1);
      void this.loadItems();
    });

    void this.initialize();
  }

  protected async reload(): Promise<void> {
    await this.loadProjectContext(this.filters.controls.projectId.value);
  }

  protected async toggleOnlyMine(): Promise<void> {
    if (!this.currentUserId()) {
      this.message.warning('当前账号未关联用户标识，不能按我的研发项筛选');
      return;
    }
    this.onlyMine.update((value) => !value);
    this.page.set(1);
    await this.loadItems();
  }

  protected async toggleOnlyBlocked(): Promise<void> {
    this.onlyBlocked.update((value) => !value);
    this.page.set(1);
    await this.loadItems();
  }

  protected async toggleOnlyOverdue(): Promise<void> {
    this.onlyOverdue.update((value) => !value);
    this.page.set(1);
    await this.loadItems();
  }

  protected async changePage(page: number): Promise<void> {
    this.page.set(page);
    await this.loadItems();
  }

  protected async selectItem(item: RdItem): Promise<void> {
    this.selectedItemId.set(item.id);
    await this.loadDetail(item.projectId, item.id);
  }

  protected openCreateModal(): void {
    if (!this.canCreateItem()) {
      this.message.warning('当前账号不是项目成员，不能创建研发项');
      return;
    }
    this.editingItem.set(null);
    this.itemModalVisible.set(true);
  }

  protected openEditModal(): void {
    const item = this.detail()?.item ?? null;
    if (!this.canEditItem(item)) {
      this.message.warning('当前账号没有编辑该研发项的权限');
      return;
    }
    this.editingItem.set(item);
    this.itemModalVisible.set(true);
  }

  protected closeItemModal(): void {
    this.itemModalVisible.set(false);
    this.editingItem.set(null);
  }

  protected openStageManager(): void {
    if (!this.canManageStages()) {
      this.message.warning('当前账号没有管理研发阶段的权限');
      return;
    }
    this.stageManagerVisible.set(true);
  }

  protected async submitItemForm(value: RdItemFormValue): Promise<void> {
    const projectId = this.filters.controls.projectId.value;
    if (!projectId) {
      return;
    }

    this.itemSubmitting.set(true);
    try {
      if (this.editingItem()) {
        const updated = await this.api.updateItem(projectId, this.editingItem()!.id, value);
        this.message.success('研发项已更新');
        this.selectedItemId.set(updated.id);
      } else {
        const created = await this.api.createItem(projectId, value);
        this.message.success('研发项已创建');
        this.selectedItemId.set(created.id);
      }
      this.closeItemModal();
      await this.loadProjectContext(projectId);
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
      this.message.success('????????');
      await this.refreshCurrentProjectView(detail.item.id);
    } catch (error) {
      this.message.error(this.resolveErrorMessage(error, '?????????'));
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
      this.message.success('??????');
      this.selectedItemId.set(null);
      this.detail.set(null);
      await this.loadProjectContext(detail.item.projectId);
    } catch (error) {
      this.message.error(this.resolveErrorMessage(error, '???????'));
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
      await this.loadProjectContext(projectId);
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
      await this.loadProjectContext(projectId);
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
      await this.loadProjectContext(projectId);
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
      const projects = await this.api.listProjects();
      this.projects.set(projects);
      const projectId = projects[0]?.id ?? '';
      this.filters.patchValue({ projectId }, { emitEvent: false });
      if (projectId) {
        await this.loadProjectContext(projectId);
      } else {
        this.items.set([]);
        this.overview.set(null);
      }
    } catch (error) {
      this.errorMessage.set(this.resolveErrorMessage(error, '加载研发管理失败'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadProjectContext(projectId: string): Promise<void> {
    if (!projectId) {
      this.projectMembers.set([]);
      this.stages.set([]);
      this.items.set([]);
      this.overview.set(null);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const [members, stages, overview] = await Promise.all([
        this.api.listProjectMembers(projectId),
        this.api.listStages(projectId),
        this.api.getOverview(projectId)
      ]);
      this.projectMembers.set(members);
      this.stages.set(stages);
      this.overview.set(overview);

      const selectedStageId = this.filters.controls.stageId.value;
      if (selectedStageId && !stages.some((item) => item.id === selectedStageId)) {
        this.filters.patchValue({ stageId: '' }, { emitEvent: false });
      }

      await this.loadItems();
    } catch (error) {
      this.errorMessage.set(this.resolveErrorMessage(error, '加载项目研发上下文失败'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadItems(): Promise<void> {
    const filter = this.filters.getRawValue() as RdFilterValue;
    if (!filter.projectId) {
      this.items.set([]);
      this.total.set(0);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const params: Record<string, string | number | boolean> = {
        page: this.page(),
        pageSize: this.pageSize
      };
      if (filter.stageId) params['stageId'] = filter.stageId;
      if (filter.status) params['status'] = filter.status;
      if (filter.priority) params['priority'] = filter.priority;
      if (filter.type) params['type'] = filter.type;
      if (filter.assigneeId) params['assigneeId'] = filter.assigneeId;
      if (filter.keyword.trim()) params['keyword'] = filter.keyword.trim();

      const currentUserId = this.currentUserId();
      if (this.onlyMine() && currentUserId) params['assigneeId'] = currentUserId;
      if (this.onlyBlocked()) params['status'] = 'blocked';
      if (this.onlyOverdue()) params['overdue'] = true;

      const result = await this.api.listItems(filter.projectId, params);
      this.items.set(result.items);
      this.total.set(result.total);

      const selectedId = this.selectedItemId();
      const nextSelected = selectedId && result.items.some((item) => item.id === selectedId)
        ? selectedId
        : result.items[0]?.id ?? null;

      this.selectedItemId.set(nextSelected);
      if (nextSelected) {
        await this.loadDetail(filter.projectId, nextSelected);
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
    if (this.currentMember()?.roles.includes('project_admin')) return true;
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
}
