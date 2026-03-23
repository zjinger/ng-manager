import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent } from '@shared/ui';
import type { CreateProjectInput } from '../../models/project.model';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';

const DEFAULT_DRAFT: CreateProjectInput = {
  name: '',
  description: '',
  icon: '',
  visibility: 'internal',
};

@Component({
  selector: 'app-project-create-dialog',
  standalone: true,
  imports: [FormsModule, NzGridModule, NzButtonModule, NzIconModule, NzFormModule, NzInputModule, NzSelectModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="720"
      [title]="'新建项目'"
      [subtitle]="'先建立用于测试协作流和问题流转的基础项目数据。'"
      [icon]="'folder-add'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form nz-form [nzLayout]="'vertical'">
          <div class="row" nz-row  [nzGutter]="16"> 
            <div class="col" nz-col  [nzSpan]="12">
              <nz-form-item >
              <nz-form-label nzRequired nzFor="email">项目名称</nz-form-label>
              <nz-form-control nzErrorTip="请输入项目名称">
                <input nz-input required="true" [ngModel]="draft().name" name="name" (ngModelChange)="updateField('name', $event)" />
              </nz-form-control>
            </nz-form-item>
            </div>
            <div class="col" nz-col  [nzSpan]="12"></div>
          </div>
          <div class="row" nz-row  [nzGutter]="16">
            <div class="col" nz-col  [nzSpan]="24" >
            <nz-form-item >
              <nz-form-label  nzFor="email">项目描述</nz-form-label>
              <nz-form-control >
                <textarea nz-input rows="4" placeholder="描述项目的业务边界、协作对象或当前阶段。" [ngModel]="draft().description" name="description" (ngModelChange)="updateField('description', $event)"></textarea>
              </nz-form-control>
            </nz-form-item>
            </div>
          </div>
          <div class="row" nz-row  [nzGutter]="16">
            <div class="col" nz-col  [nzSpan]="12">
              <nz-form-item >
                <nz-form-label  nzFor="visibility">图标</nz-form-label>
                <nz-form-control >
                  <input
                    nz-input
                    placeholder="可先填写 emoji 或简写"
                    [ngModel]="draft().icon"
                    name="icon"
                    (ngModelChange)="updateField('icon', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
            <div class="col" nz-col  [nzSpan]="12">
              <nz-form-item >
                <nz-form-label nzRequired nzTooltipTitle="内部公开：所有登录用户可见；私有：仅项目成员可见" [nzTooltipIcon]="'question-circle'" nzFor="visibility">可见性</nz-form-label>
                <nz-form-control >
                  <nz-select [ngModel]="draft().visibility" name="visibility" (ngModelChange)="updateField('visibility', $event)">
                  <nz-option nzLabel="内部" nzValue="internal"></nz-option>
                  <nz-option nzLabel="私有" nzValue="private"></nz-option>
                </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
        </form>
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [nzLoading]="busy()" (click)="submitForm()" [disabled]="!canSubmit()" type="submit" >
          <nz-icon nzType="check" nzTheme="outline"/>
          创建项目
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
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
    return !!this.draft().name?.trim();
  }

  submitForm(): void {
    if (!this.canSubmit()) {
      return;
    }
    const draft = this.draft();
    this.create.emit({
      name: draft.name.trim(),
      description: draft.description?.trim() || undefined,
      icon: draft.icon?.trim() || undefined,
      visibility: draft.visibility || 'internal',
    });
  }
}
