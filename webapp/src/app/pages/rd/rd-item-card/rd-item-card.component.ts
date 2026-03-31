import { Component, computed, input, Input, output } from '@angular/core';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { RdItemEntity, RdItemPriority, RdItemStatus, RdStageEntity } from '../models/rd.model';
import { CommonModule } from '@angular/common';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@app/shared/constants/priority-options';
import { RD_STATUS_LABELS } from '@app/shared/constants/status-options';
const PRIORITY_COLOR_MAP = {
  low: 'default', // 灰
  medium: 'processing', // 蓝
  high: 'warning', // 橙
  critical: 'error', // 红
};

@Component({
  selector: 'app-rd-item-card',
  imports: [NzProgressModule, NzTagModule, NzAvatarModule, NzIconModule, CommonModule],
  template: `
    <div
      class="task-card"
      [ngClass]="{ 'task-card-active': selected() }"
      (click)="selectItem.emit(rdItem())"
    >
      <!-- 侧边紧急条 -->
      <div
        [class.priority-left-bar]="selected()"
        class="priority-left-bar"
        [style.background]="'#1890ff'"
      ></div>
      <div class="card-content">
        <div class="card-header">
          <span class="task-id">{{ rdItem().rdNo }}</span>
          <div class="badge-row">
            <nz-tag [nzColor]="'blue'" class="tag">{{ getStageName(rdItem().stageId) }}</nz-tag>
            <nz-tag [nzColor]="getPriorityColor(rdItem().priority)" class="tag">{{
              getPriorityLabel(rdItem().priority)
            }}</nz-tag>
          </div>
        </div>
        <div class="task-title">{{ rdItem().title }}</div>
        <div class="progress-section">
          <nz-progress [nzPercent]="rdItem().progress" nzSize="small" />
        </div>

        <div class="meta-row">
          <div class="assignee">
            <nz-avatar [nzText]="rdItem().assigneeName?.charAt(0) ?? '?'" nzSize="small" />
            <span class="assignee-name">{{ rdItem().assigneeName }}</span>
          </div>
          <div class="due-date">
            <!-- 这里紧急时可以标红色标记 -->
            <nz-icon nzType="calendar" nzTheme="outline" />
            {{ rdItem().planEndAt | date: 'yyyy-MM-dd' }}
          </div>
        </div>
        <!-- <div class="footer-note">
            剩余 5 天
        </div> -->
      </div>
    </div>
  `,
  styleUrl: './rd-item-card.component.less',
})
export class RdItemCardComponent {
  rdItem = input.required<RdItemEntity>();
  stages = input<RdStageEntity[]>([]);
  selected = input<boolean>(false);
  selectItem = output<RdItemEntity>();

  getPriorityColor(priority: RdItemPriority) {
    return PRIORITY_COLORS[priority];
  }

  getPriorityLabel(priority: RdItemPriority) {
    return PRIORITY_LABELS[priority];
  }

  getStatusLabel(status: RdItemStatus) {
    return RD_STATUS_LABELS[status];
  }

  getStageName(stageId: string | null) {
    const stage = this.stages().find((s) => s.id === stageId);
    return stage ? stage.name : '-';
  }
}
