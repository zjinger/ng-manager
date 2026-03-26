import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { RD_STATUS_FILTER_OPTIONS } from '@shared/constants';
import { ISSUE_PRIORITY_OPTIONS } from '@shared/constants';
import { ViewToggleComponent, SearchBoxComponent, FilterBarComponent, PageToolbarComponent } from '@shared/ui';
import type { RdListQuery, RdStageEntity } from '../../models/rd.model';
import { NzIconModule } from 'ng-zorro-antd/icon';

export type RdViewMode = 'board' | 'list';

@Component({
  selector: 'app-rd-filter-bar',
  standalone: true,
  imports: [FormsModule, NzIconModule, NzButtonModule, NzSelectModule, FilterBarComponent, PageToolbarComponent, SearchBoxComponent, ViewToggleComponent],
  template: `
    <app-page-toolbar>
      <button toolbar-primary nz-button nzType="primary" class="toolbar-create-btn" (click)="create.emit()">
        <nz-icon nzType="plus" nzTheme="outline"/>
        新建研发项
      </button>

      <app-filter-bar toolbar-filters class="rd-toolbar__main">
        <nz-select
          nzPlaceHolder="所有阶段"
          class="toolbar-select"
          [ngModel]="draft().stageId"
          (ngModelChange)="updateField('stageId', $event)"
        >
          <nz-option nzLabel="所有阶段" nzValue=""></nz-option>
          @for (item of stages(); track item.id) {
            <nz-option [nzLabel]="item.name" [nzValue]="item.id"></nz-option>
          }
        </nz-select>

        <nz-select
          nzPlaceHolder="所有状态"
          class="toolbar-select"
          [ngModel]="draft().status"
          (ngModelChange)="updateField('status', $event)"
        >
          @for (item of statusOptions; track item.value) {
            <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
          }
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
        placeholder="搜索 RD 编号、标题或描述"
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
      .rd-toolbar__main {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .toolbar-search {
        min-width: 240px;
        max-width: 320px;
        flex: 0 0 clamp(240px, 28vw, 320px);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdFilterBarComponent {
  readonly query = input.required<RdListQuery>();
  readonly stages = input<RdStageEntity[]>([]);
  readonly viewMode = input<RdViewMode>('list');
  readonly submit = output<RdListQuery>();
  readonly create = output<void>();
  readonly viewModeChange = output<RdViewMode>();

  readonly priorityOptions = ISSUE_PRIORITY_OPTIONS;
  readonly statusOptions = RD_STATUS_FILTER_OPTIONS;
  readonly viewOptions = [
    { value: 'list' as const, icon: 'unordered-list', ariaLabel: '列表视图' },
    { value: 'board' as const, icon: 'appstore', ariaLabel: '看板视图' },
  ];
  readonly draft = signal<RdListQuery>({
    page: 1,
    pageSize: 20,
    keyword: '',
    projectId: '',
    stageId: '',
    status: '',
    type: '',
    priority: '',
  });

  constructor() {
    effect(() => {
      this.draft.set({ ...this.query() });
    });
  }

  updateField<K extends keyof RdListQuery>(key: K, value: RdListQuery[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }
}
