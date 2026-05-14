import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  untracked,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { FilterBarComponent, PageToolbarComponent } from '@shared/ui';
import { NoticeFilterQuery, SelectOption } from '../../models/notice.model';

// ==================== 常量定义 ====================

const DEFAULT_QUERY: NoticeFilterQuery = {
  page: 1,
  pageSize: 20,
  noticeTypes: [],
  noticeStatuses: [],
  visibleScopes: [],
  date: null,
  keyword: '',
};

const FILTER_CONFIG = {
  SELECT_WIDTH: 220,
  SEARCH_WIDTH: 320,
  RESPONSIVE_BREAKPOINT: 1200,
  MAX_TAG_COUNT: 2,
} as const;

// ==================== 组件定义 ====================

@Component({
  selector: 'app-notice-filter-bar',
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
      <app-filter-bar toolbar-filters class="notice-toolbar">
        <!-- 公告类型 -->
        <nz-select
          class="toolbar-field"
          nzMode="multiple"
          nzPlaceHolder="公告类型"
          [nzMaxTagCount]="maxTagCount"
          [nzAllowClear]="true"
          [ngModel]="draft().noticeTypes"
          (ngModelChange)="updateField('noticeTypes', $event)"
        >
          @for (item of noticeTypeOptions(); track item.value) {
          <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
          }
        </nz-select>

        <!-- 公告状态 -->
        <nz-select
          class="toolbar-field"
          nzMode="multiple"
          nzPlaceHolder="公告状态"
          [nzMaxTagCount]="maxTagCount"
          [nzAllowClear]="true"
          [ngModel]="draft().noticeStatuses"
          (ngModelChange)="updateField('noticeStatuses', $event)"
        >
          @for (item of noticeStatusOptions(); track item.value) {
          <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
          }
        </nz-select>

        <!-- 可见范围 -->
        <nz-select
          class="toolbar-field"
          nzMode="multiple"
          nzPlaceHolder="可见范围"
          [nzMaxTagCount]="maxTagCount"
          [nzAllowClear]="true"
          [ngModel]="draft().visibleScopes"
          (ngModelChange)="updateField('visibleScopes', $event)"
        >
          @for (item of visibleScopeOptions(); track item.value) {
          <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
          }
        </nz-select>

        <!-- 日期 -->
        <nz-date-picker
          class="toolbar-field"
          nzPlaceHolder="发布日期"
          [ngModel]="draft().date"
          (ngModelChange)="updateField('date', $event)"
        />

        <!-- 搜索 -->
        <div class="toolbar-search">
          <nz-input-group [nzPrefix]="searchIcon">
            <input
              nz-input
              placeholder="标题 / 内容 / 发布人关键词"
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

      .notice-toolbar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
      }

      .toolbar-field {
        width: ${FILTER_CONFIG.SELECT_WIDTH}px;
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
export class NoticeFilterBarComponent {
  // ==================== 配置属性 ====================

  readonly maxTagCount = FILTER_CONFIG.MAX_TAG_COUNT;

  // ==================== 输入 ====================

  /** 当前筛选条件 */
  readonly query = input<NoticeFilterQuery>(structuredClone(DEFAULT_QUERY));

  /** 公告类型选项 */
  readonly noticeTypeOptions = input<SelectOption[]>([]);

  /** 公告状态选项 */
  readonly noticeStatusOptions = input<SelectOption[]>([]);

  /** 可见范围选项 */
  readonly visibleScopeOptions = input<SelectOption[]>([]);

  // ==================== 输出 ====================

  /** 点击查询 */
  readonly submit = output<NoticeFilterQuery>();

  // ==================== 内部状态 ====================

  private readonly draftSignal = signal<NoticeFilterQuery>(structuredClone(DEFAULT_QUERY));

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
  updateField<K extends keyof NoticeFilterQuery>(key: K, value: NoticeFilterQuery[K]): void {
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
