import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { MentionOnSearchTypes, NzMentionModule } from 'ng-zorro-antd/mention';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { ROLE_LABELS } from '@app/shared/constants';
import { AuthStore } from '@core/auth';
import { PanelCardComponent } from '@shared/ui';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { IssueCommentEntity } from '../../models/issue.model';

@Component({
  selector: 'app-issue-comment-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, NzAvatarModule, NzButtonModule, NzIconModule, NzInputModule, NzMentionModule, PanelCardComponent],
  templateUrl: './issue-comment-editor.component.html',
  styleUrls: ['./issue-comment-editor.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueCommentEditorComponent {
  private readonly authStore = inject(AuthStore);

  readonly comments = input.required<IssueCommentEntity[]>();
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly busy = input(false);
  readonly submit = output<{ content: string; mentions: string[] }>();

  readonly draft = signal('');
  readonly mentionKeyword = signal('');
  readonly currentUser = this.authStore.currentUser;
  readonly currentUserInitial = computed(() => this.avatarText(this.currentUser()?.nickname || '我'));
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

  submitComment(): void {
    const raw = this.draft();
    const content = raw.trim();
    if (!content) {
      return;
    }

    this.submit.emit({ content, mentions: this.collectMentions(raw) });
    this.draft.set('');
    this.mentionKeyword.set('');
  }

  avatarText(name: string): string {
    return name.slice(0, 1);
  }

  mentionLabel(member: ProjectMemberEntity): string {
    return member.displayName?.trim() || member.userId;
  }

  handleMentionSearch(event: MentionOnSearchTypes): void {
    this.mentionKeyword.set(event.value || '');
  }

  handleMentionSelect(_member: ProjectMemberEntity): void {
    this.mentionKeyword.set('');
  }

  commentSegments(item: IssueCommentEntity): Array<{ text: string; mentioned: boolean }> {
    const mentionMarkers = this.mentionMarkers(item);
    if (mentionMarkers.length === 0) {
      return [{ text: item.content, mentioned: false }];
    }

    const escaped = mentionMarkers
      .sort((left, right) => right.length - left.length)
      .map((value) => this.escapeRegExp(value));
    const pattern = new RegExp(`(${escaped.join('|')})`, 'g');
    const segments: Array<{ text: string; mentioned: boolean }> = [];
    let lastIndex = 0;

    for (const match of item.content.matchAll(pattern)) {
      const index = match.index ?? 0;
      const text = match[0] ?? '';
      if (!text) {
        continue;
      }
      if (index > lastIndex) {
        segments.push({ text: item.content.slice(lastIndex, index), mentioned: false });
      }
      segments.push({ text, mentioned: true });
      lastIndex = index + text.length;
    }

    if (lastIndex < item.content.length) {
      segments.push({ text: item.content.slice(lastIndex), mentioned: false });
    }

    return segments.length > 0 ? segments : [{ text: item.content, mentioned: false }];
  }

  roleLabel(roleCode: string): string {
    return ROLE_LABELS[roleCode] || roleCode;
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

  private mentionMarkers(item: IssueCommentEntity): string[] {
    const mentions = this.parseMentionIds(item.mentionsJson);
    if (mentions.length === 0) {
      return [];
    }

    const markers: string[] = [];
    for (const userId of mentions) {
      const member = this.members().find((m) => m.userId === userId);
      const label = member?.displayName?.trim() || member?.userId;
      if (label) {
        markers.push(`@${label}`);
      }
    }

    return Array.from(new Set(markers));
  }

  private parseMentionIds(raw: string | null): string[] {
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    } catch {
      return [];
    }
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
