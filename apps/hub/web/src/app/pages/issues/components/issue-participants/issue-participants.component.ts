import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import type { ProjectMemberItem } from '../../../projects/projects.model';
import { memberDisplay, type IssueParticipant } from '../../issues.model';

@Component({
  selector: 'app-issue-participants',
  imports: [ReactiveFormsModule, NzButtonModule, NzEmptyModule, NzSelectModule, NzTagModule],
  templateUrl: './issue-participants.component.html',
  styleUrls: ['./issue-participants.component.less']
})
export class IssueParticipantsComponent {
  private readonly fb = inject(FormBuilder);

  @Input() assigneeId: string | null = null;
  @Input() participants: IssueParticipant[] = [];
  @Input() memberOptions: ProjectMemberItem[] = [];
  @Input() allowManage = false;
  @Input() saving = false;

  @Output() readonly added = new EventEmitter<string>();
  @Output() readonly removed = new EventEmitter<string>();

  protected readonly form = this.fb.nonNullable.group({
    userId: ['']
  });

  protected availableMembers(): ProjectMemberItem[] {
    const participantIds = new Set(this.participants.map((item) => item.userId));
    return this.memberOptions.filter((member) => member.userId !== this.assigneeId && !participantIds.has(member.userId));
  }

  protected memberLabel(member: ProjectMemberItem): string {
    return memberDisplay(member);
  }

  protected addParticipant(): void {
    const userId = this.form.controls.userId.value.trim();
    if (!userId) {
      return;
    }
    this.added.emit(userId);
    this.form.reset({ userId: '' });
  }
}
