import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import { ProjectMemberEntity } from '@models/project.model';
import { RdItemEntity, RdItemProgress } from '@pages/rd/models/rd.model';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzProgressModule } from 'ng-zorro-antd/progress';

@Component({
  selector: 'app-rd-progress-area',
  imports: [
    NzAvatarModule,
    NzButtonModule,
    NzProgressModule,
    NzPopoverModule,
    NzPopconfirmModule,
    DetailItemCardComponent,
    CommonModule,
  ],
  template: `
    <app-detail-item-card title="成员进度">
      <div class="main-progress-header">
        <div class="main-progress-info">
          <span class="main-progress-label">整体进度</span>
          <span class="main-progress-hint">自动取成员平均值</span>
        </div>
        <div class="main-progress-data">{{ mainProgress() }}%</div>
      </div>
      <div class="progress-bar">
        <nz-progress
          [nzPercent]="mainProgress()"
          [nzShowInfo]="false"
          [nzStrokeColor]="{ '0%': '#108ee9', '100%': '#87d068' }"
        ></nz-progress>
      </div>
      <div class="progress-list">
        @for (item of normalizedProgressList(); track item.id) {
          <div class="progress-item">
            <div class="progress-item-header">
              <nz-avatar
                [nzSize]="'small'"
                [nzText]="item.userName?.charAt(0)"
                [style.background-color]="'#1890ff'"
              ></nz-avatar>
              <div class="member-info">
                <span class="member-name">
                  {{ item.userName }}
                  @if (item.userId === currentUserId()) {
                    (我)
                  }
                </span>
                <span class="member-hint">
                  最后更新：{{ item.updatedAt | date: 'MM:dd hh:mm' }}
                </span>
              </div>
              <nz-progress [nzPercent]="item.progress"></nz-progress>
            </div>
            <div class="progress-item-footer">
              @if (item.note) {
                <div class="note-row">
                  <span class="note-label">进度说明：</span>
                  <span class="note">{{ item.note }}</span>
                </div>
              }
              <div class="progress-item-actions">
                @if (item.userId === currentUserId() && !isProgressLocked()) {
                  @if (item.progress <= 0) {
                    <button
                      nz-button
                      nzType="default"
                      nzSize="small"
                      nz-popconfirm
                      nzPopconfirmTitle="确认开始处理吗？"
                      nzPopconfirmPlacement="topRight"
                      (nzOnConfirm)="onStartProgress(item)"
                    >
                      开始
                    </button>
                  } @else {
                    <button
                      nz-button
                      nzType="default"
                      nzSize="small"
                      (click)="onUpdateProgress(item)"
                    >
                      更新
                    </button>
                  }
                }
              </div>
            </div>
          </div>
        } @empty {
          <div class="empty">暂无成员进度数据</div>
        }
      </div>
    </app-detail-item-card>
  `,
  styleUrl: './rd-progress-area.component.less',
})
export class RdProgressAreaComponent {
  readonly item = input<RdItemEntity | null>(null);
  // readonly memberProgressList = input<MemberProgressItem[]>([]);
  // 只有用户更新了进度才会出现在列表
  readonly progressList = input<RdItemProgress[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly currentUserId = input<string>('');
  readonly updateProgressClick = output<RdItemProgress>();

  readonly normalizedProgressList = computed<RdItemProgress[]>(() => {
    const currentRdItem = this.item();
    if (!currentRdItem) return [];
    const memberIds = currentRdItem.memberIds ?? [];
    const memberNameMap = new Map(
      this.members().map((member) => [member.userId, member.displayName]),
    );
    const progressMap = new Map(this.progressList().map((progress) => [progress.userId, progress]));
    const normalizedList = [];
    // 老版本兼容
    if (!memberIds.length) {
      // 没有分配人
      if (!currentRdItem.assigneeId) return [];
      normalizedList.push({
        id: '',
        itemId: currentRdItem.id,
        userId: currentRdItem.assigneeId,
        userName:
          currentRdItem.assigneeName ??
          memberNameMap.get(currentRdItem.assigneeId) ??
          currentRdItem.assigneeId,
        progress: currentRdItem.progress,
        note: '',
        updatedAt: currentRdItem.updatedAt,
      });
    } else {
      const list = memberIds.map((memberId) => {
        return {
          id: memberId,
          itemId: progressMap.get(memberId)?.itemId ?? currentRdItem.id,
          userId: memberId,
          userName: progressMap.get(memberId)?.userName ?? memberNameMap.get(memberId) ?? memberId,
          progress: progressMap.get(memberId)?.progress ?? 0,
          note: progressMap.get(memberId)?.note ?? '',
          updatedAt: currentRdItem.updatedAt,
        };
      });
      normalizedList.push(...list);
    }

    const currentId = this.currentUserId();

    return normalizedList.sort((a, b) => {
      if (a.userId === currentId) return -1;
      if (b.userId === currentId) return 1;
      return 0; // 保持原顺序
    });
  });

  readonly mainProgress = computed(() => this.item()?.progress ?? 0);

  isClosed(): boolean {
    return this.item()?.status === 'closed';
  }

  getAvatarLetter(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  isProgressLocked(): boolean {
    const status = this.item()?.status;
    return status === 'accepted' || status === 'closed';
  }

  onUpdateProgress(item: RdItemProgress): void {
    this.updateProgressClick.emit(item);
  }

  onStartProgress(item: RdItemProgress): void {
    this.updateProgressClick.emit(item);
  }
}
