import { Component, computed, input, Input, output } from '@angular/core';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { RdItemEntity, RdItemPriority, RdItemStatus, RdStageEntity } from '../models/rd.model';
import { CommonModule } from '@angular/common';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@app/shared/constants/priority-options';
import { RD_STATUS_LABELS } from '@app/shared/constants/status-options';
import { EllipsisTextComponent } from '@app/shared/components/ellipsis-text/ellipsis-text.component';
import { parseDescriptionImage } from '@app/utils/md-text';
import { ProjectMemberEntity } from '@models/index';
const PRIORITY_COLOR_MAP = {
  low: 'default', // 灰
  medium: 'processing', // 蓝
  high: 'warning', // 橙
  critical: 'error', // 红
};

@Component({
  selector: 'app-rd-item-card',
  imports: [
    NzProgressModule,
    NzTagModule,
    NzAvatarModule,
    NzIconModule,
    EllipsisTextComponent,
    CommonModule,
  ],
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
        <div class="des-text">
          <app-ellipsis-text [lines]="2" [enableToggle]="false">
            {{ rdItemPreview().summary }}
          </app-ellipsis-text>
        </div>
        <div class="progress-section">
          <nz-progress [nzPercent]="rdItem().progress" nzSize="small" />
        </div>

        <div class="meta-row">
          <div class="assignee">
            <nz-avatar-group>
              @for (item of memberAvatarList(); track item.name) {
                <nz-avatar [nzText]="item.text" [ngStyle]="{ 'background-color': item.color }" />
              }
            </nz-avatar-group>
            <span class="assignee-name">
              <app-ellipsis-text [lines]="1" [enableToggle]="false">
                {{ memberNamesText(rdItem()) }}
              </app-ellipsis-text>
            </span>
          </div>
          <div class="due-date">
            <!-- 这里紧急时可以标红色标记 -->
            <nz-icon nzType="calendar" nzTheme="outline" />
            {{ rdItem().planEndAt | date: 'yyyy-MM-dd' }}
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './rd-item-card.component.less',
})
export class RdItemCardComponent {
  rdItem = input.required<RdItemEntity>();
  stages = input<RdStageEntity[]>([]);
  projectMembers = input<ProjectMemberEntity[]>([]);
  selected = input<boolean>(false);
  projectId = input<string | null>(null);

  selectItem = output<RdItemEntity>();

  rdItemPreview = computed(() => {
    return (
      parseDescriptionImage(
        this.rdItem().description,
        this.projectId()!,
        this.rdItem().id,
        'rd-items',
      ) || '暂无详细描述'
    );
  });

  itemMembersMap = computed(() => {
    const ids = this.rdItem().memberIds || [];
    if (ids.length === 0 && this.rdItem().assigneeName) {
      return new Map([[this.rdItem().assigneeName, this.rdItem().assigneeName]]);
    } else if (ids.length === 0 && !this.rdItem().assigneeName) {
      return new Map();
    }

    return new Map(
      this.projectMembers()
        .filter((member) => ids.includes(member.userId))
        .map((member) => [member.userId, member.displayName]),
    );
  });

  readonly memberAvatarList = computed(() => {
    const map = this.itemMembersMap();

    const entries = Array.from(map.values()); // 只要 displayName

    return entries.map((name, index) => {
      return {
        name,
        text: name?.charAt(0)?.toUpperCase() || '?',
        color: this.generateBlue(index, entries.length),
      };
    });
  });
  private generateBlue(index: number, total: number): string {
    if (total <= 1) return 'hsl(210, 70%, 55%)';

    const start = 65; // 浅
    const end = 35; // 深

    const lightness = start - (index / (total - 1)) * (start - end);

    return `hsl(210, 70%, ${lightness}%)`;
  }
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

  getStagesName(stageId: string | null) {
    if (!stageId) return '';
    const stage = this.stages().find((stage) => {
      return stage.id === stageId;
    });
    return stage?.name ?? '';
  }

  memberNamesText(item: RdItemEntity): string {
    const memberMap = this.itemMembersMap();
    if (memberMap.size === 0) return '';

    return Array.from(memberMap.values()).join('、');
  }
}
