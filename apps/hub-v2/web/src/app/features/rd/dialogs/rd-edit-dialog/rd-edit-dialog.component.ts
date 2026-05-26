import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent, MarkdownEditorComponent } from '@shared/ui';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import { getRdMemberIds, type RdItemEntity } from '../../models/rd.model';

export interface RdEditDialogSaveInput {
  title: string;
  description: string | null;
  memberIds: string[];
  verifierId: string | null;
}

@Component({
  selector: 'app-rd-edit-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, NzSelectModule, DialogShellComponent, MarkdownEditorComponent],
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

          <div class="edit-form__grid">
            <label class="dialog-field">
              <span class="dialog-field__label">执行人</span>
              <nz-select
                nzMode="multiple"
                nzShowSearch
                nzAllowClear
                nzPlaceHolder="至少选择 1 名执行人"
                [ngModel]="memberIds()"
                name="memberIds"
                (ngModelChange)="memberIds.set(normalizeUserIds($event))"
              >
                @for (member of members(); track member.userId) {
                  <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
                }
              </nz-select>
            </label>

            <label class="dialog-field">
              <span class="dialog-field__label">验证人</span>
              <nz-select
                nzShowSearch
                nzAllowClear
                nzPlaceHolder="未指定时默认为创建人"
                [ngModel]="verifierId()"
                name="verifierId"
                (ngModelChange)="verifierId.set(normalizeNullableUserId($event))"
              >
                @for (member of members(); track member.userId) {
                  <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
                }
              </nz-select>
            </label>
          </div>

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
        <button nz-button nzType="primary" [disabled]="!isFormValid()" [nzLoading]="busy()" type="submit" form="rd-edit-form">
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
      .edit-form__grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 12px;
      }
      @media (max-width: 768px) {
        .edit-form__grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdEditDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly item = input<RdItemEntity | null>(null);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly save = output<RdEditDialogSaveInput>();
  readonly cancel = output<void>();

  readonly title = signal('');
  readonly description = signal('');
  readonly memberIds = signal<string[]>([]);
  readonly verifierId = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const current = this.item();
      this.title.set(current?.title ?? '');
      this.description.set(current?.description ?? '');
      this.memberIds.set(getRdMemberIds(current));
      this.verifierId.set(current?.verifierId?.trim() || null);
    });
  }

  isFormValid(): boolean {
    return this.title().trim().length > 0 && this.memberIds().length > 0;
  }

  submitForm(): void {
    const title = this.title().trim();
    const memberIds = this.normalizeUserIds(this.memberIds());
    if (!title || memberIds.length === 0) {
      return;
    }
    const desc = this.description().trim();
    this.save.emit({
      title,
      description: desc ? desc : null,
      memberIds,
      verifierId: this.normalizeNullableUserId(this.verifierId()),
    });
  }

  normalizeUserIds(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)));
  }

  normalizeNullableUserId(value: unknown): string | null {
    const id = String(value ?? '').trim();
    return id || null;
  }
}
