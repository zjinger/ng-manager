import { CommonModule } from '@angular/common';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnDestroy, ViewChild, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ROLE_LABELS } from '@app/shared/constants';
import { AuthStore } from '@core/auth';
import { UPLOAD_TARGETS } from '@shared/constants';
import { ImageUploadService } from '@shared/services/image-upload.service';
import { PanelCardComponent } from '@shared/ui';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, of, Subject, switchMap } from 'rxjs';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzInputModule } from 'ng-zorro-antd/input';
import { MentionOnSearchTypes, NzMentionComponent, NzMentionModule } from 'ng-zorro-antd/mention';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { IssueCommentEntity, IssueEntity, IssueListResult } from '../../models/issue.model';
import { IssueApiService } from '../../services/issue-api.service';
import { composeContentWithMarkdownImages, createUploadId, extractClipboardImages, parseIssueReferenceSegments, revokePreviewUrls } from '../../utils';

interface CommentUploadItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'uploading' | 'done' | 'error';
  url: string | null;
  error: string | null;
}

interface IssueReferenceOption {
  kind: 'issue';
  id: string;
  issueNo: string;
  title: string;
}

interface SlashCommandOption {
  kind: 'command';
  command: '测试单';
  label: string;
  description: string;
}

interface ActiveIssueLinkCommand {
  start: number;
  end: number;
  query: string;
}

interface IssueReferenceSearchResult {
  query: string;
  result: IssueListResult;
}

type MentionSuggestion = ProjectMemberEntity | SlashCommandOption;
type MentionPrefix = '@' | '/';

const LINK_COMMAND: SlashCommandOption = {
  kind: 'command',
  command: '测试单',
  label: '/测试单',
  description: '引用测试单',
};
const ISSUE_REFERENCE_SEARCH_DEBOUNCE_MS = 300;
const ISSUE_REFERENCE_PAGE_SIZE = 20;
const ISSUE_REFERENCE_OVERLAY_POSITIONS: ConnectedPosition[] = [
  {
    originX: 'start',
    originY: 'bottom',
    overlayX: 'start',
    overlayY: 'top',
    offsetY: 6,
  },
  {
    originX: 'start',
    originY: 'top',
    overlayX: 'start',
    overlayY: 'bottom',
    offsetY: -6,
  },
];

