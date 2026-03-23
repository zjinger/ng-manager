import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent } from '@shared/ui';
import type { ProjectSummary, UpdateProjectInput } from '../../models/project.model';

type EditDraft = {
  name: string;
  description: string;
  icon: string;
  visibility: 'internal' | 'private';
};

@Component({
  selector: 'app-project-edit-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzFormModule, NzIconModule, NzInputModule, NzSelectModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="720"
      [title]="'编辑项目'"
      [subtitle]="project()?.projectKey || ''"
      [icon]="'edit'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form nz-form nzLayout="vertical">
          <nz-form-item>
            <nz-form-label nzRequired>项目名称</nz-form-label>
            <nz-form-control>
              <input nz-input [ngModel]="draft().name" name="name" (ngModelChange)="update('name', $event)" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>项目描述</nz-form-label>
            <nz-form-control>
              <textarea
                nz-input
                rows="4"
                [ngModel]="draft().description"
                name="description"
                (ngModelChange)="update('description', $event)"
              ></textarea>
            </nz-form-control>
          </nz-form-item>

          <div class="row">
            <nz-form-item>
              <nz-form-label>图标</nz-form-label>
              <nz-form-control>
                <input nz-input [ngModel]="draft().icon" name="icon" (ngModelChange)="update('icon', $event)" />
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label>可见性</nz-form-label>
              <nz-form-control>
                <nz-select
                  [ngModel]="draft().visibility"
                  name="visibility"
                  (ngModelChange)="update('visibility', $event || 'internal')"
                >
                  <nz-option nzLabel="内部" nzValue="internal"></nz-option>
                  <nz-option nzLabel="私有" nzValue="private"></nz-option>
                </nz-select>
              </nz-form-control>
            </nz-form-item>
          </div>
        </form>
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [nzLoading]="busy()" [disabled]="!canSubmit()" (click)="submit()">
          <nz-icon nzType="save" nzTheme="outline" />
          保存
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      @media (max-width: 768px) {
        .row {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectEditDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly project = input<ProjectSummary | null>(null);
  readonly cancel = output<void>();
  readonly save = output<UpdateProjectInput>();

  readonly draft = signal<EditDraft>({
    name: '',
    description: '',
    icon: '',
    visibility: 'internal'
  });
  readonly canSubmit = computed(() => !!this.draft().name.trim());

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const project = this.project();
      if (!project) {
        return;
      }
      this.draft.set({
        name: project.name,
        description: project.description ?? '',
        icon: project.icon ?? '',
        visibility: project.visibility === 'private' ? 'private' : 'internal'
      });
    });
  }

  update<K extends keyof EditDraft>(key: K, value: EditDraft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    const draft = this.draft();
    this.save.emit({
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      icon: draft.icon.trim() || null,
      visibility: draft.visibility
    });
  }
}
