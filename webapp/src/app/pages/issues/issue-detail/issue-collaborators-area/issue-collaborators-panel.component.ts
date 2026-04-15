import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';

// import type { ProjectMemberEntity } from '@pages/issues/models/issue.model';
import type { IssueEntity, IssueParticipantEntity } from '../../models/issue.model';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipDirective, NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { ProjectMemberEntity } from '@pages/rd/models/rd.model';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';

@Component({
  selector: 'app-issue-collaborators-area',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzSelectModule,
    NzIconModule,
    NzTooltipModule,
    NzPopconfirmModule,
    NzTooltipDirective,
    NzAvatarModule,
    DetailItemCardComponent,
  ],
  template: `
    <app-detail-item-card
      title="合作人"
      [emptyStatus]="participants().length <= 0"
      [count]="participants().length"
      emptyText="当前还没有合作人"
    >
      <div class="participant-list">
        @for (item of participants(); track item.id) {
          <div class="participant-item" [style.width]="canManageParticipants() ? '100%' : 'auto'">
            <div class="participant-chip">
              <nz-avatar
                [nzText]="item.userName.charAt(0)"
                nzSize="small"
                style="background-color: #1890ff;"
              ></nz-avatar>
              <span class="participant-item__name">{{ item.userName }}</span>
            </div>
            @if (canManageParticipants()) {
              <button
                nz-button
                nzType="default"
                nzShape="circle"
                nz-popconfirm
                nzPopconfirmTitle="确定要移除该参与人吗？"
                nzPopconfirmOkText="移除"
                nzPopconfirmCancelText="取消"
                nz-tooltip="移除参与人"
                (nzOnConfirm)="removeParticipant.emit(item.id)"
                nzSize="small"
                [nzLoading]="busy()"
                class="remove-btn"
              >
                <nz-icon nzType="minus"></nz-icon>
              </button>
            }
          </div>
        }
      </div>
    </app-detail-item-card>
  `,
  styles: [
    `
      .empty {
        text-align: center;
        color: gray;
      }
      .participant-list {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        gap: 20px 8px;
        padding: 10px 0;
      }
      .participant-item {
        height: 20px;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
      }
      .participant-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 4px 10px 4px 4px;
        border-radius: 999px;
        background: #fafafa;
        border: 1px solid #f0f0f0;
      }
      .participant-item__name {
        font-size: 0.875rem;
        font-weight: 600;
        // color: #1890ff;
      }
      .remove-btn {
        margin-right: 8px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueCollaboratorsAreaComponent {
  readonly issue = input.required<IssueEntity>();
  readonly participants = input<IssueParticipantEntity[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly availableMembers = input<ProjectMemberEntity[]>([]);
  readonly canAssign = input(false);
  readonly canManageParticipants = input(false);
  readonly busy = input(false);
  readonly assign = output<string>();
  readonly removeParticipant = output<string>();

  readonly selectedAssignee = signal<string | null>(null);
}
