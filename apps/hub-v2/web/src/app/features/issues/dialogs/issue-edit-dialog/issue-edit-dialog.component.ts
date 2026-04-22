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

import type { ProjectMetaItem, ProjectVersionItem } from '@features/projects/models/project.model';
import { ISSUE_PRIORITY_OPTIONS, ISSUE_TYPE_OPTIONS } from '@shared/constants';
import { ImageUploadService } from '@shared/services/image-upload.service';
import { DialogShellComponent, FormActionsComponent, MarkdownEditorComponent } from '@shared/ui';
import type { IssueEntity, IssuePriority, IssueType, UpdateIssueInput } from '../../models/issue.model';

type EditDraft = {
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  moduleCode: string;
  versionCode: string;
  environmentCode: string;
};

const EMPTY_DRAFT: EditDraft = {
  title: '',
  description: '',
  type: 'bug',
  priority: 'medium',
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
                <nz-form-label nzFor="moduleCode">模块</nz-form-label>
                <nz-form-control>
                  <nz-cascader
                    #moduleCascaderRef
                    nzAllowClear
                    nzPlaceHolder="未选择"
                    [nzChangeOnSelect]="true"
                    nzColumnClassName="issue-module-cascader-column"
                    nzMenuClassName="issue-module-cascader-menu"
                    [nzOptions]="moduleCascaderOptions()"
                    [nzMenuStyle]="moduleMenuStyle()"
                    [ngModel]="modulePath()"
                    name="moduleCode"
                    (nzVisibleChange)="onModuleCascaderVisibleChange($event)"
                    (ngModelChange)="onModulePathChange($event)"
                  ></nz-cascader>
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueEditDialogComponent {
  private readonly message = inject(NzMessageService);
  private readonly imageUpload = inject(ImageUploadService);
  readonly priorityOptions = ISSUE_PRIORITY_OPTIONS.filter((option) => option.value !== '');
  readonly issueTypeOptions = ISSUE_TYPE_OPTIONS;

  readonly open = input(false);
  readonly busy = input(false);
  readonly issue = input<IssueEntity | null>(null);
  readonly modules = input<ProjectMetaItem[]>([]);
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
  readonly moduleCascaderOptions = computed(() => this.buildModuleCascaderOptions());
  readonly uploadMarkdownImage = async (file: File): Promise<string> => this.imageUpload.uploadImage(file);
  @ViewChild('moduleCascaderRef', { read: ElementRef }) moduleCascaderRef?: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const issue = this.issue();
      this.draft.set({
        title: issue?.title || '',
        description: issue?.description || '',
        type: issue?.type || 'bug',
        priority: issue?.priority || 'medium',
        moduleCode: issue?.moduleCode || '',
        versionCode: issue?.versionCode || '',
        environmentCode: issue?.environmentCode || '',
      });
      this.setModulePath(this.findModulePathByCode(issue?.moduleCode));
      this.scheduleSyncModuleMenuWidth();
    });

    effect(() => {
      if (!this.open()) {
        return;
      }
      this.setModulePath(this.findModulePathByCode(this.draft().moduleCode));
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
    this.updateField('moduleCode', this.resolveModuleCodeByPath(path));
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

    const payload: UpdateIssueInput = {
      title: draft.title.trim(),
      description: draft.description.trim() ? draft.description : null,
      type: draft.type,
      priority: draft.priority,
      moduleCode: draft.moduleCode.trim() ? draft.moduleCode.trim() : null,
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

  private buildModuleCascaderOptions(): Array<{ label: string; value: string; children?: Array<{ label: string; value: string; isLeaf: true }>; isLeaf?: true }> {
    const items = this.modules();
    const subsystemItems = items.filter((item) => item.nodeType === 'subsystem');
    const subsystemIdSet = new Set(subsystemItems.map((item) => item.id));
    const modulesByParent = new Map<string, ProjectMetaItem[]>();
    const standaloneModules: ProjectMetaItem[] = [];

    for (const item of items) {
      if (item.nodeType !== 'module') {
        continue;
      }
      if (item.parentId && subsystemIdSet.has(item.parentId)) {
        const list = modulesByParent.get(item.parentId) ?? [];
        list.push(item);
        modulesByParent.set(item.parentId, list);
        continue;
      }
      standaloneModules.push(item);
    }

    const options: Array<{ label: string; value: string; children?: Array<{ label: string; value: string; isLeaf: true }>; isLeaf?: true }> = [];
    for (const sub of subsystemItems) {
      const children = (modulesByParent.get(sub.id) ?? []).map((item) => ({
        label: item.name,
        value: item.id,
        isLeaf: true as const
      }));
      options.push({
        label: sub.name,
        value: sub.id,
        children: children.length > 0 ? children : undefined,
        isLeaf: children.length > 0 ? undefined : true
      });
    }
    for (const item of standaloneModules) {
      options.push({
        label: item.name,
        value: item.id,
        isLeaf: true
      });
    }
    return options;
  }

  private findModulePathByCode(moduleCode: string | null | undefined): string[] | null {
    const normalized = moduleCode?.trim();
    if (!normalized) {
      return null;
    }
    const target = this.modules().find((item) => this.moduleValue(item) === normalized);
    if (!target) {
      return null;
    }
    if (target.nodeType === 'module' && target.parentId && this.modules().some((item) => item.id === target.parentId && item.nodeType === 'subsystem')) {
      return [target.parentId, target.id];
    }
    return [target.id];
  }

  private resolveModuleCodeByPath(path: string[] | null): string {
    if (!path || path.length === 0) {
      return '';
    }
    const targetId = path[path.length - 1];
    const target = this.modules().find((item) => item.id === targetId);
    return target ? this.moduleValue(target) : '';
  }

  private moduleValue(item: ProjectMetaItem): string {
    return (item.code || item.name || '').trim();
  }
}
