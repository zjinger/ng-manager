import { Component, computed, effect, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserStore } from '@app/core/stores';
import {
  RD_STATUS,
  RD_STATUS_COLORS,
  RD_STATUS_FILTER_OPTIONS,
  RD_STATUS_LABELS,
} from '@app/shared/constants/status-options';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import {
  ProjectMemberEntity,
  RdItemEntity,
  RdItemStatus,
  RdLogEntity,
  RdStageEntity,
} from '@pages/rd/models/rd.model';
import { RdPermissionService } from '@pages/rd/services/rd-permission.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzTagModule } from 'ng-zorro-antd/tag';
interface ActionButton {
  key: 'start' | 'block' | 'resume' | 'complete' | 'advance';
  label: string;
  primary?: boolean;
  confirm?: {
    title: string;
    placement:
      | 'top'
      | 'topLeft'
      | 'topRight'
      | 'left'
      | 'right'
      | 'bottom'
      | 'bottomLeft'
      | 'bottomRight';
  };
}

@Component({
  selector: 'app-rd-flow-area',
  imports: [
    NzButtonModule,
    NzPopconfirmModule,
    NzSliderModule,
    NzStepsModule,
    NzTagModule,
    FormsModule,
    DetailItemCardComponent,
  ],
  template: `
    <app-detail-item-card>
      <div class="steps">
        <div class="flow-card__meta">
          <span class="stage">当前阶段：{{ currentStageName() }}</span>
          <nz-tag [nzColor]="getRdStatusColor(item().status)">{{ currentStatusName() }}</nz-tag>
        </div>
        <nz-steps [nzCurrent]="getStepIndex(item().status)" nzSize="small">
          @for (step of stepsOptions; track step.value) {
            @if (item().status === 'closed') {
              <nz-step
                [nzTitle]="step.label"
                [nzStatus]="excutedStatus().has(step.value) ? 'finish' : 'wait'"
              ></nz-step>
            } @else {
              <nz-step [nzTitle]="step.label"></nz-step>
            }
          }
        </nz-steps>
      </div>
    </app-detail-item-card>
  `,
  styles: `
    .flow-card__meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 0.875rem;
      margin-bottom: 1rem;
      font-weight: 600;
      .stage {
        margin-right: auto;
      }
    }

    .action-empty {
      color: gray;
      font-size: 0.9rem;
    }
    .delete-btn {
      margin-left: auto;
    }
    .progress-wrap {
      width: 100%;
      margin-top: 8px;
      padding: 1rem;
      border: 1px solid #f0f0f0;
      border-radius: 10px;
      .progress-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .progress-actions {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: end;
        gap: 1rem;
      }
    }
    :host ::ng-deep .ant-steps-item-title::after {
      background-color: #d3d3d3 !important;
    }
  `,
})
export class RdFlowAreaComponent {
  private readonly rdPermission = inject(RdPermissionService);
  private readonly userStore = inject(UserStore);
  readonly item = input.required<RdItemEntity>();
  readonly stages = input<RdStageEntity[]>([]);
  readonly busy = input();

  readonly actionClick = output<'block' | 'resume' | 'complete'>();
  readonly deleteClick = output<void>();
  readonly progressChange = output<number>();

  // 项目成员
  members = input<ProjectMemberEntity[]>([]);
  // 当前用户id
  currentUser = computed(() => this.userStore.currentUser());
  currentUserId = computed(() => this.userStore.currentUserId());
  readonly currentStageName = computed(() => {
    const current = this.item();
    if (!current) {
      return '-';
    }
    return this.stages().find((stage) => stage.id === current.stageId)?.name ?? '-';
  });

  readonly currentStatusName = computed(() => {
    const status = this.item()?.status;
    if (status === 'blocked') {
      return '处理中（阻塞中）';
    }
    return RD_STATUS_LABELS[status] ?? '_ _';
  });

  // 关闭情况显示已经过的阶段
  readonly excutedStatus = computed(() => {
    const executedStatusesSet = new Set<RdItemStatus>();
    if (this.item().status !== 'closed') {
      return executedStatusesSet;
    }

    // 待开始和关闭必有
    executedStatusesSet.add('todo');
    executedStatusesSet.add('closed');

    // 通过进度条判断是否经过“进行中”
    if (this.item().progress > 0) {
      executedStatusesSet.add('doing');
    }

    // 通过进度条判断是否经过“待确认”
    if (this.item().progress >= 100) {
      executedStatusesSet.add('done');
    }

    return executedStatusesSet;
  });

  readonly progressDraft = signal(0);

  constructor() {
    effect(() => {
      this.item()?.progress && this.progressDraft.set(this.item()?.progress);
    });
  }

  readonly stepsOptions = RD_STATUS_FILTER_OPTIONS.filter((options) => {
    if (options.value === 'blocked' || options.value === '') {
      return false;
    }
    return true;
  }) as { label: string; value: Exclude<RdItemStatus, 'blocked' | 'accepted'> }[];

  getStepIndex(status: RdItemStatus): number {
    if (status === 'blocked') {
      return 1;
    }
    if (status === 'done') {
      return 2;
    }
    if (status === 'closed') {
      return 3; // 关闭状态显示在最后
    }
    if (status === 'reopened') {
      return 1;
    }

    const index = RD_STATUS.findIndex((s) => s === status) ?? -1;
    return index;
  }

  getRdStatusColor(status: RdItemStatus): string {
    return RD_STATUS_COLORS[status] ?? 'default';
  }
}
