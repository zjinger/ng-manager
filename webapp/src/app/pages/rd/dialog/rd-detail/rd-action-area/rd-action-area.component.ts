import { Component, computed, effect, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectMemberEntity, RdItemEntity } from '@pages/rd/models/rd.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSliderModule } from 'ng-zorro-antd/slider';
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
  selector: 'app-rd-action-area',
  imports: [NzButtonModule, NzPopconfirmModule, NzSliderModule, FormsModule],
  templateUrl: './rd-action-area.component.html',
  styleUrl: './rd-action-area.component.less',
})
export class RdActionAreaComponent {
  readonly selectedItem = input.required<RdItemEntity>();
  readonly busy = input();

  readonly actionClick = output<'start' | 'block' | 'resume' | 'complete' | 'advance'>();
  readonly deleteClick = output<void>();
  readonly progressChange = output<number>();

  // TODO:后面从外部传入 项目成员
  members = signal<ProjectMemberEntity[]>([{ userId: 'usr_seed_pm' } as ProjectMemberEntity]);
  // TODO:后面从外部传入 当前用户id
  currentUserId = signal('usr_seed_pm');

  readonly progressDraft = signal(0);

  constructor() {
    effect(()=>{
      this.selectedItem()?.progress && this.progressDraft.set(this.selectedItem()?.progress);
    })
  }

  // 行动按钮
  readonly actionButtons = computed<ActionButton[]>(() => {
    const current = this.selectedItem();
    if (!current) {
      return [];
    }
    switch (current.status) {
      case 'todo':
        return this.canStartSelectedItem()
          ? [{ key: 'start' as const, label: '开始', primary: true }]
          : [];
      case 'doing':
        if (this.canBlockSelectedItem() && this.canCompleteSelectedItem()) {
          return [
            { key: 'block' as const, label: '阻塞', primary: false },
            {
              key: 'complete' as const,
              label: '完成',
              primary: true,
              confirm: { title: '确认完成该研发项吗？', placement: 'topRight' },
            },
          ];
        }
        if (this.canBlockSelectedItem()) {
          return [{ key: 'block' as const, label: '阻塞', primary: false }];
        }
        return this.canCompleteSelectedItem()
          ? [
              {
                key: 'complete' as const,
                label: '完成',
                primary: true,
                confirm: { title: '确认完成该研发项吗？', placement: 'topRight' },
              },
            ]
          : [];
      case 'blocked':
        return this.canResumeSelectedItem()
          ? [
              {
                key: 'resume' as const,
                label: '继续',
                primary: true,
                confirm: { title: '确认继续该研发项吗？', placement: 'topRight' },
              },
            ]
          : [];
      case 'done':
        return this.canAdvanceSelectedItem()
          ? [{ key: 'advance' as const, label: '进入下一阶段', primary: true }]
          : [];
      case 'accepted':
        return this.canAdvanceSelectedItem()
          ? [{ key: 'advance' as const, label: '进入下一阶段', primary: true }]
          : [];
      default:
        return [];
    }
  });

  saveProgress(): void {
    if (!this.progressDirty() || this.busy()) {
      return;
    }
    this.progressChange.emit(this.progressDraft());
  }

  // 更新进度条
  updateProgressDraft(value: number): void {
    this.progressDraft.set(Math.max(0, Math.min(100, Number(value ?? 0))));
  }

  // 重置进度
  resetProgress(): void {
    this.progressDraft.set(this.selectedItem()?.progress ?? 0);
  }

  readonly progressDirty = computed(
    () => this.progressDraft() !== (this.selectedItem()?.progress ?? 0),
  );

  readonly canEditSelectedProgress = computed(() => {
    const current = this.selectedItem();
    const userId = this.currentUserId();
    return !!current && !!userId && !!current.assigneeId && current.assigneeId === userId;
  });

  readonly allowProgressEdit = computed(() => {
    const status = this.selectedItem()?.status;
    return this.canEditSelectedProgress() && !!status && status !== 'closed';
  });

  readonly canStartSelectedItem = computed(() => this.canEditSelectedProgress());

  readonly canCompleteSelectedItem = computed(() => this.canEditSelectedProgress());

  readonly canEditSelectedBasic = computed(() => {
    const current = this.selectedItem();
    const userId = this.currentUserId();
    if (!current || !userId) {
      return false;
    }
    if (current.creatorId === userId || current.assigneeId === userId) {
      return true;
    }
    const member = this.members().find((item) => item.userId === userId);
    return !!member && (member.roleCode === 'project_admin' || member.isOwner);
  });
  readonly canDeleteSelectedItem = computed(() => {
    const current = this.selectedItem();
    const userId = this.currentUserId();
    if (!current || !userId) {
      return false;
    }
    if (current.creatorId === userId) {
      return true;
    }
    const member = this.members().find((item) => item.userId === userId);
    return !!member && (member.roleCode === 'project_admin' || member.isOwner);
  });

  readonly canBlockSelectedItem = computed(() => {
    const current = this.selectedItem();
    const userId = this.currentUserId();
    if (!current || !userId) {
      return false;
    }
    if (current.assigneeId && current.assigneeId === userId) {
      return true;
    }
    const member = this.members().find((item) => item.userId === userId);
    return !!member && (member.roleCode === 'project_admin' || member.isOwner);
  });

  readonly canResumeSelectedItem = computed(() => this.canBlockSelectedItem());

  readonly canAdvanceSelectedItem = computed(() => {
    const current = this.selectedItem();
    if (!current) {
      return false;
    }
    if (current.status !== 'done' && current.status !== 'accepted') {
      return false;
    }
    return this.canEditSelectedBasic();
  });
}
