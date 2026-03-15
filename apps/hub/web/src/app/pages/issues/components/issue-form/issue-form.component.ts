import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import type { ProjectConfigItem, ProjectMemberItem, ProjectVersionItem } from '../../../projects/projects.model';
import {
  ISSUE_PRIORITY_OPTIONS,
  ISSUE_TYPE_OPTIONS,
  type IssueFormValue,
  type IssueItem
} from '../../issues.model';

@Component({
  selector: 'app-issue-form',
  imports: [ReactiveFormsModule, NzButtonModule, NzFormModule, NzInputModule, NzSelectModule],
  templateUrl: './issue-form.component.html',
  styleUrls: ['./issue-form.component.less']
})
export class IssueFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() mode: 'create' | 'edit' = 'create';
  @Input() initialValue: IssueItem | null = null;
  @Input() memberOptions: ProjectMemberItem[] = [];
  @Input() moduleOptions: ProjectConfigItem[] = [];
  @Input() versionOptions: ProjectVersionItem[] = [];
  @Input() environmentOptions: ProjectConfigItem[] = [];
  @Input() submitting = false;

  @Output() readonly submitted = new EventEmitter<IssueFormValue>();
  @Output() readonly cancelled = new EventEmitter<void>();

  protected readonly typeOptions = ISSUE_TYPE_OPTIONS;
  protected readonly priorityOptions = ISSUE_PRIORITY_OPTIONS;

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(10000)]],
    type: ['bug' as IssueFormValue['type'], [Validators.required]],
    priority: ['medium' as IssueFormValue['priority'], [Validators.required]],
    assigneeId: [''],
    moduleCode: [''],
    versionCode: [''],
    environmentCode: ['']
  });

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue'] || changes['mode']) {
      this.resetForm();
    }

    if (changes['memberOptions']) {
      this.ensureAssigneeStillValid();
    }

    if (changes['moduleOptions']) {
      this.ensureOptionStillValid('moduleCode', this.moduleOptions.map((item) => item.name));
    }
    if (changes['versionOptions']) {
      this.ensureOptionStillValid('versionCode', this.versionOptions.map((item) => item.version));
    }
    if (changes['environmentOptions']) {
      this.ensureOptionStillValid('environmentCode', this.environmentOptions.map((item) => item.name));
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
      type: value.type,
      priority: value.priority,
      assigneeId: value.assigneeId.trim(),
      moduleCode: value.moduleCode.trim(),
      versionCode: value.versionCode.trim(),
      environmentCode: value.environmentCode.trim()
    });
  }

  protected memberLabel(member: ProjectMemberItem): string {
    return member.displayName?.trim() || member.userId;
  }

  private resetForm(): void {
    const issue = this.initialValue;
    this.form.reset({
      title: issue?.title ?? '',
      description: issue?.description ?? '',
      type: issue?.type ?? 'bug',
      priority: issue?.priority ?? 'medium',
      assigneeId: issue?.assigneeId ?? '',
      moduleCode: issue?.moduleCode ?? '',
      versionCode: issue?.versionCode ?? '',
      environmentCode: issue?.environmentCode ?? ''
    });
  }

  private ensureAssigneeStillValid(): void {
    const assigneeId = this.form.controls.assigneeId.value.trim();
    if (!assigneeId) {
      return;
    }
    const exists = this.memberOptions.some((member) => member.userId === assigneeId);
    if (!exists) {
      this.form.patchValue({ assigneeId: '' });
    }
  }

  private ensureOptionStillValid(controlName: 'moduleCode' | 'versionCode' | 'environmentCode', options: string[]): void {
    const value = this.form.controls[controlName].value.trim();
    if (!value) {
      return;
    }
    if (!options.includes(value)) {
      this.form.patchValue({ [controlName]: '' });
    }
  }
}
