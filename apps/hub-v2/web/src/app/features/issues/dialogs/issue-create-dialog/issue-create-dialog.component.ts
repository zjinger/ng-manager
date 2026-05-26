import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCascaderModule } from 'ng-zorro-antd/cascader';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { formatUploadSizeLimit, ISSUE_PRIORITY_OPTIONS, ISSUE_TYPE_OPTIONS, UPLOAD_TARGETS } from '@shared/constants';
import { DialogShellComponent, FileUploadDropzoneComponent, FormActionsComponent, MarkdownEditorComponent } from '@shared/ui';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { ImageUploadService } from '../../../../shared/services/image-upload.service';
import { AiRecommendPanelComponent } from '../../../ai/components/ai-recommend-panel/ai-recommend-panel.component';
import { AiIssueStore } from '../../../ai/store/ai-issue.store';
import type { ProjectMemberEntity, ProjectMetaItem, ProjectModuleRdLinkEntity, ProjectVersionItem } from '../../../projects/models/project.model';
import type { CreateIssueInput, IssuePriority, IssueType } from '../../models/issue.model';
import {
  buildModuleRdCascaderOptions,
  findModuleRdSelectionPath,
  moduleRdCascaderOptionIcon,
  resolveModuleRdSelection,
  type ModuleRdCascaderOption,
  type ModuleRdCascaderRdItem
} from '../../utils';

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
  rdItemId: null,
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
    NzButtonModule,
    NzCascaderModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    DialogShellComponent,
    FileUploadDropzoneComponent,
    FormActionsComponent,
    MarkdownEditorComponent,
    AiRecommendPanelComponent
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
                    placeholder="简要描述问题，例如：登录接口返回 500"
                    [ngModel]="draft().title"
                    name="title"
                    (ngModelChange)="onTitleChange($event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
          @if (projectId()) {
            <app-ai-recommend-panel
              [loading]="aiLoading()"
              [assigneeLoading]="aiAssigneeLoading()"
              [result]="aiResult()"
              [assigneeResult]="aiAssigneeResult()"
              [modules]="modules()"
              (accept)="onAiAccept($event)"
              (skip)="onAiSkip()"
            />
          }
          <div class="row" nz-row nzGutter="16">
            <div class="col" nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label nzFor="description">描述</nz-form-label>
                <nz-form-control>
	                  <app-markdown-editor 
	                    [ngModel]="draft().description" 
	                    [config]="editorConfig"
                      [imageUploadHandler]="uploadMarkdownImage"
	                    name="description"
	                    [minHeight]="'240px'"
	                    (contentChange)="onDescriptionChange($event)"
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
              <nz-form-label nzFor="assigneeId" [nzTooltipIcon]="'question-circle'" nzTooltipTitle="指派给某人以负责处理此问题，或后续等待成员自行认领">指派给</nz-form-label>
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
                <nz-form-label nzFor="participantIds" [nzTooltipIcon]="'question-circle'" nzTooltipTitle="协作人会接收通知并参与处理问题">协作人</nz-form-label>
                <nz-form-control>
                  <nz-select
                    nzMode="multiple"
                    nzAllowClear
                    [nzDisabled]="!draft().assigneeId"
                    [nzPlaceHolder]="draft().assigneeId ? '加入协作人并收到通知' : '请先指派负责人'"
                    [nzMaxTagCount]="3"
                    [ngModel]="draft().participantIds"
                    name="participantIds"
                    (ngModelChange)="updateParticipantIds($event)"
                  >
                    @for (member of participantCandidates(); track member.id) {
                      <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
                    }
                  </nz-select>
                  <!-- @if (!draft().assigneeId) {
                    <div class="issue-create-hint">请先选择负责人，再添加协作人。</div>
                  } -->
              </nz-form-control>
            </nz-form-item>   
            </div>
            <div class="col" nz-col nzSpan="8">
              <nz-form-item>
              <nz-form-label nzFor="verifierId" [nzTooltipIcon]="'question-circle'" nzTooltipTitle="验证人负责验证问题的解决情况，未指定时默认为创建人">验证人</nz-form-label>
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
              <nz-form-label nzFor="moduleCode">子项目/模块/研发项</nz-form-label>
              <nz-form-control>
                <nz-cascader
                  #moduleCascaderRef
                  nzAllowClear
                  nzPlaceHolder="未选择"
                  [nzChangeOnSelect]="true"
                  nzColumnClassName="issue-module-cascader-column"
                  nzMenuClassName="issue-module-cascader-menu"
                  [nzOptionRender]="moduleOptionTpl"
                  [nzOptions]="moduleRdCascaderOptions()"
                  [nzMenuStyle]="moduleMenuStyle()"
                  [ngModel]="modulePath()"
                  name="moduleRdCode"
                  (nzVisibleChange)="onModuleCascaderVisibleChange($event)"
                  (ngModelChange)="onModulePathChange($event)"
                ></nz-cascader>
                <ng-template #moduleOptionTpl let-option>
                  <span class="issue-module-option" [attr.data-kind]="option.kind">
                    <nz-icon [nzType]="moduleOptionIcon(option)" nzTheme="outline" />
                    <span>{{ option.label }}</span>
                  </span>
                </ng-template>
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
                <app-file-upload-dropzone
                  [policy]="attachmentUploadPolicy"
                  [files]="draft().attachmentFiles"
                  [disabled]="busy()"
                  [removeDisabled]="busy()"
                  [hint]="'支持图片/视频格式，单个文件最大 ' + attachmentUploadSizeText"
                  (filesChange)="updateField('attachmentFiles', $event)"
                />
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
            创建测试单
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
      .issue-create-hint {
        margin-top: 6px;
        font-size: 12px;
        color: var(--text-muted);
      }
      .issue-field textarea.ant-input {
        border-radius: 0 0 8px 8px;
      }
      ::ng-deep .issue-module-cascader-menu .issue-module-cascader-column {
        width: var(--issue-module-cascader-col-width, 260px);
        min-width: var(--issue-module-cascader-col-width, 260px);
      }
      ::ng-deep .issue-module-cascader-menu.ant-cascader-menus {
        width: auto;
      }
      .issue-module-option {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .issue-module-option nz-icon {
        color: var(--text-muted);
        font-size: 13px;
      }
      .issue-module-option[data-kind='subsystem'] nz-icon {
        color: var(--primary-600);
      }
      .issue-module-option[data-kind='module'] nz-icon {
        color: #64748b;
      }
      .issue-module-option[data-kind='rd'] nz-icon,
      .issue-module-option[data-kind='rd-direct'] nz-icon,
      .issue-module-option[data-kind='rd-group'] nz-icon {
        color: #0f766e;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueCreateDialogComponent {
  private readonly message = inject(NzMessageService);
  private readonly imageUpload = inject(ImageUploadService);
  private readonly aiStore = inject(AiIssueStore);

  readonly open = input(false);
  readonly busy = input(false);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly rdItems = input<ModuleRdCascaderRdItem[]>([]);
  readonly modules = input<ProjectMetaItem[]>([]);
  readonly moduleRdLinks = input<ProjectModuleRdLinkEntity[]>([]);
  readonly environments = input<ProjectMetaItem[]>([]);
  readonly versions = input<ProjectVersionItem[]>([]);
  readonly projectName = input<string>('');
  readonly projectId = input<string>('');
  readonly create = output<Draft>();
  readonly cancel = output<void>();

  readonly aiLoading = this.aiStore.loading;
  readonly aiAssigneeLoading = this.aiStore.assigneeLoading;
  readonly aiResult = this.aiStore.result;
  readonly aiAssigneeResult = this.aiStore.assigneeResult;

  readonly priorityOptions = ISSUE_PRIORITY_OPTIONS.filter((option) => option.value !== '');
  readonly issueTypeOptions = ISSUE_TYPE_OPTIONS;
  readonly attachmentUploadPolicy = UPLOAD_TARGETS.issueAttachment;
  readonly attachmentUploadSizeText = formatUploadSizeLimit(this.attachmentUploadPolicy);
  readonly draft = signal<Draft>({ ...DEFAULT_DRAFT });
  readonly participantCandidates = signal<ProjectMemberEntity[]>([]);
  readonly editorConfig = {
    autosave: true,
    autosaveUniqueId: 'article-editor',
    status: ['lines', 'words']
  };
  readonly uploadMarkdownImage = async (file: File): Promise<string> => {
    return this.imageUpload.uploadImage(file);
  };
  readonly modulePath = signal<string[] | null>(null);
  readonly moduleTriggerWidth = signal(0);
  readonly moduleMenuStyle = computed(() =>
    this.moduleTriggerWidth() > 0
      ? { '--issue-module-cascader-col-width': `${this.moduleTriggerWidth()}px` }
      : null
  );
  readonly moduleRdCascaderOptions = computed(() =>
    buildModuleRdCascaderOptions({
      modules: this.modules(),
      moduleRdLinks: this.moduleRdLinks(),
      rdItems: this.rdItems(),
      currentRdItemId: this.draft().rdItemId
    })
  );
  @ViewChild('moduleCascaderRef', { read: ElementRef }) moduleCascaderRef?: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.draft.set({ ...DEFAULT_DRAFT });
        this.modulePath.set(null);
        this.scheduleSyncModuleMenuWidth();
        this.aiStore.clear();
        const projectId = this.projectId();
        if (projectId) {
          this.aiStore.setProject(projectId);
        }
      }
    });

    effect(() => {
      if (!this.open()) {
        return;
      }
      const projectId = this.projectId();
      if (projectId) {
        this.aiStore.setProject(projectId);
      }
    });

    effect(() => {
      const assigneeId = this.draft().assigneeId;
      this.participantCandidates.set(this.members().filter((member) => member.userId !== assigneeId));
      if (!assigneeId) {
        const participantIds = this.draft().participantIds ?? [];
        if (participantIds.length > 0) {
          this.updateField('participantIds', []);
        }
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

    effect(() => {
      if (!this.open()) {
        return;
      }
      this.setModulePath(
        findModuleRdSelectionPath({
          modules: this.modules(),
          moduleRdLinks: this.moduleRdLinks(),
          moduleCode: this.draft().moduleCode,
          rdItemId: this.draft().rdItemId
        })
      );
      this.scheduleSyncModuleMenuWidth();
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

  onTitleChange(value: string): void {
    this.updateField('title', value);
    // this.aiStore.updateTitle(value);
  }

  onDescriptionChange(value: string): void {
    this.updateField('description', value);
    // this.aiStore.updateDescription(value || null);
  }

  onAiAccept(result: { type: IssueType | null; priority: IssuePriority | null; assigneeId?: string | null; moduleCode?: string }): void {
    if (result.type) {
      this.updateType(result.type);
    }
    if (result.priority) {
      this.updateField('priority', result.priority);
    }
    if (result.assigneeId) {
      this.updateField('assigneeId', result.assigneeId);
    }
    if (result.moduleCode !== undefined) {
      this.updateField('moduleCode', result.moduleCode);
    }
  }

  onAiSkip(): void {
    this.aiStore.clear();
  }

  updateParticipantIds(value: unknown): void {
    if (!this.draft().assigneeId) {
      this.message.warning('请先选择负责人，再添加协作人');
      this.updateField('participantIds', []);
      return;
    }
    const values = Array.isArray(value) ? value : [];
    const normalized = [...new Set(values.map((item) => `${item}`.trim()).filter(Boolean))];
    const assigneeId = this.draft().assigneeId;
    this.updateField(
      'participantIds',
      assigneeId ? normalized.filter((id) => id !== assigneeId) : normalized
    );
  }

  submitForm(): void {
    if (!this.draft().title.trim()) {
      return;
    }
    if (!this.draft().assigneeId && (this.draft().participantIds?.length ?? 0) > 0) {
      this.message.warning('未指定负责人时不能添加协作人');
      this.updateField('participantIds', []);
      return;
    }
    this.create.emit({ ...this.draft(), title: this.draft().title.trim() });
  }

  private scheduleSyncModuleMenuWidth(): void {
    this.syncModuleMenuWidthWithRetry(0);
  }

  private syncModuleMenuWidthWithRetry(attempt: number): void {
    requestAnimationFrame(() => {
      const width = this.measureModuleTriggerWidth();
      if (width > 0) {
        if (width !== this.moduleTriggerWidth()) {
          this.moduleTriggerWidth.set(width);
        }
        return;
      }
      if (attempt < 5) {
        this.syncModuleMenuWidthWithRetry(attempt + 1);
      }
    });
  }

  private measureModuleTriggerWidth(): number {
    const host = this.moduleCascaderRef?.nativeElement;
    if (!host) {
      return 0;
    }
    const selector = host.querySelector('.ant-select-selector') as HTMLElement | null;
    const measured = Math.round((selector ?? host).getBoundingClientRect().width) - 1;
    return Math.max(0, measured);
  }

  onModulePathChange(value: unknown): void {
    const path =
      Array.isArray(value) && value.length > 0 ? value.map((item) => `${item}`.trim()).filter(Boolean) : null;
    this.setModulePath(path);
    const { moduleCode, rdItemId } = resolveModuleRdSelection({ modules: this.modules(), path });
    this.updateField('moduleCode', moduleCode);
    this.updateField('rdItemId', rdItemId);
  }

  onModuleCascaderVisibleChange(visible: boolean): void {
    if (visible) {
      this.scheduleSyncModuleMenuWidth();
    }
  }

  private setModulePath(path: string[] | null): void {
    const current = this.modulePath();
    if (this.samePath(current, path)) {
      return;
    }
    this.modulePath.set(path);
  }

  private samePath(a: string[] | null, b: string[] | null): boolean {
    if (a === b) {
      return true;
    }
    if (!a || !b || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  moduleOptionIcon(option: ModuleRdCascaderOption | null | undefined): string {
    return moduleRdCascaderOptionIcon(option);
  }
}
