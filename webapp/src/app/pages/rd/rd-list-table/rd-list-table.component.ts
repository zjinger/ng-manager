import { Component, input, output } from '@angular/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { RdItemEntity, RdItemPriority, RdItemStatus } from '../models/rd.model';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@app/shared/constants/priority-options';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { RD_STATUS_COLORS, RD_STATUS_FILTER_OPTIONS, RD_STATUS_LABELS } from '@app/shared/constants/status-options';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rd-list-table',
  imports: [NzTableModule, NzButtonModule, NzProgressModule, NzTagModule, CommonModule],
  templateUrl: './rd-list-table.component.html',
  styleUrl: './rd-list-table.component.less',
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
