import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ISSUE_PRIORITY_OPTIONS } from '../../../../shared/constants/priority-options';
import { FilterBarComponent } from '../../../../shared/ui/filter-bar/filter-bar.component';
import { PageToolbarComponent } from '../../../../shared/ui/page-toolbar/page-toolbar.component';
import { SearchBoxComponent } from '../../../../shared/ui/search-box/search-box.component';
import { ViewToggleComponent } from '../../../../shared/ui/view-toggle/view-toggle.component';
import type { IssueListQuery } from '../../models/issue.model';
import { NzIconModule } from 'ng-zorro-antd/icon';

export type IssueListViewMode = 'list' | 'card';

@Component({
  selector: 'app-issue-filter-bar',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzSelectModule, NzIconModule, FilterBarComponent, PageToolbarComponent, SearchBoxComponent, ViewToggleComponent],
  template: `
    <app-page-toolbar>
      <button toolbar-primary nz-button nzType="primary" class="toolbar-create-btn" (click)="create.emit()">
        <nz-icon nzType="plus" nzTheme="outline" />
        新建 Issue
      </button>

      <app-filter-bar toolbar-filters class="issue-toolbar__main">
        <nz-select
          nzPlaceHolder="所有状态"
          class="toolbar-select"
          [ngModel]="draft().status"
          (ngModelChange)="updateField('status', $event)"
        >
          <nz-option nzLabel="所有状态" nzValue=""></nz-option>
          <nz-option nzLabel="待处理" nzValue="open"></nz-option>
          <nz-option nzLabel="进行中" nzValue="in_progress"></nz-option>
          <nz-option nzLabel="待验证" nzValue="resolved"></nz-option>
          <nz-option nzLabel="已验证" nzValue="verified"></nz-option>
          <nz-option nzLabel="已重开" nzValue="reopened"></nz-option>
          <nz-option nzLabel="已关闭" nzValue="closed"></nz-option>
        </nz-select>

        <nz-select
          nzPlaceHolder="所有优先级"
          class="toolbar-select"
          [ngModel]="draft().priority"
          (ngModelChange)="updateField('priority', $event)"
        >
          @for (item of priorityOptions; track item.value) {
            <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
          }
        </nz-select>

        <button nz-button class="toolbar-filter-btn" (click)="submit.emit(draft())">筛选</button>
      </app-filter-bar>

      <app-search-box
        toolbar-search
        class="toolbar-search"
        placeholder="搜索标题、编号或提报人"
        [value]="draft().keyword || ''"
        (valueChange)="updateField('keyword', $event)"
        (submitted)="submit.emit(draft())"
      />

      <app-view-toggle
        toolbar-actions
        [options]="viewOptions"
        [value]="viewMode()"
        (valueChange)="viewModeChange.emit($event)"
      />
    </app-page-toolbar>
  `,
  styles: [
    `
      .issue-toolbar__main {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .toolbar-search {
        min-width: min(240px, 100%);
        flex: 1 1 280px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueFilterBarComponent {
  readonly query = input.required<IssueListQuery>();
  readonly viewMode = input<IssueListViewMode>('list');
  readonly submit = output<IssueListQuery>();
  readonly create = output<void>();
  readonly viewModeChange = output<IssueListViewMode>();

  readonly priorityOptions = ISSUE_PRIORITY_OPTIONS;
  readonly viewOptions = [
    { value: 'list' as const, icon: 'unordered-list', ariaLabel: '列表视图' },
    { value: 'card' as const, icon: 'appstore', ariaLabel: '卡片视图' },
  ];
  readonly draft = signal<IssueListQuery>({
    page: 1,
    pageSize: 20,
    keyword: '',
    status: '',
    priority: '',
    projectId: '',
  });

  constructor() {
    effect(() => {
      this.draft.set({ ...this.query() });
    });
  }

  updateField<K extends keyof IssueListQuery>(key: K, value: IssueListQuery[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }
}
