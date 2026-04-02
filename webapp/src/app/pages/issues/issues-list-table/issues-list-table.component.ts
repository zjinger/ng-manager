import { Component, input, output } from '@angular/core';
import { IssueEntity, IssuePriority, IssueStatus, IssueType } from '../models/issue.model';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ISSUE_STATUS_COLORS, ISSUE_STATUS_LABELS } from '@app/shared/constants/status-options';
import { RdItemStatus } from '@pages/rd/models/rd.model';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@app/shared/constants/priority-options';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { CommonModule } from '@angular/common';
import { ISSUE_TYPE_COLORS, ISSUE_TYPE_LABELS } from '@app/shared/constants/issue-type-options';

@Component({
  selector: 'app-issues-list-table',
  imports: [NzTableModule, NzTagModule, NzProgressModule, CommonModule],
  template: ` <nz-table
    [nzData]="issues()"
    [nzFrontPagination]="false"
    [nzShowPagination]="false"
    [nzShowSizeChanger]="true"
    class="rd-list"
  >
    <thead>
      <tr>
        <th nzWidth="4%">序号</th>
        <!-- <th nzWidth="7%">编号</th> -->
        <th nzWidth="48%">标题</th>
        <th nzWidth="8%">状态</th>
        <th nzWidth="8%">提报人</th>
        <th nzWidth="8%">负责人</th>
        <th nzWidth="10%">更新时间</th>
      </tr>
    </thead>
    <tbody>
      @for (item of issues(); track item.id) {
        <tr
          (click)="selectItem.emit(item)"
          [style.background-color]="item.id == selectedItem()?.id ? '#1890ff24' : ''"
        >
          <td>{{ $index + 1 }}</td>
          <td>
            <div class="title-wrap">
              <span class="rd-title"> [{{ item.issueNo }}] {{ item.title }} </span>
              <nz-tag [nzColor]="getTypeColor(item.type)">
                {{ getTypeLabel(item.type) }}
              </nz-tag>
              <nz-tag [nzColor]="getPriorityColor(item.priority)">
                {{ getPriorityLabel(item.priority) }}
              </nz-tag>
              @if (item.moduleCode) {
                <nz-tag nzColor="default">{{ item.moduleCode }}</nz-tag>
              }
            </div>
            <div class="des">{{ item.description }}</div>
          </td>
          <td>
            <nz-tag [nzColor]="getStatusColor(item.status)">
              {{ getStatusLabel(item.status) }}
            </nz-tag>
          </td>
          <td>{{ item.assigneeName || '-' }}</td>
          <td>{{ item.reporterName }}</td>
          <td>{{ (item.updatedAt | date: 'MM-dd HH:mm') ?? '_' }}</td>
        </tr>
      }
    </tbody>
  </nz-table>`,
  styles: `
    .title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0; // 关键：让内部可以ellipsis
    }

    .rd-title {
      font-weight: 600; // 标题加粗
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: inline-block;
      max-width: 100%;
    }

    .des {
      font-size: 12px; // 描述变小
      color: #999; // 变灰
      margin-top: 2px;

      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    :host ::ng-deep table[nz-table-content] {
      table-layout: fixed !important;
    }
  `,
})
export class IssuesListTableComponent {
  readonly issues = input.required<IssueEntity[]>();
  readonly selectedItem = input<IssueEntity>();
  readonly selectItem = output<IssueEntity>();

  getStatusLabel(status: IssueStatus) {
    return ISSUE_STATUS_LABELS[status];
  }

  getStatusColor(status: IssueStatus) {
    return ISSUE_STATUS_COLORS[status];
  }

  getPriorityColor(priority: IssuePriority) {
    return PRIORITY_COLORS[priority];
  }

  getPriorityLabel(priority: IssuePriority) {
    return PRIORITY_LABELS[priority];
  }

  getTypeLabel(type: IssueType) {
    return ISSUE_TYPE_LABELS[type];
  }

  getTypeColor(type: IssueType) {
    return ISSUE_TYPE_COLORS[type];
  }
}
