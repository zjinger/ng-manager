import { ChangeDetectionStrategy, Component, OnDestroy, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ISSUE_PRIORITY_OPTIONS, ISSUE_TYPE_OPTIONS } from '@shared/constants';
import { AttachmentPreviewWallComponent, DialogShellComponent, FormActionsComponent, MarkdownEditorComponent } from '@shared/ui';
import type { AttachmentPreviewItem } from '@shared/ui';
import type { ProjectMemberEntity, ProjectMetaItem, ProjectVersionItem } from '../../../projects/models/project.model';
import type { CreateIssueInput, IssueType } from '../../models/issue.model';
import { MarkdownImageUploadService } from '../../../../shared/services/markdown-image-upload.service';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import type { NzUploadFile, NzUploadXHRArgs } from 'ng-zorro-antd/upload';

type Draft = Omit<CreateIssueInput, 'projectId'> & {
  attachmentFiles: File[];
};

const DEFAULT_DRAFT: Draft = {
  title: '',
  description: '',
  type: 'bug',
  priority: 'medium',
  assigneeId: null,
  participantIds: [],
  verifierId: null,
  moduleCode: '',
  versionCode: '',
  environmentCode: '',
  attachmentFiles: [],
};

@Component({
  selector: 'app-issue-create-dialog',
  standalone: true,
  imports: [FormsModule,
    NzFormModule,
    NzGridModule,
    NzUploadModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    AttachmentPreviewWallComponent,
    DialogShellComponent,
    FormActionsComponent,
    MarkdownEditorComponent
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [center]="true"
      [width]="920"
      [title]="'新建测试单' + (projectName() ? ' · ' + projectName() : '')"
      [subtitle]="''"
      [icon]="'plus-circle'"
      [modalClass]="'issue-create-modal'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form nz-form nzLayout="vertical">
          <div class="row" nz-row nzGutter="16">
            <div class="col" nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label nzRequired nzFor="title">标题</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    maxlength="120"
                    placeholder="简要描述问题，例如：登录接口在高并发下返回 500"
                    [ngModel]="draft().title"
                    name="title"
                    (ngModelChange)="updateField('title', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
          <div class="row" nz-row nzGutter="16">
            <div class="col" nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label nzFor="description">描述</nz-form-label>
                <nz-form-control>
                  <!-- <div class="md-toolbar">
                    <button type="button" class="md-toolbar__btn">B</button>
                    <button type="button" class="md-toolbar__btn">I</button>
                    <button type="button" class="md-toolbar__btn">S</button>
                    <span class="md-toolbar__sep"></span>
                    <button type="button" class="md-toolbar__btn">H</button>
                    <button type="button" class="md-toolbar__btn">•</button>
                    <button type="button" class="md-toolbar__btn">1.</button>
                    <span class="md-toolbar__sep"></span>
                    <button type="button" class="md-toolbar__btn">&#123; &#125;</button>
                    <button type="button" class="md-toolbar__btn">"</button>
                    <button type="button" class="md-toolbar__btn">↗</button>
                  </div> <textarea
                    nz-input
                    class="md-editor"
                    rows="8"
                    placeholder="**复现步骤：**&#10;1. &#10;2. &#10;3. &#10;&#10;**期望行为：**&#10;&#10;**实际行为：**&#10;&#10;**环境信息：**"
                    [ngModel]="draft().description"
                    name="description"
                    (ngModelChange)="updateField('description', $event)"
                  ></textarea> -->
	                  <app-markdown-editor 
	                    [ngModel]="draft().description" 
	                    [config]="editorConfig"
                      [imageUploadHandler]="uploadMarkdownImage"
	                    name="description"
	                    [minHeight]="'240px'"
	                    (contentChange)="updateField('description', $event)"
                      (imageUploadFailed)="onMarkdownImageUploadFailed($event)"
	                    [placeholder]="'**复现步骤：**&#10;1. &#10;2. &#10;3. &#10;&#10;**期望行为：**&#10;&#10;**实际行为：**&#10;&#10;'" />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
          <div class="row" nz-row nzGutter="16">
            <div class="col" nz-col nzSpan="12">
              <nz-form-item>
              <nz-form-label nzFor="type" nzRequired>类型</nz-form-label>
              <nz-form-control>
                <nz-select [ngModel]="draft().type" name="type" (ngModelChange)="updateType($event)">
                @for (item of issueTypeOptions; track item.value) {
                  <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                }
                </nz-select>
              </nz-form-control>
              </nz-form-item>
            </div>
            <div class="col" nz-col nzSpan="12">
              <nz-form-item>
              <nz-form-label nzFor="priority" nzRequired>优先级</nz-form-label>
              <nz-form-control>
                <nz-select [ngModel]="draft().priority" name="priority" (ngModelChange)="updateField('priority', $event)">
                @for (item of priorityOptions; track item.value) {
                  <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                }
              </nz-select>
              </nz-form-control>
              </nz-form-item>
            </div>
          </div>
          <div class="row" nz-row nzGutter="16">
            <div class="col" nz-col nzSpan="8">
              <nz-form-item>
              <nz-form-label nzFor="assigneeId">指派给</nz-form-label>
              <nz-form-control>
                <nz-select
                nzAllowClear
                nzPlaceHolder="未指派"
                [ngModel]="draft().assigneeId"
                name="assigneeId"
                (ngModelChange)="updateField('assigneeId', $event)"
              >
                @for (member of members(); track member.id) {
                  <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
                }
              </nz-select>
              </nz-form-control>
              </nz-form-item>
            </div>
            <div class="col" nz-col nzSpan="8">
              <nz-form-item>
                <nz-form-label >协作人</nz-form-label>
                <nz-form-control>
                  <nz-select
                    nzMode="multiple"
                    nzAllowClear
                    nzPlaceHolder="加入协作人并收到通知"
                    [ngModel]="draft().participantIds"
                    name="participantIds"
                    (ngModelChange)="updateParticipantIds($event)"
                  >
                    @for (member of participantCandidates(); track member.id) {
                      <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
                    }
                  </nz-select>
              </nz-form-control>
            </nz-form-item>   
            </div>
            <div class="col" nz-col nzSpan="8">
              <nz-form-item>
              <nz-form-label nzFor="verifierId">验证人</nz-form-label>
              <nz-form-control>
                <nz-select
                nzAllowClear
                nzPlaceHolder="未指定"
                [ngModel]="draft().verifierId"
                name="verifierId"
                (ngModelChange)="updateField('verifierId', $event)"
              >
                @for (member of members(); track member.id) {
                  <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
                }
              </nz-select>
              </nz-form-control>
              </nz-form-item>
            </div>
          </div>
          <div class="row" nz-row nzGutter="16">
            <div class="col" nz-col nzSpan="8">
              <nz-form-item>
              <nz-form-label nzFor="moduleCode">模块</nz-form-label>
              <nz-form-control>
                <nz-select
                nzAllowClear
                nzPlaceHolder="未选择"
                [ngModel]="draft().moduleCode"
                name="moduleCode"
                (ngModelChange)="updateField('moduleCode', $event)"
              >
                @for (item of modules(); track item.id) {
                  <nz-option [nzLabel]="item.name" [nzValue]="item.code || item.name"></nz-option>
                }
              </nz-select>
              </nz-form-control>
              </nz-form-item>
            </div>
            <div class="col" nz-col nzSpan="8">
              <nz-form-item>
                <nz-form-label nzFor="versionCode">版本</nz-form-label>
                <nz-form-control>
                  <nz-select nzAllowClear nzPlaceHolder="未选择" [ngModel]="draft().versionCode" name="versionCode" (ngModelChange)="updateField('versionCode', $event)">
                    @for (item of versions(); track item.id) {
                      <nz-option [nzLabel]="item.version" [nzValue]="item.code || item.version"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div class="col" nz-col nzSpan="8">
              <nz-form-item>
              <nz-form-label nzFor="environmentCode">环境</nz-form-label>
              <nz-form-control>
                <nz-select
                nzAllowClear
                nzPlaceHolder="未指定"
                [ngModel]="draft().environmentCode"
                name="environmentCode"
                (ngModelChange)="updateField('environmentCode', $event)"
              >
                @for (item of environments(); track item.id) {
                  <nz-option [nzLabel]="item.name" [nzValue]="item.code || item.name"></nz-option>
                }
              </nz-select>
              </nz-form-control>
              </nz-form-item>
            </div>
          </div>          
          <div class="row" nz-row nzGutter="16">
            <div class="col" nz-col nzSpan="24">
              <nz-form-item>
              <nz-form-label>附件</nz-form-label>
              <nz-form-control>
                <nz-upload
                    class="upload-zone"
                    nzType="drag"
                    [nzMultiple]="true"
                    [nzShowUploadList]="false"
                    [nzAccept]="acceptTypes"
                    [nzBeforeUpload]="beforeUpload"
                    [nzCustomRequest]="customRequest"
                  >
                    <p class="upload-zone__icon">
                      <nz-icon nzType="plus" />
                    </p>
                    <div class="upload-zone__title">点击或拖拽文件到此区域上传</div>
                    <div class="upload-zone__hint">支持图片/视频格式，单个文件最大 10MB</div>
                </nz-upload>
                @if (draft().attachmentFiles.length > 0) {
                  <div class="upload-picked">
                    <app-attachment-preview-wall
                      [items]="attachmentPreviewItems()"
                      [removeDisabled]="busy()"
                      (remove)="removeAttachmentById($event)"
                    />
                  </div>
                }
              </nz-form-control>
              </nz-form-item>
            </div>
          </div>          
         </form>
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="cancel.emit()">取消</button>
          <button
            nz-button
            nzType="primary"
            [disabled]="!draft().title.trim()"
            [nzLoading]="busy()"
            (click)="submitForm()"
            type="submit"
            form="issue-create-form"
          >
            <span nz-icon nzType="send"></span>
            创建 测试单
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .md-toolbar {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 14px;
        border: 1px solid var(--border-color);
        border-bottom: 0;
        border-radius: 14px 14px 0 0;
        background: var(--bg-subtle);
      }
      .md-toolbar__btn {
        min-width: 28px;
        height: 30px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: var(--text-muted);
        font-weight: 700;
      }
      .md-toolbar__btn:hover {
        background: var(--surface-overlay);
        color: var(--text-primary);
      }
      .md-toolbar__sep {
        width: 1px;
        height: 16px;
        background: var(--border-color);
      }
      .md-editor {
        border-top-left-radius: 0;
        border-top-right-radius: 0;
        border-bottom-left-radius: 14px;
        border-bottom-right-radius: 14px;
        min-height: 180px;
      }
      .upload-zone {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-height: 176px;
        padding: 24px;
        border: 1px dashed var(--border-color);
        border-radius: 18px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        text-align: center;
      }
      .upload-zone__icon {
        width: 52px;
        height: 52px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: color-mix(in srgb, var(--primary-500) 10%, transparent);
        color: var(--primary-500);
      }
      .upload-zone__icon > span[nz-icon] {
        font-size: 28px;
      }
      .upload-zone__title {
        font-weight: 600;
        color: var(--text-primary);
        font-size: 16px;
      }
      .upload-zone__hint {
        margin:0 auto;
        max-width: 360px;
        font-size: 14px;
        line-height: 1.7;
        color: var(--text-muted);
      }
      .upload-picked {
        margin-top: 12px;
      }
      .issue-field textarea.ant-input {
        border-radius: 0 0 8px 8px;
      }
      :host-context(html[data-theme='dark']) .upload-zone {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01)), var(--bg-subtle);
      }
      :host-context(html[data-theme='dark']) .upload-zone__icon {
        background: color-mix(in srgb, var(--primary-500) 18%, transparent);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueCreateDialogComponent implements OnDestroy {
  private readonly message = inject(NzMessageService);
  private readonly markdownImageUpload = inject(MarkdownImageUploadService);
  private readonly previewUrlMap = new Map<string, string>();

  readonly open = input(false);
  readonly busy = input(false);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly modules = input<ProjectMetaItem[]>([]);
  readonly environments = input<ProjectMetaItem[]>([]);
  readonly versions = input<ProjectVersionItem[]>([]);
  readonly projectName = input<string>('');
  readonly create = output<Draft>();
  readonly cancel = output<void>();

  readonly priorityOptions = ISSUE_PRIORITY_OPTIONS.filter((option) => option.value !== '');
  readonly issueTypeOptions = ISSUE_TYPE_OPTIONS;
  readonly acceptTypes = 'image/*,video/*';
  readonly draft = signal<Draft>({ ...DEFAULT_DRAFT });
  readonly participantCandidates = signal<ProjectMemberEntity[]>([]);
  readonly editorConfig = {
    autosave: true,
    autosaveUniqueId: 'article-editor',
    status: ['lines', 'words']
  };
  readonly uploadMarkdownImage = async (file: File): Promise<string> => {
    return this.markdownImageUpload.uploadImage(file, 10);
  };

  constructor() {
    effect(() => {
      if (this.open()) {
        this.clearPreviewUrls();
        this.draft.set({ ...DEFAULT_DRAFT });
      }
    });

    effect(() => {
      const assigneeId = this.draft().assigneeId;
      this.participantCandidates.set(this.members().filter((member) => member.userId !== assigneeId));
      if (!assigneeId) {
        return;
      }
      const participantIds = this.draft().participantIds ?? [];
      if (!participantIds.includes(assigneeId)) {
        return;
      }
      this.updateField(
        'participantIds',
        participantIds.filter((id) => id !== assigneeId)
      );
    });
  }

  onMarkdownImageUploadFailed(message: string): void {
    this.message.error(message || '图片上传失败');
  }

  updateField<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  updateType(value: IssueType): void {
    this.updateField('type', value);
  }

  updateParticipantIds(value: unknown): void {
    const values = Array.isArray(value) ? value : [];
    const normalized = [...new Set(values.map((item) => `${item}`.trim()).filter(Boolean))];
    const assigneeId = this.draft().assigneeId;
    this.updateField(
      'participantIds',
      assigneeId ? normalized.filter((id) => id !== assigneeId) : normalized
    );
  }

  readonly beforeUpload = (file: NzUploadFile): boolean => {
    const rawFile = this.toRawFile(file);
    if (!rawFile) {
      this.message.warning('文件读取失败，请重试');
      return false;
    }
    if (!this.isAllowedFile(rawFile)) {
      this.message.warning('仅支持上传图片或视频文件');
      return false;
    }
    if (rawFile.size > 10 * 1024 * 1024) {
      this.message.warning('单个文件最大 10MB');
      return false;
    }

    this.draft.update((draft) => {
      const exists = draft.attachmentFiles.some(
        (item) => item.name === rawFile.name && item.size === rawFile.size && item.lastModified === rawFile.lastModified
      );
      if (exists) {
        return draft;
      }
      return { ...draft, attachmentFiles: [...draft.attachmentFiles, rawFile] };
    });
    return false;
  };

  readonly customRequest = (item: NzUploadXHRArgs): Subscription => {
    item.onSuccess?.({}, item.file, item);
    return new Subscription();
  };

  removeAttachment(file: File): void {
    this.revokePreviewUrl(file);
    this.draft.update((draft) => ({
      ...draft,
      attachmentFiles: draft.attachmentFiles.filter(
        (item) => !(item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)
      ),
    }));
  }

  removeAttachmentById(id: string): void {
    const file = this.draft().attachmentFiles.find((item) => this.fileIdentity(item) === id);
    if (!file) {
      return;
    }
    this.removeAttachment(file);
  }

  attachmentPreviewItems(): AttachmentPreviewItem[] {
    return this.draft().attachmentFiles.map((file) => ({
      id: this.fileIdentity(file),
      name: file.name,
      url: this.previewUrl(file),
      kind: this.isImage(file) ? 'image' : 'video',
    }));
  }

  isImage(file: File): boolean {
    return (file.type || '').toLowerCase().startsWith('image/');
  }

  previewUrl(file: File): string {
    const key = this.fileIdentity(file);
    const cached = this.previewUrlMap.get(key);
    if (cached) {
      return cached;
    }
    const created = URL.createObjectURL(file);
    this.previewUrlMap.set(key, created);
    return created;
  }

  private toRawFile(file: NzUploadFile): File | null {
    if (file.originFileObj instanceof File) {
      return file.originFileObj;
    }
    if (file instanceof File) {
      return file;
    }
    return null;
  }

  private isAllowedFile(file: File): boolean {
    const mime = (file.type || '').toLowerCase();
    if (mime.startsWith('image/') || mime.startsWith('video/')) {
      return true;
    }
    const name = file.name.toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|svg|mp4|mov|webm|mkv|avi|m4v)$/.test(name);
  }

  formatSize(size: number): string {
    if (!Number.isFinite(size) || size < 0) {
      return '-';
    }
    if (size < 1024) {
      return `${size} B`;
    }
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  submitForm(): void {
    if (!this.draft().title.trim()) {
      return;
    }
    this.create.emit({ ...this.draft(), title: this.draft().title.trim() });
  }

  ngOnDestroy(): void {
    this.clearPreviewUrls();
  }

  private revokePreviewUrl(file: File): void {
    const key = this.fileIdentity(file);
    const cached = this.previewUrlMap.get(key);
    if (!cached) {
      return;
    }
    URL.revokeObjectURL(cached);
    this.previewUrlMap.delete(key);
  }

  private clearPreviewUrls(): void {
    for (const url of this.previewUrlMap.values()) {
      URL.revokeObjectURL(url);
    }
    this.previewUrlMap.clear();
  }

  private fileIdentity(file: File): string {
    return `${file.name}|${file.size}|${file.lastModified}`;
  }
}
