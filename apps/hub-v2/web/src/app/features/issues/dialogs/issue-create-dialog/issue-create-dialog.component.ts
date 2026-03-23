import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ISSUE_PRIORITY_OPTIONS } from '../../../../shared/constants/priority-options';
import { DialogShellComponent } from '../../../../shared/ui/dialog/dialog-shell.component';
import { FormActionsComponent } from '../../../../shared/ui/form-actions/form-actions.component';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { CreateIssueInput, IssueType } from '../../models/issue.model';

type Draft = Omit<CreateIssueInput, 'projectId'>;

const DEFAULT_DRAFT: Draft = {
  title: '',
  description: '',
  type: 'bug',
  priority: 'medium',
  assigneeId: null,
  verifierId: null,
  moduleCode: '',
  versionCode: '',
  environmentCode: '',
};

@Component({
  selector: 'app-issue-create-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzIconModule, NzInputModule, NzSelectModule, DialogShellComponent, FormActionsComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="920"
      [title]="'新建 Issue'"
      [subtitle]="'按设计稿保留标题、描述、责任人、模块和环境信息。'"
      [icon]="'plus'"
      [modalClass]="'issue-create-modal'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="issue-create-form" class="issue-form dialog-form" (ngSubmit)="submitForm()">
          <div class="issue-form__group">
            <label class="issue-field dialog-field">
              <span class="issue-field__label dialog-field__label">标题 <span class="required">*</span></span>
              <input
                nz-input
                maxlength="120"
                placeholder="简要描述问题，例如：登录接口在高并发下返回 500"
                [ngModel]="draft().title"
                name="title"
                (ngModelChange)="updateField('title', $event)"
              />
            </label>
          </div>

          <div class="issue-form__group">
            <label class="issue-field dialog-field">
              <span class="issue-field__label dialog-field__label">描述</span>
              <div class="md-toolbar">
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
              </div>
              <textarea
                nz-input
                class="md-editor"
                rows="8"
                placeholder="**复现步骤：**&#10;1. &#10;2. &#10;3. &#10;&#10;**期望行为：**&#10;&#10;**实际行为：**&#10;&#10;**环境信息：**"
                [ngModel]="draft().description"
                name="description"
                (ngModelChange)="updateField('description', $event)"
              ></textarea>
              <span class="issue-field__hint">Markdown 编辑器后续再接，当前先用 textarea 代替。</span>
            </label>
          </div>

          <div class="issue-form__grid dialog-form__grid">
            <label class="issue-field dialog-field">
              <span class="issue-field__label dialog-field__label">类型 <span class="required">*</span></span>
              <nz-select [ngModel]="draft().type" name="type" (ngModelChange)="updateType($event)">
                <nz-option nzLabel="Bug" nzValue="bug"></nz-option>
                <nz-option nzLabel="Task" nzValue="task"></nz-option>
                <nz-option nzLabel="Support" nzValue="support"></nz-option>
              </nz-select>
            </label>

            <label class="issue-field dialog-field">
              <span class="issue-field__label dialog-field__label">优先级 <span class="required">*</span></span>
              <nz-select [ngModel]="draft().priority" name="priority" (ngModelChange)="updateField('priority', $event)">
                @for (item of priorityOptions; track item.value) {
                  <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                }
              </nz-select>
            </label>
          </div>

          <div class="issue-form__grid dialog-form__grid issue-form__grid--three">
            <label class="issue-field dialog-field">
              <span class="issue-field__label dialog-field__label">指派给</span>
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
            </label>
            <label class="issue-field dialog-field">
            <span class="issue-field__label dialog-field__label">协作人</span>
            <nz-select nzAllowClear nzPlaceHolder="加入协作人列表并收到通知">
              @for (member of members(); track member.id) {
                <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
              }
            </nz-select>
            </label>
            <label class="issue-field dialog-field">
              <span class="issue-field__label dialog-field__label">验证人</span>
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
            </label>    
          </div>

          <div class="issue-form__grid dialog-form__grid issue-form__grid--three">
            <label class="issue-field dialog-field">
              <span class="issue-field__label dialog-field__label">模块</span>
              <nz-select
                nzAllowClear
                nzPlaceHolder="未选择"
                [ngModel]="draft().moduleCode"
                name="moduleCode"
                (ngModelChange)="updateField('moduleCode', $event)"
              >
                <nz-option nzLabel="Auth" nzValue="Auth"></nz-option>
                <nz-option nzLabel="User" nzValue="User"></nz-option>
                <nz-option nzLabel="Project" nzValue="Project"></nz-option>
                <nz-option nzLabel="Issue" nzValue="Issue"></nz-option>
                <nz-option nzLabel="RD" nzValue="RD"></nz-option>
                <nz-option nzLabel="Dashboard" nzValue="Dashboard"></nz-option>
              </nz-select>
            </label>

            <label class="issue-field dialog-field">
              <span class="issue-field__label dialog-field__label">版本</span>
              <nz-select
                nzAllowClear
                nzPlaceHolder="未选择"
                [ngModel]="draft().versionCode"
                name="versionCode"
                (ngModelChange)="updateField('versionCode', $event)"
              >
                <nz-option nzLabel="v2.3.0" nzValue="v2.3.0"></nz-option>
                <nz-option nzLabel="v2.2.3" nzValue="v2.2.3"></nz-option>
                <nz-option nzLabel="v2.2.2" nzValue="v2.2.2"></nz-option>
              </nz-select>
            </label>

            <label class="issue-field dialog-field">
              <span class="issue-field__label dialog-field__label">环境</span>
              <nz-select
                nzAllowClear
                nzPlaceHolder="未选择"
                [ngModel]="draft().environmentCode"
                name="environmentCode"
                (ngModelChange)="updateField('environmentCode', $event)"
              >
                <nz-option nzLabel="Production" nzValue="Production"></nz-option>
                <nz-option nzLabel="Staging" nzValue="Staging"></nz-option>
                <nz-option nzLabel="Development" nzValue="Development"></nz-option>
              </nz-select>
            </label>
          </div>

          <label class="issue-field dialog-field issue-field--upload">
            <span class="issue-field__label dialog-field__label">附件</span>
            <div class="upload-zone">
              <div class="upload-zone__icon">
                <span nz-icon nzType="plus"></span>
              </div>
              <div class="upload-zone__title">点击或拖拽文件到此区域上传</div>
              <div class="upload-zone__hint">支持 png、jpg、log、txt 等格式，单个文件最大 10MB</div>
            </div>
          </label>

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
            type="submit"
            form="issue-create-form"
          >
            <span nz-icon nzType="send"></span>
            创建 Issue
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .issue-form {
        gap: 18px;
      }
      .issue-form__group {
        display: grid;
      }
      .issue-form__grid--three {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .issue-field--upload,
      .issue-field--collaborators {
        min-height: 100%;
      }
      .issue-field--collaborators {
        margin-top: 2px;
      }
      .required {
        color: var(--color-danger);
      }
      .issue-field__hint {
        font-size: 12px;
        color: var(--text-muted);
      }
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
        max-width: 320px;
        font-size: 14px;
        line-height: 1.7;
        color: var(--text-muted);
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
      @media (max-width: 900px) {
        .issue-form__grid--three {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 768px) {
        .issue-form__grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueCreateDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly create = output<Draft>();
  readonly cancel = output<void>();

  readonly priorityOptions = ISSUE_PRIORITY_OPTIONS;
  readonly draft = signal<Draft>({ ...DEFAULT_DRAFT });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.draft.set({ ...DEFAULT_DRAFT });
      }
    });
  }

  updateField<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  updateType(value: IssueType): void {
    this.updateField('type', value);
  }

  submitForm(): void {
    if (!this.draft().title.trim()) {
      return;
    }
    this.create.emit({ ...this.draft(), title: this.draft().title.trim() });
  }
}
