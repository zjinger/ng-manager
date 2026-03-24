import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ISSUE_PRIORITY_OPTIONS, ISSUE_TYPE_OPTIONS } from '@shared/constants';
import { DialogShellComponent, FormActionsComponent } from '@shared/ui';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { CreateIssueInput, IssueType } from '../../models/issue.model';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzUploadModule } from 'ng-zorro-antd/upload';

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
  imports: [FormsModule, NzFormModule, NzGridModule, NzUploadModule, NzButtonModule, NzIconModule, NzInputModule, NzSelectModule, DialogShellComponent, FormActionsComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="920"
      [title]="'新建 Issue'"
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
                  <nz-select nzAllowClear nzPlaceHolder="加入协作人并收到通知">
                  @for (member of members(); track member.id) {
                    <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
                  }
                </nz-select>
              </nz-form-control>
            </nz-form-item>   
            </div>
            <div class="col" nz-col nzSpan="8">
              <nz-form-item>
              <nz-form-label nzFor="verifierId" nzRequired>验证人</nz-form-label>
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
                <nz-option nzLabel="Auth" nzValue="Auth"></nz-option>
                <nz-option nzLabel="User" nzValue="User"></nz-option>
                <nz-option nzLabel="Project" nzValue="Project"></nz-option>
                <nz-option nzLabel="Issue" nzValue="Issue"></nz-option>
              </nz-select>
              </nz-form-control>
              </nz-form-item>
            </div>
            <div class="col" nz-col nzSpan="8">
              <nz-form-item>
                <nz-form-label nzFor="versionCode">版本</nz-form-label>
                <nz-form-control>
                  <nz-select nzAllowClear nzPlaceHolder="未选择" [ngModel]="draft().versionCode" name="versionCode" (ngModelChange)="updateField('versionCode', $event)">
                    <nz-option nzLabel="v2.3.0" nzValue="v2.3.0"></nz-option>
                    <nz-option nzLabel="v2.2.3" nzValue="v2.2.3"></nz-option>
                    <nz-option nzLabel="v2.2.2" nzValue="v2.2.2"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div class="col" nz-col nzSpan="8">
              <nz-form-item>
              <nz-form-label nzFor="environmentCode" nzRequired>环境</nz-form-label>
              <nz-form-control>
                <nz-select
                nzAllowClear
                nzPlaceHolder="未指定"
                [ngModel]="draft().environmentCode"
                name="environmentCode"
                (ngModelChange)="updateField('environmentCode', $event)"
              >
                <nz-option nzLabel="Production" nzValue="Production"></nz-option>
                <nz-option nzLabel="Staging" nzValue="Staging"></nz-option>
                <nz-option nzLabel="Development" nzValue="Development"></nz-option>
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
                    nzAction="https://www.mocky.io/v2/5cc8019d300000980a055e76"
                  >
                    <p class="upload-zone__icon">
                      <nz-icon nzType="plus" />
                    </p>
                    <div class="upload-zone__title">点击或拖拽文件到此区域上传</div>
                    <div class="upload-zone__hint">支持 png、jpg、log、txt 等格式，单个文件最大 10MB</div>
                  </nz-upload>
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
            创建 Issue
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
export class IssueCreateDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly create = output<Draft>();
  readonly cancel = output<void>();

  readonly priorityOptions = ISSUE_PRIORITY_OPTIONS.filter((option) => option.value !== '');
  readonly issueTypeOptions = ISSUE_TYPE_OPTIONS;
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
