import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
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
import { roleLabel, type ProjectMemberItem, type ProjectMemberRole } from '../../../projects/projects.model';
import type { IssueComment, IssueCommentMention } from '../../issues.model';

const MENTION_META_DELIMITER = '⁣';
const MENTION_META_CODEPOINTS = Array.from({ length: 16 }, (_, index) => String.fromCharCode(0xfe00 + index));
const MENTION_META_REGEX = new RegExp(
  `@([^@\n${MENTION_META_DELIMITER}]+)${MENTION_META_DELIMITER}([\uFE00-\uFE0F]+)${MENTION_META_DELIMITER}`,
  'g'
);

export interface IssueCommentSubmitPayload {
  content: string;
  mentions: IssueCommentMention[];
}

interface IssueCommentSegment {
  text: string;
  mentioned: boolean;
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
    NzMentionModule
  ],
  templateUrl: './issue-comments.component.html',
  styleUrls: ['./issue-comments.component.less']
})
export class IssueCommentsComponent {
  private readonly fb = inject(FormBuilder);

  @Input() comments: IssueComment[] = [];
  @Input() memberOptions: ProjectMemberItem[] = [];
  @Input() canSubmit = false;
  @Input() submitting = false;

  @Output() readonly submitted = new EventEmitter<IssueCommentSubmitPayload>();

  @ViewChild('commentInput') private commentInput?: ElementRef<HTMLTextAreaElement>;

  protected mentionKeyword = '';

  protected readonly form = this.fb.nonNullable.group({
    content: ['', [Validators.required, Validators.maxLength(5000)]]
  });

  protected submit(): void {
    if (!this.canSubmit || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawContent = this.form.controls.content.value;
    const content = this.normalizeContent(rawContent).trim();
    if (!content) {
      return;
    }

    this.submitted.emit({
      content,
      mentions: this.collectMentions(rawContent)
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
    return this.memberOptions.filter((member) => {
      const displayName = (member.displayName || '').toLowerCase();
      const userId = (member.userId || '').toLowerCase();
      return displayName.includes(keyword) || userId.includes(keyword);
    }).slice(0, 20);
  }

  protected mentionLabel(member: ProjectMemberItem): string {
    return member.displayName?.trim() || member.userId;
  }

  protected mentionUserRoles(roles: ProjectMemberRole[]): string {
    return roles.map(role => roleLabel(role)).join(', ');
  }

  protected handleMentionSearch(event: MentionOnSearchTypes): void {
    this.mentionKeyword = event.value || '';
  }

  protected handleMentionSelect(member: ProjectMemberItem): void {
    const input = this.commentInput?.nativeElement;
    const currentValue = this.form.controls.content.value;
    const mentionLabel = this.mentionLabel(member);
    const mentionText = `@${mentionLabel}`;
    const caret = input?.selectionStart ?? currentValue.length;
    const mentionStart = currentValue.lastIndexOf(mentionText, caret);

    if (mentionStart < 0) {
      return;
    }

    const mentionEnd = mentionStart + mentionText.length;
    const encodedMention = `${mentionText}${MENTION_META_DELIMITER}${this.encodeMentionMeta(member.userId)}${MENTION_META_DELIMITER}`;
    const nextValue = `${currentValue.slice(0, mentionStart)}${encodedMention}${currentValue.slice(mentionEnd)}`;
    const nextCaret = caret + encodedMention.length - mentionText.length;

    this.form.controls.content.setValue(nextValue);
    queueMicrotask(() => input?.setSelectionRange(nextCaret, nextCaret));
  }

  protected commentSegments(item: IssueComment): IssueCommentSegment[] {
    if (!item.mentions.length) {
      return [{ text: item.content, mentioned: false }];
    }

    const mentionMap = new Map<string, true>(
      item.mentions
        .map((mention) => mention.displayName?.trim())
        .filter((displayName): displayName is string => !!displayName)
        .map((displayName) => [`@${displayName}`, true] as const)
    );

    if (!mentionMap.size) {
      return [{ text: item.content, mentioned: false }];
    }

    const markers = Array.from(mentionMap.keys())
      .sort((left, right) => right.length - left.length)
      .map((marker) => this.escapeRegExp(marker));
    const pattern = new RegExp(`(${markers.join('|')})`, 'g');
    const segments: IssueCommentSegment[] = [];
    let lastIndex = 0;

    for (const match of item.content.matchAll(pattern)) {
      const index = match.index ?? 0;
      if (index > lastIndex) {
        segments.push({ text: item.content.slice(lastIndex, index), mentioned: false });
      }

      const text = match[0] ?? '';
      if (text) {
        segments.push({ text, mentioned: mentionMap.has(text) });
      }
      lastIndex = index + text.length;
    }

    if (lastIndex < item.content.length) {
      segments.push({ text: item.content.slice(lastIndex), mentioned: false });
    }

    return segments.length ? segments : [{ text: item.content, mentioned: false }];
  }

  private escapeRegExp(value: string): string {
    let result = '';
    for (const char of value) {
      result += '\^$.*+?()[]{}|'.includes(char) ? `\${char}` : char;
    }
    return result;
  }

  private encodeMentionMeta(userId: string): string {
    return userId
      .split('')
      .flatMap((char) => char.charCodeAt(0).toString(16).padStart(4, '0').split(''))
      .map((digit) => MENTION_META_CODEPOINTS[Number.parseInt(digit, 16)])
      .join('');
  }

  private decodeMentionMeta(value: string): string | null {
    if (!value || value.length % 4 !== 0) {
      return null;
    }

    const hex = Array.from(value)
      .map((char) => {
        const index = MENTION_META_CODEPOINTS.indexOf(char);
        return index >= 0 ? index.toString(16) : '';
      })
      .join('');

    if (!hex || hex.length % 4 !== 0) {
      return null;
    }

    const chars: string[] = [];
    for (let index = 0; index < hex.length; index += 4) {
      const code = Number.parseInt(hex.slice(index, index + 4), 16);
      if (Number.isNaN(code)) {
        return null;
      }
      chars.push(String.fromCharCode(code));
    }

    return chars.join('');
  }

  private collectMentions(content: string): IssueCommentMention[] {
    const result: IssueCommentMention[] = [];
    const seen = new Set<string>();

    for (const match of content.matchAll(MENTION_META_REGEX)) {
      const displayName = match[1]?.trim();
      const userId = this.decodeMentionMeta(match[2] || '');
      if (!displayName || !userId || seen.has(userId)) {
        continue;
      }

      const member = this.memberOptions.find((item) => item.userId === userId);
      result.push({
        userId,
        displayName: member?.displayName?.trim() || displayName
      });
      seen.add(userId);
    }

    return result;
  }

  private normalizeContent(content: string): string {
    return content.replace(MENTION_META_REGEX, (_matched, displayName: string) => `@${displayName.trim()}`);
  }
}
