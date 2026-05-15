import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import {
  ActiveFilterTag,
  ActiveFiltersBarComponent,
  ListStateComponent,
  PageHeaderComponent,
} from '@app/shared/ui';
import {
  ApprovalDashboardPanelComponent,
  ApprovalFilterBarComponent,
  ApprovalFilterQuery,
  SelectOption,
} from '../../components';
import { ApprovalListTableComponent } from '../../components/approval-list-table/approval-list-table';
import {
  ApprovalListItem,
  ApprovalNodeOptions,
  DepartmentOptions,
  ExpenseTypeOptions,
  MockApprovalList,
} from '../../models';

// 常量配置
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const LOADING_DELAY_MS = 300;

// 默认查询参数
const DEFAULT_QUERY: ApprovalFilterQuery = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  expenseTypes: [],
  approvalNodes: [],
  departments: [],
  amountRange: '',
  keyword: '',
};

// 映射表：用于删除筛选标签
type FilterKind = 'expenseTypes' | 'approvalNodes' | 'departments' | 'amountRange' | 'keyword';

@Component({
  selector: 'app-approval-pending',
  standalone: true,
  imports: [
    PageHeaderComponent,
    ApprovalDashboardPanelComponent,
    ApprovalFilterBarComponent,
    ActiveFiltersBarComponent,
    ListStateComponent,
    NzPaginationModule,
    ApprovalListTableComponent,
  ],
  templateUrl: './approval-pending.html',
  styleUrls: ['./approval-pending.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalPending {
  private router = inject(Router);
  
  // 公有配置项
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly departmentOptions: SelectOption[] = DepartmentOptions;
  readonly expenseTypeOptions: SelectOption[] = ExpenseTypeOptions;
  readonly approvalNodeOptions: SelectOption[] = ApprovalNodeOptions;

  // ==================== 状态管理 ====================
  readonly query = signal<ApprovalFilterQuery>(DEFAULT_QUERY);
  // 
  private readonly allData = signal<ApprovalListItem[]>(MockApprovalList);
  
  readonly loading = signal(false);
  
  // 派生状态：筛选后的数据
  private readonly filteredData = computed(() => {
    const data = this.allData();
    const q = this.query();
    console.log(this.applyFilters(data, q),'this.applyFilters(data, q)');
    
    return this.applyFilters(data, q);
  });
  
  // 派生状态：分页后的数据
  readonly displayData = computed(() => {
    const data = this.filteredData();
    const { page, pageSize } = this.query();
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
  });
  
  // 派生状态：总记录数
  readonly totalCount = computed(() => this.filteredData().length);

  // ==================== Dashboard 统计 ====================
  readonly dashboardStats = computed(() => ({
    pendingCount: 12,
    todayAddedCount: 6,
    approvedCount: 33,
    rejectedCount: 2,
  }));

  // ==================== 筛选标签 ====================
  readonly activeFilterTags = computed<ActiveFilterTag[]>(() => {
    const q = this.query();
    const tags: ActiveFilterTag[] = [];

    // 添加标签的辅助函数
    const addTags = (
      kind: FilterKind,
      values: string[],
      labelPrefix: string,
      getLabel: (value: string) => string
    ) => {
      values.forEach(value => {
        tags.push({
          kind,
          value,
          label: `${labelPrefix}: ${getLabel(value)}`,
        });
      });
    };

    // 报销类型
    addTags('expenseTypes', q.expenseTypes, '类型', this.getExpenseTypeLabel.bind(this));
    
    // 审批节点
    addTags('approvalNodes', q.approvalNodes, '节点', this.getApprovalNodeLabel.bind(this));
    
    // 部门
    addTags('departments', q.departments, '部门', this.getDepartmentLabel.bind(this));

    // 金额区间
    if (q.amountRange.trim()) {
      tags.push({
        kind: 'amountRange',
        value: q.amountRange,
        label: `金额: ${q.amountRange}`,
      });
    }

    // 关键词
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
  handleFilter(query: ApprovalFilterQuery): void {
    this.updateQuery({ ...query, page: 1 });
  }

  /**
   * 重置所有筛选条件
   */
  resetFilters(): void {
    this.updateQuery(DEFAULT_QUERY);
  }

  /**
   * 删除单个筛选标签
   */
  onRemoveFilter(event: { kind: string; value: string }): void {
    const updateMap: Record<FilterKind, (q: ApprovalFilterQuery) => ApprovalFilterQuery> = {
      expenseTypes: (q) => ({ ...q, expenseTypes: q.expenseTypes.filter(v => v !== event.value), page: 1 }),
      approvalNodes: (q) => ({ ...q, approvalNodes: q.approvalNodes.filter(v => v !== event.value), page: 1 }),
      departments: (q) => ({ ...q, departments: q.departments.filter(v => v !== event.value), page: 1 }),
      amountRange: (q) => ({ ...q, amountRange: '', page: 1 }),
      keyword: (q) => ({ ...q, keyword: '', page: 1 }),
    };

    const updater = updateMap[event.kind as FilterKind];
    if (updater) {
      this.updateQuery(updater(this.query()));
    }
  }

  /**
   * 页码变化
   */
  onPageIndexChange(page: number): void {
    this.updateQuery({ ...this.query(), page });
  }

  /**
   * 每页条数变化
   */
  onPageSizeChange(pageSize: number): void {
    this.updateQuery({ ...this.query(), page: 1, pageSize });
  }

  /**
   * 处理审批
   */
  handleApprove(item: ApprovalListItem): void {
    console.log('审批:', item);
    const detailPath = item.expenseType === 'travel' ? '/travel-expense/detail' : '/expense/detail';
    this.router.navigate([detailPath, item.id]);
  }

  // ==================== 私有方法 ====================
  
  /**
   * 更新查询参数并重新加载数据
   */
  private updateQuery(newQuery: ApprovalFilterQuery): void {
    console.log('更新查询参数:', newQuery);
    this.query.set(newQuery);
    this.loadData();
  }

  /**
   * 加载数据
   * TODO: 后续替换为真实的 API 调用
   */
  private loadData(): void {
    this.loading.set(true);
    
    // 模拟异步加载
    setTimeout(() => {
      // 这里直接使用 computed 会自动更新，无需手动处理
      // 但为了模拟加载效果，保留 loading 状态
      this.loading.set(false);
    }, LOADING_DELAY_MS);

    /**
     * TODO: 接口模式示例
     */
    // this.approvalService.getPendingList(this.query()).subscribe({
    //   next: (res) => {
    //     this.allData.set(res.list);
    //     this.loading.set(false);
    //   },
    //   error: () => {
    //     this.loading.set(false);
    //   },
    // });
  }

  /**
   * 应用筛选条件 TODO:后续删掉切换为接口模式
   */
  private applyFilters(data: ApprovalListItem[], query: ApprovalFilterQuery): ApprovalListItem[] {
    let result = [...data];

    // 报销类型筛选
    if (query.expenseTypes.length > 0) {
      result = result.filter(item => query.expenseTypes.includes(item.expenseType));
    }

    // 审批节点筛选
    if (query.approvalNodes.length > 0) {
      result = result.filter(item => query.approvalNodes.includes(item.approvalNode));
    }

    // 部门筛选
    if (query.departments.length > 0) {
      result = result.filter(item => query.departments.includes(item.department));
    }

    // 金额区间筛选
    if (query.amountRange.trim()) {
      const [min, max] = query.amountRange.split('-').map(v => Number(v.trim()));
      result = result.filter(item => {
        if (!isNaN(min) && item.amount < min) return false;
        if (!isNaN(max) && item.amount > max) return false;
        return true;
      });
    }

    // 关键词筛选
    if (query.keyword.trim()) {
      const keyword = query.keyword.trim().toLowerCase();
      result = result.filter(item =>
        item.code.toLowerCase().includes(keyword) ||
        item.applicant.toLowerCase().includes(keyword)
      );
    }

    return result;
  }

  /**
   * 判断是否是今天
   */
  private isToday(dateStr: string): boolean {
    if (!dateStr) return false;
    const today = new Date().toDateString();
    const date = new Date(dateStr).toDateString();
    return today === date;
  }

  /**
   * 获取报销类型名称
   */
  private getExpenseTypeLabel(value: string): string {
    return this.expenseTypeOptions.find(item => item.value === value)?.label || value;
  }

  /**
   * 获取审批节点名称
   */
  private getApprovalNodeLabel(value: string): string {
    return this.approvalNodeOptions.find(item => item.value === value)?.label || value;
  }

  /**
   * 获取部门名称
   */
  private getDepartmentLabel(value: string): string {
    return this.departmentOptions.find(item => item.value === value)?.label || value;
  }
}