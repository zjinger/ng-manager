import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

import { DialogShellComponent, FormActionsComponent } from '@shared/ui';
import {
  TODO_TAG_COLORS,
  type TodoTagColor,
  type TodoTagDraft,
  type TodoTagEntity,
} from '../models/todo.model';

@Component({
  selector: 'app-todo-tag-manager',
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
      [title]="'管理标签'"
      [subtitle]="'维护个人待办使用的私有标签。'"
      [icon]="'tags'"
      [modalClass]="'personal-todo-tag-modal'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="personal-todo-tag-form" class="tag-form" nz-form nzLayout="vertical" [formGroup]="form" (ngSubmit)="submit()">
          <nz-form-item>
            <nz-form-label nzRequired nzFor="todo-tag-name">标签名称</nz-form-label>
            <nz-form-control nzErrorTip="请输入 24 字以内的标签名称">
              <input
                id="todo-tag-name"
                nz-input
                formControlName="name"
                maxlength="24"
                placeholder="输入标签名称"
                (keydown.enter)="$event.preventDefault(); submit()"
              />
            </nz-form-control>
          </nz-form-item>

          <div class="tag-form__colors" role="radiogroup" aria-label="标签颜色">
            @for (item of colorOptions; track item.value) {
              <button
                type="button"
                class="tag-color"
                [class.is-selected]="selectedColor() === item.value"
                [style.--tag-color]="item.swatch"
                [attr.aria-label]="item.label"
                [attr.aria-checked]="selectedColor() === item.value"
                role="radio"
                (click)="selectedColor.set(item.value)"
              ></button>
            }
          </div>

          <div class="tag-form__actions">
            @if (editingTag()) {
              <button nz-button type="button" (click)="resetForm()">取消编辑</button>
            }
            <button nz-button nzType="primary" type="submit">
              <span nz-icon [nzType]="editingTag() ? 'save' : 'plus'"></span>
              {{ editingTag() ? '保存标签' : '新增标签' }}
            </button>
          </div>
        </form>

        <section class="tag-list">
          @for (tag of sortedTags(); track tag.id) {
            <article class="tag-row">
              <span class="tag-row__swatch" [attr.data-color]="tag.color"></span>
              <strong>{{ tag.name }}</strong>
              <div class="tag-row__actions">
                <button nz-button nzType="text" nzShape="circle" title="编辑" (click)="editTag(tag)">
                  <span nz-icon nzType="edit"></span>
                </button>
                <button nz-button nzType="text" nzShape="circle" title="删除" nzDanger (click)="deleteTag.emit(tag)">
                  <span nz-icon nzType="delete"></span>
                </button>
              </div>
            </article>
          } @empty {
            <div class="tag-list__empty">暂无标签</div>
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
      .tag-form {
        display: grid;
        gap: 12px;
        padding-bottom: 18px;
        border-bottom: 1px solid var(--border-color-soft);
      }

      .tag-form__colors {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .tag-color {
        width: 28px;
        height: 28px;
        border: 2px solid transparent;
        border-radius: 999px;
        background: var(--tag-color);
        cursor: pointer;
        transition: var(--transition-base);
      }

      .tag-color.is-selected {
        border-color: var(--text-primary);
        box-shadow: 0 0 0 3px var(--bg-container), 0 0 0 5px color-mix(in srgb, var(--tag-color) 40%, transparent);
      }

      .tag-form__actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .tag-list {
        display: grid;
        gap: 8px;
        margin-top: 16px;
        max-height: 300px;
        overflow: auto;
      }

      .tag-row {
        display: grid;
        grid-template-columns: 14px minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border: 1px solid var(--border-color-soft);
        border-radius: var(--border-radius-sm);
        background: var(--bg-container);
      }

      .tag-row strong {
        min-width: 0;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tag-row__swatch {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--color-info);
      }

      .tag-row__swatch[data-color='purple'] {
        background: #7c3aed;
      }

      .tag-row__swatch[data-color='green'] {
        background: #16a34a;
      }

      .tag-row__swatch[data-color='red'] {
        background: #dc2626;
      }

      .tag-row__swatch[data-color='orange'] {
        background: #ea580c;
      }

      .tag-row__swatch[data-color='cyan'] {
        background: #0891b2;
      }

      .tag-row__swatch[data-color='gray'] {
        background: #64748b;
      }

      .tag-row__actions {
        display: inline-flex;
        align-items: center;
      }

      .tag-list__empty {
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
export class TodoTagManagerComponent {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly visible = input(false);
  readonly tags = input<TodoTagEntity[]>([]);
  readonly resetToken = input(0);
  readonly createTag = output<TodoTagDraft>();
  readonly updateTag = output<{ id: string; draft: TodoTagDraft }>();
  readonly deleteTag = output<TodoTagEntity>();
  readonly cancel = output<void>();

  readonly editingTag = signal<TodoTagEntity | null>(null);
  readonly selectedColor = signal<TodoTagColor>('blue');
  readonly sortedTags = computed(() => [...this.tags()].sort((a, b) => a.sortOrder - b.sortOrder));
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

  editTag(tag: TodoTagEntity): void {
    this.editingTag.set(tag);
    this.selectedColor.set(tag.color);
    this.form.reset({ name: tag.name });
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

    const draft: TodoTagDraft = {
      name,
      color: this.selectedColor(),
    };
    const editing = this.editingTag();
    if (editing) {
      this.updateTag.emit({ id: editing.id, draft });
    } else {
      this.createTag.emit(draft);
    }
  }

  resetForm(): void {
    this.editingTag.set(null);
    this.selectedColor.set('blue');
    this.form.reset({ name: '' });
  }
}
