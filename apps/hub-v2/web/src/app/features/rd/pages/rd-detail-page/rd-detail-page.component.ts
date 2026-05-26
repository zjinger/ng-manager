import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';

import { AuthStore } from '@core/auth';
import { ProjectContextStore } from '@core/state';
import { ListStateComponent, SideDetailLayoutComponent } from '@shared/ui';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import { ProjectApiService } from '../../../projects/services/project-api.service';
import type { IssueEntity } from '../../../issues/models/issue.model';
import { IssueApiService } from '../../../issues/services/issue-api.service';
import { RdDetailContentComponent } from '../../components/rd-detail-content/rd-detail-content.component';
import { RdDetailHeaderComponent } from '../../components/rd-detail-header/rd-detail-header.component';
import { RdProgressPanelComponent, type MemberProgressItem } from '../../components/rd-progress-panel/rd-progress-panel.component';
import { RdAdvanceStageDialogComponent } from '../../dialogs/rd-advance-stage-dialog/rd-advance-stage-dialog.component';
import { RdCloseDialogComponent } from '../../dialogs/rd-close-dialog/rd-close-dialog.component';
import { RdCompleteDialogComponent } from '../../dialogs/rd-complete-dialog/rd-complete-dialog.component';
import { RdEditDialogComponent, type RdEditDialogSaveInput } from '../../dialogs/rd-edit-dialog/rd-edit-dialog.component';
import { RdProgressUpdateDialogComponent, type RdProgressUpdateDialogSaveInput } from '../../dialogs/rd-progress-update-dialog/rd-progress-update-dialog.component';
import { getRdMemberIds, type RdItemEntity, type RdItemProgress, type RdLogEntity, type RdMemberBlockEntity, type RdStageEntity, type RdStageHistoryEntry } from '../../models/rd.model';
import { RdApiService } from '../../services/rd-api.service';
import { RdPermissionService } from '../../services/rd-permission.service';
import { map } from 'rxjs';

const LINKED_ISSUES_PAGE_SIZE = 10;

