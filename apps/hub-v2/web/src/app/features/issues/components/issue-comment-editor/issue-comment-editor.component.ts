import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ROLE_LABELS } from '@app/shared/constants';
import { AuthStore } from '@core/auth';
import { UPLOAD_TARGETS } from '@shared/constants';
import { ImageUploadService } from '@shared/services/image-upload.service';
import { PanelCardComponent } from '@shared/ui';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzInputModule } from 'ng-zorro-antd/input';
import { MentionOnSearchTypes, NzMentionModule } from 'ng-zorro-antd/mention';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { IssueCommentEntity } from '../../models/issue.model';
import { composeContentWithMarkdownImages, createUploadId, extractClipboardImages, revokePreviewUrls } from '../../utils';

interface CommentUploadItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'uploading' | 'done' | 'error';
  url: string | null;
  error: string | null;
}

@Component({
  selector: 'app-issue-comment-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, NzAvatarModule, NzButtonModule, NzIconModule, NzInputModule, NzMentionModule, NzImageModule, PanelCardComponent, NzTooltipModule],
  templateUrl: './issue-comment-editor.component.html',
  styleUrls: ['./issue-comment-editor.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueCommentEditorComponent implements OnDestroy {
  private readonly authStore = inject(AuthStore);
  private readonly imageUpload = inject(ImageUploadService);
  private readonly commentUploadPolicy = UPLOAD_TARGETS.commentImage;

  readonly comments = input.required<IssueCommentEntity[]>();
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly busy = input(false);
  readonly submit = output<{ content: string; mentions: string[] }>();

  readonly draft = signal('');
  readonly mentionKeyword = signal('');
  readonly uploads = signal<CommentUploadItem[]>([]);
  readonly uploading = computed(() => this.uploads().some((item) => item.status === 'uploading'));
  readonly canSubmit = computed(() => {
    const hasText = !!this.draft().trim();
    const hasUploadedImages = this.uploads().some((item) => item.status === 'done' && !!item.url);
    return (hasText || hasUploadedImages) && !this.busy() && !this.uploading();
  });
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
    const content = this.composeSubmitContent(raw);
    if (!content || this.uploading() || this.busy()) {
      return;
    }

    this.submit.emit({ content, mentions: this.collectMentions(raw) });
    this.draft.set('');
    this.mentionKeyword.set('');
    this.clearUploadItems();
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

  onPaste(event: ClipboardEvent): void {
    if (this.busy()) {
      return;
    }
    const files = extractClipboardImages(event, 'comment-image');
    if (files.length === 0) {
      return;
    }
    event.preventDefault();
    for (const file of files) {
      this.enqueueImageUpload(file);
    }
  }

  retryUpload(id: string): void {
    const target = this.uploads().find((item) => item.id === id);
    if (!target || target.status !== 'error') {
      return;
    }
    this.uploads.update((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, status: 'uploading', error: null }
          : item,
      ),
    );
    void this.runUpload(id, target.file);
  }

  removeUpload(id: string): void {
    const target = this.uploads().find((item) => item.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }
    this.uploads.update((items) => items.filter((item) => item.id !== id));
  }

  ngOnDestroy(): void {
    this.clearUploadItems();
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

  private enqueueImageUpload(file: File): void {
    const id = createUploadId(file);
    const previewUrl = URL.createObjectURL(file);
    this.uploads.update((items) => [...items, { id, file, previewUrl, status: 'uploading', url: null, error: null }]);
    void this.runUpload(id, file);
  }

  private async runUpload(id: string, file: File): Promise<void> {
    try {
      const url = await this.imageUpload.uploadImage(file, this.commentUploadPolicy);
      this.uploads.update((items) =>
        items.map((item) =>
          item.id === id
            ? { ...item, status: 'done', url, error: null }
            : item,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '图片上传失败';
      this.uploads.update((items) =>
        items.map((item) =>
          item.id === id
            ? { ...item, status: 'error', error: message }
            : item,
        ),
      );
    }
  }

  private composeSubmitContent(raw: string): string {
    return composeContentWithMarkdownImages(raw, this.uploads());
  }

  private clearUploadItems(): void {
    revokePreviewUrls(this.uploads());
    this.uploads.set([]);
  }
}
