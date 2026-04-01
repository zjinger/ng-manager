import { Component, input, output } from '@angular/core';
import { IssueEntity, IssuePriority, IssueStatus } from '../models/issue.model';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ISSUE_STATUS_LABELS } from '@app/shared/constants/status-options';
import { RdItemStatus } from '@pages/rd/models/rd.model';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@app/shared/constants/priority-options';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-issues-list-table',
  imports: [NzTableModule, NzTagModule, NzProgressModule, CommonModule],
  template: ` <nz-table
    [nzData]="issues()"
    [nzFrontPagination]="false"
    [nzShowPagination]="false"
    [nzShowSizeChanger]="true"
    [nzScroll]="{ y: '520px' }"
    class="rd-list"
  >
    <thead>
      <tr>
        <th nzWidth="5%">序号</th>
        <!-- <th nzWidth="7%">编号</th> -->
        <th nzWidth="38%">标题</th>
        <th nzWidth="6%">状态</th>
        <th nzWidth="5%">提报人</th>
        <th nzWidth="5%">负责人</th>
        <th nzWidth="8%">更新时间</th>
      </tr>
    </thead>
    <tbody>
      @for (item of issues(); track item.id) {
        <tr
          (click)="selectItem.emit(item)"
          [style.background-color]="item.id == selectedItem()?.id ? '#1890ff24' : ''"
        >
          <td>{{ $index + 1  }}</td>
          <!-- <td>{{ item.issueNo }}</td> -->
          <td>
            <div class="title-wrap">
              <span class="rd-title">
               [{{ item.issueNo }}] {{ item.title }}
              </span>
              <nz-tag [nzColor]="getPriorityColor(item.priority)">{{
                getPriorityLabel(item.priority)
              }}</nz-tag>
              @if (item.moduleCode) {
                <nz-tag nzColor="default">{{ item.moduleCode }}</nz-tag>
              }
            </div>
            <div class="des">{{ item.description }}</div>
          </td>
          <td>
            <nz-tag nzColor="default"> {{ getStatusLabel(item.status) }}</nz-tag>
          </td>
          <td>{{ item.assigneeName || '-' }}</td>
          <td>{{ item.reporterName }}</td>
          <td>{{ item.updatedAt | date: 'MM-dd HH:mm' }}</td>
        </tr>
      }
    </tbody>
  </nz-table>`,
  styleUrl: './issues-list-table.component.less',
})
export class IssuesListTableComponent {
  readonly issues = input.required<IssueEntity[]>();
  readonly selectedItem = input<IssueEntity>();
  readonly selectItem = output<IssueEntity>();

  getStatusLabel(status: IssueStatus) {
    return ISSUE_STATUS_LABELS[status];
  }

  getPriorityColor(priority: IssuePriority) {
    return PRIORITY_COLORS[priority];
  }

  getPriorityLabel(priority: IssuePriority) {
    return PRIORITY_LABELS[priority];
  }
}
