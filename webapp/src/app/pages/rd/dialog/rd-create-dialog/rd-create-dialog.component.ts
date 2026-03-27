import { Component, effect, inject, input, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PRIORITY_OPTIONS } from '@app/shared/constants/priority-options';
import {
  CreateRdItemInput,
  ProjectMemberEntity,
  RdItemPriority,
  RdItemType,
  RdStageEntity,
} from '@pages/rd/models/rd.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFlexModule } from 'ng-zorro-antd/flex';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';

type Draft = Omit<CreateRdItemInput, 'projectId'>;
const DEFAULT_DRAFT: Draft = {
  title: '',
  description: '',
  stageId: null,
  type: 'feature_dev',
  priority: 'medium',
  assigneeId: null,
  reviewerId: null,
  planStartAt: '',
  planEndAt: '',
};

@Component({
  selector: 'app-rd-create-dialog',
  imports: [
    NzModalModule,
    NzCardModule,
    NzDatePickerModule,
    NzSelectModule,
    NzFormModule,
    ReactiveFormsModule,
    NzButtonModule,
    NzInputModule,
    NzFlexModule,
  ],
  templateUrl: './rd-create-dialog.component.html',
  styleUrl: './rd-create-dialog.component.less',
})
export class RdCreateDialogComponent {
  private fb = inject(NonNullableFormBuilder);

  readonly open = input(false);
  readonly stages = input<RdStageEntity[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly create = output<Draft>();
  readonly cancel = output<void>();


  readonly priorityOptions = PRIORITY_OPTIONS;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.form.reset(DEFAULT_DRAFT);
      }
    });
  }

  form = this.fb.group({
    title: this.fb.control(DEFAULT_DRAFT.title, [Validators.required]),
    description: this.fb.control(DEFAULT_DRAFT.description),
    stageId: this.fb.control(DEFAULT_DRAFT.stageId, [Validators.required]),
    type: this.fb.control<RdItemType>(DEFAULT_DRAFT.type!, [Validators.required]),
    priority: this.fb.control<RdItemPriority>(DEFAULT_DRAFT.priority!, [Validators.required]),
    assigneeId: this.fb.control(DEFAULT_DRAFT.assigneeId, [Validators.required]),
    reviewerId: this.fb.control(DEFAULT_DRAFT.reviewerId),
    planStartAt: this.fb.control(DEFAULT_DRAFT.planStartAt),
    planEndAt: this.fb.control(DEFAULT_DRAFT.planEndAt),
  });

  updateCtrl(ctrlKey: keyof Draft, value: Draft[keyof Draft]) {
    this.form.get(ctrlKey)?.setValue(value);
  }

  submit() {
    if (this.form.valid) {
      this.form.markAllAsTouched();
    }
    const draft = this.form.getRawValue();
    this.create.emit({ ...draft, title: draft.title.trim() });
  }
}
