import { Component, input, output } from '@angular/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { RdItemEntity, RdItemPriority, RdItemStatus } from '../models/rd.model';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@app/shared/constants/priority-options';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTagModule } from 'ng-zorro-antd/tag';
import {
  RD_STATUS_COLORS,
  RD_STATUS_FILTER_OPTIONS,
  RD_STATUS_LABELS,
} from '@app/shared/constants/status-options';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rd-list-table',
  imports: [NzTableModule, NzButtonModule, NzProgressModule, NzTagModule, CommonModule],
  template: `
    <nz-table
      [nzData]="rdItems()"
      [nzFrontPagination]="false"
      [nzShowPagination]="false"
      [nzShowSizeChanger]="true"
      [nzScroll]="{ y: '520px' }"
      class="rd-list"
    >
      <thead>
        <tr>
          <th nzWidth="30%">研发项</th>
          <th nzWidth="10%">阶段</th>
          <th nzWidth="7%">状态</th>
          <th nzWidth="7%">优先级</th>
          <th nzWidth="7%">负责人</th>
          <th nzWidth="11%">进度</th>
          <th nzWidth="10%">更新时间</th>
        </tr>
      </thead>
      <tbody>
        @for (item of rdItems(); track item.id) {
          <tr
            (click)="selectItem.emit(item)"
            [style.background-color]="item.id == selectedItem()?.id ? '#1890ff24' : ''"
          >
            <td class="title-col">
              <span class="rd-title"> {{ item.title }} </span><br />
              <span class="rd-no">{{ item.rdNo }}</span>
            </td>
            <td>{{ item.stageId || '-' }}</td>
            <td>
              <nz-tag [nzColor]="getStatusColor(item.status)">
                {{ getStatusLabel(item.status) }}</nz-tag
              >
            </td>
            <td>
              <nz-tag [nzColor]="getPriorityColor(item.priority)">{{
                getPriorityLabel(item.priority)
              }}</nz-tag>
            </td>
            <td>{{ item.assigneeName || '-' }}</td>
            <td><nz-progress [nzPercent]="item.progress" nzSize="small" /></td>
            <td>{{ item.planEndAt | date: 'MM-dd HH:mm' }}</td>
          </tr>
        }
      </tbody>
    </nz-table>
  `,
  styles: `
    .title-col {
      .rd-title {
        color: #1677ff;
        font-weight: 500;
        font-size: 1rem;
        cursor: pointer;
      }
      .rd-no {
        padding-left: .5rem;
        color: gray;
        font-size: 0.8rem;
      }
    }
  `,
})
export class RdListTableComponent {
  readonly rdItems = input.required<RdItemEntity[]>();
  readonly selectedItem = input<RdItemEntity>();
  readonly selectItem = output<RdItemEntity>();

  getPriorityColor(priority: RdItemPriority) {
    return PRIORITY_COLORS[priority];
  }

  getPriorityLabel(priority: RdItemPriority) {
    return PRIORITY_LABELS[priority];
  }

  getStatusLabel(status: RdItemStatus) {
    return RD_STATUS_LABELS[status];
  }

  getStatusColor(status: RdItemStatus) {
    return RD_STATUS_COLORS[status];
  }
}
