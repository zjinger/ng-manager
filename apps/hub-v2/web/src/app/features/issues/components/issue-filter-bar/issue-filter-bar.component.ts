import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { ISSUE_PRIORITY_OPTIONS, ISSUE_TYPE_OPTIONS } from '@shared/constants';
import { FilterBarComponent, PageToolbarComponent, SearchBoxComponent, ViewToggleComponent } from '@shared/ui';
import { NzIconModule } from 'ng-zorro-antd/icon';
import type { IssueListQuery } from '../../models/issue.model';
import { CommonModule } from '@angular/common';
import type { ProjectMemberEntity, ProjectMetaItem, ProjectVersionItem } from '@features/projects/models/project.model';

export type IssueListViewMode = 'list' | 'card';

@Component({
  selector: 'app-issue-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzSelectModule, NzDrawerModule, NzSwitchModule, NzIconModule, FilterBarComponent, PageToolbarComponent, SearchBoxComponent, ViewToggleComponent],
  template: `
    <app-page-toolbar>
      @if(canCreate()){
      <button toolbar-primary nz-button nzType="primary" class="toolbar-create-btn" (click)="create.emit()">
        <nz-icon nzType="plus" nzTheme="outline" />
        新建测试单
      </button>
      }
      <app-filter-bar toolbar-filters class="issue-toolbar__main">
        <nz-select
          nzPlaceHolder="类型，支持多选"
          style="width: 260px"
          class="toolbar-select"
          [ngModel]="draft().types"
          (ngModelChange)="updateField('types', $event)"
          nzMode="multiple"
          [nzMaxTagCount]="2"
          [nzAllowClear]="true"
          [nzMaxTagPlaceholder]="null"
        >
          @for (item of issueTypeOptions; track item.value) {
            @if (item.value !== '') {
              <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
            }
          }
        </nz-select>
        <nz-select
          nzPlaceHolder="状态，支持多选"
          style="width: 250px"
          class="toolbar-select"
          [ngModel]="draft().status"
          (ngModelChange)="updateField('status', $event)"
          name="status"
          nzMode="multiple"
          [nzMaxTagCount]="2"
          [nzAllowClear]="true"
           [nzMaxTagPlaceholder]="null"
        >
          <nz-option nzLabel="待处理" nzValue="open"></nz-option>
          <nz-option nzLabel="处理中" nzValue="in_progress"></nz-option>
          <nz-option nzLabel="待验证" nzValue="resolved"></nz-option>
          <nz-option nzLabel="已验证" nzValue="verified"></nz-option>
          <nz-option nzLabel="已重开" nzValue="reopened"></nz-option>
          <nz-option nzLabel="已关闭" nzValue="closed"></nz-option>
        </nz-select>
        <nz-select
          nzPlaceHolder="优先级，支持多选"
          style="width: 200px"
          class="toolbar-select"
          [ngModel]="draft().priority"
          (ngModelChange)="updateField('priority', $event)"
          nzMode="multiple"
          [nzMaxTagCount]="2"
          [nzAllowClear]="true"
          [nzMaxTagPlaceholder]="null"
        >
          @for (item of priorityOptions; track item.value) {
            @if (item.value !== '') {
            <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
            }
          }
        </nz-select>
        <nz-select
          nzPlaceHolder="提报人，支持多选"
          style="width: 230px"
          class="toolbar-select"
          [ngModel]="draft().reporterIds"
          (ngModelChange)="updateField('reporterIds', $event)"
          nzMode="multiple"
          [nzMaxTagCount]="2"
          [nzAllowClear]="true"
           [nzMaxTagPlaceholder]="null"
        >
          @for (member of members(); track member.userId) {
            <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
          }
        </nz-select>
        <nz-select
          nzPlaceHolder="负责人，支持多选"
          style="width: 230px"
          class="toolbar-select"
          [ngModel]="draft().assigneeIds"
          (ngModelChange)="updateField('assigneeIds', $event)"
          nzMode="multiple"
          [nzMaxTagCount]="2"
          [nzAllowClear]="true"
        >
          <nz-option nzLabel="未指派" nzValue="__unassigned__"></nz-option>
          @for (member of members(); track member.userId) {
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
            <label>模块</label>
            <nz-select
              nzMode="multiple"
              nzPlaceHolder="选择模块"
              [nzAllowClear]="true"
              [ngModel]="draft().moduleCodes"
              (ngModelChange)="updateField('moduleCodes', $event)"
            >
              @for (item of modules(); track item.id) {
                <nz-option [nzLabel]="item.name" [nzValue]="item.code || item.name"></nz-option>
              }
            </nz-select>
          </div>
          <div class="advanced-field">
            <label>版本</label>
            <nz-select
              nzMode="multiple"
              nzPlaceHolder="选择版本"
              [nzAllowClear]="true"
              [ngModel]="draft().versionCodes"
              (ngModelChange)="updateField('versionCodes', $event)"
            >
              @for (item of versions(); track item.id) {
                <nz-option [nzLabel]="item.version" [nzValue]="item.code || item.version"></nz-option>
              }
            </nz-select>
          </div>
          <div class="advanced-field">
            <label>环境</label>
            <nz-select
              nzMode="multiple"
              nzPlaceHolder="选择环境"
              [nzAllowClear]="true"
              [ngModel]="draft().environmentCodes"
              (ngModelChange)="updateField('environmentCodes', $event)"
            >
              @for (item of environments(); track item.id) {
                <nz-option [nzLabel]="item.name" [nzValue]="item.code || item.name"></nz-option>
              }
            </nz-select>
          </div>
          <!-- <div class="advanced-field">
            <label>负责人筛选包含协作人</label>
            <label class="advanced-switch">
              <nz-switch [ngModel]="draft().includeAssigneeParticipants" (ngModelChange)="updateField('includeAssigneeParticipants', $event)"></nz-switch>
              <span>{{ draft().includeAssigneeParticipants ? '开启' : '关闭' }}</span>
            </label>
          </div> -->
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
      .issue-toolbar__main {
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
      .advanced-switch {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueFilterBarComponent {
  readonly query = input.required<IssueListQuery>();
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly modules = input<ProjectMetaItem[]>([]);
  readonly environments = input<ProjectMetaItem[]>([]);
  readonly versions = input<ProjectVersionItem[]>([]);
  readonly viewMode = input<IssueListViewMode>('list');
  readonly canCreate = input(true);
  readonly submit = output<IssueListQuery>();
  readonly reset = output<void>();
  readonly create = output<void>();
  readonly viewModeChange = output<IssueListViewMode>();
  readonly advancedOpen = signal(false);

  readonly priorityOptions = ISSUE_PRIORITY_OPTIONS;
  readonly issueTypeOptions = ISSUE_TYPE_OPTIONS;
  readonly viewOptions = [
    { value: 'list' as const, icon: 'unordered-list', ariaLabel: '列表视图' },
    { value: 'card' as const, icon: 'appstore', ariaLabel: '卡片视图' },
  ];
  readonly draft = signal<IssueListQuery>({
    page: 1,
    pageSize: 20,
    keyword: '',
    status: [],
    types: [],
    priority: [],
    reporterIds: [],
    assigneeIds: [],
    moduleCodes: [],
    versionCodes: [],
    environmentCodes: [],
    includeAssigneeParticipants: true,
    sortBy: 'createdAt',
    sortOrder: 'desc',
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

  applyAdvanced(): void {
    this.submit.emit(this.draft());
    this.advancedOpen.set(false);
  }

  clearAdvanced(): void {
    this.draft.update((draft) => ({
      ...draft,
      moduleCodes: [],
      versionCodes: [],
      environmentCodes: [],
      types: [],
      includeAssigneeParticipants: true,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }));
  }
}
