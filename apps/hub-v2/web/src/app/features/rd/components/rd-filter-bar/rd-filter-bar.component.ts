import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { RD_STATUS_FILTER_OPTIONS } from '@shared/constants';
import { ISSUE_PRIORITY_OPTIONS } from '@shared/constants';
import { ViewToggleComponent, SearchBoxComponent, FilterBarComponent, PageToolbarComponent } from '@shared/ui';
import { RD_TYPE_OPTIONS, type RdListQuery, type RdStageEntity } from '../../models/rd.model';
import { NzIconModule } from 'ng-zorro-antd/icon';
import type { ProjectMemberEntity } from '@features/projects/models/project.model';

export type RdViewMode = 'board' | 'list';

@Component({
  selector: 'app-rd-filter-bar',
  standalone: true,
  imports: [FormsModule, NzIconModule, NzButtonModule, NzDrawerModule, NzSelectModule, FilterBarComponent, PageToolbarComponent, SearchBoxComponent, ViewToggleComponent],
  template: `
    <app-page-toolbar>
      @if(canCreate()){
        <button toolbar-primary nz-button nzType="primary" class="toolbar-create-btn" (click)="create.emit()">
          <nz-icon nzType="plus" nzTheme="outline"/>
          新建研发项
        </button>
      }

      <app-filter-bar toolbar-filters class="rd-toolbar__main">
        @if(stages().length > 0){
        <nz-select
          nzPlaceHolder="阶段，支持多选"
          style="width:270px"
          class="toolbar-select"
          [ngModel]="draft().stageIds"
          (ngModelChange)="updateField('stageIds', $event)"
          nzMode="multiple"
          [nzMaxTagCount]="2"
          [nzAllowClear]="true"
        >
          @for (item of stages(); track item.id) {
            <nz-option [nzLabel]="item.name" [nzValue]="item.id"></nz-option>
          }
        </nz-select>
        }
        <nz-select
          nzPlaceHolder="状态，支持多选"
          style="width:250px"
          class="toolbar-select"
          [ngModel]="draft().status"
          (ngModelChange)="updateField('status', $event)"
          nzMode="multiple"
          [nzMaxTagCount]="2"
          [nzAllowClear]="true"
        >
          @for (item of statusOptions; track item.value) {
            @if (item.value !== '') {
              <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
            }
          }
        </nz-select>
        <nz-select
          nzPlaceHolder="优先级，支持多选"
          style="width:240px"
          class="toolbar-select"
          [ngModel]="draft().priority"
          (ngModelChange)="updateField('priority', $event)"
          nzMode="multiple"
          [nzMaxTagCount]="3"
          [nzAllowClear]="true"
        >
          @for (item of priorityOptions; track item.value) {
            @if (item.value !== '') {
              <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
            }
          }
        </nz-select>
        <nz-select
          nzPlaceHolder="执行人，支持多选"
          style="width:230px"
          class="toolbar-select"
          [ngModel]="draft().assigneeIds"
          (ngModelChange)="updateField('assigneeIds', $event)"
          nzMode="multiple"
          [nzMaxTagCount]="2"
          [nzAllowClear]="true"
        >
          @for (member of sortedMembers(); track member.userId) {
            <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
          }
        </nz-select>
        <button nz-button class="toolbar-filter-btn" (click)="submit.emit(draft())">筛选</button>
        <button nz-button class="toolbar-filter-btn" (click)="advancedOpen.set(true)">高级筛选</button>
        <button nz-button class="toolbar-filter-btn" (click)="reset.emit()">清空</button>
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

    <nz-drawer
      [nzVisible]="advancedOpen()"
      nzPlacement="right"
      [nzClosable]="true"
      [nzWidth]="420"
      nzTitle="高级筛选"
      (nzOnClose)="advancedOpen.set(false)"
    >
      <ng-template nzDrawerContent>
        <div class="advanced-panel">
          <div class="advanced-field">
            <label>研发类型</label>
            <nz-select
              nzMode="multiple"
              nzPlaceHolder="选择研发类型"
              [nzAllowClear]="true"
              [ngModel]="draft().type"
              (ngModelChange)="updateField('type', $event)"
            >
              @for (item of typeOptions; track item.value) {
                <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
              }
            </nz-select>
          </div>
          <div class="advanced-field">
            <label>排序字段</label>
            <nz-select [ngModel]="draft().sortBy" (ngModelChange)="updateField('sortBy', $event)">
              <nz-option nzLabel="创建时间" nzValue="createdAt"></nz-option>
              <nz-option nzLabel="更新时间" nzValue="updatedAt"></nz-option>
            </nz-select>
          </div>
          <div class="advanced-field">
            <label>排序方向</label>
            <nz-select [ngModel]="draft().sortOrder" (ngModelChange)="updateField('sortOrder', $event)">
              <nz-option nzLabel="倒序（新到旧）" nzValue="desc"></nz-option>
              <nz-option nzLabel="正序（旧到新）" nzValue="asc"></nz-option>
            </nz-select>
          </div>
          <div class="advanced-actions">
            <button nz-button (click)="clearAdvanced()">重置</button>
            <button nz-button nzType="primary" (click)="applyAdvanced()">应用筛选</button>
          </div>
        </div>
      </ng-template>
    </nz-drawer>
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
        // flex: 0 0 clamp(240px, 28vw, 320px);
      }
      .advanced-panel {
        display: grid;
        gap: 14px;
      }
      .advanced-field {
        display: grid;
        gap: 8px;
      }
      .advanced-field label {
        font-size: 13px;
        color: var(--text-secondary);
      }
      .advanced-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 6px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdFilterBarComponent {
  readonly query = input.required<RdListQuery>();
  readonly stages = input<RdStageEntity[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly currentUserId = input<string>('');
  readonly viewMode = input<RdViewMode>('list');
  readonly canCreate = input(true);
  readonly submit = output<RdListQuery>();
  readonly reset = output<void>();
  readonly create = output<void>();
  readonly viewModeChange = output<RdViewMode>();
  readonly advancedOpen = signal(false);

  readonly priorityOptions = ISSUE_PRIORITY_OPTIONS;
  readonly statusOptions = RD_STATUS_FILTER_OPTIONS;
  readonly typeOptions = RD_TYPE_OPTIONS;
  readonly viewOptions = [
    { value: 'list' as const, icon: 'unordered-list', ariaLabel: '列表视图' },
    { value: 'board' as const, icon: 'appstore', ariaLabel: '看板视图' },
  ];
  readonly sortedMembers = computed(() => {
    const members = this.members();
    const currentUserId = this.currentUserId();
    if (!currentUserId) {
      return members;
    }
    return [...members].sort((a, b) => {
      if (a.userId === currentUserId && b.userId !== currentUserId) {
        return -1;
      }
      if (b.userId === currentUserId && a.userId !== currentUserId) {
        return 1;
      }
      return 0;
    });
  });
  readonly draft = signal<RdListQuery>({
    page: 1,
    pageSize: 20,
    keyword: '',
    projectId: '',
    stageId: '',
    stageIds: [],
    status: [],
    type: [],
    priority: [],
    assigneeIds: [],
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  constructor() {
    effect(() => {
      this.draft.set({ ...this.query() });
    });
  }

  updateField<K extends keyof RdListQuery>(key: K, value: RdListQuery[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  applyAdvanced(): void {
    this.submit.emit(this.draft());
    this.advancedOpen.set(false);
  }

  clearAdvanced(): void {
    this.draft.update((draft) => ({
      ...draft,
      type: [],
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }));
  }
}
