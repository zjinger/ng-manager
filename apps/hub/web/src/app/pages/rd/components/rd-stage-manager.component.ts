import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { type RdStageFormValue, type RdStageItem } from '../models/rd.model';

@Component({
  selector: 'app-rd-stage-manager',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzButtonModule,
    NzEmptyModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzTagModule
  ],
  templateUrl: './rd-stage-manager.component.html',
  styleUrls: ['./rd-stage-manager.component.less']
})
export class RdStageManagerComponent {
  private readonly fb = new FormBuilder();

  @Input() stages: RdStageItem[] = [];
  @Input() saving = false;

  @Output() readonly created = new EventEmitter<RdStageFormValue>();
  @Output() readonly updated = new EventEmitter<{ id: string; value: RdStageFormValue }>();
  @Output() readonly removed = new EventEmitter<string>();

  protected editingId: string | null = null;

  protected readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    sort: [0, [Validators.min(0), Validators.max(9999)]],
    enabled: [true]
  });

  protected readonly editForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    sort: [0, [Validators.min(0), Validators.max(9999)]],
    enabled: [true]
  });

  protected submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const value = this.createForm.getRawValue();
    this.created.emit({ name: value.name.trim(), sort: value.sort ?? 0, enabled: value.enabled });
    this.createForm.reset({ name: '', sort: 0, enabled: true });
  }

  protected beginEdit(item: RdStageItem): void {
    this.editingId = item.id;
    this.editForm.reset({ name: item.name, sort: item.sort, enabled: item.enabled });
  }

  protected cancelEdit(): void {
    this.editingId = null;
    this.editForm.reset({ name: '', sort: 0, enabled: true });
  }

  protected saveEdit(item: RdStageItem): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const value = this.editForm.getRawValue();
    this.updated.emit({ id: item.id, value: { name: value.name.trim(), sort: value.sort ?? 0, enabled: value.enabled } });
    this.cancelEdit();
  }

  protected toggleEnabled(item: RdStageItem): void {
    this.updated.emit({ id: item.id, value: { name: item.name, sort: item.sort, enabled: !item.enabled } });
  }

  protected removeConfirmTitle(item: RdStageItem): string {
    return `确认删除阶段“${item.name}”吗？`;
  }
}