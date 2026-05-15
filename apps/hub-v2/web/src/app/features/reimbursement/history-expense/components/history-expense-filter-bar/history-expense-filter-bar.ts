import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { FilterBarComponent, PageToolbarComponent } from '@shared/ui';
import { HistoryExpenseFilterQuery, SelectOption } from '../../models';

// ==================== 常量定义 ====================

const DEFAULT_QUERY: HistoryExpenseFilterQuery = {
  page: 1,
  pageSize: 20,
  roleNodes: [],
  actionTypes: [],
  statuses: [],
  departments: [],
  date: null,
  keyword: '',
};

const FILTER_CONFIG = {
  FIELD_WIDTH: 240,
  SEARCH_WIDTH: 260,
  RESPONSIVE_BREAKPOINT: 1200,
  MAX_TAG_COUNT: 2,
} as const;

@Component({
  selector: 'app-history-expense-filter-bar',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzDatePickerModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    FilterBarComponent,
    PageToolbarComponent,
  ],
  template: `
    <app-page-toolbar>
      <app-filter-bar toolbar-filters class="history-toolbar">
        <!-- 角色节点 -->
        <nz-select
          class="toolbar-field"
          nzMode="multiple"
          nzPlaceHolder="角色节点"
          [nzMaxTagCount]="maxTagCount"
          [nzAllowClear]="true"
          [ngModel]="draft().roleNodes"
          (ngModelChange)="updateField('roleNodes', $event)"
        >
          @for (item of roleNodeOptions(); track item.value) {
            <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
          }
        </nz-select>

        <!-- 处理动作 -->
        <nz-select
          class="toolbar-field"
          nzMode="multiple"
          nzPlaceHolder="处理动作"
          [nzMaxTagCount]="maxTagCount"
          [nzAllowClear]="true"
          [ngModel]="draft().actionTypes"
          (ngModelChange)="updateField('actionTypes', $event)"
        >
          @for (item of actionTypeOptions(); track item.value) {
            <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
          }
        </nz-select>

        <!-- 当前状态 -->
        <nz-select
          class="toolbar-field"
          nzMode="multiple"
          nzPlaceHolder="当前状态"
          [nzMaxTagCount]="maxTagCount"
          [nzAllowClear]="true"
          [ngModel]="draft().statuses"
          (ngModelChange)="updateField('statuses', $event)"
        >
          @for (item of statusOptions(); track item.value) {
            <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
          }
        </nz-select>

        <!-- 部门 -->
        <nz-select
          class="toolbar-field"
          nzMode="multiple"
          nzPlaceHolder="部门"
          [nzMaxTagCount]="maxTagCount"
          [nzAllowClear]="true"
          [ngModel]="draft().departments"
          (ngModelChange)="updateField('departments', $event)"
        >
          @for (item of departmentOptions(); track item.value) {
            <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
          }
        </nz-select>

        <!-- 日期 -->
        <nz-date-picker
          class="toolbar-field"
          nzPlaceHolder="选择日期"
          [ngModel]="draft().date"
          (ngModelChange)="updateField('date', $event)"
        />

        <!-- 搜索 -->
        <div class="toolbar-search">
          <nz-input-group [nzPrefix]="searchIcon">
            <input
              nz-input
              placeholder="搜索单据编号、申请人"
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

      .history-toolbar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
      }

      .toolbar-field {
        width: ${FILTER_CONFIG.FIELD_WIDTH}px;
      }

      .toolbar-search {
        width: ${FILTER_CONFIG.SEARCH_WIDTH}px;
      }

      .toolbar-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      @media (max-width: ${FILTER_CONFIG.RESPONSIVE_BREAKPOINT}px) {
        .toolbar-field,
        .toolbar-search {
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
export class HistoryExpenseFilterBarComponent {
  // ==================== 配置属性 ====================
  
  readonly maxTagCount = FILTER_CONFIG.MAX_TAG_COUNT;

  // ==================== 输入 ====================

  /** 当前筛选条件 */
  readonly query = input<HistoryExpenseFilterQuery>(structuredClone(DEFAULT_QUERY));

  /** 角色节点选项 */
  readonly roleNodeOptions = input<SelectOption[]>([]);

  /** 处理动作选项 */
  readonly actionTypeOptions = input<SelectOption[]>([]);

  /** 当前状态选项 */
  readonly statusOptions = input<SelectOption[]>([]);

  /** 部门选项 */
  readonly departmentOptions = input<SelectOption[]>([]);

  // ==================== 输出 ====================

  /** 提交查询事件 */
  readonly submit = output<HistoryExpenseFilterQuery>();

  // ==================== 内部状态 ====================

  private readonly draftSignal = signal<HistoryExpenseFilterQuery>(structuredClone(DEFAULT_QUERY));
  
  /** 草稿状态（用于双向绑定） */
  readonly draft = this.draftSignal.asReadonly();

  // ==================== 生命周期 ====================

  constructor() {
    // 监听外部查询变化，同步到内部草稿
    effect(() => {
      const query = this.query();
      untracked(() => {
        this.draftSignal.set(structuredClone(query));
      });
    });
  }

  // ==================== 公开方法 ====================

  /**
   * 更新字段值
   * @param key - 字段名
   * @param value - 新值
   */
  updateField<K extends keyof HistoryExpenseFilterQuery>(
    key: K,
    value: HistoryExpenseFilterQuery[K]
  ): void {
    this.draftSignal.update((currentDraft) => {
      const shouldResetPage = !['page', 'pageSize'].includes(key as string);
      
      return {
        ...currentDraft,
        [key]: value,
        page: shouldResetPage ? 1 : currentDraft.page,
      };
    });
  }

  /** 提交查询 */
  onSubmit(): void {
    this.submit.emit(this.draftSignal());
  }

  /** 重置所有筛选条件 */
  onReset(): void {
    const resetQuery = {
      ...structuredClone(DEFAULT_QUERY),
      pageSize: this.draftSignal().pageSize, // 保留当前分页大小
    };
    this.draftSignal.set(resetQuery);
    this.submit.emit(resetQuery);
  }
}