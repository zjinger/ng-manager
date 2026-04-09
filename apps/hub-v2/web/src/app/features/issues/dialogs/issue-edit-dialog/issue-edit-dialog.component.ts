import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type { ProjectMetaItem, ProjectVersionItem } from '@features/projects/models/project.model';
import { MarkdownImageUploadService } from '@shared/services/markdown-image-upload.service';
import { DialogShellComponent, FormActionsComponent, MarkdownEditorComponent } from '@shared/ui';
import type { IssueEntity, UpdateIssueInput } from '../../models/issue.model';

type EditDraft = {
  title: string;
  description: string;
  moduleCode: string;
  versionCode: string;
  environmentCode: string;
};

const EMPTY_DRAFT: EditDraft = {
  title: '',
  description: '',
  moduleCode: '',
  versionCode: '',
  environmentCode: '',
};

@Component({
  selector: 'app-issue-edit-dialog',
  standalone: true,
  imports: [FormsModule, NzIconModule, NzFormModule, NzGridModule, NzInputModule, NzButtonModule, NzSelectModule, DialogShellComponent, FormActionsComponent, MarkdownEditorComponent],
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
                    placeholder="简要描述问题"
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
            <div nz-col nzSpan="8">
              <nz-form-item>
                <nz-form-label nzFor="moduleCode">模块</nz-form-label>
                <nz-form-control>
                  <nz-select
                    nzAllowClear
                    nzPlaceHolder="未选择"
                    [ngModel]="draft().moduleCode"
                    name="moduleCode"
                    (ngModelChange)="updateField('moduleCode', $event || '')"
                  >
                    @for (item of modules(); track item.id) {
                      <nz-option [nzLabel]="item.name" [nzValue]="item.code || item.name"></nz-option>
                    }
                  </nz-select>
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueEditDialogComponent {
  private readonly message = inject(NzMessageService);
  private readonly markdownImageUpload = inject(MarkdownImageUploadService);

  readonly open = input(false);
  readonly busy = input(false);
  readonly issue = input<IssueEntity | null>(null);
  readonly modules = input<ProjectMetaItem[]>([]);
  readonly versions = input<ProjectVersionItem[]>([]);
  readonly environments = input<ProjectMetaItem[]>([]);

  readonly cancel = output<void>();
  readonly confirm = output<UpdateIssueInput>();

  readonly draft = signal<EditDraft>({ ...EMPTY_DRAFT });
  readonly uploadMarkdownImage = async (file: File): Promise<string> => this.markdownImageUpload.uploadImage(file, 10);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const issue = this.issue();
      this.draft.set({
        title: issue?.title || '',
        description: issue?.description || '',
        moduleCode: issue?.moduleCode || '',
        versionCode: issue?.versionCode || '',
        environmentCode: issue?.environmentCode || '',
      });
    });
  }

  onMarkdownImageUploadFailed(message: string): void {
    this.message.error(message || '图片上传失败');
  }

  updateField<K extends keyof EditDraft>(key: K, value: EditDraft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  submit(): void {
    const draft = this.draft();
    if (!draft.title.trim()) {
      return;
    }

    const payload: UpdateIssueInput = {
      title: draft.title.trim(),
      description: draft.description.trim() ? draft.description : null,
      moduleCode: draft.moduleCode.trim() ? draft.moduleCode.trim() : null,
      versionCode: draft.versionCode.trim() ? draft.versionCode.trim() : null,
      environmentCode: draft.environmentCode.trim() ? draft.environmentCode.trim() : null,
    };
    this.confirm.emit(payload);
  }
}
