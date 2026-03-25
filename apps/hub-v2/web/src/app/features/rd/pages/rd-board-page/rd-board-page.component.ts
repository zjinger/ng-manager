import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';

import { AuthStore } from '../../../../core/auth/auth.store';
import { ProjectContextStore } from '../../../../core/state/project-context.store';
import { ListStateComponent } from '../../../../shared/ui/list-state/list-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import { ProjectApiService } from '../../../projects/services/project-api.service';
import { RdBoardComponent } from '../../components/rd-board/rd-board.component';
import { RdDetailDrawerComponent } from '../../components/rd-detail-drawer/rd-detail-drawer.component';
import { RdFilterBarComponent, type RdViewMode } from '../../components/rd-filter-bar/rd-filter-bar.component';
import { RdListTableComponent } from '../../components/rd-list-table/rd-list-table.component';
import { RdAdvanceStageDialogComponent } from '../../dialogs/rd-advance-stage-dialog/rd-advance-stage-dialog.component';
import { RdBlockDialogComponent } from '../../dialogs/rd-block-dialog/rd-block-dialog.component';
import { RdCreateDialogComponent } from '../../dialogs/rd-create-dialog/rd-create-dialog.component';
import type { CreateRdItemInput, RdItemEntity, RdListQuery, RdLogEntity } from '../../models/rd.model';
import { RdApiService } from '../../services/rd-api.service';
import { RdStore } from '../../store/rd.store';
import { map } from 'rxjs';

