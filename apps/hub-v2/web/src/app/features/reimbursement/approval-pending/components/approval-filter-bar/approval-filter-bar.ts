import {
  ChangeDetectionStrategy,
  Component,
  effect,
  untracked,
  input,
  output,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { FilterBarComponent, PageToolbarComponent } from '@shared/ui';

// ==================== 类型 ====================

export interface SelectOption {
  label: string;
  value: string;
}

/**
 * 审批筛选条件
 */
export interface ApprovalFilterQuery {
  page: number;

  pageSize: number;

  // 报销类型
  expenseTypes: string[];

  // 审批节点
  approvalNodes: string[];

  // 部门
  departments: string[];

  // 金额范围
  amountRange: string;

  // 搜索关键词（申请人 / 编号）
  keyword: string;
}

// ==================== 默认值 ====================

const DEFAULT_QUERY: ApprovalFilterQuery = {
  page: 1,
  pageSize: 20,
  expenseTypes: [],
  approvalNodes: [],
  departments: [],
  amountRange: '',
  keyword: '',
};

@Component({
  selector: 'app-approval-filter-bar',

  standalone: true,

  imports: [
    FormsModule,

    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,

    FilterBarComponent,
    PageToolbarComponent,
  ],

  template: `
    <app-page-toolbar>
      <app-filter-bar toolbar-filters class="approval-toolbar">
        <!-- 报销类型 -->
        <nz-select
          class="toolbar-field"
          nzMode="multiple"
          style="width: 280px;"
          nzPlaceHolder="报销类型"
          [nzMaxTagCount]="2"
          [nzAllowClear]="true"
          [ngModel]="draft().expenseTypes"
          (ngModelChange)="updateField('expenseTypes', $event)"
        >
          @for (item of expenseTypeOptions(); track item.value) {
          <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
          }
        </nz-select>

        <!-- 审批节点 -->
        <nz-select
          class="toolbar-field"
          nzMode="multiple"
          style="width: 280px;"
          nzPlaceHolder="审批节点"
          [nzMaxTagCount]="2"
          [nzAllowClear]="true"
          [ngModel]="draft().approvalNodes"
          (ngModelChange)="updateField('approvalNodes', $event)"
        >
          @for (item of approvalNodeOptions(); track item.value) {
          <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
          }
        </nz-select>

        <!-- 部门 -->
        <nz-select
          class="toolbar-field"
          nzMode="multiple"
          nzPlaceHolder="部门"
          style="width: 280px;"
          [nzMaxTagCount]="2"
          [nzAllowClear]="true"
          [ngModel]="draft().departments"
          (ngModelChange)="updateField('departments', $event)"
        >
          @for (item of departmentOptions(); track item.value) {
          <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
          }
        </nz-select>

        <!-- 金额区间 -->
        <div class="toolbar-search">
          <nz-input-group [nzPrefix]="moneyIcon">
            <input
              nz-input
              placeholder="金额区间，如：1000-5000"
              [ngModel]="draft().amountRange"
              (ngModelChange)="updateField('amountRange', $event)"
              (keyup.enter)="onSubmit()"
            />
          </nz-input-group>

          <ng-template #moneyIcon>
            <nz-icon nzType="account-book" nzTheme="outline" />
          </ng-template>
        </div>

        <!-- 搜索 -->
        <div class="toolbar-search">
          <nz-input-group [nzPrefix]="searchIcon">
            <input
              nz-input
              placeholder="搜索申请人或编号"
              [ngModel]="draft().keyword"
              (ngModelChange)="updateField('keyword', $event)"
              (keyup.enter)="onSubmit()"
            />
          </nz-input-group>

          <ng-template #searchIcon>
            <nz-icon nzType="search" nzTheme="outline" />
          </ng-template>
        </div>

        <!-- 操作 -->
        <div toolbar-actions class="toolbar-actions">
          <button nz-button nzType="primary" (click)="onSubmit()">
            <nz-icon nzType="search" />
            查询
          </button>

          <button nz-button nzType="default" (click)="onReset()">
            <nz-icon nzType="reload" />
            重置
          </button>
        </div>
      </app-filter-bar>
    </app-page-toolbar>
  `,

  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .approval-toolbar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
      }

      .toolbar-field {
        width: 240px;
      }

      .toolbar-search {
        width: 260px;
      }

      .toolbar-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      @media (max-width: 1200px) {
        .toolbar-field,
        .toolbar-search,
        .amount-range {
          width: 100%;
        }

        .toolbar-actions {
          width: 100%;
        }
      }
    `,
  ],

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalFilterBarComponent {
  // ==================== 输入 ====================

  readonly query = input<ApprovalFilterQuery>(structuredClone(DEFAULT_QUERY));

  readonly expenseTypeOptions = input<SelectOption[]>([]);

  readonly approvalNodeOptions = input<SelectOption[]>([]);

  readonly departmentOptions = input<SelectOption[]>([]);

  // ==================== 输出 ====================

  readonly submit = output<ApprovalFilterQuery>();

  // ==================== 状态 ====================

  readonly initialized = signal(false);

  readonly draft = signal<ApprovalFilterQuery>(structuredClone(DEFAULT_QUERY));

  // ==================== 生命周期 ====================

  constructor() {
    effect(() => {
      const query = this.query();

      untracked(() => {
        this.draft.set(structuredClone(query));
      });
    });
  }

  // ==================== 更新字段 ====================

  updateField<K extends keyof ApprovalFilterQuery>(key: K, value: ApprovalFilterQuery[K]): void {
    this.draft.update((draft) => ({
      ...draft,

      [key]: value,

      // 修改筛选项后回第一页
      page: key === 'page' || key === 'pageSize' ? draft.page : 1,
    }));
  }

  // ==================== 查询 ====================

  onSubmit(): void {
    this.submit.emit(this.draft());
  }

  // ==================== 重置 ====================

  onReset(): void {
    const resetQuery: ApprovalFilterQuery = {
      ...structuredClone(DEFAULT_QUERY),

      pageSize: this.draft().pageSize,
    };

    this.draft.set(resetQuery);

    this.submit.emit(resetQuery);
  }
}
