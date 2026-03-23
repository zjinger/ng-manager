import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';

import { ProjectContextStore } from '../../../../core/state/project-context.store';
import { ListStateComponent } from '../../../../shared/ui/list-state/list-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { PanelCardComponent } from '../../../../shared/ui/panel-card/panel-card.component';
import { SideDetailLayoutComponent } from '../../../../shared/ui/side-detail-layout/side-detail-layout.component';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import { ProjectApiService } from '../../../projects/services/project-api.service';
import { RdActivityTimelineComponent } from '../../components/rd-activity-timeline/rd-activity-timeline.component';
import { RdBoardComponent } from '../../components/rd-board/rd-board.component';
import { RdFilterBarComponent, type RdViewMode } from '../../components/rd-filter-bar/rd-filter-bar.component';
import { RdListTableComponent } from '../../components/rd-list-table/rd-list-table.component';
import { RdPropsPanelComponent } from '../../components/rd-props-panel/rd-props-panel.component';
import { RdBlockDialogComponent } from '../../dialogs/rd-block-dialog/rd-block-dialog.component';
import { RdCreateDialogComponent } from '../../dialogs/rd-create-dialog/rd-create-dialog.component';
import type { CreateRdItemInput, RdItemEntity, RdListQuery } from '../../models/rd.model';
import { RdStore } from '../../store/rd.store';

@Component({
  selector: 'app-rd-board-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    ListStateComponent,
    PanelCardComponent,
    SideDetailLayoutComponent,
    RdFilterBarComponent,
    RdBoardComponent,
    RdListTableComponent,
    RdCreateDialogComponent,
    RdBlockDialogComponent,
    RdPropsPanelComponent,
    RdActivityTimelineComponent,
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
      <app-side-detail-layout>
        <div detail-main>
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
                [selectedItemId]="selectedItem()?.id || null"
                (selectItem)="selectedItem.set($event)"
                (actionClick)="handleAction($event.item, $event.action)"
              />
            } @else {
              <app-rd-list-table
                [stages]="store.stages()"
                [items]="store.items()"
                [selectedItemId]="selectedItem()?.id || null"
                (selectItem)="selectedItem.set($event)"
                (actionClick)="handleAction($event.item, $event.action)"
              />
            }
          </app-list-state>
        </div>

        <div detail-side>
          @if (selectedItem(); as item) {
            <app-panel-card title="研发项摘要">
              <div class="summary-card">
                <div class="summary-card__code">{{ item.rdNo }}</div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.description || '暂无描述' }}</p>
              </div>
            </app-panel-card>

            <app-rd-props-panel [item]="item" [stages]="store.stages()" />
            <app-rd-activity-timeline [item]="item" />
          } @else {
            <app-list-state [empty]="true" emptyTitle="请选择一个研发项" emptyDescription="点击左侧卡片或列表行查看详情。" />
          }
        </div>
      </app-side-detail-layout>
    }

    <app-rd-create-dialog
      [open]="createOpen()"
      [busy]="store.busy()"
      [stages]="store.stages()"
      [members]="members()"
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
  `,
  styles: [
    `
      .summary-card {
        padding: 20px;
      }
      .summary-card__code {
        color: var(--text-muted);
        font-size: 12px;
        font-family: 'JetBrains Mono', monospace;
      }
      .summary-card h3 {
        margin: 10px 0 8px;
        color: var(--text-heading);
        font-size: 18px;
        line-height: 1.4;
      }
      .summary-card p {
        margin: 0;
        color: var(--text-secondary);
        line-height: 1.7;
        white-space: pre-wrap;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdBoardPageComponent {
  readonly store = inject(RdStore);
  readonly projectContext = inject(ProjectContextStore);
  private readonly projectApi = inject(ProjectApiService);

  readonly viewMode = signal<RdViewMode>('board');
  readonly createOpen = signal(false);
  readonly blockOpen = signal(false);
  readonly blockingItem = signal<RdItemEntity | null>(null);
  readonly selectedItem = signal<RdItemEntity | null>(null);
  readonly members = signal<ProjectMemberEntity[]>([]);
  readonly subtitle = computed(() => `当前项目共 ${this.store.total()} 个研发项`);

  constructor() {
    effect((onCleanup) => {
      const projectId = this.projectContext.currentProjectId();
      this.store.refreshForProject(projectId);
      this.selectedItem.set(null);
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
      const current = this.selectedItem();
      if (items.length === 0) {
        this.selectedItem.set(null);
        return;
      }
      if (!current || !items.some((item) => item.id === current.id)) {
        this.selectedItem.set(items[0]);
      }
    });
  }

  applyFilters(query: RdListQuery): void {
    this.store.updateQuery({
      keyword: query.keyword?.trim(),
      stageId: query.stageId,
      status: query.status,
      priority: query.priority,
    });
  }

  createRd(input: Omit<CreateRdItemInput, 'projectId'>): void {
    this.store.create(input, () => this.createOpen.set(false));
  }

  handleAction(item: RdItemEntity, action: 'start' | 'block' | 'resume' | 'complete' | 'accept' | 'close'): void {
    this.selectedItem.set(item);
    switch (action) {
      case 'start':
        this.store.start(item.id);
        break;
      case 'block':
        this.blockingItem.set(item);
        this.blockOpen.set(true);
        break;
      case 'resume':
        this.store.resume(item.id);
        break;
      case 'complete':
        this.store.complete(item.id);
        break;
      case 'accept':
        this.store.accept(item.id);
        break;
      case 'close':
        this.store.close(item.id);
        break;
    }
  }

  confirmBlock(blockerReason: string): void {
    const item = this.blockingItem();
    if (!item) {
      return;
    }
    this.store.block(item.id, { blockerReason });
    this.closeBlockDialog();
  }

  closeBlockDialog(): void {
    this.blockOpen.set(false);
    this.blockingItem.set(null);
  }
}