@Component({
  selector: 'app-rd-detail-page',
  standalone: true,
  imports: [
    NzButtonModule,
    NzIconModule,
    // PageHeaderComponent,
    ListStateComponent,
    SideDetailLayoutComponent,
    RdDetailHeaderComponent,
    RdDetailContentComponent,
    RdCloseDialogComponent,
    RdCompleteDialogComponent,
    RdEditDialogComponent,
    RdAdvanceStageDialogComponent,
    RdProgressPanelComponent,
    RdProgressUpdateDialogComponent,
  ],
  template: `
    <div class="detail-page">
      <!-- <app-page-header title="研发项详情" [subtitle]="subtitle()" /> -->
      <a class="back-link" (click)="goBack()">
        <span nz-icon nzType="arrow-left" class="back-link__icon"></span>
        返回列表
      </a>
      <app-list-state
        [loading]="loading()"
        [empty]="!loading() && !item()"
        loadingText="正在加载研发项详情…"
        emptyTitle="未找到对应研发项"
        emptyDescription="该研发项可能已删除或你无访问权限。"
      >
        <section class="detail-stack">
          <app-side-detail-layout>
            <div detail-main class="detail-main">
              <app-rd-detail-header
                [busy]="busy()"
                [item]="item()"
                [projectName]="projectName(item()!.projectId)"
                [stages]="stages()"
                [canEditBasic]="canEditBasic()"
                [canAdvance]="canAdvance()"
                [canComplete]="canComplete()"
                [canAccept]="canAccept()"
                [canClose]="canClose()"
                (actionClick)="handleAction($event)"
                (editClick)="openEditDialog()"
              />
              <app-rd-progress-panel
                [item]="item()!"
                [memberProgressList]="memberProgressList()"
                [memberBlocks]="memberBlocks()"
                [canResolveMemberBlocks]="canResolveMemberBlocks()"
                [currentUserId]="currentUserId() || ''"
                (updateProgressClick)="openProgressUpdate($event)"
                (resolveMemberBlockClick)="resolveMemberBlock($event.blockId)"
              />
              <app-rd-detail-content
                [busy]="busy()"
                [item]="item()"
                [logs]="logs()"
                [stages]="stages()"
                [stageHistory]="stageHistory()"
                [memberProgressList]="memberProgressList()"
                [canEditBasic]="canEditBasic()"
                [canAdvance]="canAdvance()"
                [canComplete]="canComplete()"
                [canAccept]="canAccept()"
                [canClose]="canClose()"
                [showAction]="false"
                [showProps]="false"
                [showStageHistory]="false"
                [showActivity]="false"
                (actionClick)="handleAction($event)"
                (editRequest)="openEditDialog()"
              />
              <app-rd-detail-content
                [busy]="busy()"
                [item]="item()"
                [logs]="logs()"
                [stages]="stages()"
                [stageHistory]="stageHistory()"
                [memberProgressList]="memberProgressList()"
                [canEditBasic]="canEditBasic()"
                [canAdvance]="canAdvance()"
                [canComplete]="canComplete()"
                [canAccept]="canAccept()"
                [canClose]="canClose()"
                [showLinkedIssues]="true"
                [linkedIssues]="linkedIssues()"
                [linkedIssuesTotal]="linkedIssuesTotal()"
                [linkedIssuesLoading]="linkedIssuesLoading()"
                [showSummary]="false"
                [showAction]="false"
                [showProps]="false"
                (loadMoreLinkedIssues)="loadMoreLinkedIssues()"
                (actionClick)="handleAction($event)"
                (editRequest)="openEditDialog()"
              />
            </div>

            <div detail-side class="detail-side">
              <app-rd-detail-content
                [busy]="busy()"
                [item]="item()"
                [logs]="logs()"
                [stages]="stages()"
                [stageHistory]="stageHistory()"
                [memberProgressList]="memberProgressList()"
                [canEditBasic]="canEditBasic()"
                [canAdvance]="canAdvance()"
                [canComplete]="canComplete()"
                [canAccept]="canAccept()"
                [canClose]="canClose()"
                [showSummary]="false"
                [showActivity]="false"
                [showAction]="false"
                [showStageHistory]="false"
                (actionClick)="handleAction($event)"
                (editRequest)="openEditDialog()"
              />
            </div>
          </app-side-detail-layout>
        </section>
      </app-list-state>
      
    </div>

    <app-rd-progress-update-dialog
      [open]="progressUpdateOpen()"
      [busy]="busy()"
      [memberName]="progressUpdateMemberName()"
      [currentProgress]="progressUpdateCurrentProgress()"
      [activeBlock]="progressUpdateActiveBlock()"
      (save)="confirmUpdateProgress($event)"
      (cancel)="closeProgressUpdate()"
    />

    <app-rd-close-dialog
      [open]="closeOpen()"
      [busy]="busy()"
      [item]="item()"
      (cancel)="closeOpen.set(false)"
      (confirm)="confirmClose($event.reason)"
    />

    <app-rd-complete-dialog
      [open]="completeOpen()"
      [busy]="busy()"
      [item]="item()"
      [memberProgressList]="memberProgressList()"
      (cancel)="completeOpen.set(false)"
      (confirm)="confirmComplete($event.reason)"
    />

    <app-rd-edit-dialog
      [open]="editOpen()"
      [busy]="busy()"
      [item]="item()"
      [members]="members()"
      (cancel)="editOpen.set(false)"
      (save)="saveBasic($event)"
    />

    <app-rd-advance-stage-dialog
      [open]="advanceStageOpen()"
      [busy]="busy()"
      [item]="item()"
      [stages]="stages()"
      [members]="members()"
      [currentMemberIds]="getCurrentMemberIds()"
      (cancel)="advanceStageOpen.set(false)"
      (confirm)="confirmAdvanceStage($event)"
    />
  `,
  styles: [
    `
      .detail-page {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .detail-stack {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .detail-main,
      .detail-side {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .back-link {
        width: fit-content;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: 999px;
        background: var(--surface-overlay);
        border: 1px solid var(--border-color);
        color: var(--primary-700);
        font-weight: 700;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
        backdrop-filter: blur(10px);
      }
      .back-link__icon {
        font-size: 12px;
      }
      :host-context(html[data-theme='dark']) .back-link {
        border-color: rgba(148, 163, 184, 0.14);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly rdApi = inject(RdApiService);
  private readonly projectContext = inject(ProjectContextStore);
  private readonly projectApi = inject(ProjectApiService);
  private readonly authStore = inject(AuthStore);
  private readonly rdPermission = inject(RdPermissionService);
  private readonly issueApi = inject(IssueApiService);
  private readonly message = inject(NzMessageService);
  private readonly routeItemId = toSignal(this.route.paramMap.pipe(map((params) => params.get('itemId'))), {
    initialValue: this.route.snapshot.paramMap.get('itemId'),
  });

  readonly item = signal<RdItemEntity | null>(null);
  readonly logs = signal<RdLogEntity[]>([]);
  readonly stageHistory = signal<RdStageHistoryEntry[]>([]);
  readonly stages = signal<RdStageEntity[]>([]);
  readonly members = signal<ProjectMemberEntity[]>([]);
  readonly progressList = signal<RdItemProgress[]>([]);
  readonly memberBlocks = signal<RdMemberBlockEntity[]>([]);
  readonly linkedIssues = signal<IssueEntity[]>([]);
  readonly linkedIssuesTotal = signal(0);
  readonly linkedIssuesPage = signal(1);
  readonly linkedIssuesLoading = signal(false);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly closeOpen = signal(false);
  readonly completeOpen = signal(false);
  readonly editOpen = signal(false);
  readonly advanceStageOpen = signal(false);
  readonly progressUpdateOpen = signal(false);
  readonly progressUpdateMemberName = signal('');
  readonly progressUpdateCurrentProgress = signal(0);
  readonly progressUpdateUserId = signal('');

  readonly itemId = computed(() => this.routeItemId() ?? '');
  readonly currentUserId = computed(() => this.authStore.currentUser()?.userId || null);
  readonly subtitle = computed(() => this.item()?.rdNo || '通过 工作台 待办进入');
  readonly projectNameById = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const project of this.projectContext.projects()) {
      map[project.id] = project.name;
    }
    return map;
  });

  readonly canEditBasic = computed(() => this.rdPermission.canEditBasic(this.item(), this.currentUserId(), this.members()));
  readonly canClose = computed(() => {
    const item = this.item();
    if (!this.rdPermission.canClose(item, this.currentUserId())) {
      return false;
    }
    if (!item) {
      return false;
    }
    if (item.status === 'accepted') {
      return false;
    }
    return true;
  });
  readonly canAdvance = computed(
    () => this.hasNextStage(this.item()) && this.rdPermission.canAdvance(this.item(), this.currentUserId(), this.members())
  );
  readonly canComplete = computed(() => this.rdPermission.canForceComplete(this.item(), this.currentUserId(), this.members()));
  readonly canAccept = computed(() => this.rdPermission.canAccept(this.item(), this.currentUserId(), this.members()));
  readonly canResolveMemberBlocks = computed(() => this.rdPermission.canVerify(this.item(), this.currentUserId(), this.members()));
  readonly progressUpdateActiveBlock = computed(() => {
    const userId = this.progressUpdateUserId();
    if (!userId) {
      return null;
    }
    return this.memberBlocks().find((block) => block.userId === userId && block.status === 'active') ?? null;
  });

  readonly memberProgressList = computed<MemberProgressItem[]>(() => {
    const item = this.item();
    const list = this.normalizeProgressByUser(this.progressList());
    const currentId = this.currentUserId();
    const memberMap = new Map(this.members().map((m) => [m.userId, m.displayName]));
    const avatarMap = new Map(this.members().map((m) => [m.userId, m.avatarUrl]));
    const progressByUserId = new Map(list.map((p) => [p.userId, p]));
    const legacyMemberIds = getRdMemberIds(item);
    const activeMemberIds = new Set(legacyMemberIds);
    const useLegacyAssigneeProgressFallback =
      list.length === 0 &&
      legacyMemberIds.length === 1 &&
      !!item?.assigneeId &&
      legacyMemberIds[0] === item.assigneeId;
    const normalizedList = [...list];
    for (const userId of legacyMemberIds) {
      if (!progressByUserId.has(userId)) {
        const fallbackProgress =
          useLegacyAssigneeProgressFallback && userId === item?.assigneeId ? Number(item?.progress ?? 0) : 0;
        const fallbackUpdatedAt = useLegacyAssigneeProgressFallback && fallbackProgress > 0 ? (item?.updatedAt ?? '') : '';
        normalizedList.push({
          id: `legacy-${userId}`,
          itemId: item?.id || '',
          userId,
          userName: userId === item?.assigneeId ? (item.assigneeName ?? userId) : userId,
          progress: Math.max(0, Math.min(100, fallbackProgress)),
          note: null,
          updatedAt: fallbackUpdatedAt,
        });
      }
    }

    return normalizedList.map((p) => ({
      ...p,
      itemId: item?.id || '',
      memberName:
        memberMap.get(p.userId) ||
        (p.userId === item?.assigneeId ? (item.assigneeName ?? null) : null) ||
        p.userName ||
        p.userId,
      isCurrentUser: p.userId === currentId,
      isActiveMember: activeMemberIds.has(p.userId),
      avatarUrl: avatarMap.get(p.userId) ?? null,
      updatedAt: p.updatedAt,
    }));
  });
  readonly getCurrentMemberIds = computed(() => getRdMemberIds(this.item()));

  constructor() {
    effect(() => {
      const id = this.itemId();
      if (!id) {
        this.item.set(null);
        this.logs.set([]);
        this.stages.set([]);
        this.members.set([]);
        this.progressList.set([]);
        this.memberBlocks.set([]);
        this.linkedIssues.set([]);
        this.linkedIssuesTotal.set(0);
        this.linkedIssuesPage.set(1);
        this.linkedIssuesLoading.set(false);
        return;
      }
      this.load(id);
    });
  }

  goBack(): void {
    this.router.navigate(['/rd']);
  }

  handleAction(action: 'advance' | 'complete' | 'accept' | 'close' | 'reopen'): void {
    const current = this.item();
    if (!current) {
      return;
    }
    if (action === 'advance' && this.canAdvance()) {
      this.warnIfAdvanceWithActiveBlocks();
      this.warnIfAdvanceWithIncompleteProgress(this.memberProgressList());
      this.advanceStageOpen.set(true);
      return;
    }
    if (action === 'complete' && this.canComplete()) {
      this.completeOpen.set(true);
      return;
    }
    if (action === 'close' && this.canClose()) {
      this.closeOpen.set(true);
      return;
    }
    if (action === 'accept' && this.canAccept()) {
      this.runAction(() => this.rdApi.accept(current.id));
      return;
    }
    if (action === 'reopen' && this.canClose()) {
      this.runAction(() => this.rdApi.reopen(current.id));
    }
  }

  saveBasic(input: RdEditDialogSaveInput): void {
    const current = this.item();
    if (!current || !this.canEditBasic()) {
      return;
    }
    this.runAction(() => this.rdApi.update(current.id, { version: current.version, ...input }));
    this.editOpen.set(false);
  }

  resolveMemberBlock(blockId: string): void {
    const current = this.item();
    if (!current || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.rdApi.resolveMemberBlock(current.id, blockId).subscribe({
      next: () => {
        this.loadMemberBlocks(current.id);
        this.rdApi.listLogs(current.id).subscribe({
          next: (logs) => this.logs.set(logs),
          error: () => this.logs.set([]),
        });
        this.busy.set(false);
      },
      error: () => {
        this.busy.set(false);
      },
    });
  }

  confirmClose(reason: string): void {
    const current = this.item();
    if (!current) {
      return;
    }
    this.runAction(() => this.rdApi.close(current.id, { reason }));
    this.closeOpen.set(false);
  }

  confirmComplete(reason: string): void {
    const current = this.item();
    if (!current || !this.canComplete()) {
      return;
    }
    this.runAction(() => this.rdApi.complete(current.id, { reason }), () => this.completeOpen.set(false));
  }

  projectName(projectId: string): string {
    return this.projectNameById()[projectId] || '未知项目';
  }

  confirmAdvanceStage(input: { stageId: string; memberIds: string[]; description?: string; planStartAt?: string; planEndAt?: string }): void {
    const current = this.item();
    if (!current || !input.stageId.trim()) {
      return;
    }
    this.runAction(() =>
      this.rdApi.advanceStage(current.id, {
        stageId: input.stageId.trim(),
        memberIds: input.memberIds,
        description: input.description?.trim() || undefined,
        planStartAt: input.planStartAt?.trim() || undefined,
        planEndAt: input.planEndAt?.trim() || undefined,
      })
    );
    this.advanceStageOpen.set(false);
  }

  openProgressUpdate(data: { userId: string; memberName: string; currentProgress: number; quickStart?: boolean }): void {
    if (this.item()?.status === 'closed' || this.busy()) {
      return;
    }
    this.progressUpdateUserId.set(data.userId);
    this.progressUpdateMemberName.set(data.memberName);
    this.progressUpdateCurrentProgress.set(data.currentProgress);
    this.progressUpdateOpen.set(true);
  }

  openEditDialog(): void {
    if (!this.canEditBasic() || this.item()?.status === 'closed') {
      return;
    }
    this.editOpen.set(true);
  }

  closeProgressUpdate(): void {
    this.progressUpdateOpen.set(false);
    this.progressUpdateUserId.set('');
  }

  confirmUpdateProgress(input: RdProgressUpdateDialogSaveInput): void {
    const current = this.item();
    if (!current || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.rdApi.updateProgress(current.id, input).subscribe({
      next: (item) => {
        this.item.set(item);
        this.loadProgress(item.id);
        this.rdApi.listLogs(item.id).subscribe({
          next: (logs) => this.logs.set(logs),
        });
        this.loadMemberBlocks(item.id);
        this.busy.set(false);
        this.closeProgressUpdate();
      },
      error: () => {
        this.busy.set(false);
      },
    });
  }

  loadMoreLinkedIssues(): void {
    const current = this.item();
    if (!current || this.linkedIssuesLoading() || this.linkedIssues().length >= this.linkedIssuesTotal()) {
      return;
    }
    const nextPage = this.linkedIssuesPage() + 1;
    this.linkedIssuesLoading.set(true);
    this.issueApi.list({ projectId: current.projectId, rdItemId: current.id, page: nextPage, pageSize: LINKED_ISSUES_PAGE_SIZE }).subscribe({
      next: (result) => {
        if (this.item()?.id !== current.id) {
          this.linkedIssuesLoading.set(false);
          return;
        }
        const existingIds = new Set(this.linkedIssues().map((issue) => issue.id));
        const nextItems = result.items.filter((issue) => !existingIds.has(issue.id));
        this.linkedIssues.update((items) => [...items, ...nextItems]);
        this.linkedIssuesPage.set(result.page);
        this.linkedIssuesTotal.set(result.total);
        this.linkedIssuesLoading.set(false);
      },
      error: () => {
        this.linkedIssuesLoading.set(false);
      },
    });
  }

  private loadProgress(itemId: string): void {
    this.rdApi.listProgress(itemId).subscribe({
      next: (list) => this.progressList.set(list),
      error: () => this.progressList.set([]),
    });
  }

  private loadMemberBlocks(itemId: string): void {
    this.rdApi.listMemberBlocks(itemId).subscribe({
      next: (items) => this.memberBlocks.set(items),
      error: () => this.memberBlocks.set([]),
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.linkedIssues.set([]);
    this.linkedIssuesTotal.set(0);
    this.linkedIssuesPage.set(1);
    this.linkedIssuesLoading.set(false);
    this.rdApi.getById(id).subscribe({
      next: (item) => {
        this.item.set(item);
        forkJoin({
          logs: this.rdApi.listLogs(item.id),
          stageHistory: this.rdApi.listStageHistory(item.id),
          stages: this.rdApi.listStages(item.projectId),
          members: this.projectApi.listMembers(item.projectId),
          progress: this.rdApi.listProgress(item.id),
          memberBlocks: this.rdApi.listMemberBlocks(item.id),
          linkedIssues: this.issueApi.list({ projectId: item.projectId, rdItemId: item.id, page: 1, pageSize: LINKED_ISSUES_PAGE_SIZE }),
        }).subscribe({
          next: ({ logs, stageHistory, stages, members, progress, memberBlocks, linkedIssues }) => {
            this.logs.set(logs);
            this.stageHistory.set(stageHistory);
            this.stages.set(stages);
            this.members.set(members);
            this.progressList.set(progress);
            this.memberBlocks.set(memberBlocks);
            this.linkedIssues.set(linkedIssues.items);
            this.linkedIssuesPage.set(linkedIssues.page);
            this.linkedIssuesTotal.set(linkedIssues.total);
            this.loading.set(false);
          },
          error: () => {
            this.logs.set([]);
            this.stageHistory.set([]);
            this.stages.set([]);
            this.members.set([]);
            this.progressList.set([]);
            this.memberBlocks.set([]);
            this.linkedIssues.set([]);
            this.linkedIssuesTotal.set(0);
            this.linkedIssuesPage.set(1);
            this.linkedIssuesLoading.set(false);
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.item.set(null);
        this.logs.set([]);
        this.stageHistory.set([]);
        this.stages.set([]);
        this.members.set([]);
        this.progressList.set([]);
        this.memberBlocks.set([]);
        this.linkedIssues.set([]);
        this.linkedIssuesTotal.set(0);
        this.linkedIssuesPage.set(1);
        this.linkedIssuesLoading.set(false);
        this.loading.set(false);
      },
    });
  }

  private runAction(request: () => ReturnType<RdApiService['start']>, done?: () => void): void {
    this.busy.set(true);
    request().subscribe({
      next: (item) => {
        this.item.set(item);
        this.rdApi.listLogs(item.id).subscribe({
          next: (logs) => this.logs.set(logs),
        });
        this.rdApi.listStageHistory(item.id).subscribe({
          next: (items) => this.stageHistory.set(items),
          error: () => this.stageHistory.set([]),
        });
        this.loadProgress(item.id);
        this.loadMemberBlocks(item.id);
        this.busy.set(false);
        done?.();
      },
      error: () => {
        this.busy.set(false);
      },
    });
  }

  private warnIfAdvanceWithIncompleteProgress(list: MemberProgressItem[]): void {
    const incomplete = list.filter((item) => item.isActiveMember && Number(item.progress) < 100);
    if (incomplete.length === 0) {
      return;
    }
    const names = incomplete
      .map((item) => item.memberName?.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join('、');
    this.message.warning(`执行人进度未全部达到 100%${names ? `（${names}${incomplete.length > 3 ? ' 等' : ''}）` : ''}，请确认后继续进入下一阶段。`);
  }

  private warnIfAdvanceWithActiveBlocks(): void {
    const active = this.memberBlocks().filter((item) => item.status === 'active');
    if (active.length === 0) {
      return;
    }
    const names = active
      .map((item) => item.userName?.trim() || item.userId)
      .slice(0, 3)
      .join('、');
    this.message.warning(`当前仍有 ${active.length} 个成员阻塞${names ? `（${names}${active.length > 3 ? ' 等' : ''}）` : ''}，请确认后继续进入下一阶段。`);
  }

  private hasNextStage(item: RdItemEntity | null): boolean {
    if (!item) {
      return false;
    }
    const all = [...this.stages()]
      .filter((stage) => stage.enabled)
      .sort((a, b) => {
        if (a.sort !== b.sort) {
          return a.sort - b.sort;
        }
        const aCreated = Date.parse(a.createdAt || '');
        const bCreated = Date.parse(b.createdAt || '');
        if (Number.isFinite(aCreated) && Number.isFinite(bCreated) && aCreated !== bCreated) {
          return aCreated - bCreated;
        }
        return a.id.localeCompare(b.id);
      });
    if (all.length === 0) {
      return false;
    }
    if (!item.stageId) {
      return all.length > 0;
    }
    const currentIndex = all.findIndex((stage) => stage.id === item.stageId);
    if (currentIndex < 0) {
      return all.length > 0;
    }
    return currentIndex < all.length - 1;
  }

  private normalizeProgressByUser(list: RdItemProgress[]): RdItemProgress[] {
    const dedup = new Map<string, RdItemProgress>();
    for (const row of list) {
      const existing = dedup.get(row.userId);
      if (!existing) {
        dedup.set(row.userId, row);
        continue;
      }
      const existingAt = Date.parse(existing.updatedAt || "");
      const rowAt = Date.parse(row.updatedAt || "");
      if (Number.isFinite(rowAt) && (!Number.isFinite(existingAt) || rowAt >= existingAt)) {
        dedup.set(row.userId, row);
      }
    }
    return Array.from(dedup.values());
  }
}