@Component({
  selector: 'app-issue-comment-editor',
  standalone: true,
  imports: [CommonModule, CdkConnectedOverlay, CdkOverlayOrigin, FormsModule, NzAvatarModule, NzButtonModule, NzIconModule, NzInputModule, NzMentionModule, NzImageModule, PanelCardComponent, NzTooltipModule],
  templateUrl: './issue-comment-editor.component.html',
  styleUrls: ['./issue-comment-editor.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueCommentEditorComponent implements OnDestroy {
  private readonly authStore = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly issueApi = inject(IssueApiService);
  private readonly imageUpload = inject(ImageUploadService);
  private readonly commentUploadPolicy = UPLOAD_TARGETS.commentImage;
  private readonly issueSearch$ = new Subject<string>();
  private uploadListObserver: ResizeObserver | null = null;

  @ViewChild('uploadListRef')
  set uploadListRef(value: ElementRef<HTMLElement> | undefined) {
    this.bindUploadListObserver(value?.nativeElement ?? null);
  }

  @ViewChild('textareaRef')
  private textareaRef?: ElementRef<HTMLTextAreaElement>;

  @ViewChild('inputShellRef')
  private inputShellRef?: ElementRef<HTMLElement>;

  @ViewChild('mentionRef')
  private mentionRef?: NzMentionComponent;

  readonly comments = input.required<IssueCommentEntity[]>();
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly issueId = input<string | null>(null);
  readonly projectId = input<string | null>(null);
  readonly busy = input(false);
  readonly submit = output<{ content: string; mentions: string[] }>();

  readonly draft = signal('');
  readonly mentionKeyword = signal('');
  readonly activeMentionPrefix = signal<MentionPrefix>('@');
  readonly slashCommandKeyword = signal('');
  readonly activeIssueLinkCommand = signal<ActiveIssueLinkCommand | null>(null);
  readonly issueReferenceOptions = signal<IssueReferenceOption[]>([]);
  readonly issueReferenceLoading = signal(false);
  readonly issueReferenceLoadingMore = signal(false);
  readonly issueReferenceQuery = signal('');
  readonly issueReferencePage = signal(1);
  readonly issueReferenceTotal = signal(0);
  readonly hasMoreIssueReferences = computed(() => this.issueReferenceOptions().length < this.issueReferenceTotal());
  readonly issueReferenceOverlayWidth = signal(0);
  readonly issueReferenceOverlayPositions = ISSUE_REFERENCE_OVERLAY_POSITIONS;
  readonly uploads = signal<CommentUploadItem[]>([]);
  readonly uploadListHeight = signal(0);
  readonly textareaPaddingTop = computed(() => this.uploadListHeight() + 20);
  readonly uploading = computed(() => this.uploads().some((item) => item.status === 'uploading'));
  readonly canSubmit = computed(() => {
    const hasText = !!this.draft().trim();
    const hasUploadedImages = this.uploads().some((item) => item.status === 'done' && !!item.url);
    return (hasText || hasUploadedImages) && !this.busy() && !this.uploading();
  });
  readonly currentUser = this.authStore.currentUser;
  readonly currentUserInitial = computed(() => this.avatarText(this.currentUser()?.nickname || '我'));
  readonly mentionOptions = computed<MentionSuggestion[]>(() => {
    if (this.activeMentionPrefix() === '/') {
      const keyword = this.slashCommandKeyword().trim().toLowerCase();
      if (!keyword || LINK_COMMAND.command.includes(keyword) || LINK_COMMAND.description.includes(keyword)) {
        return [LINK_COMMAND];
      }
      return [];
    }

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
  readonly mentionValue = (option: MentionSuggestion): string => {
    if (this.isSlashCommandOption(option)) {
      return option.command;
    }
    return this.mentionLabel(option);
  };
  readonly mentionNotFoundText = computed(() => (this.activeMentionPrefix() === '/' ? '无可用命令' : '未找到匹配成员'));

  constructor() {
    this.issueSearch$
      .pipe(
        map((keyword) => keyword.trim()),
        debounceTime(ISSUE_REFERENCE_SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((normalizedKeyword) => {
          const projectId = this.projectId();
          if (!projectId || !normalizedKeyword) {
            this.issueReferenceLoading.set(false);
            return of({ query: normalizedKeyword, result: this.emptyIssueListResult() });
          }
          this.issueReferenceLoading.set(true);
          return this.issueApi
            .list({
              page: 1,
              pageSize: ISSUE_REFERENCE_PAGE_SIZE,
              keyword: normalizedKeyword,
              projectId,
              includeAssigneeParticipants: false,
              sortBy: 'updatedAt',
              sortOrder: 'desc',
            })
            .pipe(
              map((result) => ({ query: normalizedKeyword, result })),
              catchError(() => of({ query: normalizedKeyword, result: this.emptyIssueListResult() })),
              finalize(() => this.issueReferenceLoading.set(false)),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ query, result }) => {
        this.issueReferenceQuery.set(query);
        this.issueReferencePage.set(result.page);
        this.issueReferenceTotal.set(result.total);
        this.issueReferenceOptions.set(this.toIssueReferenceOptions(result.items));
      });
  }

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

  handleDraftChange(value: string): void {
    this.draft.set(value);
    this.refreshActiveIssueLinkCommand();
  }

  handleMentionSearch(event: MentionOnSearchTypes): void {
    if (event.prefix === '/') {
      this.activeMentionPrefix.set('/');
      this.slashCommandKeyword.set(event.value || '');
      return;
    }

    this.activeMentionPrefix.set('@');
    this.mentionKeyword.set(event.value || '');
  }

  handleMentionSelect(option: MentionSuggestion): void {
    if (this.isSlashCommandOption(option)) {
      queueMicrotask(() => this.refreshActiveIssueLinkCommand());
      return;
    }
    this.mentionKeyword.set('');
  }

  handleTextareaNavigation(): void {
    this.refreshActiveIssueLinkCommand();
  }

  handleTextareaKeydown(event: KeyboardEvent): void {
    if (!this.activeIssueLinkCommand()) {
      return;
    }
    if (event.key === 'Escape') {
      this.activeIssueLinkCommand.set(null);
      this.issueReferenceOptions.set([]);
      event.preventDefault();
      return;
    }
    if (event.key === 'Enter' && this.issueReferenceOptions().length > 0) {
      this.insertIssueReference(this.issueReferenceOptions()[0]);
      event.preventDefault();
    }
  }

  insertIssueReference(option: IssueReferenceOption): void {
    const command = this.activeIssueLinkCommand();
    if (!command) {
      return;
    }
    const raw = this.draft();
    const link = `[${option.issueNo} ${option.title}](/issues/${option.id})`;
    const trailingSpace = raw[command.end] && !/\s/.test(raw[command.end]) ? ' ' : '';
    const next = `${raw.slice(0, command.start)}${link}${trailingSpace}${raw.slice(command.end)}`;
    const caret = command.start + link.length + trailingSpace.length;

    this.draft.set(next);
    this.activeIssueLinkCommand.set(null);
    this.issueReferenceOptions.set([]);
    this.issueReferenceQuery.set('');
    this.issueReferencePage.set(1);
    this.issueReferenceTotal.set(0);
    this.updateTextareaValue(next, caret);
  }

  onIssueReferenceScroll(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (remaining > 24) {
      return;
    }
    this.loadMoreIssueReferences();
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
    this.bindUploadListObserver(null);
    this.clearUploadItems();
  }

  commentSegments(item: IssueCommentEntity): Array<{ text: string; mentioned?: boolean; issueReference?: boolean; issueId?: string }> {
    const mentionMarkers = this.mentionMarkers(item);
    const segments: Array<{ text: string; mentioned?: boolean; issueReference?: boolean; issueId?: string }> = [];
    for (const segment of parseIssueReferenceSegments(item.content)) {
      if (segment.issueReference) {
        segments.push(segment);
        continue;
      }
      segments.push(...this.highlightMentionSegments(segment.text, mentionMarkers));
    }

    return segments.length > 0 ? segments : [{ text: item.content }];
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

  isSlashCommandOption(option: MentionSuggestion): option is SlashCommandOption {
    return 'kind' in option && option.kind === 'command';
  }

  private toIssueReferenceOption(issue: IssueEntity): IssueReferenceOption {
    return {
      kind: 'issue',
      id: issue.id,
      issueNo: issue.issueNo,
      title: issue.title,
    };
  }

  private toIssueReferenceOptions(items: IssueEntity[]): IssueReferenceOption[] {
    return items
      .filter((issue) => issue.id !== this.issueId())
      .map((issue) => this.toIssueReferenceOption(issue));
  }

  private emptyIssueListResult(): IssueListResult {
    return {
      items: [],
      page: 1,
      pageSize: ISSUE_REFERENCE_PAGE_SIZE,
      total: 0,
    };
  }

  private highlightMentionSegments(text: string, mentionMarkers: string[]): Array<{ text: string; mentioned?: boolean }> {
    if (!text || mentionMarkers.length === 0) {
      return text ? [{ text }] : [];
    }

    const escaped = [...mentionMarkers]
      .sort((left, right) => right.length - left.length)
      .map((value) => this.escapeRegExp(value));
    const pattern = new RegExp(`(${escaped.join('|')})`, 'g');
    const segments: Array<{ text: string; mentioned?: boolean }> = [];
    let lastIndex = 0;

    for (const match of text.matchAll(pattern)) {
      const index = match.index ?? 0;
      const matchedText = match[0] ?? '';
      if (!matchedText) {
        continue;
      }
      if (index > lastIndex) {
        segments.push({ text: text.slice(lastIndex, index) });
      }
      segments.push({ text: matchedText, mentioned: true });
      lastIndex = index + matchedText.length;
    }

    if (lastIndex < text.length) {
      segments.push({ text: text.slice(lastIndex) });
    }

    return segments.length > 0 ? segments : [{ text }];
  }

  private refreshActiveIssueLinkCommand(): void {
    const raw = this.draft();
    const caret = this.textareaRef?.nativeElement.selectionStart ?? raw.length;
    const command = this.findActiveIssueLinkCommand(raw, caret);

    this.activeIssueLinkCommand.set(command);
    if (command) {
      this.updateIssueReferenceOverlayWidth();
      this.mentionRef?.closeDropdown();
      this.issueSearch$.next(command.query);
    } else {
      this.issueReferenceOptions.set([]);
      this.issueReferenceQuery.set('');
      this.issueReferencePage.set(1);
      this.issueReferenceTotal.set(0);
    }
  }

  private loadMoreIssueReferences(): void {
    const projectId = this.projectId();
    const keyword = this.issueReferenceQuery().trim();
    if (!projectId || !keyword || this.issueReferenceLoading() || this.issueReferenceLoadingMore() || !this.hasMoreIssueReferences()) {
      return;
    }

    const nextPage = this.issueReferencePage() + 1;
    this.issueReferenceLoadingMore.set(true);
    this.issueApi
      .list({
        page: nextPage,
        pageSize: ISSUE_REFERENCE_PAGE_SIZE,
        keyword,
        projectId,
        includeAssigneeParticipants: false,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      })
      .pipe(
        map((result) => ({
          result,
          options: this.toIssueReferenceOptions(result.items),
        })),
        catchError(() => of({ result: this.emptyIssueListResult(), options: [] })),
        finalize(() => this.issueReferenceLoadingMore.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ result, options }) => {
        this.issueReferencePage.set(result.page);
        this.issueReferenceTotal.set(result.total);
        const seen = new Set(this.issueReferenceOptions().map((item) => item.id));
        this.issueReferenceOptions.update((items) => [
          ...items,
          ...options.filter((item) => !seen.has(item.id)),
        ]);
      });
  }

  private updateIssueReferenceOverlayWidth(): void {
    const width = Math.ceil(this.inputShellRef?.nativeElement.getBoundingClientRect().width ?? 0);
    if (width > 0 && width !== this.issueReferenceOverlayWidth()) {
      this.issueReferenceOverlayWidth.set(width);
    }
  }

  private findActiveIssueLinkCommand(raw: string, caret: number): ActiveIssueLinkCommand | null {
    const lineStart = Math.max(raw.lastIndexOf('\n', caret - 1) + 1, 0);
    const beforeCaret = raw.slice(lineStart, caret);
    const match = /(^|\s)\/测试单(?:\s+([^\s\]]*))?$/.exec(beforeCaret);
    if (!match) {
      return null;
    }

    const leadingSpace = match[1] || '';
    const commandStart = lineStart + (match.index ?? 0) + leadingSpace.length;
    return {
      start: commandStart,
      end: caret,
      query: match[2] || '',
    };
  }

  private updateTextareaValue(value: string, caret: number): void {
    const textarea = this.textareaRef?.nativeElement;
    if (!textarea) {
      return;
    }
    textarea.value = value;
    textarea.focus();
    textarea.setSelectionRange(caret, caret);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
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

  private bindUploadListObserver(element: HTMLElement | null): void {
    if (this.uploadListObserver) {
      this.uploadListObserver.disconnect();
      this.uploadListObserver = null;
    }

    if (!element) {
      this.uploadListHeight.set(0);
      return;
    }

    const measure = () => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      if (height !== this.uploadListHeight()) {
        this.uploadListHeight.set(height);
      }
    };

    measure();
    this.uploadListObserver = new ResizeObserver(() => measure());
    this.uploadListObserver.observe(element);
  }
}
