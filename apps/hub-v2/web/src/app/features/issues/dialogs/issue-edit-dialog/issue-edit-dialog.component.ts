import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCascaderModule } from 'ng-zorro-antd/cascader';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type { ProjectMetaItem, ProjectModuleRdLinkEntity, ProjectVersionItem } from '@features/projects/models/project.model';
import { ISSUE_PRIORITY_OPTIONS, ISSUE_TYPE_OPTIONS, UPLOAD_TARGETS } from '@shared/constants';
import { ImageUploadService } from '@shared/services/image-upload.service';
import { DialogShellComponent, FormActionsComponent, MarkdownEditorComponent } from '@shared/ui';
import type { IssueEntity, IssuePriority, IssueType, UpdateIssueInput } from '../../models/issue.model';
import {
  buildModuleRdCascaderOptions,
  findModuleRdSelectionPath,
  moduleRdCascaderOptionIcon,
  resolveModuleRdSelection,
  type ModuleRdCascaderOption,
  type ModuleRdCascaderRdItem
} from '../../utils';

type EditDraft = {
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  rdItemId: string | null;
  moduleCode: string;
  versionCode: string;
  environmentCode: string;
};

const EMPTY_DRAFT: EditDraft = {
  title: '',
  description: '',
  type: 'bug',
  priority: 'medium',
  rdItemId: null,
  moduleCode: '',
  versionCode: '',
  environmentCode: '',
};

@Component({
  selector: 'app-issue-edit-dialog',
  standalone: true,
  imports: [FormsModule, NzIconModule, NzFormModule, NzGridModule, NzInputModule, NzButtonModule, NzSelectModule, NzCascaderModule, DialogShellComponent, FormActionsComponent, MarkdownEditorComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [center]="true"
      [width]="920"
      [title]="'编辑测试单'"
      [subtitle]="issue()?.issueNo || ''"
      [icon]="'edit'"
      [modalClass]="'issue-edit-modal'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form nz-form nzLayout="vertical">
          <div nz-row nzGutter="16">
            <div nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label nzRequired nzFor="title">标题</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    maxlength="120"
                    placeholder="简要描述问题，例如：登录接口返回 500"
                    [ngModel]="draft().title"
                    name="title"
                    (ngModelChange)="updateField('title', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label nzFor="description">描述</nz-form-label>
                <nz-form-control>
                  <app-markdown-editor
                    [ngModel]="draft().description"
                    name="description"
                    [minHeight]="'240px'"
                    [imageUploadHandler]="uploadMarkdownImage"
                    (contentChange)="updateField('description', $event)"
                    (imageUploadFailed)="onMarkdownImageUploadFailed($event)"
                    [placeholder]="'补充问题背景、复现步骤和期望结果'"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="12">
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

            <div nz-col nzSpan="12">
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

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="8">
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

            <div nz-col nzSpan="8">
              <nz-form-item>
                <nz-form-label nzFor="versionCode">版本</nz-form-label>
                <nz-form-control>
                  <nz-select
                    nzAllowClear
                    nzPlaceHolder="未选择"
                    [ngModel]="draft().versionCode"
                    name="versionCode"
                    (ngModelChange)="updateField('versionCode', $event || '')"
                  >
                    @for (item of versions(); track item.id) {
                      <nz-option [nzLabel]="item.version" [nzValue]="item.code || item.version"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>

            <div nz-col nzSpan="8">
              <nz-form-item>
                <nz-form-label nzFor="environmentCode">环境</nz-form-label>
                <nz-form-control>
                  <nz-select
                    nzAllowClear
                    nzPlaceHolder="未指定"
                    [ngModel]="draft().environmentCode"
                    name="environmentCode"
                    (ngModelChange)="updateField('environmentCode', $event || '')"
                  >
                    @for (item of environments(); track item.id) {
                      <nz-option [nzLabel]="item.name" [nzValue]="item.code || item.name"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
        </form>
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="cancel.emit()">取消</button>
          <button nz-button nzType="primary" [nzLoading]="busy()" [disabled]="!draft().title.trim()" (click)="submit()">
            <nz-icon nzType="check" class="icon-left"></nz-icon>
            保存修改
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
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
export class IssueEditDialogComponent {
  private readonly message = inject(NzMessageService);
  private readonly imageUpload = inject(ImageUploadService);
  private initializedIssueId: string | null = null;
  readonly priorityOptions = ISSUE_PRIORITY_OPTIONS.filter((option) => option.value !== '');
  readonly issueTypeOptions = ISSUE_TYPE_OPTIONS;

  readonly open = input(false);
  readonly busy = input(false);
  readonly issue = input<IssueEntity | null>(null);
  readonly rdItems = input<ModuleRdCascaderRdItem[]>([]);
  readonly modules = input<ProjectMetaItem[]>([]);
  readonly moduleRdLinks = input<ProjectModuleRdLinkEntity[]>([]);
  readonly versions = input<ProjectVersionItem[]>([]);
  readonly environments = input<ProjectMetaItem[]>([]);

  readonly cancel = output<void>();
  readonly confirm = output<UpdateIssueInput>();

  readonly draft = signal<EditDraft>({ ...EMPTY_DRAFT });
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
  readonly uploadMarkdownImage = async (file: File): Promise<string> =>
    this.imageUpload.uploadImage(file, UPLOAD_TARGETS.markdownImage);
  @ViewChild('moduleCascaderRef', { read: ElementRef }) moduleCascaderRef?: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      if (!this.open()) {
        this.initializedIssueId = null;
        return;
      }
      const issue = this.issue();
      const issueId = issue?.id ?? null;
      if (this.initializedIssueId === issueId) {
        return;
      }
      this.initializedIssueId = issueId;
      this.draft.set({
        title: issue?.title || '',
        description: issue?.description || '',
        type: issue?.type || 'bug',
        priority: issue?.priority || 'medium',
        rdItemId: issue?.rdItemId || null,
        moduleCode: issue?.moduleCode || '',
        versionCode: issue?.versionCode || '',
        environmentCode: issue?.environmentCode || '',
      });
      this.setModulePath(
        findModuleRdSelectionPath({
          modules: this.modules(),
          moduleRdLinks: this.moduleRdLinks(),
          moduleCode: issue?.moduleCode,
          rdItemId: issue?.rdItemId
        })
      );
      this.scheduleSyncModuleMenuWidth();
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

  updateField<K extends keyof EditDraft>(key: K, value: EditDraft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  updateType(value: IssueType): void {
    this.updateField('type', value);
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

  submit(): void {
    const draft = this.draft();
    if (!draft.title.trim()) {
      return;
    }
    const normalizedModuleCode = draft.moduleCode.trim() ? draft.moduleCode.trim() : '';
    const normalizedRdItemId = draft.rdItemId?.trim() || null;

    const payload: UpdateIssueInput = {
      title: draft.title.trim(),
      description: draft.description.trim() ? draft.description : null,
      type: draft.type,
      priority: draft.priority,
      rdItemId: normalizedRdItemId,
      moduleCode: normalizedRdItemId && !normalizedModuleCode ? undefined : normalizedModuleCode || null,
      versionCode: draft.versionCode.trim() ? draft.versionCode.trim() : null,
      environmentCode: draft.environmentCode.trim() ? draft.environmentCode.trim() : null,
    };
    this.confirm.emit(payload);
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
