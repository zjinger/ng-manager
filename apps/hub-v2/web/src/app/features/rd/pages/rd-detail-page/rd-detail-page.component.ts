import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { AuthStore } from '@core/auth';
import { ListStateComponent, PageHeaderComponent } from '@shared/ui';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import { ProjectApiService } from '../../../projects/services/project-api.service';
import { RdDetailContentComponent } from '../../components/rd-detail-content/rd-detail-content.component';
import { RdAdvanceStageDialogComponent } from '../../dialogs/rd-advance-stage-dialog/rd-advance-stage-dialog.component';
import { RdBlockDialogComponent } from '../../dialogs/rd-block-dialog/rd-block-dialog.component';
import type { RdItemEntity, RdLogEntity, RdStageEntity } from '../../models/rd.model';
import { RdApiService } from '../../services/rd-api.service';

@Component({
  selector: 'app-rd-detail-page',
  standalone: true,
  imports: [
    NzButtonModule,
    NzIconModule,
    PageHeaderComponent,
    ListStateComponent,
    RdDetailContentComponent,
    RdBlockDialogComponent,
    RdAdvanceStageDialogComponent,
  ],
  template: `
    <div class="detail-page">
      <app-page-header title="研发项详情" [subtitle]="subtitle()" />

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
      />

      @if (!loading() && item()) {
        <app-rd-detail-content
          [busy]="busy()"
          [item]="item()"
          [logs]="logs()"
          [stages]="stages()"
          [canBlock]="canBlock()"
          [canEditProgress]="canEditProgress()"
          [canEditBasic]="canEditBasic()"
          [canStart]="canStart()"
          [canResume]="canResume()"
          [canComplete]="canComplete()"
          [canAdvance]="canAdvance()"
          [canDelete]="canDelete()"
          (actionClick)="handleAction($event)"
          (progressChange)="updateProgress($event)"
          (basicSave)="saveBasic($event)"
          (deleteClick)="deleteItem()"
        />
      }
    </div>

    <app-rd-block-dialog
      [open]="blockOpen()"
      [busy]="busy()"
      [item]="item()"
      (cancel)="closeBlockDialog()"
      (confirm)="confirmBlock($event.blockerReason)"
    />

    <app-rd-advance-stage-dialog
      [open]="advanceStageOpen()"
      [busy]="busy()"
      [item]="item()"
      [stages]="stages()"
      (cancel)="advanceStageOpen.set(false)"
      (confirm)="confirmAdvanceStage($event.stageId)"
    />
  `,
  styles: [
    `
      .detail-page {
        display: flex;
        flex-direction: column;
        gap: 16px;
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly rdApi = inject(RdApiService);
  private readonly projectApi = inject(ProjectApiService);
  private readonly authStore = inject(AuthStore);

  readonly item = signal<RdItemEntity | null>(null);
  readonly logs = signal<RdLogEntity[]>([]);
  readonly stages = signal<RdStageEntity[]>([]);
  readonly members = signal<ProjectMemberEntity[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly blockOpen = signal(false);
  readonly advanceStageOpen = signal(false);

  readonly itemId = computed(() => this.route.snapshot.paramMap.get('itemId') ?? '');
  readonly currentUserId = computed(() => this.authStore.currentUser()?.userId || null);
  readonly subtitle = computed(() => this.item()?.rdNo || '通过 Dashboard 待办进入');

  readonly canEditProgress = computed(() => {
    const current = this.item();
    const userId = this.currentUserId();
    return !!current && !!userId && !!current.assigneeId && current.assigneeId === userId;
  });
  readonly canStart = computed(() => this.canEditProgress());
  readonly canComplete = computed(() => this.canEditProgress());
  readonly canEditBasic = computed(() => {
    const current = this.item();
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
  readonly canDelete = computed(() => {
    const current = this.item();
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
  readonly canBlock = computed(() => {
    const current = this.item();
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
  readonly canResume = computed(() => this.canBlock());
  readonly canAdvance = computed(() => {
    const current = this.item();
    if (!current) {
      return false;
    }
    if (current.status !== 'done' && current.status !== 'accepted') {
      return false;
    }
    return this.canEditBasic();
  });

  constructor() {
    effect(() => {
      const id = this.itemId();
      if (!id) {
        this.item.set(null);
        this.logs.set([]);
        this.stages.set([]);
        this.members.set([]);
        return;
      }
      this.load(id);
    });
  }

  goBack(): void {
    this.router.navigate(['/rd']);
  }

  handleAction(action: 'start' | 'block' | 'resume' | 'complete' | 'advance'): void {
    const current = this.item();
    if (!current) {
      return;
    }
    if (action === 'start' && this.canStart()) {
      this.runAction(() => this.rdApi.start(current.id));
      return;
    }
    if (action === 'block' && this.canBlock()) {
      this.blockOpen.set(true);
      return;
    }
    if (action === 'resume' && this.canResume()) {
      this.runAction(() => this.rdApi.resume(current.id));
      return;
    }
    if (action === 'complete' && this.canComplete()) {
      this.runAction(() => this.rdApi.complete(current.id));
      return;
    }
    if (action === 'advance' && this.canAdvance()) {
      this.advanceStageOpen.set(true);
    }
  }

  updateProgress(progress: number): void {
    const current = this.item();
    if (!current || !this.canEditProgress()) {
      return;
    }
    this.runAction(() => this.rdApi.update(current.id, { progress }));
  }

  saveBasic(input: { title: string; description: string | null }): void {
    const current = this.item();
    if (!current || !this.canEditBasic()) {
      return;
    }
    this.runAction(() => this.rdApi.update(current.id, input));
  }

  deleteItem(): void {
    const current = this.item();
    if (!current || !this.canDelete()) {
      return;
    }
    this.busy.set(true);
    this.rdApi.delete(current.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.goBack();
      },
      error: () => {
        this.busy.set(false);
      },
    });
  }

  confirmBlock(blockerReason: string): void {
    const current = this.item();
    if (!current) {
      return;
    }
    this.runAction(() => this.rdApi.block(current.id, { blockerReason }));
    this.closeBlockDialog();
  }

  confirmAdvanceStage(stageId: string): void {
    const current = this.item();
    if (!current || !stageId.trim()) {
      return;
    }
    this.runAction(() => this.rdApi.advanceStage(current.id, { stageId: stageId.trim() }));
    this.advanceStageOpen.set(false);
  }

  closeBlockDialog(): void {
    this.blockOpen.set(false);
  }

  private load(id: string): void {
    this.loading.set(true);
    this.rdApi.getById(id).subscribe({
      next: (item) => {
        this.item.set(item);
        forkJoin({
          logs: this.rdApi.listLogs(item.id),
          stages: this.rdApi.listStages(item.projectId),
          members: this.projectApi.listMembers(item.projectId),
        }).subscribe({
          next: ({ logs, stages, members }) => {
            this.logs.set(logs);
            this.stages.set(stages);
            this.members.set(members);
            this.loading.set(false);
          },
          error: () => {
            this.logs.set([]);
            this.stages.set([]);
            this.members.set([]);
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.item.set(null);
        this.logs.set([]);
        this.stages.set([]);
        this.members.set([]);
        this.loading.set(false);
      },
    });
  }

  private runAction(request: () => ReturnType<RdApiService['start']>): void {
    this.busy.set(true);
    request().subscribe({
      next: (item) => {
        this.item.set(item);
        this.rdApi.listLogs(item.id).subscribe({
          next: (logs) => this.logs.set(logs),
        });
        this.busy.set(false);
      },
      error: () => {
        this.busy.set(false);
      },
    });
  }
}
