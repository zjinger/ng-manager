import { Component, computed, effect, inject, signal } from '@angular/core';
import { PageLayoutComponent } from '../../shared';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzFormModule } from 'ng-zorro-antd/form';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFlexModule } from 'ng-zorro-antd/flex';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { RdItemCardComponent } from './rd-item-card/rd-item-card.component';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { RdListBoardComponent } from './rd-list-board/rd-list-board.component';
import { RdCreateDialogComponent } from './dialog/rd-create-dialog/rd-create-dialog.component';
import { CreateRdItemInput, RdItemEntity } from './models/rd.model';
import { RdListTableComponent } from './rd-list-table/rd-list-table.component';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { RdStore } from './store/rd.store';
import { RdDetailComponent } from './dialog/rd-detail/rd-detail.component';
import { RdBlockDialogComponent } from './dialog/rd-block-dialog/rd-block-dialog.component';
import { ActivatedRoute, Router } from '@angular/router';
import { NzDrawerPlacement } from 'ng-zorro-antd/drawer';
import { RdAdvanceStageDialogComponent } from './dialog/rd-advance-stage-dialog/rd-advance-stage-dialog.component';

type viewType = 'list' | 'board';

@Component({
  selector: 'app-rd.component',
  imports: [
    PageLayoutComponent,
    NzSelectModule,
    NzTableModule,
    NzButtonModule,
    NzInputModule,
    NzIconModule,
    NzRadioModule,
    NzFormModule,
    NzCardModule,
    NzProgressModule,
    NzBadgeModule,
    ReactiveFormsModule,
    FormsModule,
    NzFlexModule,
    NzTagModule,
    NzPaginationModule,
    RdListBoardComponent,
    RdListTableComponent,
    RdCreateDialogComponent,
    RdDetailComponent,
    RdBlockDialogComponent,
    RdAdvanceStageDialogComponent,
  ],
  templateUrl: './rd.component.html',
  styleUrl: './rd.component.less',
})
export class RdComponent {
  private readonly rdStore = inject(RdStore);
  protected readonly fb = inject(NonNullableFormBuilder);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly viewType = signal<viewType>('list');

  // 新建研发项弹窗
  protected readonly createDialogOpen = signal(false);
  protected readonly detailDrawerOpen = signal(false);

  // 阻塞处理中的研发项
  protected readonly blockingItem = signal<RdItemEntity | null>(null);
  protected readonly blockOpen = signal(false);

  // 详情抽屉方向
  protected readonly drawerPlacement = signal('right');

  // 推进研发项
  readonly advanceStageOpen = signal(false);

  // stages = ['阶段1', '阶段2', '阶段3']; // 可替换成实际阶段
  statuses = ['待开始', '进行中', '阻塞', '已完成', '已取消'];
  priorities = ['低', '中', '高'];

  pageIndex = signal(1);
  pageSize = signal(10);

  pageRdItems = this.rdStore.rdItemsPageList;
  currentRdItem = this.rdStore.currentRdItem;
  currentRdLogs = this.rdStore.currentRdLogs;
  stages = this.rdStore.stages;
  total = this.rdStore.rdItemsCount;
  busy = this.rdStore.busy;

  constructor() {
    this.rdStore.loadRdItems(this.pageIndex(), this.pageSize());
  }

  form = this.fb.group({
    keyword: this.fb.control<string>(''),
    stage: this.fb.control<string>(''),
    status: this.fb.control<string>(''),
    priority: this.fb.control<string>(''),
  });

  onPageChange(page: number) {
    this.pageIndex.set(page);
    this.rdStore.loadRdItems(this.pageIndex(), this.pageSize());
  }

  onPageSizeChange(size: number) {
    this.pageSize.set(size);
    this.rdStore.loadRdItems(this.pageIndex(), this.pageSize());
  }

  /** 新建研发项 */
  createRd(input: Omit<CreateRdItemInput, 'projectId'>): void {
    // this.store.create(input, () => this.createOpen.set(false));
  }

  /**打开新建研发项弹窗 */
  openCreateDialog() {
    this.createDialogOpen.set(true);
  }

  async selectItem(item: RdItemEntity) {
    if (this.viewType() === 'board' && (item.status === 'blocked' || item.status === 'done')) {
      this.updateDetailDrawerPlacement('left');
    } else {
      this.updateDetailDrawerPlacement('right');
    }
    this.detailDrawerOpen.set(true);
    await this.rdStore.loadCurrentRdItem(item.id);
    this.rdStore.setCurrentRdItem(this.rdStore.currentRdItem() ?? item);
  }

  updateDetailDrawerPlacement(pla: NzDrawerPlacement) {
    this.drawerPlacement.set(pla);
  }

  // 关闭详情抽屉
  closeDetail() {
    this.detailDrawerOpen.set(false);
    this.rdStore.setCurrentRdItem(null);
  }

  handleSelectedAction(action: 'start' | 'block' | 'resume' | 'complete' | 'advance'): void {
    const current = this.currentRdItem();
    if (!current) {
      return;
    }
    this.handleAction(current, action);
  }

  handleAction(
    item: RdItemEntity,
    action: 'start' | 'block' | 'resume' | 'complete' | 'advance',
  ): void {
    this.openDetail(item);
    switch (action) {
      case 'start':
        this.rdStore.start(item.id);
        break;
      case 'block':
        this.blockingItem.set(item);
        this.blockOpen.set(true);
        break;
      case 'resume':
        this.rdStore.resume(item.id);
        break;
      case 'complete':
        this.rdStore.complete(item.id);
        break;
      case 'advance':
        this.advanceStageOpen.set(true);
        break;
    }
  }

  openDetail(item: RdItemEntity): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { detail: item.id },
      queryParamsHandling: 'merge',
    });
  }

  // 阻塞处理

  confirmBlock(blockerReason: string): void {
    const item = this.blockingItem();
    if (!item) {
      return;
    }
    this.rdStore.block(item.id, { blockerReason });
    this.closeBlockDialog();
  }

  closeBlockDialog(): void {
    this.blockOpen.set(false);
    this.blockingItem.set(null);
  }

  // 推进研发项
  confirmAdvanceStage(stageId: string): void {
    const current = this.currentRdItem();
    if (!current || !stageId.trim()) {
      return;
    }
    this.rdStore.advanceStage(current.id, { stageId: stageId.trim() });
    this.advanceStageOpen.set(false);
  }
}
