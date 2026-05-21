import {
  ChangeDetectionStrategy,
  Component,
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
import { ReimbursementListQuery } from '@app/features/reimbursement/models/reimbursement.model';

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
      <div toolbar-primary class="toolbar-primary">
        <ng-content select="[toolbar-primary]"></ng-content>
      </div>

      <app-filter-bar toolbar-filters class="expenses-toolbar__main">
        <!-- 范围筛选 -->
        @if (showScopeFilter()) {
        <nz-select
          nzPlaceHolder="查看范围"
          style="width:150px"
          class="toolbar-select"
          [ngModel]="draft().scope"
          (ngModelChange)="updateField('scope', $event)"
          [nzAllowClear]="true"
        >
          <nz-option nzLabel="我的报销" nzValue="my"></nz-option>
          <nz-option nzLabel="全部报销" nzValue="all"></nz-option>
          <nz-option nzLabel="待审批" nzValue="todo"></nz-option>
        </nz-select>
        }

        <!-- 报销类型 -->
        <nz-select
          nzPlaceHolder="报销类型"
          style="width:160px"
          class="toolbar-select"
          [ngModel]="draft().claimType"
          (ngModelChange)="updateField('claimType', $event)"
          [nzAllowClear]="true"
        >
          @for (item of expenseTypeOptions(); track item.value) {
          <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
          }
        </nz-select>

        <!-- 报销状态 -->
        <nz-select
          nzPlaceHolder="报销状态"
          style="width:160px"
          class="toolbar-select"
          [ngModel]="draft().status"
          (ngModelChange)="updateField('status', $event)"
          [nzAllowClear]="true"
        >
          @for (item of statusOptions(); track item.value) {
          <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
          }
        </nz-select>

        <!-- 部门筛选 -->
        @if (showDepartmentFilter()) {
        <nz-select
          nzPlaceHolder="所属部门"
          style="width:180px"
          class="toolbar-select"
          [ngModel]="draft().departmentId"
          (ngModelChange)="updateField('departmentId', $event)"
          [nzAllowClear]="true"
          nzShowSearch
        >
          @for (item of departmentOptions(); track item.value) {
          <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
          }
        </nz-select>
        }

        <!-- 开始日期 -->
        <nz-date-picker
          style="width:160px"
          class="toolbar-datepicker"
          [ngModel]="draft().dateFrom"
          (ngModelChange)="updateField('dateFrom', $event ? $event.toISOString().split('T')[0] : null)"
          [nzAllowClear]="true"
          nzPlaceHolder="开始日期"
        ></nz-date-picker>

        <!-- 结束日期 -->
        <nz-date-picker
          style="width:160px"
          class="toolbar-datepicker"
          [ngModel]="draft().dateTo"
          (ngModelChange)="updateField('dateTo', $event ? $event.toISOString().split('T')[0] : null)"
          [nzAllowClear]="true"
          nzPlaceHolder="结束日期"
        ></nz-date-picker>

        <div class="toolbar-actions">
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

      <div toolbar-search class="toolbar-search-wrapper">
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

      .toolbar-primary {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        flex: 0 0 auto;
      }

      .toolbar-search-wrapper {
        width: 270px;
        min-width: 240px;
        max-width: 320px;
        flex: 0 0 auto;
      }

      .toolbar-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      @media (max-width: 1200px) {
        .expenses-toolbar__main {
          width: 100%;
        }
        .toolbar-search-wrapper {
          flex: 1;
          min-width: 200px;
          max-width: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesFilterBarComponent {
  // ========== 输入参数 ==========
  readonly query = input.required<ReimbursementListQuery>();
  readonly expenseTypeOptions = input<SelectOption[]>([]);
  readonly statusOptions = input<SelectOption[]>([]);
  readonly departmentOptions = input<SelectOption[]>([]);
  readonly showScopeFilter = input(true);
  readonly showDepartmentFilter = input(true);

  // ========== 输出事件 ==========
  readonly submit = output<ReimbursementListQuery>();
  readonly reset = output<void>();

  // ========== 内部状态 ==========
  readonly draft = signal<ReimbursementListQuery>({
    page: 1,
    pageSize: 20,
    scope: 'all',
    claimType: '',
    status: '',
    departmentId: undefined,
    keyword: '',
    dateFrom: undefined,
    dateTo: undefined,
  });

  constructor() {
    effect(() => {
      const externalQuery = this.query();
      if (externalQuery) {
        this.draft.set({
          page: externalQuery.page,
          pageSize: externalQuery.pageSize,
          scope: externalQuery.scope ?? 'all',
          claimType: externalQuery.claimType ?? '',
          status: externalQuery.status ?? '',
          departmentId: externalQuery.departmentId,
          keyword: externalQuery.keyword ?? '',
          dateFrom: externalQuery.dateFrom,
          dateTo: externalQuery.dateTo,
        });
      }
    });
  }

  updateField<K extends keyof ReimbursementListQuery>(key: K, value: ReimbursementListQuery[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  onFilter(): void {
    this.submit.emit(this.draft());
  }

  onReset(): void {
    this.draft.set({
      page: 1,
      pageSize: this.draft().pageSize,
      scope: 'all',
      claimType: '',
      status: '',
      departmentId: undefined,
      keyword: '',
      dateFrom: undefined,
      dateTo: undefined,
    });
    this.reset.emit();
  }
}
