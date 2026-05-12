import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

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

import { NzPaginationModule } from 'ng-zorro-antd/pagination';

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
  ],

  templateUrl: './approval-pending.html',

  styleUrls: ['./approval-pending.less'],

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalPending {
  // ==================== options ====================

  readonly expenseTypeOptions: SelectOption[] = [
    {
      label: '差旅费报销',
      value: 'travel',
    },

    {
      label: '费用报销',
      value: 'expense',
    },
  ];

  readonly approvalNodeOptions: SelectOption[] = [
    {
      label: '部门负责人',
      value: 'leader',
    },

    {
      label: '财务审核',
      value: 'finance',
    },

    {
      label: '总经理',
      value: 'gm',
    },
  ];

  readonly departmentOptions: SelectOption[] = [
    {
      label: '技术部',
      value: 'tech',
    },

    {
      label: '产品部',
      value: 'product',
    },
  ];

  // ==================== query ====================

  readonly currentQuery = signal<ApprovalFilterQuery>({
    page: 1,
    pageSize: 20,
    expenseTypes: [],
    approvalNodes: [],
    departments: [],
    amountRange: '',
    keyword: '',
  });

  // ==================== 状态 ====================

  readonly loading = signal(false);

  readonly totalCount = signal(0);

  readonly displayData = signal<any[]>([]);

  // ==================== dashboard ====================

  readonly dashboardStats = computed(() => ({
    pendingCount: 12,

    todayAddedCount: 6,

    approvedCount: 33,

    rejectedCount: 2,
  }));

  // ==================== active tags ====================

  readonly activeFilterTags = computed<ActiveFilterTag[]>(() => {
    const query = this.currentQuery();

    const tags: ActiveFilterTag[] = [];

    query.expenseTypes.forEach((item) => {
      tags.push({
        kind: 'expenseTypes',

        value: item,

        label: `类型: ${item}`,
      });
    });

    query.approvalNodes.forEach((item) => {
      tags.push({
        kind: 'approvalNodes',

        value: item,

        label: `节点: ${item}`,
      });
    });

    query.departments.forEach((item) => {
      tags.push({
        kind: 'departments',

        value: item,

        label: `部门: ${item}`,
      });
    });

    if (query.amountRange?.trim()) {
      tags.push({
        kind: 'amountRange',

        value: query.amountRange,

        label: `金额: ${query.amountRange}`,
      });
    }
    if (query.keyword?.trim()) {
      tags.push({
        kind: 'keyword',

        value: query.keyword,

        label: `关键词: ${query.keyword}`,
      });
    }

    return tags;
  });

  // ==================== filter ====================

  handleFilter(query: ApprovalFilterQuery): void {
    this.currentQuery.set({
      ...query,
      page: 1,
    });
console.log(query,'handleFilter');

    this.loadData();
  }

  resetFilters(): void {
    this.currentQuery.set({
      page: 1,
      pageSize: 20,
      expenseTypes: [],
      approvalNodes: [],
      departments: [],
      amountRange: '',
      keyword: '',
    });

    this.loadData();
  }

  onRemoveFilter(event: {
    kind: string;

    value: string;
  }): void {
    switch (event.kind) {
      case 'expenseTypes':
        this.currentQuery.update((query) => ({
          ...query,
          expenseTypes: query.expenseTypes.filter((v) => v !== event.value),
        }));

        break;

      case 'approvalNodes':
        this.currentQuery.update((query) => ({
          ...query,
          approvalNodes: query.approvalNodes.filter((v) => v !== event.value),
        }));

        break;
      case 'amountRange':
        this.currentQuery.update((query) => ({
          ...query,
          amountRange: '',
        }));

        break;
      case 'departments':
        this.currentQuery.update((query) => ({
          ...query,
          departments: query.departments.filter((v) => v !== event.value),
        }));

        break;
      case 'keyword':
        this.currentQuery.update((query) => ({
          ...query,
          keyword: '',
        }));
        break;
      default:
        break;
    }

    this.loadData();
  }

  // ==================== pagination ====================

  onPageChange(page: number): void {
    this.currentQuery.update((query) => ({
      ...query,

      page,
    }));

    this.loadData();
  }

  onPageSizeChange(pageSize: number): void {
    this.currentQuery.update((query) => ({
      ...query,

      page: 1,

      pageSize,
    }));

    this.loadData();
  }

  // ==================== request ====================

  private loadData(): void {
    this.loading.set(true);

    setTimeout(() => {
      this.totalCount.set(100);

      this.displayData.set([]);

      this.loading.set(false);
    }, 300);
  }
}