@Component({
  selector: 'app-rd-board-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    ListStateComponent,
    RdFilterBarComponent,
    RdBoardComponent,
    RdListTableComponent,
    RdDetailDrawerComponent,
    RdAdvanceStageDialogComponent,
    RdCreateDialogComponent,
    RdBlockDialogComponent,
    NzPaginationModule,
  ],
  providers: [RdStore],
  template: `
    <app-page-header title="研发项" [subtitle]="subtitle()" />

    <app-rd-filter-bar
      [query]="store.query()"
      [stages]="store.stages()"
      [viewMode]="viewMode()"
      (submit)="applyFilters($event)"
      (create)="createOpen.set(true)"
      (viewModeChange)="viewMode.set($event)"
    />

    @if (!projectContext.currentProjectId()) {
      <app-list-state [empty]="true" emptyTitle="请先在左侧选择项目" emptyDescription="选择项目后再查看对应研发项。" />
    } @else {
      <app-list-state
        [loading]="store.loading()"
        [empty]="store.items().length === 0"
        loadingText="正在加载研发项…"
        emptyTitle="当前项目下还没有研发项数据"
      >
        @if (viewMode() === 'board') {
          <app-rd-board
            [stages]="store.stages()"
            [items]="store.items()"
            [selectedItemId]="selectedItemId()"
            (selectItem)="openDetail($event)"
          />
        } @else {
          <app-rd-list-table
            [stages]="store.stages()"
            [items]="store.items()"
            [selectedItemId]="selectedItemId()"
            (selectItem)="openDetail($event)"
          />
        }

        @if (store.total() > 0) {
          <div class="rd-pagination">
            <nz-pagination
              [nzTotal]="store.total()"
              [nzPageIndex]="store.page()"
              [nzPageSize]="store.pageSize()"
              [nzPageSizeOptions]="[10, 20, 50, 100]"
              [nzShowSizeChanger]="true"
              [nzShowQuickJumper]="true"
              [nzShowTotal]="totalTpl"
              (nzPageIndexChange)="onPageIndexChange($event)"
              (nzPageSizeChange)="onPageSizeChange($event)"
            ></nz-pagination>
            <ng-template #totalTpl let-total>共 {{ total }} 条</ng-template>
          </div>
        }
      </app-list-state>
    }

    <app-rd-detail-drawer
      [open]="!!selectedItem()"
      [busy]="store.busy()"
      [item]="selectedItem()"
      [logs]="selectedLogs()"
      [stages]="store.stages()"
      [canBlock]="canBlockSelectedItem()"
      [canEditProgress]="canEditSelectedProgress()"
      [canEditBasic]="canEditSelectedBasic()"
      [canStart]="canStartSelectedItem()"
      [canResume]="canResumeSelectedItem()"
      [canComplete]="canCompleteSelectedItem()"
      [canAdvance]="canAdvanceSelectedItem()"
      [canDelete]="canDeleteSelectedItem()"
      (actionClick)="handleSelectedAction($event)"
      (progressChange)="updateSelectedProgress($event)"
      (basicSave)="saveSelectedBasic($event)"
      (deleteClick)="deleteSelectedItem()"
      (close)="closeDetail()"
    />

    <app-rd-create-dialog
      [open]="createOpen()"
      [busy]="store.busy()"
      [stages]="store.stages()"
      [members]="members()"
      [projectName]="projectContext.currentProject()?.name || ''"
      (cancel)="createOpen.set(false)"
      (create)="createRd($event)"
    />

    <app-rd-block-dialog
      [open]="blockOpen()"
      [busy]="store.busy()"
      [item]="blockingItem()"
      (cancel)="closeBlockDialog()"
      (confirm)="confirmBlock($event.blockerReason)"
    />

    <app-rd-advance-stage-dialog
      [open]="advanceStageOpen()"
      [busy]="store.busy()"
      [item]="selectedItem()"
      [stages]="store.stages()"
      (cancel)="advanceStageOpen.set(false)"
      (confirm)="confirmAdvanceStage($event.stageId)"
    />
  `,
  styles: [
    `
      .rd-pagination {
        display: flex;
        justify-content: flex-end;
        padding: 16px 0 4px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdBoardPageComponent {
  readonly store = inject(RdStore);
  readonly authStore = inject(AuthStore);
  readonly projectContext = inject(ProjectContextStore);
  private readonly projectApi = inject(ProjectApiService);
  private readonly rdApi = inject(RdApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly viewMode = signal<RdViewMode>('list');
  readonly createOpen = signal(false);
  readonly blockOpen = signal(false);
  readonly advanceStageOpen = signal(false);
  readonly blockingItem = signal<RdItemEntity | null>(null);
  readonly detailQuery = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('detail'))), {
    initialValue: this.route.snapshot.queryParamMap.get('detail'),
  });
  readonly selectedItemId = computed(() => this.detailQuery());
  readonly selectedItem = computed(
    () => this.store.items().find((item) => item.id === this.selectedItemId()) ?? null
  );
  readonly members = signal<ProjectMemberEntity[]>([]);
  readonly selectedLogs = signal<RdLogEntity[]>([]);
  readonly currentUserId = computed(() => this.authStore.currentUser()?.userId || null);
  readonly canEditSelectedProgress = computed(() => {
    const current = this.selectedItem();
    const userId = this.currentUserId();
    return !!current && !!userId && !!current.assigneeId && current.assigneeId === userId;
  });
  readonly canStartSelectedItem = computed(() => this.canEditSelectedProgress());
  readonly canCompleteSelectedItem = computed(() => this.canEditSelectedProgress());
  readonly canEditSelectedBasic = computed(() => {
    const current = this.selectedItem();
    const userId = this.currentUserId();
    if (!current || !userId) {
      return false;
    }
    if (current.creatorId === userId || current.assigneeId === userId) {
      return true;
    }
    const member = this.members().find((item) => item.userId === userId);
    return !!member && (member.roleCode === 'project_admin' || member.isOwner);
  });
  readonly canDeleteSelectedItem = computed(() => {
    const current = this.selectedItem();
    const userId = this.currentUserId();
    if (!current || !userId) {
      return false;
    }
    if (current.creatorId === userId) {
      return true;
    }
    const member = this.members().find((item) => item.userId === userId);
    return !!member && (member.roleCode === 'project_admin' || member.isOwner);
  });
  readonly canBlockSelectedItem = computed(() => {
    const current = this.selectedItem();
    const userId = this.currentUserId();
    if (!current || !userId) {
      return false;
    }
    if (current.assigneeId && current.assigneeId === userId) {
      return true;
    }
    const member = this.members().find((item) => item.userId === userId);
    return !!member && (member.roleCode === 'project_admin' || member.isOwner);
  });
  readonly canResumeSelectedItem = computed(() => this.canBlockSelectedItem());
  readonly canAdvanceSelectedItem = computed(() => {
    const current = this.selectedItem();
    if (!current) {
      return false;
    }
    if (current.status !== 'done' && current.status !== 'accepted') {
      return false;
    }
    return this.canEditSelectedBasic();
  });
  readonly subtitle = computed(() => {
    const projectName = this.projectContext.currentProject()?.name ?? '当前项目';
    return `${projectName} · 共 ${this.store.total()} 个研发项`;
  });
  private lastProjectId: string | null | undefined = undefined;

  constructor() {
    effect((onCleanup) => {
      const projectId = this.projectContext.currentProjectId();
      const isFirstRun = this.lastProjectId === undefined;
      const projectChanged = !isFirstRun && this.lastProjectId !== projectId;
      const shouldRefresh = isFirstRun || projectChanged;
      this.lastProjectId = projectId;

      if (!shouldRefresh) {
        return;
      }

      this.store.refreshForProject(projectId);
      if (projectChanged) {
        this.closeDetail();
      }
      if (!projectId) {
        this.members.set([]);
        return;
      }

      const subscription = this.projectApi.listMembers(projectId).subscribe({
        next: (items) => this.members.set(items),
        error: () => this.members.set([]),
      });
      onCleanup(() => subscription.unsubscribe());
    });

    effect(() => {
      const items = this.store.items();
      const selectedId = this.selectedItemId();
      if (!selectedId) {
        return;
      }
      if (!items.some((item) => item.id === selectedId)) {
        this.closeDetail();
      }
    });

    effect((onCleanup) => {
      const selectedId = this.selectedItemId();
      const selectedUpdatedAt = this.selectedItem()?.updatedAt;
      if (!selectedId) {
        this.selectedLogs.set([]);
        return;
      }
      void selectedUpdatedAt;
      const subscription = this.rdApi.listLogs(selectedId).subscribe({
        next: (logs) => this.selectedLogs.set(logs),
        error: () => this.selectedLogs.set([]),
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  applyFilters(query: RdListQuery): void {
    this.store.updateQuery({
      keyword: query.keyword?.trim(),
      stageId: query.stageId,
      status: query.status,
      priority: query.priority,
      page: 1,
    });
  }

  onPageIndexChange(page: number): void {
    this.store.updateQuery({ page });
  }

  onPageSizeChange(pageSize: number): void {
    const nextPageSize = Number(pageSize) || this.store.pageSize();
    if (nextPageSize === this.store.pageSize()) {
      return;
    }
    this.store.updateQuery({ page: 1, pageSize: nextPageSize });
  }

  createRd(input: Omit<CreateRdItemInput, 'projectId'>): void {
    this.store.create(input, () => this.createOpen.set(false));
  }

  openDetail(item: RdItemEntity): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { detail: item.id },
      queryParamsHandling: 'merge',
    });
  }

  closeDetail(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { detail: null },
      queryParamsHandling: 'merge',
    });
    this.selectedLogs.set([]);
    this.advanceStageOpen.set(false);
  }

  handleAction(item: RdItemEntity, action: 'start' | 'block' | 'resume' | 'complete' | 'advance'): void {
    this.openDetail(item);
    switch (action) {
      case 'start':
        if (!this.canStartSelectedItem()) {
          return;
        }
        this.store.start(item.id);
        break;
      case 'block':
        if (!this.canBlockSelectedItem()) {
          return;
        }
        this.blockingItem.set(item);
        this.blockOpen.set(true);
        break;
      case 'resume':
        if (!this.canResumeSelectedItem()) {
          return;
        }
        this.store.resume(item.id);
        break;
      case 'complete':
        if (!this.canCompleteSelectedItem()) {
          return;
        }
        this.store.complete(item.id);
        break;
      case 'advance':
        if (!this.canAdvanceSelectedItem()) {
          return;
        }
        this.advanceStageOpen.set(true);
        break;
    }
  }

  handleSelectedAction(action: 'start' | 'block' | 'resume' | 'complete' | 'advance'): void {
    const current = this.selectedItem();
    if (!current) {
      return;
    }
    this.handleAction(current, action);
  }

  updateSelectedProgress(progress: number): void {
    if (!this.canEditSelectedProgress()) {
      return;
    }
    const current = this.selectedItem();
    if (!current) {
      return;
    }
    this.store.update(current.id, { progress });
  }

  saveSelectedBasic(input: { title: string; description: string | null }): void {
    if (!this.canEditSelectedBasic()) {
      return;
    }
    const current = this.selectedItem();
    if (!current) {
      return;
    }
    this.store.update(current.id, {
      title: input.title,
      description: input.description,
    });
  }

  deleteSelectedItem(): void {
    if (!this.canDeleteSelectedItem()) {
      return;
    }
    const current = this.selectedItem();
    if (!current) {
      return;
    }
    this.store.delete(current.id);
    this.closeDetail();
  }

  confirmBlock(blockerReason: string): void {
    const item = this.blockingItem();
    if (!item) {
      return;
    }
    this.store.block(item.id, { blockerReason });
    this.closeBlockDialog();
  }

  confirmAdvanceStage(stageId: string): void {
    const current = this.selectedItem();
    if (!current || !stageId.trim()) {
      return;
    }
    this.store.advanceStage(current.id, { stageId: stageId.trim() });
    this.advanceStageOpen.set(false);
  }

  closeBlockDialog(): void {
    this.blockOpen.set(false);
    this.blockingItem.set(null);
  }
}
