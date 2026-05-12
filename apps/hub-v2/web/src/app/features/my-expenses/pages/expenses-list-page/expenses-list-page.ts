import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  ActiveFiltersBarComponent,
  PageHeaderComponent,
  ActiveFilterTag,
  ListStateComponent,
} from '@app/shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { Router } from '@angular/router';
import {
  ExpensesFilterBarComponent,
  ExpensesFilterQuery,
  SelectOption,
} from '../../components/expenses-filter-bar/expenses-filter-bar.component';
import {
  ExpensesListTableComponent,
  ExpenseItem,
} from '../../components/expenses-list-table/expenses-list-table.component';
import { ExpensesListMockData } from '../../models/list-mock-data';

@Component({
  selector: 'app-expenses-list-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    NzIconModule,
    NzButtonModule,
    NzPaginationModule,
    ExpensesFilterBarComponent,
    ActiveFiltersBarComponent,
    ExpensesListTableComponent,
    ListStateComponent,
  ],
  templateUrl: './expenses-list-page.html',
  styleUrls: ['./expenses-list-page.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesListPage {
  private router = inject(Router);

  // 新建差旅费报销
  createTravelReport(): void {
    this.router.navigate(['/travel-expense/new']);
  }

  // 新建费用报销
  createExpenseReport(): void {
    this.router.navigate(['/expense/new']);
  }

  // ========== 配置数据 ==========

  // 报销类型选项
  expenseTypeOptions: SelectOption[] = [
    { value: 'travel', label: '差旅费报销' },
    { value: 'expense', label: '费用报销' },
  ];

  // 报销状态选项
  statusOptions: SelectOption[] = [
    { value: 'draft', label: '草稿' },
    { value: 'pending', label: '待审核' },
    { value: 'approved', label: '已通过' },
    { value: 'rejected', label: '已驳回' },
    { value: 'paid', label: '已打款' },
    { value: 'cancelled', label: '已取消' },
  ];

  // 审批节点选项
  approvalNodeOptions: SelectOption[] = [
    { value: 'department_head', label: '部门负责人' },
    { value: 'finance', label: '财务审核' },
    { value: 'gm', label: '总经理' },
    { value: 'cashier', label: '出纳' },
  ];

  // ========== 状态管理 ==========

  // 当前筛选条件
  private currentQuerySignal = signal<ExpensesFilterQuery>({
    page: 1,
    pageSize: 20,
    keyword: '',
    expenseTypes: [],
    statuses: [],
    approvalNodes: [],
    submitDate: null,
  });

  // 暴露只读的查询对象
  get currentQuery(): ExpensesFilterQuery {
    return this.currentQuerySignal();
  }

  // 选中的报销单ID
  readonly selectedItemId = signal<string | null>(null);

  // 所有原始数据
  private allData = signal<ExpenseItem[]>([]);

  // 当前页显示的数据（过滤+分页后的数据）
  readonly displayData = signal<ExpenseItem[]>([]);

  // 总记录数
  readonly totalCount = signal<number>(0);

  // 加载状态
  readonly loading = signal<boolean>(false);

  // ========== 初始化 ==========

  constructor() {
    // 加载模拟数据
    this.allData.set(this.getMockData());
    // 初始加载数据
    this.loadExpenses();
  }

  // ========== 模拟数据 ==========

  private getMockData(): ExpenseItem[] {
    return ExpensesListMockData;
  }

  // ========== 激活标签相关 ==========

  private getExpenseTypeLabel(value: string): string {
    return this.expenseTypeOptions.find((opt) => opt.value === value)?.label || value;
  }

  private getStatusLabel(value: string): string {
    return this.statusOptions.find((opt) => opt.value === value)?.label || value;
  }

  private getApprovalNodeLabel(value: string): string {
    return this.approvalNodeOptions.find((opt) => opt.value === value)?.label || value;
  }

  readonly activeFilterTags = computed(() => {
    const query = this.currentQuerySignal();
    const firstSeen = new Set<string>();

    const withPrefix = (group: string, prefix: string, valueLabel: string) => {
      const first = !firstSeen.has(group);
      if (first) {
        firstSeen.add(group);
      }
      return first ? `${prefix}: ${valueLabel}` : valueLabel;
    };

    const tags: ActiveFilterTag[] = [];

    const expenseTypes = query.expenseTypes ?? [];
    if (expenseTypes.length > 0) {
      for (const type of expenseTypes) {
        const label = this.getExpenseTypeLabel(type);
        tags.push({
          kind: 'expenseTypes',
          value: type,
          label: withPrefix('expenseTypes', '类型', label),
        });
      }
    }

    const statuses = query.statuses ?? [];
    if (statuses.length > 0) {
      for (const status of statuses) {
        const label = this.getStatusLabel(status);
        tags.push({
          kind: 'statuses',
          value: status,
          label: withPrefix('statuses', '状态', label),
        });
      }
    }

    const approvalNodes = query.approvalNodes ?? [];
    if (approvalNodes.length > 0) {
      for (const node of approvalNodes) {
        const label = this.getApprovalNodeLabel(node);
        tags.push({
          kind: 'approvalNodes',
          value: node,
          label: withPrefix('approvalNodes', '审批节点', label),
        });
      }
    }

    if (query.submitDate) {
      const dateStr = new Date(query.submitDate).toLocaleDateString('zh-CN');
      tags.push({
        kind: 'submitDate',
        value: query.submitDate.toISOString(),
        label: withPrefix('submitDate', '提交日期', dateStr),
      });
    }

    if (query.keyword?.trim()) {
      tags.push({
        kind: 'keyword',
        value: query.keyword.trim(),
        label: withPrefix('keyword', '关键词', query.keyword.trim()),
      });
    }

    return tags;
  });

  readonly activeFilterBarTags = computed(() => {
    return this.activeFilterTags().map((tag) => ({
      ...tag,
      className: this.getFilterTagClass(tag.kind),
    }));
  });

  private getFilterTagClass(kind: ActiveFilterTag['kind']): string {
    const classMap: Record<ActiveFilterTag['kind'], string> = {
      expenseTypes: 'filter-tag filter-tag--type',
      statuses: 'filter-tag filter-tag--status',
      approvalNodes: 'filter-tag filter-tag--node',
      submitDate: 'filter-tag filter-tag--date',
      keyword: 'filter-tag filter-tag--keyword',
    };
    return classMap[kind];
  }

  // ========== 筛选事件处理 ==========

  handleFilter(query: ExpensesFilterQuery): void {
    console.log('筛选条件:', query);
    this.currentQuerySignal.set({
      ...query,
      page: 1, // 筛选后重置到第一页
    });
    this.filterAndPaginateData();
  }

  handleReset(): void {
    console.log('清空所有筛选条件');
    this.resetFilters();
  }

  resetFilters(): void {
    this.currentQuerySignal.set({
      page: 1,
      pageSize: 20,
      keyword: '',
      expenseTypes: [],
      statuses: [],
      approvalNodes: [],
      submitDate: null,
    });
    this.filterAndPaginateData();
  }

  onActiveFilterRemove(event: { kind: string; value: string }): void {
    const current = this.currentQuerySignal();

    switch (event.kind) {
      case 'expenseTypes':
        this.currentQuerySignal.update((query) => ({
          ...query,
          page: 1,
          expenseTypes: (query.expenseTypes ?? []).filter((v) => v !== event.value),
        }));
        break;

      case 'statuses':
        this.currentQuerySignal.update((query) => ({
          ...query,
          page: 1,
          statuses: (query.statuses ?? []).filter((v) => v !== event.value),
        }));
        break;

      case 'approvalNodes':
        this.currentQuerySignal.update((query) => ({
          ...query,
          page: 1,
          approvalNodes: (query.approvalNodes ?? []).filter((v) => v !== event.value),
        }));
        break;

      case 'submitDate':
        this.currentQuerySignal.update((query) => ({
          ...query,
          page: 1,
          submitDate: null,
        }));
        break;

      case 'keyword':
        this.currentQuerySignal.update((query) => ({
          ...query,
          page: 1,
          keyword: '',
        }));
        break;
    }

    this.filterAndPaginateData();
  }

  // ========== 数据筛选和分页 ==========

  /**
   * 获取过滤后的数据 TODO: 从后端获取数据筛选
   */
  private getFilteredData(): ExpenseItem[] {
    const query = this.currentQuerySignal();
    let filtered = [...this.allData()];

    // 关键词筛选
    if (query.keyword?.trim()) {
      const keyword = query.keyword.trim().toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.code.toLowerCase().includes(keyword) || item.title.toLowerCase().includes(keyword)
      );
    }

    // 报销类型筛选
    if (query.expenseTypes && query.expenseTypes.length > 0) {
      filtered = filtered.filter((item) => query.expenseTypes!.includes(item.expenseType));
    }

    // 状态筛选
    if (query.statuses && query.statuses.length > 0) {
      filtered = filtered.filter((item) => query.statuses!.includes(item.status));
    }

    // 审批节点筛选
    if (query.approvalNodes && query.approvalNodes.length > 0) {
      filtered = filtered.filter((item) => query.approvalNodes!.includes(item.approvalNode));
    }

    // 提交日期筛选
    if (query.submitDate) {
      const targetDate = new Date(query.submitDate);
      const targetDateStr = targetDate.toDateString();
      filtered = filtered.filter(
        (item) => new Date(item.submitDate).toDateString() === targetDateStr
      );
    }

    return filtered;
  }

  /**
   * 获取分页后的数据 TODO: 从后端获取分页数据
   */
  private getPaginatedData(filteredData: ExpenseItem[]): ExpenseItem[] {
    const query = this.currentQuerySignal();
    const start = (query.page - 1) * query.pageSize;
    const end = start + query.pageSize;
    return filteredData.slice(start, end);
  }

  /**
   * 执行过滤和分页
   */
  private filterAndPaginateData(): void {
    this.loading.set(true);

    // 模拟异步加载
    setTimeout(() => {
      // 获取过滤后的数据
      const filteredData = this.getFilteredData();

      // 更新总记录数
      this.totalCount.set(filteredData.length);

      // 获取分页后的数据
      const paginatedData = this.getPaginatedData(filteredData);
      this.displayData.set(paginatedData);

      this.loading.set(false);
    }, 300);
  }

  /**
   * 加载数据（供外部调用）
   */
  private loadExpenses(): void {
    this.filterAndPaginateData();
  }

  // ========== 分页事件处理 ==========

  /**
   * 页码变化
   */
  onPageIndexChange(page: number): void {
    this.currentQuerySignal.update((query) => ({
      ...query,
      page,
    }));
    this.filterAndPaginateData();
  }

  /**
   * 每页条数变化
   */
  onPageSizeChange(pageSize: number): void {
    this.currentQuerySignal.update((query) => ({
      ...query,
      page: 1, // 改变每页条数时重置到第一页
      pageSize,
    }));
    this.filterAndPaginateData();
  }

  // ========== 表格事件处理 ==========

  handleSelectItem(item: ExpenseItem): void {
    this.selectedItemId.set(item.id);
    console.log('选中报销单:', item);
  }

  handleView(item: ExpenseItem): void {
    console.log('查看报销单:', item);
    if(item.expenseType==="expense"){
      this.router.navigate(['/expense/detail', item.id]);
    }else{
      this.router.navigate(['/travel-expense/detail', item.id]);
    }
    
    // TODO: 打开查看详情弹窗
  }

  handleExport(item: ExpenseItem): void {
    console.log('导出报销单:', item);
    // TODO: 导出报销单
  }

  // 获取当前页显示的数据（供模板使用）
  getCurrentPageData(): ExpenseItem[] {
    return this.displayData();
  }
}
