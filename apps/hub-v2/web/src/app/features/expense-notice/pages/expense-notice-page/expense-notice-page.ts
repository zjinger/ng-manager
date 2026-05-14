import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ListStateComponent, PageHeaderComponent } from '@app/shared/ui';
import { NoticeFilterBarComponent } from '../../components/notice-filter-bar/notice-filter-bar';
import { NoticeListComponent } from '../../components/notice-list/notice-list';
import { NoticeCreateDialogComponent } from '../../dialog/notice-create-dialog/notice-create-dialog';
import { NoticeDetailDrawerComponent } from '../../components/notice-detail-drawer/notice-detail-drawer';
import {
  NoticeDetail,
  NoticeFilterQuery,
  NoticeFormValue,
  SelectOption,
} from '../../models/notice.model';
import {
  DisplayData,
  NoticeTypeOptions,
  StatusOptions,
  VisibleScopeOptions,
} from '../../models/notice.mock';

// ==================== 常量定义 ====================

const DEFAULT_QUERY: NoticeFilterQuery = {
  page: 1,
  pageSize: 10,
  noticeTypes: [],
  noticeStatuses: [],
  visibleScopes: [],
  date: null,
  keyword: '',
};

const MOCK_LOADING_DELAY = 300;
const MOCK_SUBMIT_DELAY = 800;

@Component({
  selector: 'app-expense-notice-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    NzButtonModule,
    NzIconModule,
    ListStateComponent,
    NoticeFilterBarComponent,
    NoticeListComponent,
    NoticeCreateDialogComponent,
    NoticeDetailDrawerComponent,
  ],
  templateUrl: './expense-notice-page.html',
  styleUrls: ['./expense-notice-page.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseNoticePage {
  // ==================== 配置数据 ====================

  readonly noticeTypeOptions: SelectOption[] = NoticeTypeOptions;
  readonly statusOptions: SelectOption[] = StatusOptions;
  readonly visibleScopeOptions: SelectOption[] = VisibleScopeOptions;

  // ==================== 查询状态 ====================

  private readonly currentQuerySignal = signal<NoticeFilterQuery>(structuredClone(DEFAULT_QUERY));
  readonly currentQuery = this.currentQuerySignal.asReadonly();

  // ==================== 列表状态 ====================

  readonly loading = signal(false);
  readonly displayData: NoticeDetail[] = DisplayData;

  // 选中行 ID（用于高亮）
  private readonly selectedIdSignal = signal<string | null>(null);
  readonly selectedId = this.selectedIdSignal.asReadonly();

  // ==================== 详情抽屉 ====================

  readonly detailOpen = signal(false);
  readonly currentDetail = signal<NoticeDetail | null>(null);

  // ==================== 弹窗 ====================

  readonly dialogOpen = signal(false);
  readonly dialogBusy = signal(false);
  readonly editingNotice = signal<NoticeFormValue | null>(null);

  // ==================== 计算属性 ====================

  /** 空状态标题 */
  readonly emptyTitle = computed(() => {
    const hasKeyword = this.currentQuery().keyword?.trim();
    return hasKeyword ? '未搜索到相关公告' : '暂无公告';
  });

  /** 空状态描述 */
  readonly emptyDescription = computed(() => {
    const hasKeyword = this.currentQuery().keyword?.trim();
    return hasKeyword ? '请尝试调整筛选条件后重新查询' : '当前暂无公告数据';
  });

  /** 是否为编辑模式 */
  readonly isEditMode = computed(() => !!this.editingNotice());

  // ==================== 生命周期 ====================

  constructor() {
    this.loadData();
  }

  // ==================== 筛选事件 ====================

  /** 处理筛选查询 */
  handleFilter(query: NoticeFilterQuery): void {
    this.currentQuerySignal.set(query);
    this.loadData();
  }

  // ==================== 列表事件 ====================

  /** 选中公告项 */
  handleSelect(item: NoticeDetail): void {
    this.selectedIdSignal.set(item.id);
    this.currentDetail.set(item);
    this.detailOpen.set(true);
  }

  /** 关闭详情抽屉 */
  closeDetailDrawer(): void {
    this.detailOpen.set(false);
  }

  /** 从抽屉进入编辑 */
  handleEditFromDrawer(item: NoticeDetail): void {
    this.detailOpen.set(false);
    const { id, publisher, updatedAt, ...formValue } = item;
    this.editingNotice.set(formValue);
    this.dialogOpen.set(true);
  }

  // ==================== 弹窗事件 ====================

  /** 打开新建弹窗 */
  openCreateDialog(): void {
    this.editingNotice.set(null);
    this.dialogOpen.set(true);
  }

  /** 打开编辑弹窗 */
  openEditDialog(item: NoticeFormValue): void {
    this.editingNotice.set(item);
    this.dialogOpen.set(true);
  }

  /** 关闭弹窗 */
  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  /** 提交表单（创建/编辑） */
  handleSubmit(payload: NoticeFormValue): void {
    this.dialogBusy.set(true);

    // TODO: 替换为真实 API 调用
    this.mockSubmit(payload);
  }

  // ==================== 私有方法 ====================

  /** 加载列表数据 */
  private loadData(): void {
    this.loading.set(true);

    // TODO: 替换为真实 API 调用
    // this.noticeApi.getList(this.currentQuery()).subscribe({
    //   next: (data) => this.displayData.set(data),
    //   error: (err) => console.error('加载失败:', err),
    //   complete: () => this.loading.set(false)
    // });

    setTimeout(() => {
      this.loading.set(false);
    }, MOCK_LOADING_DELAY);
  }

  /** 模拟提交（待替换） */
  private mockSubmit(payload: NoticeFormValue): void {
    console.log('公告提交:', payload, '编辑模式:', this.isEditMode());

    setTimeout(() => {
      this.dialogBusy.set(false);
      this.dialogOpen.set(false);
      this.loadData();
    }, MOCK_SUBMIT_DELAY);
  }
}
