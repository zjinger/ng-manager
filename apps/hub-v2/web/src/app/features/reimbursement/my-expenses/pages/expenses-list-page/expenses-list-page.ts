import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import {
  ActiveFiltersBarComponent,
  PageHeaderComponent,
  ActiveFilterTag,
  ListStateComponent,
} from '@app/shared/ui';
import {
  ExpensesFilterBarComponent,
  SelectOption,
} from '../../components/expenses-filter-bar/expenses-filter-bar.component';
import { ExpensesListTableComponent } from '../../components/expenses-list-table/expenses-list-table.component';
import type {
  ReimbursementListQuery,
  ReimbursementClaimEntity,
} from '@app/features/reimbursement/models/reimbursement.model';
import { ExpensesListStore } from '@app/features/reimbursement/stores/expenses-list.store';
import { OrganizationApiService } from '@app/features/organization/services/organization-api.service';
import { DepartmentEntity } from '@app/features/organization/models/organization.model';

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
  providers: [ExpensesListStore],
})
export class ExpensesListPage implements OnInit {
  private router = inject(Router);
  readonly store = inject(ExpensesListStore);
  private organizationApi = inject(OrganizationApiService);

  // ========== 配置数据 ==========

  expenseTypeOptions: SelectOption[] = [
    { value: 'travel', label: '差旅费报销' },
    { value: 'general', label: '费用报销' },
  ];

  statusOptions: SelectOption[] = [
    { value: 'draft', label: '草稿' },
    { value: 'submitted', label: '已提交' },
    { value: 'approving', label: '审批中' },
    { value: 'rejected', label: '已驳回' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
  ];

  departmentOptions = signal<SelectOption[]>([]);

  // ========== 生命周期 ==========

  ngOnInit(): void {
    // 初始化加载数据
    this.store.loadClaims();
    // 加载部门数据
    this.loadDepartments();
  }
  // 加载部门数据
  private loadDepartments(): void {
    this.organizationApi.listAllDepartments().subscribe({
      next: (items) => {
        const options = items.map((dept: DepartmentEntity) => ({
          value: dept.id,
          label: dept.name,
        }));
        this.departmentOptions.set(options);
      },
      error: () => {
        this.departmentOptions.set([]);
        // 可选：显示错误提示
        console.error('加载部门列表失败');
      },
    });
  }

  // ========== 新建报销 ==========

  createTravelReport(): void {
    this.router.navigate(['/travel-expense/new']);
  }

  createExpenseReport(): void {
    this.router.navigate(['/expense/new']);
  }

  // ========== 激活标签相关 ==========

  private getExpenseTypeLabel(value: string): string {
    return this.expenseTypeOptions.find((opt) => opt.value === value)?.label || value;
  }

  private getStatusLabel(value: string): string {
    return this.statusOptions.find((opt) => opt.value === value)?.label || value;
  }

  private getDepartmentLabel(value: string): string {
    return this.departmentOptions().find((opt) => opt.value === value)?.label || value;
  }

  private getScopeLabel(value: string): string {
    const labelMap: Record<string, string> = {
      my: '我的报销',
      all: '全部报销',
      todo: '待审批',
    };
    return labelMap[value] || value;
  }

  readonly activeFilterTags = computed(() => {
    const query = this.store.currentQuery();
    const firstSeen = new Set<string>();

    const withPrefix = (group: string, prefix: string, valueLabel: string) => {
      const first = !firstSeen.has(group);
      if (first) {
        firstSeen.add(group);
      }
      return first ? `${prefix}: ${valueLabel}` : valueLabel;
    };

    const tags: ActiveFilterTag[] = [];

    // 范围筛选（只显示非默认值）
    if (query.scope && query.scope !== 'all') {
      const scopeLabel = this.getScopeLabel(query.scope);
      tags.push({
        kind: 'scope',
        value: query.scope,
        label: withPrefix('scope', '范围', scopeLabel),
      });
    }

    if (query.claimType) {
      const label = this.getExpenseTypeLabel(query.claimType);
      tags.push({
        kind: 'claimType',
        value: query.claimType,
        label: withPrefix('claimType', '类型', label),
      });
    }

    if (query.status) {
      const label = this.getStatusLabel(query.status);
      tags.push({
        kind: 'status',
        value: query.status,
        label: withPrefix('status', '状态', label),
      });
    }

    if (query.departmentId) {
      const label = this.getDepartmentLabel(query.departmentId);
      tags.push({
        kind: 'departmentId',
        value: query.departmentId,
        label: withPrefix('departmentId', '部门', label),
      });
    }

    if (query.dateFrom) {
      tags.push({
        kind: 'dateFrom',
        value: query.dateFrom,
        label: withPrefix('dateFrom', '开始日期', query.dateFrom),
      });
    }

    if (query.dateTo) {
      tags.push({
        kind: 'dateTo',
        value: query.dateTo,
        label: withPrefix('dateTo', '结束日期', query.dateTo),
      });
    }

    if (query.keyword) {
      tags.push({
        kind: 'keyword',
        value: query.keyword,
        label: withPrefix('keyword', '关键词', query.keyword),
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

  private getFilterTagClass(kind: string): string {
    const classMap: Record<string, string> = {
      scope: 'filter-tag filter-tag--scope',
      claimType: 'filter-tag filter-tag--type',
      status: 'filter-tag filter-tag--status',
      departmentId: 'filter-tag filter-tag--dept',
      dateFrom: 'filter-tag filter-tag--date',
      dateTo: 'filter-tag filter-tag--date',
      keyword: 'filter-tag filter-tag--keyword',
    };
    return classMap[kind] || 'filter-tag';
  }

  // ========== 筛选事件处理 ==========

  async handleFilter(query: ReimbursementListQuery): Promise<void> {
    console.log('筛选条件:', query);
    await this.store.filter(query);
  }

  async handleReset(): Promise<void> {
    console.log('清空所有筛选条件');
    await this.store.clearFilter();
  }

  async onActiveFilterRemove(event: { kind: string; value: string }): Promise<void> {
    await this.store.removeFilterTag(event.kind, event.value);
  }

  // ========== 分页事件处理 ==========

  async onPageIndexChange(page: number): Promise<void> {
    await this.store.changePage(page);
  }

  async onPageSizeChange(pageSize: number): Promise<void> {
    await this.store.changePageSize(pageSize);
  }

  // ========== 表格事件处理 ==========

  handleSelectItem(item: ReimbursementClaimEntity): void {
    console.log('选中报销单:', item);
  }

  handleView(item: ReimbursementClaimEntity): void {
    console.log('查看报销单:', item);
    if (item.claimType === 'general') {
      this.router.navigate(['/expense/detail', item.id]);
    } else {
      this.router.navigate(['/travel-expense/detail', item.id]);
    }
  }

  handleExport(item: ReimbursementClaimEntity): void {
    console.log('导出报销单:', item);
    // TODO: 导出报销单
  }
}
