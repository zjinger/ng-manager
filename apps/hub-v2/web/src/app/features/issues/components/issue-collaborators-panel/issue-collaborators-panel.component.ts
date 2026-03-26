import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { PanelCardComponent } from '@shared/ui';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { IssueEntity, IssueParticipantEntity } from '../../models/issue.model';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipDirective, NzTooltipModule } from "ng-zorro-antd/tooltip";
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

@Component({
  selector: 'app-issue-collaborators-panel',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzSelectModule, NzIconModule, NzTooltipModule, NzPopconfirmModule, PanelCardComponent, NzTooltipDirective],
  template: `
    <app-panel-card title="协作人" [count]="participants().length" [empty]="participants().length === 0" emptyText="当前还没有参与人">
      <!-- @if (canAssign()) {
        <div class="panel__section panel__section--compact">
          <div class="assign-row">
            <nz-select class="panel-select" nzPlaceHolder="选择负责人" [ngModel]="selectedAssignee()" (ngModelChange)="selectedAssignee.set($event)">
              @for (member of members(); track member.id) {
                <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
              }
            </nz-select>
            <button nz-button nzType="primary" [disabled]="!selectedAssignee()" [nzLoading]="busy()" (click)="assign.emit(selectedAssignee()!)">
              指派
            </button>
          </div>
        </div>
      } -->

      @if (participants().length > 0) {
        <div class="participant-list participant-list--chips">
          @for (item of participants(); track item.id) {
            <div class="participant-item">
              <div class="participant-chip">
                <span class="mini-avatar">{{ item.userName.slice(0, 1) }}</span>
                <span class="participant-item__name">{{ item.userName }}</span>
              </div>
              @if (canManageParticipants()) {
                <button nz-button nzType="text"
                  nz-popconfirm
                  nzPopconfirmTitle="确定要移除该参与人吗？"
                  nzPopconfirmOkText="移除"
                  nzPopconfirmCancelText="取消"
                  nz-tooltip="移除参与人"
                  (nzOnConfirm)="removeParticipant.emit(item.id)"
                  nzSize="small"
                  [nzLoading]="busy()">
                  <i nz-icon nzType="minus"></i>
                </button>
              }
            </div>
          }
        </div>
      }
    </app-panel-card>
  `,
  styles: [
    `
      .panel__section {
        padding: 18px 20px;
        display: grid;
        gap: 12px;
      }
      .panel__section--compact {
        border-bottom: 1px solid var(--border-color-soft);
      }
      .assign-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
      }
      .participant-list {
        display: grid;
      }
      .participant-list--chips {
        padding: 12px 20px 16px;
        gap: 10px;
      }
      .participant-item {
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
        background: var(--bg-subtle);
      }
      .participant-item__name {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-primary);
      }
      .mini-avatar {
        width: 24px;
        height: 24px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
        color: #fff;
        font-size: 10px;
        font-weight: 700;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueCollaboratorsPanelComponent {
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
