import { Component, computed, input, Input, output } from '@angular/core';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { RdItemEntity } from '../models/rd.model';
import { CommonModule } from '@angular/common';
const PRIORITY_COLOR_MAP = {
  low: 'default', // 灰
  medium: 'processing', // 蓝
  high: 'warning', // 橙
  critical: 'error', // 红
};

@Component({
  selector: 'app-rd-item-card',
  imports: [NzProgressModule, NzTagModule, NzAvatarModule, NzIconModule, CommonModule],
  templateUrl: './rd-item-card.component.html',
  styleUrl: './rd-item-card.component.less',
})
export class RdItemCardComponent {
  rdItem = input<RdItemEntity>();
  selected = input<boolean>(false);
  selectItem = output<RdItemEntity>();

  getPriorityColor(priority: any) {
    return PRIORITY_COLOR_MAP[priority as keyof typeof PRIORITY_COLOR_MAP];
  }
}
