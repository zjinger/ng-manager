import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
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
} from '@app/features/reimbursement/shared/components/expenses-filter-bar/expenses-filter-bar.component';
import { ExpensesListTableComponent } from '@app/features/reimbursement/shared/components/expenses-list-table/expenses-list-table.component';
import type {
  ReimbursementListQuery,
  ReimbursementClaimEntity,
} from '@app/features/reimbursement/models/reimbursement.model';
import { ExpensesListStore } from '@app/features/reimbursement/stores/expenses-list.store';
import { ReimbursementDetailDrawerComponent } from '@app/features/reimbursement/management/components/reimbursement-detail-drawer/reimbursement-detail-drawer.component';
import { ReimbursementRefreshBusService } from '@app/features/reimbursement/services/reimbursement-refresh-bus.service';

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
    ReimbursementDetailDrawerComponent,
  ],
  templateUrl: './expenses-list-page.html',
  styleUrls: ['./expenses-list-page.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ExpensesListStore],
})
export class ExpensesListPage implements OnInit {
  private router = inject(Router);
  private readonly reimbursementRefreshBus = inject(ReimbursementRefreshBusService);
  readonly store = inject(ExpensesListStore);

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

  readonly selectedClaimId = signal<string | null>(null);
  readonly selectedClaim = computed<ReimbursementClaimEntity | null>(() => {
    const claimId = this.selectedClaimId();
    if (!claimId) {
      return null;
    }
    return this.store.displayData().find((item) => item.id === claimId) ?? null;
  });

  constructor() {
    effect(() => {
      const event = this.reimbursementRefreshBus.event();
      if (event.version === 0 || event.source !== 'ws') {
        return;
      }
      void this.store.refresh();
    });
  }

  // ========== 生命周期 ==========

  ngOnInit(): void {
    // 我的报销页固定只加载当前登录用户提交的报销单
    void this.store.filter({ scope: 'my' });
  }

  // ========== 新建报销 ==========

  createTravelReport(): void {
    this.router.navigate(['/reimbursements/new/travel']);
  }

  createExpenseReport(): void {
    this.router.navigate(['/reimbursements/new/general']);
  }

  // ========== 激活标签相关 ==========

  private getExpenseTypeLabel(value: string): string {
    return this.expenseTypeOptions.find((opt) => opt.value === value)?.label || value;
  }

  private getStatusLabel(value: string): string {
    return this.statusOptions.find((opt) => opt.value === value)?.label || value;
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
      claimType: 'filter-tag filter-tag--type',
      status: 'filter-tag filter-tag--status',
      dateFrom: 'filter-tag filter-tag--date',
      dateTo: 'filter-tag filter-tag--date',
      keyword: 'filter-tag filter-tag--keyword',
    };
    return classMap[kind] || 'filter-tag';
  }

  // ========== 筛选事件处理 ==========

  async handleFilter(query: ReimbursementListQuery): Promise<void> {
    console.log('筛选条件:', query);
    await this.store.filter({
      ...query,
      scope: 'my',
      departmentId: undefined,
    });
  }

  async handleReset(): Promise<void> {
    console.log('清空所有筛选条件');
    await this.store.filter({
      page: 1,
      pageSize: this.store.currentPageSize(),
      scope: 'my',
      claimType: '',
      status: '',
      departmentId: undefined,
      keyword: '',
      dateFrom: undefined,
      dateTo: undefined,
    });
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
    this.openDetail(item);
  }

  handleView(item: ReimbursementClaimEntity): void {
    console.log('查看报销单:', item);
    this.openFullDetail(item);
  }

  openFullDetail(item: ReimbursementClaimEntity): void {
    void this.router.navigate(['/reimbursements', item.id], {
      queryParams: { source: 'mine' },
    });
  }

  closeDetail(): void {
    this.selectedClaimId.set(null);
  }

  handleDrawerChanged(): void {
    void this.store.refresh();
  }

  handleExport(item: ReimbursementClaimEntity): void {
    console.log('导出报销单:', item);
    // TODO: 导出报销单
  }

  private openDetail(item: ReimbursementClaimEntity): void {
    this.selectedClaimId.set(item.id);
  }
}
