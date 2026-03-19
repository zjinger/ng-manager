import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCommentModule } from 'ng-zorro-antd/comment';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzListModule } from 'ng-zorro-antd/list';
import { MentionOnSearchTypes, NzMentionModule } from 'ng-zorro-antd/mention';
import {
  roleLabel,
  type ProjectMemberItem,
  type ProjectMemberRole,
} from '../../../projects/projects.model';
import type { IssueComment, IssueCommentMention } from '../../issues.model';

export interface IssueCommentSubmitPayload {
  content: string;
  mentions: IssueCommentMention[];
}

@Component({
  selector: 'app-issue-comments',
  imports: [
    ReactiveFormsModule,
    NzAvatarModule,
    NzButtonModule,
    NzCommentModule,
    NzEmptyModule,
    NzInputModule,
    NzListModule,
    NzMentionModule,
  ],
  templateUrl: './issue-comments.component.html',
  styleUrls: ['./issue-comments.component.less'],
})
export class IssueCommentsComponent {
  private readonly fb = inject(FormBuilder);

  @Input() comments: IssueComment[] = [];
  @Input() memberOptions: ProjectMemberItem[] = [];
  @Input() canSubmit = false;
  @Input() submitting = false;

  @Output() readonly submitted = new EventEmitter<IssueCommentSubmitPayload>();

  protected mentionKeyword = '';

  protected readonly form = this.fb.nonNullable.group({
    content: ['', [Validators.required, Validators.maxLength(5000)]],
  });

  protected submit(): void {
    if (!this.canSubmit || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const content = this.form.controls.content.value.trim();
    if (!content) {
      return;
    }

    this.submitted.emit({
      content,
      mentions: this.collectMentions(content),
    });
    this.form.reset({ content: '' });
    this.mentionKeyword = '';
  }

  protected authorName(item: IssueComment): string {
    return item.authorName?.trim() || '未知用户';
  }

  protected avatarText(item: IssueComment): string {
    return this.authorName(item).slice(0, 1).toUpperCase();
  }

  protected avatarUrl(item: IssueComment): string {
    const menber = this.memberOptions.find((m) => {
      return item.authorId === m.userId;
    });
    return menber?.avatarUrl ?? '';
  }

  protected datetimeText(item: IssueComment): string {
    const createdAt = new Date(item.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      return item.createdAt;
    }
    return formatDistanceToNow(createdAt, { addSuffix: true, locale: zhCN });
  }

  protected mentionSuggestions(): ProjectMemberItem[] {
    const keyword = this.mentionKeyword.trim().toLowerCase();
    if (!keyword) {
      return this.memberOptions.slice(0, 20);
    }
    return this.memberOptions
      .filter((member) => {
        const displayName = (member.displayName || '').toLowerCase();
        const userId = (member.userId || '').toLowerCase();
        return displayName.includes(keyword) || userId.includes(keyword);
      })
      .slice(0, 20);
  }

  protected mentionLabel(member: ProjectMemberItem): string {
    return member.displayName?.trim() || member.userId;
  }

  protected mentionUserRoles(roles: ProjectMemberRole[]): string {
    return roles.map((role) => roleLabel(role)).join(', ');
  }

  protected handleMentionSearch(event: MentionOnSearchTypes): void {
    this.mentionKeyword = event.value || '';
  }

  private collectMentions(content: string): IssueCommentMention[] {
    const result: IssueCommentMention[] = [];
    const seen = new Set<string>();

    for (const member of this.memberOptions) {
      const displayName = member.displayName?.trim() || member.userId;
      const marker = `@${displayName}`;
      if (!content.includes(marker) || seen.has(member.userId)) {
        continue;
      }
      result.push({
        userId: member.userId,
        displayName,
      });
      seen.add(member.userId);
    }

    return result;
  }
}
