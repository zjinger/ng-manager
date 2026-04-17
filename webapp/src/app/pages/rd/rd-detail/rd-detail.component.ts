import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarkdownViewerComponent } from '@app/shared/components/markdown-viewer';
import { PRIORITY_LABELS } from '@app/shared/constants/priority-options';
import { RD_STATUS_LABELS } from '@app/shared/constants/status-options';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import {
  ProjectMemberEntity,
  RdItemEntity,
  RdItemPriority,
  RdItemStatus,
  RdLogEntity,
  RdStageEntity,
} from '@pages/rd/models/rd.model';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { RdActionAreaComponent } from './rd-action-area/rd-action-area.component';

@Component({
  selector: 'app-rd-detail',
  standalone: true,
  imports: [
    NzDrawerModule,
    NzIconModule,
    NzCardModule,
    NzDescriptionsModule,
    NzTimelineModule,
    CommonModule,
    NzInputModule,
    NzEmptyModule,
    FormsModule,
    RdActionAreaComponent,
    DetailItemCardComponent,
    MarkdownViewerComponent,
  ],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      [nzClosable]="true"
      [nzMaskClosable]="true"
      [nzWidth]="740"
      [nzWrapClassName]="'rd-detail-drawer'"
      [nzMask]="false"
      [nzTitle]="drawerTitleTpl"
      (nzOnClose)="closeDetaile()"
    >
      <ng-template #drawerTitleTpl>
        <div class="title-wrap">
          <div class="title-main">
            @if (subtitleText(); as subtitle) {
              <span class="subtitle">{{ subtitle }}</span>
            }
            <strong>{{ titleText() }}</strong>
          </div>
        </div>
      </ng-template>

      <ng-template nzDrawerContent>
        @if (!rdItem()) {
          <nz-empty></nz-empty>
        } @else {
          <div class="detail-wrap">
            <app-detail-item-card title="操作">
              <app-rd-action-area
                [item]="rdItem()!"
                (actionClick)="this.actionClick.emit($event)"
                (progressChange)="this.progressChange.emit($event)"
                (deleteClick)="this.deleteClick.emit()"
                [members]="members()"
                [busy]="busy()"
              ></app-rd-action-area>
            </app-detail-item-card>

            <app-detail-item-card title="研发项描述">
              <nz-descriptions nzBordered nzSize="small">
                <nz-descriptions-item nzTitle="研发项" [nzSpan]="3">
                  {{ titleText() }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="研发项描述" [nzSpan]="3">
                  <app-markdown-viewer
                    [content]="mdContent()"
                    [showToc]="false"
                  ></app-markdown-viewer>
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="执行人">
                  {{ rdItem()!.assigneeName }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="验收人">
                  {{ rdItem()!.reviewerName ?? '_' }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="进度">
                  {{ rdItem()!.progress }}%
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="状态">
                  {{ getStatusLabel(rdItem()!.status) }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="优先级">
                  {{ getPriorityLabel(rdItem()!.priority) }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="阶段">
                  {{ getStagesName(rdItem()!.stageId) }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="计划开始">
                  {{ (rdItem()!.planStartAt | date: 'yyyy-MM-dd') ?? '_' }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="计划结束">
                  {{ (rdItem()!.planEndAt | date: 'yyyy-MM-dd') ?? '_' }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="创建时间">
                  {{ (rdItem()!.createdAt | date: 'yyyy-MM-dd HH:mm') ?? '_' }}
                </nz-descriptions-item>
              </nz-descriptions>
            </app-detail-item-card>

            <app-detail-item-card title="研发动态">
              <nz-timeline>
                @for (log of logs(); track log.id) {
                  <nz-timeline-item>
                    <div class="rd-log-item">
                      <div class="meta">
                        <span class="operator">{{ log.operatorName || '系统' }}</span>
                        <span class="content">{{ log.content || log.actionType }}</span>
                        <span class="time">{{ log.createdAt | date: 'MM/dd HH:mm' }}</span>
                      </div>
                    </div>
                  </nz-timeline-item>
                }
                @if (logs().length === 0) {
                  <nz-timeline-item>
                    <span class="empty">暂无动态</span>
                  </nz-timeline-item>
                }
              </nz-timeline>
            </app-detail-item-card>
          </div>
        }
      </ng-template>
    </nz-drawer>
  `,
  styles: `
    ::ng-deep
      .detail-wrap
      .ant-descriptions-view
      .ant-descriptions-row:nth-of-type(2)
      .ant-descriptions-item-label:first-child {
      min-width: 106px;
    }
    .title-wrap {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .subtitle {
        margin-right: 1rem;
        font-size: 12px;
        line-height: 1.4;
        padding: 3px 8px;
        border-radius: 4px;
        white-space: nowrap;
        background: #f1f5f9;
        color: #64748b;
      }
    }
    .wrap-title {
      width: 100%;
      margin-bottom: 12px;
      font-size: 18px;
      font-weight: bold;
      border-bottom: 1px solid #bbbbbb;
    }
    .detail-wrap {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      .detail-item {
        margin-bottom: 20px;
      }
      .edit-bar {
        width: 100%;
        display: flex;
        justify-content: end;
        .edit-btn {
          margin-top: 10px;
        }
      }
      .edit-area {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .rd-log-item {
        padding: 4px 0 0;
        .meta {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          color: rgba(0, 0, 0, 0.65);
          font-size: 1rem;
          margin-bottom: 4px;
          .operator {
            font-weight: bold;
          }
          .content {
            color: rgba(0, 0, 0, 0.85);
            font-size: 14px;
          }
          .time {
            fornsize: 10px;
            font-weight: 300;
            color: #bbbbbb;
            margin-left: auto;
          }
        }
        .empty {
          color: rgba(0, 0, 0, 0.45);
        }
      }
    }

    ::ng-deep .ant-descriptions-item-content,
    ::ng-deep .ant-descriptions-item-label {
      font-size: 0.875rem;
    }
  `,
})
export class RdDetailComponent {
  readonly rdItem = input.required<RdItemEntity | null>();
  readonly open = input(false);
  readonly busy = input(false);
  readonly logs = input<RdLogEntity[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly projectId = input<string>('');

  readonly close = output();
  readonly actionClick = output<'start' | 'block' | 'resume' | 'complete' | 'advance'>();
  readonly progressChange = output<number>();
  readonly deleteClick = output<void>();

  readonly subtitleText = computed(() => this.rdItem()?.rdNo || '');
  readonly titleText = computed(() => this.rdItem()?.title || '研发项详情');

  // 研发项描述md文档
  readonly mdContent = computed(() => {
    const rdItem = this.rdItem();
    if (!rdItem) return '_ _';
    return this.replaceImagePaths(rdItem.description || '', this.projectId(), rdItem.id);
  });

  getPriorityLabel(priority: RdItemPriority) {
    return PRIORITY_LABELS[priority];
  }

  getStatusLabel(status: RdItemStatus) {
    return RD_STATUS_LABELS[status];
  }

  closeDetaile() {
    this.close.emit();
  }

  getStagesName(stageId: string | null) {
    if (!stageId) return '';
    const stage = this.stages().find((stage) => {
      return stage.id === stageId;
    });
    return stage?.name ?? '';
  }

  private replaceImagePaths(mdContent: string, projectId: string, rdId: string) {
    // 正则表达式匹配Markdown中的图片路径
    const regex = /!\[.*?\]\((\/api\/admin\/uploads\/[a-zA-Z0-9_-]+\/raw)\)/g;

    // 替换匹配到的图片路径
    return mdContent.replace(regex, (match: string, originalPath: string) => {
      // 提取原路径中的 uploadId (例如upl_mnk0hxvl4xt7)
      const matchResult = originalPath.match(/uploads\/([a-zA-Z0-9_-]+)/);

      if (!matchResult) {
        return match;
      }
      const itemId = matchResult[1];
      const newPath = `/api/client/hub-token/projects/${projectId}/rd/${rdId}/uploads/${itemId}/raw`;

      return match.replace(originalPath, newPath);
    });
  }
}
