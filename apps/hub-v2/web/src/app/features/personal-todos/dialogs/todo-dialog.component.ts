import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent, FormActionsComponent, MarkdownEditorComponent } from '@shared/ui';
import {
  TODO_PRIORITY_OPTIONS,
  TODO_STATUS_OPTIONS,
  type Todo,
  type TodoDraft,
  type TodoPriority,
  type TodoStatus,
  type TodoTagEntity,
} from '../models/todo.model';

@Component({
  selector: 'app-todo-dialog',
  imports: [
    ReactiveFormsModule,
    NzButtonModule,
    NzDatePickerModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    DialogShellComponent,
    FormActionsComponent,
    MarkdownEditorComponent,
  ],
  template: `
    <app-dialog-shell
      [open]="visible()"
      [center]="true"
      [width]="720"
      [title]="todo() ? '编辑待办' : '新建待办'"
      [subtitle]="'记录个人事项、截止日期和执行状态。'"
      [icon]="todo() ? 'edit' : 'plus-circle'"
      [modalClass]="'personal-todo-modal'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="personal-todo-form" class="todo-form" nz-form nzLayout="vertical" [formGroup]="form" (ngSubmit)="submit()">
          <div class="row" nz-row nzGutter="16">
            <div class="col" nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label nzRequired nzFor="todo-title">待办标题</nz-form-label>
                <nz-form-control nzErrorTip="请输入 100 字以内的待办标题">
                  <input
                    id="todo-title"
                    nz-input
                    formControlName="title"
                    maxlength="100"
                    placeholder="输入待办标题"
                    (keydown.enter)="$event.preventDefault(); submit()"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div class="row" nz-row nzGutter="16">
            <div class="col" nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label nzFor="todo-desc">待办描述</nz-form-label>
                <nz-form-control>
                  <app-markdown-editor
                    formControlName="desc"
                    [config]="editorConfig"
                    [minHeight]="'200px'"
                    [maxHeight]="'360px'"
                    [placeholder]="'补充待办背景、目标、检查清单或备注'"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div class="row" nz-row nzGutter="16">
            <div class="col" nz-col nzSpan="8">
              <nz-form-item>
                <nz-form-label nzRequired>优先级</nz-form-label>
                <nz-form-control>
                  <nz-select formControlName="priority">
                    @for (item of priorityOptions; track item.value) {
                      <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>

            <div class="col" nz-col nzSpan="8">
              <nz-form-item>
                <nz-form-label>状态</nz-form-label>
                <nz-form-control>
                  <nz-select formControlName="status">
                    @for (item of statusOptions; track item.value) {
                      <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>

            <div class="col" nz-col nzSpan="8">
              <nz-form-item>
                <nz-form-label nzFor="todo-due">截止日期</nz-form-label>
                <nz-form-control>
                  <nz-date-picker
                    id="todo-due"
                    formControlName="due"
                    nzFormat="yyyy-MM-dd"
                    nzPlaceHolder="选择截止日期"
                    class="todo-date-picker"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div class="row" nz-row nzGutter="16">
            <div class="col" nz-col nzSpan="24">
              <div class="todo-form__chips">
                <label>标签</label>
                <div class="todo-form__chip-list">
                  @for (item of tags(); track item.id) {
                    <button
                      type="button"
                      class="todo-chip"
                      [class.is-selected]="isTagSelected(item.id)"
                      [attr.data-color]="item.color"
                      (click)="toggleTag(item.id)"
                    >
                      {{ item.name }}
                    </button>
                  } @empty {
                    <span class="todo-form__empty-tags">暂无标签</span>
                  }
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="cancel.emit()">取消</button>
          <button nz-button nzType="primary" type="submit" form="personal-todo-form">
            <span nz-icon nzType="save"></span>
            保存
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .todo-form {
        display: grid;
        gap: 0;
      }

      .todo-form__chips {
        display: grid;
        gap: 8px;
      }

      .todo-date-picker {
        width: 100%;
      }

      .todo-form__chips label {
        color: var(--text-secondary);
        font-size: 14px;
      }

      .todo-form__chip-list {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .todo-chip {
        border: 1px solid var(--border-color);
        border-radius: 999px;
        padding: 5px 12px;
        background: var(--bg-container);
        color: var(--text-secondary);
        font-size: 13px;
        cursor: pointer;
        transition: var(--transition-base);
      }

      .todo-chip.is-selected {
        border-color: transparent;
        font-weight: 700;
      }

      .todo-form__empty-tags {
        color: var(--text-disabled);
        font-size: 13px;
      }

      .todo-chip.is-selected[data-color='blue'] {
        background: var(--color-info-light);
        color: var(--color-info);
      }

      .todo-chip.is-selected[data-color='purple'] {
        background: rgba(139, 92, 246, 0.14);
        color: #7c3aed;
      }

      .todo-chip.is-selected[data-color='green'] {
        background: var(--color-success-light);
        color: var(--color-success);
      }

      .todo-chip.is-selected[data-color='red'] {
        background: var(--color-danger-light);
        color: var(--color-danger);
      }

      .todo-chip.is-selected[data-color='orange'] {
        background: rgba(234, 88, 12, 0.14);
        color: #c2410c;
      }

      .todo-chip.is-selected[data-color='cyan'] {
        background: rgba(8, 145, 178, 0.14);
        color: #0e7490;
      }

      .todo-chip.is-selected[data-color='gray'] {
        background: rgba(100, 116, 139, 0.14);
        color: #475569;
      }

      @media (max-width: 720px) {
        .row .col {
          width: 100%;
          max-width: 100%;
          flex: 0 0 100%;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoDialogComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly message = inject(NzMessageService);

  readonly visible = input(false);
  readonly todo = input<Todo | null>(null);
  readonly tags = input<TodoTagEntity[]>([]);
  readonly save = output<TodoDraft>();
  readonly cancel = output<void>();
  readonly selectedTagIds = signal<string[]>([]);

  readonly priorityOptions = TODO_PRIORITY_OPTIONS;
  readonly statusOptions = TODO_STATUS_OPTIONS;
  readonly editorConfig = {
    autosave: true,
    autosaveUniqueId: 'personal-todo-editor',
    status: ['lines', 'words'],
  };
  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    desc: ['', [Validators.maxLength(500)]],
    priority: this.fb.control<TodoPriority>('medium'),
    status: this.fb.control<TodoStatus>('todo'),
    due: new FormControl<Date | null>(null),
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }

      const todo = this.todo();
      this.form.reset({
        title: todo?.title ?? '',
        desc: todo?.desc ?? '',
        priority: todo?.priority ?? 'medium',
        status: todo?.status ?? 'todo',
        due: todo?.due ? this.parseIsoDate(todo.due) : null,
      });
      this.selectedTagIds.set([...(todo?.tagIds ?? [])]);
    });
  }

  submit(): void {
    const title = this.form.controls.title.value.trim();
    if (!title) {
      this.form.controls.title.markAsDirty();
      this.form.controls.title.updateValueAndValidity();
      this.message.error('请输入待办标题');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.save.emit({
      title,
      desc: value.desc,
      priority: value.priority,
      status: value.status,
      due: value.due ? this.formatIsoDate(value.due) : null,
      tagIds: this.selectedTagIds(),
    });
  }

  toggleTag(tagId: string): void {
    this.selectedTagIds.update((tags) =>
      tags.includes(tagId) ? tags.filter((item) => item !== tagId) : [...tags, tagId]
    );
  }

  isTagSelected(tagId: string): boolean {
    return this.selectedTagIds().includes(tagId);
  }

  private parseIsoDate(value: string): Date | null {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(year, month - 1, day);
  }

  private formatIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
