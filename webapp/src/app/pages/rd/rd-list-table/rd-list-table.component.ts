import { Component, computed, input, output } from '@angular/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import {
  ProjectMemberEntity,
  RdItemEntity,
  RdItemPriority,
  RdItemStatus,
  RdListQuery,
  RdStageEntity,
} from '../models/rd.model';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@app/shared/constants/priority-options';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTagModule } from 'ng-zorro-antd/tag';
import {
  RD_STATUS_COLORS,
  RD_STATUS_FILTER_OPTIONS,
  RD_STATUS_LABELS,
} from '@app/shared/constants/status-options';
import { CommonModule, DatePipe } from '@angular/common';
import { EllipsisTextComponent } from '@app/shared/components/ellipsis-text/ellipsis-text.component';
import { parseDescriptionImage } from '@app/utils/md-text';
import { ImageHoverPreviewComponent } from '@app/shared/components/image-hover-preview/image-hover-preview.component';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-rd-list-table',
  imports: [
    NzTableModule,
    NzButtonModule,
    NzProgressModule,
    NzTagModule,
    NzTooltipModule,
    CommonModule,
    EllipsisTextComponent,
    ImageHoverPreviewComponent,
  ],
  template: `
    <nz-table
      [nzData]="rdItems()"
      [nzFrontPagination]="false"
      [nzShowPagination]="false"
      [nzShowSizeChanger]="true"
      class="rd-list"
    >
      <thead>
        <tr>
          <th nzWidth="66px">序号</th>
          <th [nzEllipsis]="true">研发项</th>
          <th nzWidth="100px">阶段</th>
          <!-- <th nzWidth="7%">状态</th> -->
          <!-- <th nzWidth="7%">优先级</th> -->
          <th nzWidth="100px">创建人</th>
          <th nzWidth="140px">执行人</th>
          <th nzWidth="150px">进度</th>
          <th nzWidth="140px">更新时间</th>
        </tr>
      </thead>
      <tbody>
        @for (item of rdItems(); track item.id) {
          <tr
            (click)="selectItem.emit(item)"
            [class.selected-row]="item.id === selectedItem()?.id"
            class="rd-item-row"
          >
            <td>{{ $index + 1 + query().pageSize * (query().page - 1) }}</td>
            <td class="title-col">
              <div class="rd-title-wrap">
                <div class="title-text">
                  <app-ellipsis-text [lines]="1" [enableToggle]="false">
                    <span class="rd-no">[{{ item.rdNo }}]</span>
                    <span class="rd-title"> {{ item.title }} </span>
                  </app-ellipsis-text>

                  <nz-tag [nzColor]="getStatusColor(item.status)">
                    {{ getStatusLabel(item.status) }}
                  </nz-tag>
                  <nz-tag [nzColor]="getPriorityColor(item.priority)">
                    {{ getPriorityLabel(item.priority) }}
                  </nz-tag>
                </div>
                <div class="des-text">
                  <app-ellipsis-text [lines]="2" [enableToggle]="false">
                    {{ previewSummary(item) }}
                  </app-ellipsis-text>
                </div>
              </div>
              <app-image-hover-preview
                [src]="previewImageUrl(item)"
                [previewSrc]="previewImageUrl(item)"
              ></app-image-hover-preview>
            </td>
            <td>{{ getStagesName(item.stageId) || '-' }}</td>
            <td>{{ item.creatorName || '-' }}</td>
            <td>
              @if (memberNamesText(item); as memberNames) {
                <app-ellipsis-text [lines]="1" [enableToggle]="false">
                  <span class="rd-member-text" [nz-tooltip]="memberNames">{{ memberNames }}</span>
                </app-ellipsis-text>
              } @else {
                <span class="no-member">未指派</span>
              }
            </td>
            <td><nz-progress [nzPercent]="item.progress" nzSize="small" /></td>
            <td>{{ item.updatedAt | date: 'MM-dd HH:mm' }}</td>
          </tr>
        }
      </tbody>
    </nz-table>
  `,
  styles: `
    .title-col {
      display: flex;
      .rd-title-wrap {
        margin-right: auto;
      }
      .title-text {
        display: flex;
        align-items: center;
      }
      .rd-title {
        margin-right: 8px;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
      }
      .rd-no {
        font-weight: 600;
        color: #1890ff;
      }
      .des-text {
        font-size: 12px; // 描述变小
        color: #999; // 变灰
        margin-top: 2px;
      }

      .rd-img-wrap {
        width: 100px;
        margin-left: auto;
      }
    }
    .rd-item-row {
      cursor: pointer;
      &.selected-row > td:first-child {
        border-left: 4px solid #91d5ff;
      }

      &.selected-row > td {
        background-color: #e6f7ff;
      }

      &.selected-row:hover > td {
        background-color: #e6f7ff;
      }
    }
  `,
})
export class RdListTableComponent {
  readonly rdItems = input.required<RdItemEntity[]>();
  readonly query = input.required<RdListQuery>();
  readonly projectId = input<string | null>(null);
  readonly selectedItem = input<RdItemEntity | null>(null);
  readonly stages = input<RdStageEntity[]>([]);
  readonly selectItem = output<RdItemEntity>();
  readonly members = input<ProjectMemberEntity[]>([]);

  readonly previewMap = computed(() => {
    const map = new Map<string, { summary: string; imageUrl: string | null; imageAlt: string }>();

    for (const item of this.rdItems()) {
      map.set(
        item.id,
        parseDescriptionImage(item.description, this.projectId()!, item.id, 'rd-items'),
      );
    }
    return map;
  });

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

  getStagesName(stageId: string | null) {
    if (!stageId) return '';
    const stage = this.stages().find((stage) => {
      return stage.id === stageId;
    });
    return stage?.name ?? '';
  }

  previewSummary(item: RdItemEntity): string {
    return this.previewMap().get(item.id)?.summary || '暂无详细描述';
  }

  previewImageUrl(item: RdItemEntity): string | null {
    return this.previewMap().get(item.id)?.imageUrl ?? null;
  }

  memberNamesText(item: RdItemEntity): string {
    const ids = item.memberIds || [];
    if (ids.length === 0 && !item.assigneeName) {
      return '';
    } else if (ids.length === 0 && item.assigneeName) {
      return item.assigneeName;
    }
    const memberMap = new Map(this.members().map((member) => [member.userId, member.displayName]));
    return ids.map((id) => memberMap.get(id) || id).join('、');
  }
}
