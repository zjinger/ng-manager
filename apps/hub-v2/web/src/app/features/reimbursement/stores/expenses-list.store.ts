import { computed, inject, Injectable, signal } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ReimbursementApiService } from '../services/reimbursement-api.service';
import type {
  ReimbursementListQuery,
  ReimbursementClaimEntity,
  ReimbursementClaimListResult,
} from '../models/reimbursement.model';

export interface ReimbursementListState {
  /** 报销单列表数据 */
  claims: ReimbursementClaimEntity[];
  /** 总记录数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 加载状态 */
  loading: boolean;
  /** 当前查询条件 */
  query: ReimbursementListQuery;
}

const DEFAULT_QUERY: ReimbursementListQuery = {
  page: 1,
  pageSize: 20,
  scope: 'all',
  claimType: '',
  status: '',
  departmentId: undefined,
  keyword: '',
  dateFrom: undefined,
  dateTo: undefined,
};

const DEFAULT_STATE: ReimbursementListState = {
  claims: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  query: { ...DEFAULT_QUERY },
};

@Injectable()
export class ExpensesListStore {
  private readonly reimbursementApi = inject(ReimbursementApiService);
  private readonly message = inject(NzMessageService);

  // =========================
  // State
  // =========================

  /** 报销单列表数据 */
  private readonly claimsState = signal<ReimbursementClaimEntity[]>([]);

  /** 总记录数 */
  private readonly totalState = signal<number>(0);

  /** 当前页码 */
  private readonly pageState = signal<number>(1);

  /** 每页条数 */
  private readonly pageSizeState = signal<number>(20);

  /** 加载状态 */
  private readonly loadingState = signal<boolean>(false);

  /** 当前查询条件 */
  private readonly queryState = signal<ReimbursementListQuery>({ ...DEFAULT_QUERY });

  // =========================
  // Public Selectors
  // =========================

  /** 报销单列表 */
  readonly claims = computed(() => this.claimsState());

  /** 总记录数 */
  readonly total = computed(() => this.totalState());

  /** 当前页码 */
  readonly page = computed(() => this.pageState());

  /** 每页条数 */
  readonly pageSize = computed(() => this.pageSizeState());

  /** 加载中 */
  readonly loading = computed(() => this.loadingState());

  /** 当前查询条件 */
  readonly currentQuery = computed(() => this.queryState());

  /** 显示数据（直接使用 claims） */
  readonly displayData = computed(() => this.claimsState());

  /** 总记录数（别名） */
  readonly totalCount = computed(() => this.totalState());

  /** 当前页码（别名） */
  readonly currentPage = computed(() => this.pageState());

  /** 每页条数（别名） */
  readonly currentPageSize = computed(() => this.pageSizeState());

  /** 加载中（别名） */
  readonly isLoading = computed(() => this.loadingState());

  /** 是否为空 */
  readonly isEmpty = computed(() => this.claimsState().length === 0 && !this.loadingState());

  /** 是否有数据 */
  readonly hasData = computed(() => this.claimsState().length > 0);

  // =========================
  // Actions
  // =========================

  /**
   * 更新查询条件
   */
  updateQuery(query: Partial<ReimbursementListQuery>): void {
    const newQuery = {
      ...this.queryState(),
      ...query,
      page: query.page !== undefined ? query.page : 1,
    };

    this.queryState.set(newQuery);
    this.pageState.set(newQuery.page || 1);
    this.pageSizeState.set(newQuery.pageSize || 20);
  }

  /**
   * 重置查询条件
   */
  resetQuery(): void {
    this.queryState.set({ ...DEFAULT_QUERY, pageSize: this.pageSizeState() });
    this.pageState.set(1);
  }

  /**
   * 加载报销列表
   */
  loadClaims(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingState.set(true);
      const query = this.queryState();

      this.reimbursementApi.listClaims(query).subscribe({
        next: (result: ReimbursementClaimListResult) => {
          this.claimsState.set(result.items || []);
          this.totalState.set(result.total || 0);
          this.pageState.set(result.page || 1);
          this.pageSizeState.set(result.pageSize || 20);
          this.loadingState.set(false);
          resolve();
        },
        error: (error) => {
          console.error('加载报销列表失败:', error);
          this.message.error('加载报销列表失败，请稍后重试');
          this.claimsState.set([]);
          this.totalState.set(0);
          this.loadingState.set(false);
          reject(error);
        },
      });
    });
  }

  /**
   * 筛选
   */
  filter(query: Partial<ReimbursementListQuery>): Promise<void> {
    this.updateQuery({ ...query, page: 1 });
    return this.loadClaims();
  }

  /**
   * 清空筛选
   */
  clearFilter(): Promise<void> {
    this.resetQuery();
    return this.loadClaims();
  }

  /**
   * 分页变化
   */
  changePage(page: number): Promise<void> {
    this.updateQuery({ page });
    return this.loadClaims();
  }

  /**
   * 每页条数变化
   */
  changePageSize(pageSize: number): Promise<void> {
    this.updateQuery({ page: 1, pageSize });
    return this.loadClaims();
  }

  /**
   * 刷新列表
   */
  refresh(): Promise<void> {
    return this.loadClaims();
  }

  /**
   * 删除筛选标签
   */
  removeFilterTag(kind: string, value: string): Promise<void> {
    const currentQuery = this.queryState();
    const updates: Partial<ReimbursementListQuery> = { page: 1 };

    switch (kind) {
      case 'scope':
        updates.scope = 'my';
        break;
      case 'claimType':
        updates.claimType = '';
        break;
      case 'status':
        updates.status = '';
        break;
      case 'departmentId':
        updates.departmentId = undefined;
        break;
      case 'dateFrom':
        updates.dateFrom = undefined;
        break;
      case 'dateTo':
        updates.dateTo = undefined;
        break;
      case 'keyword':
        updates.keyword = '';
        break;
    }

    this.updateQuery(updates);
    return this.loadClaims();
  }
}
