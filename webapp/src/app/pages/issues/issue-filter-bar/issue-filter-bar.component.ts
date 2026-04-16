import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { IssueListQuery, IssuePriority, IssueStatus } from '../models/issue.model';
import { ISSUE_STATUS_FILTER_OPTIONS } from '@app/shared/constants/status-options';
import { PRIORITY_OPTIONS } from '@app/shared/constants/priority-options';

@Component({
  selector: 'app-issue-filter-bar',
  imports: [NzInputModule, NzButtonModule, NzIconModule, NzRadioModule, FormsModule],
  template: `
    <div class="toolbar">
      <div class="filter-group">
        <div class="keyword-wrap">
          <nz-input-wrapper>
            <nz-icon nzInputPrefix nzType="search" nzTheme="outline"></nz-icon>
            <input
              nz-input
              type="text"
              [ngModel]="query().keyword"
              (ngModelChange)="updateKeyword($event)"
              placeholder="搜索标题、编号或提报人"
            />
          </nz-input-wrapper>
        </div>

        <div class="status-filter-wrap">
          <span class="label"> <nz-icon nzType="tags" nzTheme="fill" /> 状态： </span>
          @for (item of statusOptions; track item.value) {
            <button
              nz-button
              type="button"
              nzShape="round"
              [nzType]="statusBtnTypeByType(item.value)"
              (click)="updateStatusSelectedOpts(item.value)"
            >
              {{ item.label }}
            </button>
          }
        </div>
        <div class="priority-filter-wrap">
          <span class="label">
            <nz-icon nzType="experiment" nzTheme="fill" />
            优先级：
          </span>
          @for (item of priorityOptions; track item.value) {
            <button
              nz-button
              type="button"
              [nzType]="priorityBtnTypeByType(item.value)"
              (click)="updatePrioritySelectedOpts(item.value)"
            >
              {{ item.label }}
            </button>
          }
        </div>
      </div>
      <div class="right-col">
        <!-- 新建按钮 -->
        <!-- <button nz-button nzType="primary" type="button" (click)="openCreateDialog()">
                    <nz-icon nzType="plus" nzTheme="outline"></nz-icon>
                    新建测试单
                </button> -->
        <!-- 列表视图切换 -->
        <nz-radio-group [(ngModel)]="viewType" class="view-type">
          <label nz-radio-button nzValue="list">
            <nz-icon nzType="unordered-list" nzTheme="outline"></nz-icon>
          </label>
          <!-- <label nz-radio-button nzValue="board">
                        <nz-icon nzType="book" nzTheme="outline"></nz-icon>
                    </label> -->
        </nz-radio-group>
      </div>
    </div>
  `,
  styleUrl: './issue-filter-bar.component.less',
})
export class IssueFilterBarComponent {
  readonly query = input.required<IssueListQuery>();
  readonly queryChange = output<Partial<IssueListQuery>>();
  statusOptions = ISSUE_STATUS_FILTER_OPTIONS;
  priorityOptions = PRIORITY_OPTIONS;

  readonly viewType = signal('list');

  updateKeyword(keyword: string) {
    this.queryChange.emit({ keyword });
  }

  updatePrioritySelectedOpts(priority: IssuePriority | '') {
    const current = this.query().priority;

    if (priority === '') {
      this.queryChange.emit({ priority: [] });
      return;
    }

    if (current.includes(priority)) {
      this.queryChange.emit({
        priority: current.filter((s) => s !== priority),
      });
    } else {
      this.queryChange.emit({
        priority: [...current, priority],
      });
    }
  }

  updateStatusSelectedOpts(status: IssueStatus | '') {
    const current = this.query().status;
    if (status === '') {
      this.queryChange.emit({ status: [] });
      return;
    }

    if (current.includes(status)) {
      this.queryChange.emit({
        status: current.filter((s) => s !== status),
      });
    } else {
      this.queryChange.emit({
        status: [...current, status],
      });
    }
  }

  statusBtnTypeByType(status: IssueStatus | '') {
    if (status === '' && this.query().status.length === 0) {
      return 'primary';
    }
    if (status !== '' && this.query().status.includes(status)) {
      return 'primary';
    }
    return 'default';
  }

  priorityBtnTypeByType(priority: IssuePriority | '') {
    if (priority === '' && this.query().priority.length === 0) {
      return 'primary';
    }
    if (priority !== '' && this.query().priority.includes(priority)) {
      return 'primary';
    }
    return 'default';
  }
}
