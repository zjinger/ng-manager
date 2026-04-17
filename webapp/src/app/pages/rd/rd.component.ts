import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectContextStore } from '@app/core/stores';
import { UserStore } from '@app/core/stores/user/user.store';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFlexModule } from 'ng-zorro-antd/flex';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { PageLayoutComponent } from '../../shared';
import { RdAdvanceStageDialogComponent } from './dialog/rd-advance-stage-dialog/rd-advance-stage-dialog.component';
import { RdBlockDialogComponent } from './dialog/rd-block-dialog/rd-block-dialog.component';
import {
  CreateRdItemInput,
  RdItemEntity,
  RdListQuery
} from './models/rd.model';
import { RdDetailComponent } from './rd-detail/rd-detail.component';
import { RdFilterBarComponent } from './rd-filter-bar/rd-filter-bar.component';
import { RdListBoardComponent } from './rd-list-board/rd-list-board.component';
import { RdListTableComponent } from './rd-list-table/rd-list-table.component';
import { RdStore } from './store/rd.store';

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
    RdDetailComponent,
    RdBlockDialogComponent,
    RdAdvanceStageDialogComponent,
    RdFilterBarComponent,
  ],
  templateUrl: './rd.component.html',
  styleUrl: './rd.component.less',
})
export class RdComponent {
  private readonly rdStore = inject(RdStore);
  protected readonly fb = inject(NonNullableFormBuilder);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly userStore = inject(UserStore);
  private readonly projectContext = inject(ProjectContextStore);

  // 视图模式
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

  // 用户
  readonly currentUserId = this.userStore.currentUserId;

  // 项目相关
  readonly currentProjectId = computed(() => this.rdStore.projectId() || '');
  readonly members = this.rdStore.projectMembers;

  priorities = ['低', '中', '高'];

  protected readonly loading = this.rdStore.rdItemsLoading;
  protected readonly currentRdLoading = this.rdStore.currentRdLoading;
  protected readonly pageRdItems = this.rdStore.rdItemsPageList;
  protected readonly currentRdItem = this.rdStore.currentRdItem;
  protected readonly currentRdLogs = this.rdStore.currentRdLogs;
  protected readonly stages = this.rdStore.stages;
  protected readonly total = this.rdStore.rdItemsCount;
  protected readonly busy = this.rdStore.busy;
  protected readonly query = this.rdStore.query;

  constructor() {
    this.rdStore.initialize();
    this.route.queryParamMap.subscribe((params) => {
      const detailId = params.get('detail');

      if (detailId && !this.currentRdItem()) {
        this.rdStore.loadCurrentRdItem(detailId);
        this.detailDrawerOpen.set(true);
      }
    });

    // 确保用户token绑定
    this.userStore.ensureUserLoaded();
  }

  onPageChange(page: number) {
    // this.pageIndex.set(page);
    this.rdStore.updateQuery({ page });
    this.rdStore.loadRdItems();
  }

  onPageSizeChange(size: number) {
    this.rdStore.updateQuery({ pageSize: size });
    this.rdStore.loadRdItems();
  }

  updateQueryByFilter(query: Partial<RdListQuery>): void {
    this.rdStore.updateQuery(query);
    this.rdStore.loadRdItems();
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
    this.openDetail(item);
    this.detailDrawerOpen.set(true);
    await this.rdStore.loadCurrentRdItem(item.id);
    this.rdStore.setCurrentRdItem(this.rdStore.currentRdItem() ?? item);
  }

  // 关闭详情抽屉
  closeDetail() {
    this.detailDrawerOpen.set(false);
    this.rdStore.setCurrentRdItem(null);
    this.router.navigate([], {
      queryParams: {},
    });
  }

  handleSelectedAction(action: 'start' | 'block' | 'resume' | 'complete' | 'advance'): void {
    const current = this.currentRdItem();
    if (!current) {
      return;
    }
    this.handleAction(current, action);
  }

  updateSelectedProgress(progress: number): void {
    const current = this.currentRdItem();
    if (!current) {
      return;
    }
    this.rdStore.progress(current.id, { version: current.version, progress });
  }

  deleteSelectedItem(): void {
    const current = this.currentRdItem();
    if (!current) {
      return;
    }
    this.rdStore.delete(current.id);
    this.closeDetail();
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
        this.rdStore.resolve(item.id);
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
    // TODO ：后面需要再添加
    const current = this.currentRdItem();
    if (!current || !stageId.trim()) {
      return;
    }
    this.rdStore.advanceStage(current.id, { stageId: stageId.trim() });
    this.advanceStageOpen.set(false);
  }
}
