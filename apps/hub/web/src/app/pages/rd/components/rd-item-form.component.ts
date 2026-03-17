import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import type { ProjectMemberItem } from '../../projects/projects.model';
import {
  memberDisplay,
  RD_PRIORITY_OPTIONS,
  RD_TYPE_OPTIONS,
  type RdItem,
  type RdItemFormValue,
  type RdStageItem
} from '../models/rd.model';

@Component({
  selector: 'app-rd-item-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NzButtonModule,
    NzDatePickerModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule
  ],
  templateUrl: './rd-item-form.component.html',
  styleUrls: ['./rd-item-form.component.less']
})
export class RdItemFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() mode: 'create' | 'edit' = 'create';
  @Input() initialValue: RdItem | null = null;
  @Input() stageOptions: RdStageItem[] = [];
  @Input() memberOptions: ProjectMemberItem[] = [];
  @Input() submitting = false;

  @Output() readonly submitted = new EventEmitter<RdItemFormValue>();
  @Output() readonly cancelled = new EventEmitter<void>();

  protected readonly typeOptions = RD_TYPE_OPTIONS;
  protected readonly priorityOptions = RD_PRIORITY_OPTIONS;

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(10000)]],
    stageId: ['', [Validators.required]],
    type: ['feature_dev' as RdItemFormValue['type'], [Validators.required]],
    priority: ['medium' as RdItemFormValue['priority'], [Validators.required]],
    assigneeId: [''],
    reviewerId: [''],
    progress: [0, [Validators.min(0), Validators.max(100)]],
    planStartAt: [null as Date | null],
    planEndAt: [null as Date | null],
    blockerReason: ['']
  });

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue'] || changes['mode'] || changes['stageOptions']) {
      this.resetForm();
    }

    if (changes['memberOptions']) {
      this.ensureMemberStillValid('assigneeId');
      this.ensureMemberStillValid('reviewerId');
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.submitted.emit({
      title: value.title.trim(),
      description: value.description.trim(),
      stageId: value.stageId,
      type: value.type,
      priority: value.priority,
      assigneeId: value.assigneeId.trim(),
      reviewerId: value.reviewerId.trim(),
      progress: Number(value.progress ?? 0),
      planStartAt: this.formatDateValue(value.planStartAt),
      planEndAt: this.formatDateValue(value.planEndAt),
      blockerReason: value.blockerReason.trim()
    });
  }

  protected memberLabel(member: ProjectMemberItem): string {
    return memberDisplay(member);
  }

  private resetForm(): void {
    const item = this.initialValue;
    const defaultStageId = this.stageOptions[0]?.id ?? '';
    this.form.reset({
      title: item?.title ?? '',
      description: item?.description ?? '',
      stageId: item?.stageId ?? defaultStageId,
      type: item?.type ?? 'feature_dev',
      priority: item?.priority ?? 'medium',
      assigneeId: item?.assigneeId ?? '',
      reviewerId: item?.reviewerId ?? '',
      progress: item?.progress ?? 0,
      planStartAt: this.parseDateValue(item?.planStartAt ?? ''),
      planEndAt: this.parseDateValue(item?.planEndAt ?? ''),
      blockerReason: item?.blockerReason ?? ''
    });
  }

  private ensureMemberStillValid(controlName: 'assigneeId' | 'reviewerId'): void {
    const userId = this.form.controls[controlName].value.trim();
    if (!userId) {
      return;
    }
    const exists = this.memberOptions.some((member) => member.userId === userId);
    if (!exists) {
      this.form.patchValue({ [controlName]: '' });
    }
  }

  private parseDateValue(value: string): Date | null {
    const text = value.trim();
    if (!text) {
      return null;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) {
      return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    return new Date(year, month, day);
  }

  private formatDateValue(value: Date | null): string {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      return '';
    }
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return [year, month, day].join('-');
  }
}