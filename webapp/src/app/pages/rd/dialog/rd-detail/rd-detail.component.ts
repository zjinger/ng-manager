import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, output, signal } from '@angular/core';
import { RdItemEntity, RdItemPriority, RdItemStatus, RdLogEntity } from '@pages/rd/models/rd.model';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDrawerModule, NzDrawerPlacement } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RdActionAreaComponent } from './rd-action-area/rd-action-area.component';
import { PRIORITY_LABELS } from '@app/shared/constants/priority-options';
import { RD_STATUS_LABELS } from '@app/shared/constants/status-options';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

@Component({
  selector: 'app-rd-detail',
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
  ],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      [nzClosable]="true"
      [nzMaskClosable]="true"
      [nzWidth]="850"
      [nzWrapClassName]="'rd-detail-drawer'"
      [nzMask]="false"
      [nzTitle]="drawerTitleTpl"
      [nzPlacement]="placement()"
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
            <nz-card class="detail-item">
              <h2 class="wrap-title">操作</h2>
              <app-rd-action-area
                [selectedItem]="rdItem()!"
                (actionClick)="this.actionClick.emit($event)"
                (progressChange)="this.progressChange.emit($event)"
                (deleteClick)="this.deleteClick.emit()"
              ></app-rd-action-area>
            </nz-card>
            
            <nz-card class="detail-item">
              <h2 class="wrap-title">研发项描述</h2>
              <nz-descriptions nzBordered nzSize="small">
                <nz-descriptions-item nzTitle="研发项" [nzSpan]="3">
                  {{ titleText() }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="研发项描述" [nzSpan]="3">
                  {{ rdItem()!.description }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="执行人">
                  {{ rdItem()!.assigneeName }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="验收人">
                  {{ rdItem()!.reviewerName }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="进度"
                  >{{ rdItem()!.progress }}%</nz-descriptions-item
                >
                <nz-descriptions-item nzTitle="状态">
                  {{ getStatusLabel(rdItem()!.status) }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="优先级">
                  {{ getPriorityLabel(rdItem()!.priority) }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="阶段">{{ rdItem()!.stageId }}</nz-descriptions-item>
                <nz-descriptions-item nzTitle="计划开始">
                  {{ rdItem()!.planStartAt | date: 'yyyy-MM-dd' }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="计划结束">
                  {{ rdItem()!.planEndAt | date: 'yyyy-MM-dd' }}
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="创建时间">
                  {{ rdItem()!.createdAt | date: 'yyyy-MM-dd HH:mm:ss' }}
                </nz-descriptions-item>
              </nz-descriptions>
            </nz-card>

            <nz-card class="detail-item">
              <h2 class="wrap-title">研发动态</h2>
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
            </nz-card>
          </div>
        }
      </ng-template>
    </nz-drawer>
  `,
  styles: `
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
  `,
})
export class RdDetailComponent {
  readonly rdItem = input<RdItemEntity | null>();
  readonly open = input(false);
  readonly busy = input(false);
  readonly logs = input<RdLogEntity[]>([]);
  readonly placement = input<NzDrawerPlacement>('right');
  readonly close = output();
  readonly actionClick = output<string>();
  readonly progressChange = output<number>();
  readonly deleteClick = output<void>();

  readonly subtitleText = computed(() => this.rdItem()?.rdNo || '');
  readonly titleText = computed(() => this.rdItem()?.title || '研发项详情');

  getPriorityLabel(priority: RdItemPriority) {
    return PRIORITY_LABELS[priority];
  }

  getStatusLabel(status: RdItemStatus) {
    return RD_STATUS_LABELS[status];
  }

  closeDetaile() {
    this.close.emit();
  }
}
