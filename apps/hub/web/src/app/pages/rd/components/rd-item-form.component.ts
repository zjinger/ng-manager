import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  @Input() projectId = '';
  @Input() projectOptions: Array<{ label: string; value: string }> = [];
  @Input() projectLocked = false;
  @Input() stageOptions: RdStageItem[] = [];
  @Input() memberOptions: ProjectMemberItem[] = [];
  @Input() submitting = false;

  @Output() readonly submitted = new EventEmitter<RdItemFormValue>();
  @Output() readonly cancelled = new EventEmitter<void>();
  @Output() readonly projectChanged = new EventEmitter<string>();

  protected readonly typeOptions = RD_TYPE_OPTIONS;
  protected readonly priorityOptions = RD_PRIORITY_OPTIONS;

  protected readonly form = this.fb.nonNullable.group({
    projectId: ['', [Validators.required]],
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

  public constructor() {
    this.form.controls.projectId.valueChanges.pipe(takeUntilDestroyed()).subscribe((projectId) => {
      this.projectChanged.emit(projectId.trim());
    });
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue'] || changes['mode']) {
      this.resetForm();
    }

    if (changes['projectId']) {
      this.syncProjectControl();
    }

    if (changes['projectLocked']) {
      this.syncProjectLock();
    }

    if (changes['stageOptions']) {
      this.ensureStageStillValid();
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
      projectId: value.projectId.trim(),
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
    const nextProjectId = item?.projectId ?? this.projectId ?? this.projectOptions[0]?.value ?? '';
    const defaultStageId = item?.stageId ?? this.stageOptions[0]?.id ?? '';

    this.form.reset({
      projectId: nextProjectId,
      title: item?.title ?? '',
      description: item?.description ?? '',
      stageId: defaultStageId,
      type: item?.type ?? 'feature_dev',
      priority: item?.priority ?? 'medium',
      assigneeId: item?.assigneeId ?? '',
      reviewerId: item?.reviewerId ?? '',
      progress: item?.progress ?? 0,
      planStartAt: this.parseDateValue(item?.planStartAt ?? ''),
      planEndAt: this.parseDateValue(item?.planEndAt ?? ''),
      blockerReason: item?.blockerReason ?? ''
    }, { emitEvent: false });

    this.syncProjectLock();
    this.ensureStageStillValid();
  }

  private syncProjectControl(): void {
    const nextProjectId = this.initialValue?.projectId ?? this.projectId ?? '';
    if (nextProjectId === this.form.controls.projectId.getRawValue()) {
      this.syncProjectLock();
      return;
    }
    this.form.controls.projectId.patchValue(nextProjectId, { emitEvent: false });
    this.syncProjectLock();
  }

  private syncProjectLock(): void {
    if (this.projectLocked) {
      this.form.controls.projectId.disable({ emitEvent: false });
      return;
    }
    this.form.controls.projectId.enable({ emitEvent: false });
  }

  private ensureStageStillValid(): void {
    const currentStageId = this.form.controls.stageId.value.trim();
    if (!this.stageOptions.length) {
      this.form.controls.stageId.patchValue('', { emitEvent: false });
      return;
    }
    const exists = this.stageOptions.some((stage) => stage.id === currentStageId);
    if (!exists) {
      this.form.controls.stageId.patchValue(this.stageOptions[0]?.id ?? '', { emitEvent: false });
    }
  }

  private ensureMemberStillValid(controlName: 'assigneeId' | 'reviewerId'): void {
    const userId = this.form.controls[controlName].value.trim();
    if (!userId) {
      return;
    }
    const exists = this.memberOptions.some((member) => member.userId === userId);
    if (!exists) {
      this.form.patchValue({ [controlName]: '' }, { emitEvent: false });
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
