import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { map } from 'rxjs';

import type { DepartmentEntity } from '@app/features/organization/models/organization.model';
import { OrganizationApiService } from '@app/features/organization/services/organization-api.service';
import type {
  ReimbursementClaimEntity,
  ReimbursementListQuery,
  ReimbursementListScope,
} from '@app/features/reimbursement/models/reimbursement.model';
import {
  ExpensesFilterBarComponent,
  SelectOption,
} from '@app/features/reimbursement/shared/components/expenses-filter-bar/expenses-filter-bar.component';
import { ExpensesListTableComponent } from '@app/features/reimbursement/shared/components/expenses-list-table/expenses-list-table.component';
import { ExpensesListStore } from '@app/features/reimbursement/stores/expenses-list.store';
import {
  ActiveFiltersBarComponent,
  ActiveFilterTag,
  ListStateComponent,
  PageHeaderComponent,
} from '@app/shared/ui';
import { ReimbursementDetailDrawerComponent } from '../../components/reimbursement-detail-drawer/reimbursement-detail-drawer.component';

@Component({
  selector: 'app-reimbursement-management-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    NzIconModule,
    NzPaginationModule,
    ExpensesFilterBarComponent,
    ActiveFiltersBarComponent,
    ExpensesListTableComponent,
    ListStateComponent,
    ReimbursementDetailDrawerComponent,
  ],
  templateUrl: './reimbursement-management-page.html',
  styleUrls: ['./reimbursement-management-page.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ExpensesListStore],
})
export class ReimbursementManagementPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly organizationApi = inject(OrganizationApiService);
  readonly store = inject(ExpensesListStore);
  private readonly detailQuery = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('detail'))), {
    initialValue: this.route.snapshot.queryParamMap.get('detail'),
  });

  readonly expenseTypeOptions: SelectOption[] = [
    { value: 'travel', label: '差旅费报销' },
    { value: 'general', label: '费用报销' },
  ];

  readonly statusOptions: SelectOption[] = [
    { value: 'draft', label: '草稿' },
    { value: 'submitted', label: '已提交' },
    { value: 'approving', label: '审批中' },
    { value: 'rejected', label: '已驳回' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
  ];

  readonly departmentOptions = signal<SelectOption[]>([]);
  readonly selectedClaimId = computed(() => this.detailQuery());
  readonly selectedClaim = computed<ReimbursementClaimEntity | null>(() => {
    const claimId = this.selectedClaimId();
    if (!claimId) {
      return null;
    }
    return this.store.displayData().find((item) => item.id === claimId) ?? null;
  });

  ngOnInit(): void {
    this.store.updateQuery({ scope: this.initialScope(), page: 1 });
    void this.store.loadClaims();
    this.loadDepartments();
  }

  private initialScope(): ReimbursementListScope {
    const scope = this.route.snapshot.queryParamMap.get('scope');
    return scope === 'todo' || scope === 'my' || scope === 'all' ? scope : 'all';
  }

  private loadDepartments(): void {
    this.organizationApi.listAllDepartments().subscribe({
      next: (items) => {
        this.departmentOptions.set(
          items.map((dept: DepartmentEntity) => ({
            value: dept.id,
            label: dept.name,
          }))
        );
      },
      error: () => {
        this.departmentOptions.set([]);
      },
    });
  }

  private getExpenseTypeLabel(value: string): string {
    return this.expenseTypeOptions.find((opt) => opt.value === value)?.label || value;
  }

  private getStatusLabel(value: string): string {
    return this.statusOptions.find((opt) => opt.value === value)?.label || value;
  }

  private getDepartmentLabel(value: string): string {
    return this.departmentOptions().find((opt) => opt.value === value)?.label || value;
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
      tags.push({
        kind: 'claimType',
        value: query.claimType,
        label: withPrefix('claimType', '类型', this.getExpenseTypeLabel(query.claimType)),
      });
    }

    if (query.status) {
      tags.push({
        kind: 'status',
        value: query.status,
        label: withPrefix('status', '状态', this.getStatusLabel(query.status)),
      });
    }

    if (query.departmentId) {
      tags.push({
        kind: 'departmentId',
        value: query.departmentId,
        label: withPrefix('departmentId', '部门', this.getDepartmentLabel(query.departmentId)),
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

  readonly activeFilterBarTags = computed(() =>
    this.activeFilterTags().map((tag) => ({
      ...tag,
      className: this.getFilterTagClass(tag.kind),
    }))
  );

  private getFilterTagClass(kind: string): string {
    const classMap: Record<string, string> = {
      claimType: 'filter-tag filter-tag--type',
      status: 'filter-tag filter-tag--status',
      departmentId: 'filter-tag filter-tag--dept',
      dateFrom: 'filter-tag filter-tag--date',
      dateTo: 'filter-tag filter-tag--date',
      keyword: 'filter-tag filter-tag--keyword',
    };
    return classMap[kind] || 'filter-tag';
  }

  async handleFilter(query: ReimbursementListQuery): Promise<void> {
    await this.store.filter({ ...query, scope: 'all' });
  }

  async handleReset(): Promise<void> {
    this.store.resetQuery();
    this.store.updateQuery({ scope: 'all' });
    await this.store.loadClaims();
  }

  async onActiveFilterRemove(event: { kind: string; value: string }): Promise<void> {
    await this.store.removeFilterTag(event.kind, event.value);
  }

  async onPageIndexChange(page: number): Promise<void> {
    await this.store.changePage(page);
  }

  async onPageSizeChange(pageSize: number): Promise<void> {
    await this.store.changePageSize(pageSize);
  }

  handleSelectItem(item: ReimbursementClaimEntity): void {
    this.openDetail(item);
  }

  handleView(item: ReimbursementClaimEntity): void {
    this.openDetail(item);
  }

  handleExport(item: ReimbursementClaimEntity): void {
    void item;
  }

  handleDrawerChanged(): void {
    void this.store.refresh();
  }

  openFullDetail(item: ReimbursementClaimEntity): void {
    void this.router.navigate(['/reimbursements', item.id], {
      queryParams: { source: 'management' },
    });
  }

  closeDetail(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { detail: null },
      queryParamsHandling: 'merge',
    });
  }

  private openDetail(item: ReimbursementClaimEntity): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { detail: item.id },
      queryParamsHandling: 'merge',
    });
  }
}
