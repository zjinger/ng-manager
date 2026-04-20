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
  RdItemProgress,
  RdItemStatus,
  RdLogEntity,
  RdStageEntity,
  RdStageHistoryEntry,
} from '@pages/rd/models/rd.model';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { RdFlowAreaComponent } from './rd-action-area/rd-flow-area.component';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { RdProgressAreaComponent } from './rd-progress-area/rd-progress-area.component';
import { RdStageHistoryComponent } from './rd-stage-history/rd-stage-history.component';
import { RdBaseInfoComponent } from './rd-base-info.component/rd-base-info.component';

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
    RdFlowAreaComponent,
    DetailItemCardComponent,
    MarkdownViewerComponent,
    RdBaseInfoComponent,
    RdProgressAreaComponent,
    NzSpinModule,
    RdStageHistoryComponent,
  ],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      [nzClosable]="true"
      [nzMaskClosable]="true"
      [nzWidth]="900"
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
        @if (loading() && !rdItem()) {
          <nz-spin nzSize="large" nzTip="正在加载研发项...." class="loading"></nz-spin>
        } @else if (rdItem(); as rdItem) {
          <div class="detail-wrap">
            <div class="left-column">
              <app-rd-flow-area
                [item]="rdItem"
                (actionClick)="this.actionClick.emit($event)"
                (deleteClick)="this.deleteClick.emit()"
                [members]="members()"
                [stages]="stages()"
                [busy]="busy()"
              ></app-rd-flow-area>

              <app-rd-progress-area
                [item]="rdItem"
                [progressList]="progressList()"
                [members]="members()"
                [currentUserId]="currentUserId()"
                (updateProgressClick)="updateProgressClick.emit($event)"
              ></app-rd-progress-area>

              <app-detail-item-card title="研发动态" maxHeight="600px">
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
              <app-rd-stage-history [entries]="stageHistory()"></app-rd-stage-history>
            </div>

            <!-- 
            <nz-descriptions-item nzTitle="研发项描述" [nzSpan]="3">
              <app-markdown-viewer [content]="mdContent()" [showToc]="false"></app-markdown-viewer>
            </nz-descriptions-item> -->
            <div class="right-column">
              <app-rd-base-info [rdItem]="rdItem" [stages]="stages()"></app-rd-base-info>
            </div>
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
    .loading {
      margin-top: 40%;
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
      align-items: start;
      gap: 1rem;
      .left-column {
        width: 65%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .right-column {
        width: 35%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
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
            font-size: 0.875rem;
          }
          .time {
            margin-right: 15px;
            font-size: 0.875rem;
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
  readonly rdItem = input<RdItemEntity | null>();
  readonly loading = input(false);
  readonly open = input(false);
  readonly busy = input(false);
  readonly logs = input<RdLogEntity[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly progressList = input<RdItemProgress[]>([]);
  readonly stageHistory = input<RdStageHistoryEntry[]>([]);
  readonly projectId = input<string>('');
  readonly currentUserId = input<string>('');

  readonly close = output();
  readonly actionClick = output<'start' | 'block' | 'resume' | 'complete' | 'advance'>();
  readonly updateProgressClick = output<RdItemProgress>();
  readonly deleteClick = output<void>();

  readonly subtitleText = computed(() => this.rdItem()?.rdNo || '');
  readonly titleText = computed(() => this.rdItem()?.title || '研发项详情');

  // 研发项描述md文档
  readonly mdContent = computed(() => {
    const rdItem = this.rdItem();
    if (!rdItem) return '_ _';
    return this.replaceImagePaths(rdItem.description || '', this.projectId(), rdItem.id);
  });

  closeDetaile() {
    this.close.emit();
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
