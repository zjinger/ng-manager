import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';

import { DialogShellComponent, MarkdownEditorComponent } from '@shared/ui';
import type { RdItemEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-edit-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, DialogShellComponent, MarkdownEditorComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="900"
      [title]="'编辑研发项'"
      [subtitle]="item() ? item()!.rdNo : ''"
      [icon]="'edit'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="rd-edit-form" class="edit-form" (ngSubmit)="submitForm()">
          <label class="dialog-field">
            <span class="dialog-field__label">标题</span>
            <input nz-input maxlength="120" [ngModel]="title()" name="title" (ngModelChange)="title.set($event)" />
          </label>

          <label class="dialog-field">
            <span class="dialog-field__label">研发项描述</span>
            <app-markdown-editor
              [ngModel]="description()"
              name="description"
              (ngModelChange)="description.set($event)"
              [minHeight]="'240px'"
              [placeholder]="'简要描述背景、目标和预期交付。'"
            ></app-markdown-editor>
          </label>
        </form>
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [disabled]="!title().trim()" [nzLoading]="busy()" type="submit" form="rd-edit-form">
          保存
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .edit-form {
        display: grid;
        gap: 12px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdEditDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly item = input<RdItemEntity | null>(null);
  readonly save = output<{ title: string; description: string | null }>();
  readonly cancel = output<void>();

  readonly title = signal('');
  readonly description = signal('');

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const current = this.item();
      this.title.set(current?.title ?? '');
      this.description.set(current?.description ?? '');
    });
  }

  submitForm(): void {
    const title = this.title().trim();
    if (!title) {
      return;
    }
    const desc = this.description().trim();
    this.save.emit({
      title,
      description: desc ? desc : null,
    });
  }
}
