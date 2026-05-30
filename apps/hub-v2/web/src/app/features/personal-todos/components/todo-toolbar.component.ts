import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';

import {
  TODO_PRIORITY_OPTIONS,
  TODO_STATUS_OPTIONS,
  type TodoPriorityFilter,
  type TodoStatusFilter,
  type TodoTagFilter,
  type TodoTagEntity,
  type TodoViewMode,
} from '../models/todo.model';
import { FilterBarComponent, PageToolbarComponent, SearchBoxComponent, ViewToggleComponent } from '@shared/ui';

@Component({
  selector: 'app-todo-toolbar',
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzSelectModule,
    FilterBarComponent,
    PageToolbarComponent,
    SearchBoxComponent,
    ViewToggleComponent,
  ],
  template: `
    <app-page-toolbar>
      <div toolbar-primary class="todo-toolbar__primary">
        <button nz-button nzType="primary" class="toolbar-create-btn" (click)="create.emit()">
          <span nz-icon nzType="plus"></span>
          新建任务
        </button>
        <button nz-button nzType="default" (click)="manageTags.emit()">
          <span nz-icon nzType="tags"></span>
          管理标签
        </button>
      </div>

      <app-filter-bar toolbar-filters class="todo-toolbar__filters">
        <nz-select
          class="todo-toolbar__select"
          [ngModel]="statusFilter()"
          (ngModelChange)="statusFilterChange.emit($event)"
        >
          <nz-option nzLabel="全部状态" nzValue="all"></nz-option>
          @for (item of statusOptions; track item.value) {
            <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
          }
        </nz-select>
        <nz-select
          class="todo-toolbar__select"
          [ngModel]="priorityFilter()"
          (ngModelChange)="priorityFilterChange.emit($event)"
        >
          <nz-option nzLabel="全部优先级" nzValue="all"></nz-option>
          @for (item of priorityOptions; track item.value) {
            <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
          }
        </nz-select>
        <nz-select
          class="todo-toolbar__select"
          [ngModel]="tagFilter()"
          (ngModelChange)="tagFilterChange.emit($event)"
        >
          <nz-option nzLabel="全部标签" nzValue="all"></nz-option>
          @for (item of tags(); track item.id) {
            <nz-option [nzLabel]="item.name" [nzValue]="item.id"></nz-option>
          }
        </nz-select>
      </app-filter-bar>

      <app-search-box
        toolbar-search
        placeholder="搜索标题或描述"
        [value]="keyword()"
        (valueChange)="keywordChange.emit($event)"
      />

      <div toolbar-actions class="todo-toolbar__actions">
        <app-view-toggle [options]="viewOptions" [value]="viewMode()" (valueChange)="viewModeChange.emit($event)" />
      </div>
    </app-page-toolbar>
  `,
  styles: [
    `
      .todo-toolbar__primary,
      .todo-toolbar__filters,
      .todo-toolbar__actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .todo-toolbar__select {
        width: 150px;
      }

      @media (max-width: 640px) {
        .todo-toolbar__select {
          width: min(100%, 260px);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoToolbarComponent {
  readonly statusFilter = input.required<TodoStatusFilter>();
  readonly priorityFilter = input.required<TodoPriorityFilter>();
  readonly tagFilter = input.required<TodoTagFilter>();
  readonly keyword = input('');
  readonly viewMode = input.required<TodoViewMode>();
  readonly tags = input<TodoTagEntity[]>([]);

  readonly create = output<void>();
  readonly manageTags = output<void>();
  readonly statusFilterChange = output<TodoStatusFilter>();
  readonly priorityFilterChange = output<TodoPriorityFilter>();
  readonly tagFilterChange = output<TodoTagFilter>();
  readonly keywordChange = output<string>();
  readonly viewModeChange = output<TodoViewMode>();

  readonly statusOptions = TODO_STATUS_OPTIONS;
  readonly priorityOptions = TODO_PRIORITY_OPTIONS;
  readonly viewOptions = [
    { value: 'list' as const, icon: 'unordered-list', ariaLabel: '列表视图' },
    { value: 'board' as const, icon: 'appstore', ariaLabel: '看板视图' },
  ];
}
