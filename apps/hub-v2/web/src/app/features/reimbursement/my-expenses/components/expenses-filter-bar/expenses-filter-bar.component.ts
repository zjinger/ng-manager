import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { FilterBarComponent, PageToolbarComponent } from '@shared/ui';

// 定义筛选条件类型
export interface ExpensesFilterQuery {
  page: number;
  pageSize: number;
  keyword: string; // 搜索编号/事由
  expenseTypes: string[]; // 报销类型（多选）
  statuses: string[]; // 报销状态（多选）
  approvalNodes: string[]; // 审批节点（多选）
  submitDate: Date | null; // 提交日期（单个日期）
}

// 选项配置类型
export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-expenses-filter-bar',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzSelectModule,
    NzInputModule,
    NzDatePickerModule,
    FilterBarComponent,
    PageToolbarComponent,
  ],
  template: `
    <app-page-toolbar>
      <app-filter-bar toolbar-filters class="expenses-toolbar__main">
        <!-- 报销类型（多选） -->
        <nz-select
          nzPlaceHolder="报销类型，支持多选"
          style="width:270px"
          class="toolbar-select"
          [ngModel]="draft().expenseTypes"
          (ngModelChange)="updateField('expenseTypes', $event)"
          nzMode="multiple"
          [nzMaxTagCount]="2"
          [nzAllowClear]="true"
        >
          @for (item of expenseTypeOptions(); track item.value) {
          <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
          }
        </nz-select>

        <!-- 报销状态（多选） -->
        <nz-select
          nzPlaceHolder="报销状态，支持多选"
          style="width:270px"
          class="toolbar-select"
          [ngModel]="draft().statuses"
          (ngModelChange)="updateField('statuses', $event)"
          nzMode="multiple"
          [nzMaxTagCount]="2"
          [nzAllowClear]="true"
        >
          @for (item of statusOptions(); track item.value) {
          <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
          }
        </nz-select>

        <!-- 审批节点（多选） -->
        <nz-select
          nzPlaceHolder="审批节点，支持多选"
          style="width:270px"
          class="toolbar-select"
          [ngModel]="draft().approvalNodes"
          (ngModelChange)="updateField('approvalNodes', $event)"
          nzMode="multiple"
          [nzMaxTagCount]="2"
          [nzAllowClear]="true"
        >
          @for (item of approvalNodeOptions(); track item.value) {
          <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
          }
        </nz-select>

        <!-- 提交日期选择（单个日期） -->
        <nz-date-picker
          style="width:270px"
          class="toolbar-datepicker"
          [ngModel]="draft().submitDate"
          (ngModelChange)="updateField('submitDate', $event)"
          [nzAllowClear]="true"
          nzPlaceHolder="提交日期"
        ></nz-date-picker>
        <!-- 搜索框：编号/事由（使用 NzInput） -->
        <div style="width:270px" class="toolbar-datepicker">
          <nz-input-group [nzPrefix]="searchIcon">
            <input
              nz-input
              placeholder="搜索报销单编号或事由"
              [ngModel]="draft().keyword"
              (ngModelChange)="updateField('keyword', $event)"
              (keyup.enter)="onFilter()"
            />
          </nz-input-group>
          <ng-template #searchIcon>
            <nz-icon nzType="search" nzTheme="outline" />
          </ng-template>
        </div>
        <div toolbar-actions class="toolbar-actions">
          <!-- 按钮组 -->
          <button nz-button nzType="default" (click)="onFilter()">
            <nz-icon nzType="search" nzTheme="outline" />
            筛选
          </button>
          <button nz-button nzType="default" (click)="onReset()">
            <nz-icon nzType="reload" nzTheme="outline" />
            清空
          </button>
        </div>
      </app-filter-bar>
    </app-page-toolbar>
  `,
  styles: [
    `
      .expenses-toolbar__main {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .toolbar-search-wrapper {
        min-width: 240px;
        max-width: 320px;
        flex: 0 0 auto;
      }

      .toolbar-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .toolbar-select,
      .toolbar-datepicker {
        width: auto;
      }

      /* 响应式布局 */
      @media (max-width: 1200px) {
        .expenses-toolbar__main {
          width: 100%;
        }

        .toolbar-search-wrapper {
          flex: 1;
          min-width: 200px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesFilterBarComponent {
  // ========== 输入参数 ==========
  // 筛选条件（来自父组件）
  readonly query = input.required<ExpensesFilterQuery>();

  // 下拉选项配置（从父组件传入，支持动态配置）
  readonly expenseTypeOptions = input<SelectOption[]>([]);
  readonly statusOptions = input<SelectOption[]>([]);
  readonly approvalNodeOptions = input<SelectOption[]>([]);

  // ========== 输出事件 ==========
  readonly submit = output<ExpensesFilterQuery>(); // 筛选事件
  readonly reset = output<void>(); // 清空事件
  readonly create = output<void>(); // 新建事件

  // ========== 内部状态 ==========
  // 草稿状态（用户正在编辑的筛选条件）
  readonly draft = signal<ExpensesFilterQuery>({
    page: 1,
    pageSize: 20,
    keyword: '',
    expenseTypes: [],
    statuses: [],
    approvalNodes: [],
    submitDate: null,
  });

  // ========== 生命周期 ==========
  constructor() {
    // 监听外部 query 变化，同步到草稿
    effect(() => {
      const externalQuery = this.query();
      if (externalQuery) {
        this.draft.set({
          page: externalQuery.page,
          pageSize: externalQuery.pageSize,
          keyword: externalQuery.keyword || '',
          expenseTypes: externalQuery.expenseTypes || [],
          statuses: externalQuery.statuses || [],
          approvalNodes: externalQuery.approvalNodes || [],
          submitDate: externalQuery.submitDate || null,
        });
      }
    });
  }

  // ========== 公共方法 ==========

  /**
   * 更新草稿中的字段
   */
  updateField<K extends keyof ExpensesFilterQuery>(key: K, value: ExpensesFilterQuery[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  /**
   * 筛选按钮点击
   */
  onFilter(): void {
    this.submit.emit(this.draft());
  }

  /**
   * 清空所有筛选条件
   */
  onReset(): void {
    // 重置草稿
    this.draft.set({
      page: 1,
      pageSize: this.draft().pageSize, // 保留 pageSize
      keyword: '',
      expenseTypes: [],
      statuses: [],
      approvalNodes: [],
      submitDate: null,
    });

    // 通知父组件
    this.reset.emit();
  }

  /**
   * 获取当前筛选条件（供父组件使用）
   */
  getCurrentFilters(): ExpensesFilterQuery {
    return this.draft();
  }
}
