import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { FilterBarComponent, PageToolbarComponent, SearchBoxComponent, ViewToggleComponent } from '@shared/ui';

export type ProjectViewMode = 'list' | 'card';

@Component({
  selector: 'app-project-filter-bar',
  standalone: true,
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
      <button
        toolbar-primary
        nz-button
        nzType="primary"
        class="toolbar-create-btn"
        (click)="create.emit()"
      >
        <nz-icon nzType="folder-add" nzTheme="outline" />
        新建项目
      </button>

      <app-filter-bar toolbar-filters class="project-toolbar__main">
        <nz-select
          nzPlaceHolder="全部状态"
          style="width: 150px"
          class="toolbar-select"
          [ngModel]="status()"
          (ngModelChange)="status.set($event)"
        >
          <nz-option nzLabel="全部状态" nzValue=""></nz-option>
          <nz-option nzLabel="活跃" nzValue="active"></nz-option>
          <nz-option nzLabel="归档" nzValue="inactive"></nz-option>
        </nz-select>

        <button nz-button class="toolbar-filter-btn" (click)="submit.emit(status())">筛选</button>
      </app-filter-bar>

      <app-search-box
        toolbar-search
        class="toolbar-search"
        placeholder="搜索项目名称、编号或 Key"
        [value]="keyword()"
        (valueChange)="keyword.set($event)"
        (submitted)="searchSubmitted.emit(keyword())"
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
      .project-toolbar__main {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .toolbar-search {
        min-width: 240px;
        max-width: 320px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectFilterBarComponent {
  readonly viewMode = input<ProjectViewMode>('list');
  readonly canCreate = input(true);
  readonly submit = output<string>();
  readonly reset = output<void>();
  readonly create = output<void>();
  readonly viewModeChange = output<ProjectViewMode>();
  readonly searchSubmitted = output<string>();

  readonly status = signal('');
  readonly keyword = signal('');

  readonly viewOptions = [
    { value: 'list' as const, icon: 'unordered-list', ariaLabel: '列表视图' },
    { value: 'card' as const, icon: 'appstore', ariaLabel: '卡片视图' },
  ];
}
