import { Component, computed, effect, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserStore } from '@app/core/stores';
import { ProjectMemberEntity, RdItemEntity } from '@pages/rd/models/rd.model';
import { RdPermissionService } from '@pages/rd/services/rd-permission.service';
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
  private readonly rdPermission = inject(RdPermissionService);
  private readonly userStore = inject(UserStore);
  readonly item = input.required<RdItemEntity>();
  readonly busy = input();

  readonly actionClick = output<'start' | 'block' | 'resume' | 'complete' | 'advance'>();
  readonly deleteClick = output<void>();
  readonly progressChange = output<number>();

  // 项目成员
  members = input<ProjectMemberEntity[]>([]);
  // 当前用户id
  currentUser = computed(() => this.userStore.currentUser());
  currentUserId = computed(() => this.userStore.currentUserId());

  readonly progressDraft = signal(0);

  constructor() {
    effect(() => {
      this.item()?.progress && this.progressDraft.set(this.item()?.progress);
    });
  }

  // 行动按钮
  readonly actionButtons = computed<ActionButton[]>(() => {
    const current = this.item();
    if (!current) {
      return [];
    }
    switch (current.status) {
      case 'todo':
        return this.canStart() ? [{ key: 'start' as const, label: '开始', primary: true }] : [];
      case 'doing':
        if (this.canBlock() && this.canComplete()) {
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
        if (this.canBlock()) {
          return [{ key: 'block' as const, label: '阻塞', primary: false }];
        }
        return this.canComplete()
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
        return this.canResume()
          ? [
              {
                key: 'resume' as const,
                label: '继续',
                primary: true,
                confirm: { title: '确认继续该研发项吗？', placement: 'topRight' },
              },
            ]
          : [];
      // case 'done':
      //   return this.canAdvance()
      //     ? [{ key: 'advance' as const, label: '进入下一阶段', primary: true }]
      //     : [];
      // case 'accepted':
      //   return this.canAdvance()
      //     ? [{ key: 'advance' as const, label: '进入下一阶段', primary: true }]
      //     : [];
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
    this.progressDraft.set(this.item()?.progress ?? 0);
  }

  readonly progressDirty = computed(() => this.progressDraft() !== (this.item()?.progress ?? 0));

  // 权限相关计算属性
  readonly canEditProgress = computed(() => {
    if (!this.rdPermission.hasPermissionToTransition(this.currentUser())) return false;
    return this.rdPermission.canEditProgress(this.item(), this.currentUserId());
  });

  readonly canStart = computed(() => {
    if (!this.rdPermission.hasPermissionToTransition(this.currentUser())) return false;
    return this.rdPermission.canStart(this.item(), this.currentUserId());
  });

  readonly canComplete = computed(() => {
    if (!this.rdPermission.hasPermissionToTransition(this.currentUser())) return false;
    return this.rdPermission.canComplete(this.item(), this.currentUserId());
  });

  readonly canEditBasic = computed(() => {
    if (!this.rdPermission.hasPermissionToEdit(this.currentUser())) return false;
    return this.rdPermission.canEditBasic(this.item(), this.currentUserId(), this.members());
  });

  readonly canDelete = computed(() => {
    if (!this.rdPermission.hasPermissionToDelete(this.currentUser())) return false;
    return this.rdPermission.canDelete(this.item(), this.currentUserId(), this.members());
  });

  readonly canBlock = computed(() => {
    if (!this.rdPermission.hasPermissionToTransition(this.currentUser())) return false;
    return this.rdPermission.canBlock(this.item(), this.currentUserId(), this.members());
  });

  readonly canResume = computed(() => {
    if (!this.rdPermission.hasPermissionToTransition(this.currentUser())) return false;
    return this.rdPermission.canResume(this.item(), this.currentUserId(), this.members());
  });

  readonly canAdvance = computed(() => {
    if (!this.rdPermission.hasPermissionToTransition(this.currentUser())) return false;
    return this.rdPermission.canAdvance(this.item(), this.currentUserId(), this.members());
  });

  readonly allowProgressEdit = computed(() => {
    const status = this.item()?.status;
    return this.canEditProgress() && !!status && status !== 'closed';
  });
}
