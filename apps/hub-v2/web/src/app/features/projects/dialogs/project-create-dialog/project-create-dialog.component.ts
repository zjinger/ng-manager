import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent } from '../../../../shared/ui/dialog/dialog-shell.component';
import type { CreateProjectInput } from '../../models/project.model';

const DEFAULT_DRAFT: CreateProjectInput = {
  projectKey: '',
  name: '',
  description: '',
  icon: '',
  visibility: 'internal',
};

@Component({
  selector: 'app-project-create-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, NzSelectModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="720"
      [title]="'新建项目'"
      [subtitle]="'先建立用于测试协作流和问题流转的基础项目数据。'"
      [icon]="'appstore'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="project-create-form" class="project-form dialog-form" (ngSubmit)="submitForm()">
          <div class="project-form__grid dialog-form__grid">
            <label class="field dialog-field">
              <span class="dialog-field__label">项目名称</span>
              <input nz-input [ngModel]="draft().name" name="name" (ngModelChange)="updateField('name', $event)" />
            </label>

            <label class="field dialog-field">
              <span class="dialog-field__label">项目 Key</span>
              <input
                nz-input
                placeholder="例如 HUB、RUNTIME"
                [ngModel]="draft().projectKey"
                name="projectKey"
                (ngModelChange)="updateField('projectKey', $event)"
              />
            </label>
          </div>

          <div class="project-form__grid dialog-form__grid">
            <label class="field dialog-field">
              <span class="dialog-field__label">可见性</span>
              <nz-select [ngModel]="draft().visibility" name="visibility" (ngModelChange)="updateField('visibility', $event)">
                <nz-option nzLabel="内部" nzValue="internal"></nz-option>
                <nz-option nzLabel="私有" nzValue="private"></nz-option>
              </nz-select>
            </label>

            <label class="field dialog-field">
              <span class="dialog-field__label">图标</span>
              <input
                nz-input
                placeholder="可先填写 emoji 或简写"
                [ngModel]="draft().icon"
                name="icon"
                (ngModelChange)="updateField('icon', $event)"
              />
            </label>
          </div>

          <label class="field dialog-field">
            <span class="dialog-field__label">描述</span>
            <textarea
              nz-input
              rows="4"
              placeholder="描述项目的业务边界、协作对象或当前阶段。"
              [ngModel]="draft().description"
              name="description"
              (ngModelChange)="updateField('description', $event)"
            ></textarea>
          </label>
        </form>
      </div>

      <div dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [nzLoading]="busy()" [disabled]="!canSubmit()" type="submit" form="project-create-form">
          创建项目
        </button>
      </div>
    </app-dialog-shell>
  `,
  styles: [
    `
      .project-form__grid {
        gap: 16px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCreateDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly create = output<CreateProjectInput>();
  readonly cancel = output<void>();

  readonly draft = signal<CreateProjectInput>({ ...DEFAULT_DRAFT });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.draft.set({ ...DEFAULT_DRAFT });
      }
    });
  }

  updateField<K extends keyof CreateProjectInput>(key: K, value: CreateProjectInput[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  canSubmit(): boolean {
    return !!this.draft().name?.trim() && !!this.draft().projectKey?.trim();
  }

  submitForm(): void {
    if (!this.canSubmit()) {
      return;
    }
    const draft = this.draft();
    this.create.emit({
      name: draft.name.trim(),
      projectKey: draft.projectKey.trim().toUpperCase(),
      description: draft.description?.trim() || undefined,
      icon: draft.icon?.trim() || undefined,
      visibility: draft.visibility || 'internal',
    });
  }
}
