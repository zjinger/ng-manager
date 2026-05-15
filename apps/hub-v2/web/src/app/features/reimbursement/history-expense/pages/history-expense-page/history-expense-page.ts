import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs';
import {
  ActiveFilterTag,
  ActiveFiltersBarComponent,
  ListStateComponent,
  PageHeaderComponent,
} from '@app/shared/ui';
import {
  HistoryExpenseFilterBarComponent,
  HistoryExpenseListTableComponent,
  StatisticsDashboardPanelComponent,
} from '../../components';
import { formatDate } from '@app/features/reimbursement/travel-expense/models';
import {
  ActionTypeOptions,
  DepartmentOptions,
  HistoryExpenseFilterQuery,
  HistoryExpenseItem,
  MockHistoryExpenseList,
  RoleNodeOptions,
  SelectOption,
  StatusOptions,
} from '../../models';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';

// 常量配置
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const LOADING_DELAY_MS = 300;

// 默认查询参数
const DEFAULT_QUERY: HistoryExpenseFilterQuery = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  roleNodes: [],
  actionTypes: [],
  statuses: [],
  departments: [],
  date: null,
  keyword: '',
};

@Component({
  selector: 'app-history-expense-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    StatisticsDashboardPanelComponent,
    HistoryExpenseFilterBarComponent,
    ActiveFiltersBarComponent,
    HistoryExpenseListTableComponent,
    ListStateComponent,
    NzPaginationModule,
  ],
  templateUrl: './history-expense-page.html',
  styleUrls: ['./history-expense-page.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryExpensePageComponent {
  // ==================== 常量配置 ====================
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly roleNodeOptions: SelectOption[] = RoleNodeOptions;
  readonly actionTypeOptions: SelectOption[] = ActionTypeOptions;
  readonly statusOptions: SelectOption[] = StatusOptions;
  readonly departmentOptions: SelectOption[] = DepartmentOptions;

  // ==================== 状态管理 ====================
   readonly query = signal<HistoryExpenseFilterQuery>(DEFAULT_QUERY);
   readonly allData = signal<HistoryExpenseItem[]>(MockHistoryExpenseList);

  // 加载状态
  readonly loading = signal(false);

  // 派生状态：分页后的数据
  readonly displayData = computed(() => {
    const data = this.allData();
    const { page, pageSize } = this.query();
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
  });

  // 派生状态：总记录数
  readonly totalCount = computed(() => this.allData().length);

  // 派生状态：仪表盘统计数据
  readonly dashboardStats = computed(() => ({
    handledCount: this.allData().length,
    approvedCount: this.allData().filter((item) => item.status === 'approved').length,
    rejectedCount: this.allData().filter((item) => item.status === 'rejected').length,
    processingCount: this.allData().filter((item) => item.status === 'processing').length,
  }));

  // 派生状态：激活的筛选标签
  readonly activeFilterTags = computed<ActiveFilterTag[]>(() => {
    const q = this.query();
    const tags: ActiveFilterTag[] = [];

    const addTags = (
      kind: string,
      values: string[],
      labelPrefix: string,
      options: SelectOption[]
    ) => {
      values.forEach((value) => {
        tags.push({
          kind,
          value,
          label: `${labelPrefix}: ${this.getOptionLabel(options, value)}`,
        });
      });
    };

    addTags('roleNodes', q.roleNodes, '角色节点', this.roleNodeOptions);
    addTags('actionTypes', q.actionTypes, '处理动作', this.actionTypeOptions);
    addTags('statuses', q.statuses, '当前状态', this.statusOptions);
    addTags('departments', q.departments, '部门', this.departmentOptions);

    if (q.date) {
      tags.push({
        kind: 'date',
        value: String(q.date),
        label: `日期: ${formatDate(q.date)}`,
      });
    }

    if (q.keyword.trim()) {
      tags.push({
        kind: 'keyword',
        value: q.keyword,
        label: `关键词: ${q.keyword}`,
      });
    }

    return tags;
  });

  // ==================== 公共方法 ====================

  /**
   * 处理筛选提交
   */
  handleFilter(query: HistoryExpenseFilterQuery): void {
    this.updateQuery({ ...query, page: 1 });
    this.loadData();
  }

  /**
   * 重置所有筛选条件
   */
  resetFilters(): void {
    this.updateQuery(DEFAULT_QUERY);
    this.loadData();
  }

  /**
   * 删除单个筛选标签
   */
  onRemoveFilter(event: { kind: string; value: string }): void {
    const updateMap: Record<string, (q: HistoryExpenseFilterQuery) => HistoryExpenseFilterQuery> = {
      roleNodes: (q) => ({ ...q, roleNodes: q.roleNodes.filter((v) => v !== event.value) }),
      actionTypes: (q) => ({ ...q, actionTypes: q.actionTypes.filter((v) => v !== event.value) }),
      statuses: (q) => ({ ...q, statuses: q.statuses.filter((v) => v !== event.value) }),
      departments: (q) => ({ ...q, departments: q.departments.filter((v) => v !== event.value) }),
      date: (q) => ({ ...q, date: null }),
      keyword: (q) => ({ ...q, keyword: '' }),
    };

    const updater = updateMap[event.kind];
    if (updater) {
      this.updateQuery(updater(this.query()));
      this.loadData();
    }
  }

  /**
   * 页码改变
   */
  onPageIndexChange(page: number): void {
    this.updateQuery({ ...this.query(), page });
    this.loadData();
  }

  /**
   * 每页条数改变
   */
  onPageSizeChange(pageSize: number): void {
    this.updateQuery({ ...this.query(), page: 1, pageSize });
    this.loadData();
  }

  /**
   * 查看详情
   */
  handleView(item: HistoryExpenseItem): void {
    console.log('查看:', item);
    // TODO: 跳转到详情页
  }

  /**
   * 导出数据
   */
  handleExport(item: HistoryExpenseItem): void {
    console.log('导出:', item);
    // TODO: 实现导出逻辑
  }

  // ==================== 私有方法 ====================

  /**
   * 更新查询参数
   */
  private updateQuery(newQuery: HistoryExpenseFilterQuery): void {
    this.query.set(newQuery);
  }

  /**
   * 加载数据（模拟异步请求）
   * TODO: 后续替换为真实的 API 调用
   */
  private loadData(): void {
    this.loading.set(true);

    // 模拟异步加载
    setTimeout(() => {
      const filteredData = this.filterData(this.allData(), this.query());
      this.allData.set(filteredData);
      this.loading.set(false);
    }, LOADING_DELAY_MS);
  }

  /**
   * 根据查询条件筛选数据
   */
  private filterData(
    data: HistoryExpenseItem[],
    query: HistoryExpenseFilterQuery
  ): HistoryExpenseItem[] {
    let result = [...data];

    // 关键词筛选
    if (query.keyword.trim()) {
      const keyword = query.keyword.toLowerCase();
      result = result.filter(
        (item) =>
          item.code.toLowerCase().includes(keyword) ||
          item.applicant.toLowerCase().includes(keyword) ||
          item.title.toLowerCase().includes(keyword)
      );
    }

    // TODO: 添加其他筛选条件（部门、状态、角色节点等）
    // 目前 mock 数据暂不支持完整筛选

    return result;
  }

  /**
   * 获取选项的显示文本
   */
  private getOptionLabel(options: SelectOption[], value: string): string {
    return options.find((item) => item.value === value)?.label || value;
  }
}
