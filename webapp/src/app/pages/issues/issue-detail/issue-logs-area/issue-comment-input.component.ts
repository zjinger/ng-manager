import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ROLE_LABELS } from '@app/shared/constants/role-options';
import { ProjectMemberEntity } from '@models/project.model';
import { createCommentInput } from '@pages/issues/models/issue.model';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCommentModule } from 'ng-zorro-antd/comment';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { MentionOnSearchTypes, NzMentionModule } from 'ng-zorro-antd/mention';

@Component({
  selector: 'app-issue-comment-input',
  imports: [
    NzCommentModule,
    NzAvatarModule,
    NzMentionModule,
    NzButtonModule,
    NzInputModule,
    CommonModule,
    FormsModule,
    NzFormModule,
  ],
  template: `
    <nz-comment>
      <nz-avatar
        nz-comment-avatar
        [nzSrc]=""
        [nzText]="'我'"
        nzSize="small"
        style="background-color:#87d068"
      />
      <nz-comment-content>
        <nz-form-item>
          <nz-mention
            [nzSuggestions]="mentionOptions()"
            [nzValueWith]="mentionLabel"
            (nzOnSearchChange)="handleMentionSearch($event)"
            (nzOnSelect)="handleMentionSelect($event)"
          >
            <textarea
              [(ngModel)]="commentDraft"
              nz-input
              nzMentionTrigger
              rows="4"
              class="comment-input"
              placeholder="添加评论...输入 @ 提及成员"
            ></textarea>
            <ng-template nzMentionSuggestion let-member>
              <div class="mention-option">
                <span class="mention-name">{{ member.displayName || member.userId }}</span>
                <span class="mention-id">{{ roleLabel(member.roleCode) }}</span>
              </div>
            </ng-template>
          </nz-mention>
        </nz-form-item>
        <nz-form-item class="toolbar">
          <button
            nz-button
            nzType="primary"
            [nzLoading]="busy()"
            (click)="handleSubmit()"
            class="send"
            [disabled]="!canComment()"
          >
            @if (canComment()) {
              发送评论
            } @else {
              没有评论权限
            }
          </button>
        </nz-form-item>
      </nz-comment-content>
    </nz-comment>
  `,
  styles: `
    .comment-input {
      width: 100%;
      border-radius: 10px;
    }
    .toolbar {
      display: flex;
      justify-content: end;
    }
    .send {
      border-radius: 6px;
    }
    .mention-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .mention-name {
      font-weight: 600;
    }
    .mention-id {
      font-size: 12px;
    }
  `,
})
export class IssueCommentInputComponent {
  readonly busy = input(false);
  readonly canComment = input(false);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly submit = output<createCommentInput>();

  readonly mentionKeyword = signal('');
  readonly commentDraft = signal('');

  // 提及选项
  readonly mentionOptions = computed(() => {
    const keyword = this.mentionKeyword().trim().toLowerCase();
    const members = this.members();
    if (!keyword) {
      return members.slice(0, 20);
    }
    return members
      .filter((member) => {
        const displayName = (member.displayName || '').toLowerCase();
        const userId = (member.userId || '').toLowerCase();
        return displayName.includes(keyword) || userId.includes(keyword);
      })
      .slice(0, 20);
  });

  mentionLabel(member: ProjectMemberEntity): string {
    return member.displayName?.trim() || member.userId;
  }

  handleMentionSearch(event: MentionOnSearchTypes): void {
    this.mentionKeyword.set(event.value || '');
  }

  handleMentionSelect(_member: ProjectMemberEntity): void {
    this.mentionKeyword.set('');
  }

  roleLabel(roleCode: string): string {
    return ROLE_LABELS[roleCode] || roleCode;
  }

  handleSubmit() {
    if (!this.commentDraft().trim()) return;
    this.submit.emit({
      content: this.commentDraft(),
      mentions: this.collectMentions(this.commentDraft()),
    });
    this.commentDraft.set('');
    this.mentionKeyword.set('');
  }

  private collectMentions(content: string): string[] {
    const result = new Set<string>();
    for (const member of this.members()) {
      const label = this.mentionLabel(member);
      if (label && content.includes(`@${label}`)) {
        result.add(member.userId);
      }
    }
    return [...result];
  }
}
