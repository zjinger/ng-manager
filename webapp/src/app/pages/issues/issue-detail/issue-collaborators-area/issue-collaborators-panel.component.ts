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
    <app-detail-item-card title="合作人">
      @if (participants().length > 0) {
        <div class="participant-list">
          @for (item of participants(); track item.id) {
            <div class="participant-item">
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
                  nzType="text"
                  nz-popconfirm
                  nzPopconfirmTitle="确定要移除该参与人吗？"
                  nzPopconfirmOkText="移除"
                  nzPopconfirmCancelText="取消"
                  nz-tooltip="移除参与人"
                  (nzOnConfirm)="removeParticipant.emit(item.id)"
                  nzSize="small"
                  [nzLoading]="busy()"
                >
                  <i nz-icon nzType="minus"></i>
                </button>
              }
            </div>
          }
        </div>
      }
    </app-detail-item-card>
  `,
  styles: [
    `
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
        background: #ecebeb;
      }
      .participant-item__name {
        font-size: 16px;
        font-weight: 600;
        // color: #1890ff;
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
