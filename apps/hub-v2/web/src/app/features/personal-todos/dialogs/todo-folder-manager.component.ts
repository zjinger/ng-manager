import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

import { DialogShellComponent, FormActionsComponent } from '@shared/ui';
import {
  TODO_TAG_COLORS,
  type TodoFolderColor,
  type TodoFolderDraft,
  type TodoFolderEntity,
} from '../models/todo.model';

@Component({
  selector: 'app-todo-folder-manager',
  imports: [
    ReactiveFormsModule,
    NzButtonModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    DialogShellComponent,
    FormActionsComponent,
  ],
  template: `
    <app-dialog-shell
      [open]="visible()"
      [center]="true"
      [width]="640"
      [title]="'管理文件夹'"
      [subtitle]="'维护个人待办使用的私有文件夹。'"
      [icon]="'folder-open'"
      [modalClass]="'personal-todo-folder-modal'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="personal-todo-folder-form" class="folder-form" nz-form nzLayout="vertical" [formGroup]="form" (ngSubmit)="submit()">
          <nz-form-item>
            <nz-form-label nzRequired nzFor="todo-folder-name">文件夹名称</nz-form-label>
            <nz-form-control nzErrorTip="请输入 24 字以内的文件夹名称">
              <input
                id="todo-folder-name"
                nz-input
                formControlName="name"
                maxlength="24"
                placeholder="输入文件夹名称"
                (keydown.enter)="$event.preventDefault(); submit()"
              />
            </nz-form-control>
          </nz-form-item>

          <div class="folder-form__colors" role="radiogroup" aria-label="文件夹颜色">
            @for (item of colorOptions; track item.value) {
              <button
                type="button"
                class="folder-color"
                [class.is-selected]="selectedColor() === item.value"
                [style.--folder-color]="item.swatch"
                [attr.aria-label]="item.label"
                [attr.aria-checked]="selectedColor() === item.value"
                role="radio"
                (click)="selectedColor.set(item.value)"
              ></button>
            }
          </div>

          <div class="folder-form__actions">
            @if (editingFolder()) {
              <button nz-button type="button" (click)="resetForm()">取消编辑</button>
            }
            <button nz-button nzType="primary" type="submit">
              <span nz-icon [nzType]="editingFolder() ? 'save' : 'folder-add'"></span>
              {{ editingFolder() ? '保存文件夹' : '新增文件夹' }}
            </button>
          </div>
        </form>

        <section class="folder-list">
          @for (folder of sortedFolders(); track folder.id) {
            <article class="folder-row">
              <span class="folder-row__swatch" [attr.data-color]="folder.color"></span>
              <strong>{{ folder.name }}</strong>
              <div class="folder-row__actions">
                <button nz-button nzType="text" nzShape="circle" title="编辑" (click)="editFolder(folder)">
                  <span nz-icon nzType="edit"></span>
                </button>
                <button nz-button nzType="text" nzShape="circle" title="删除" nzDanger (click)="deleteFolder.emit(folder)">
                  <span nz-icon nzType="delete"></span>
                </button>
              </div>
            </article>
          } @empty {
            <div class="folder-list__empty">暂无文件夹</div>
          }
        </section>
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="cancel.emit()">关闭</button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .folder-form {
        display: grid;
        gap: 12px;
        padding-bottom: 18px;
        border-bottom: 1px solid var(--border-color-soft);
      }

      .folder-form__colors {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .folder-color {
        width: 28px;
        height: 28px;
        border: 2px solid transparent;
        border-radius: 999px;
        background: var(--folder-color);
        cursor: pointer;
        transition: var(--transition-base);
      }

      .folder-color.is-selected {
        border-color: var(--text-primary);
        box-shadow: 0 0 0 3px var(--bg-container), 0 0 0 5px color-mix(in srgb, var(--folder-color) 40%, transparent);
      }

      .folder-form__actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .folder-list {
        display: grid;
        gap: 8px;
        margin-top: 16px;
        max-height: 300px;
        overflow: auto;
      }

      .folder-row {
        display: grid;
        grid-template-columns: 14px minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border: 1px solid var(--border-color-soft);
        border-radius: var(--border-radius-sm);
        background: var(--bg-container);
      }

      .folder-row strong {
        min-width: 0;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .folder-row__swatch {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--color-info);
      }

      .folder-row__swatch[data-color='purple'] {
        background: #7c3aed;
      }

      .folder-row__swatch[data-color='green'] {
        background: #16a34a;
      }

      .folder-row__swatch[data-color='red'] {
        background: #dc2626;
      }

      .folder-row__swatch[data-color='orange'] {
        background: #ea580c;
      }

      .folder-row__swatch[data-color='cyan'] {
        background: #0891b2;
      }

      .folder-row__swatch[data-color='gray'] {
        background: #64748b;
      }

      .folder-row__actions {
        display: inline-flex;
        align-items: center;
      }

      .folder-list__empty {
        display: grid;
        place-items: center;
        min-height: 96px;
        color: var(--text-disabled);
        border: 1px dashed var(--border-color);
        border-radius: var(--border-radius-sm);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoFolderManagerComponent {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly visible = input(false);
  readonly folders = input<TodoFolderEntity[]>([]);
  readonly resetToken = input(0);
  readonly createFolder = output<TodoFolderDraft>();
  readonly updateFolder = output<{ id: string; draft: TodoFolderDraft }>();
  readonly deleteFolder = output<TodoFolderEntity>();
  readonly cancel = output<void>();

  readonly editingFolder = signal<TodoFolderEntity | null>(null);
  readonly selectedColor = signal<TodoFolderColor>('blue');
  readonly sortedFolders = computed(() => [...this.folders()].sort((a, b) => a.sortOrder - b.sortOrder));
  readonly colorOptions = TODO_TAG_COLORS;
  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(24)]],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        this.resetForm();
      }
    });
    effect(() => {
      this.resetToken();
      if (this.visible()) {
        this.resetForm();
      }
    });
  }

  editFolder(folder: TodoFolderEntity): void {
    this.editingFolder.set(folder);
    this.selectedColor.set(folder.color);
    this.form.reset({ name: folder.name });
  }

  submit(): void {
    const name = this.form.controls.name.value.trim();
    if (!name) {
      this.form.controls.name.markAsDirty();
      this.form.controls.name.updateValueAndValidity();
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const draft: TodoFolderDraft = {
      name,
      color: this.selectedColor(),
    };
    const editing = this.editingFolder();
    if (editing) {
      this.updateFolder.emit({ id: editing.id, draft });
    } else {
      this.createFolder.emit(draft);
    }
  }

  resetForm(): void {
    this.editingFolder.set(null);
    this.selectedColor.set('blue');
    this.form.reset({ name: '' });
  }
}
