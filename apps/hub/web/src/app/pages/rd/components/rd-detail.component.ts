import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { HubDateTimePipe } from '../../../shared/pipes/date-time.pipe';
import {
  rdLogActionLabel,
  rdPriorityLabel,
  rdStatusColor,
  rdStatusLabel,
  rdTypeLabel,
  type RdItemDetailResult,
  type RdItemStatus,
  type RdLogActionType,
  type RdStatusChangeValue
} from '../models/rd.model';

@Component({
  selector: 'app-rd-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzButtonModule,
    NzCardModule,
    NzEmptyModule,
    NzInputModule,
    NzInputNumberModule,
    NzPopconfirmModule,
    NzProgressModule,
    NzSpinModule,
    NzTagModule,
    NzTimelineModule,
    HubDateTimePipe
  ],
  templateUrl: './rd-detail.component.html',
  styleUrls: ['./rd-detail.component.less']
})
export class RdDetailComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() detail: RdItemDetailResult | null = null;
  @Input() loading = false;
  @Input() currentProjectName = '';
  @Input() canEdit = false;
  @Input() canDelete = false;
  @Input() actionSaving = false;

  @Output() readonly editRequested = new EventEmitter<void>();
  @Output() readonly deleteRequested = new EventEmitter<void>();
  @Output() readonly statusChanged = new EventEmitter<RdStatusChangeValue>();
  @Output() readonly progressUpdated = new EventEmitter<number>();

  protected readonly progressForm = this.fb.nonNullable.group({
    progress: [0]
  });

  protected readonly blockerForm = this.fb.nonNullable.group({
    blockerReason: ['']
  });

  protected readonly logActionLabel = rdLogActionLabel;
  protected readonly statusLabel = rdStatusLabel;
  protected readonly statusColor = rdStatusColor;
  protected readonly priorityLabel = rdPriorityLabel;
  protected readonly typeLabel = rdTypeLabel;

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['detail']) {
      this.progressForm.patchValue({ progress: this.detail?.item.progress ?? 0 });
      this.blockerForm.patchValue({ blockerReason: this.detail?.item.blockerReason ?? '' });
    }
  }

  protected canShowAction(target: RdItemStatus): boolean {
    const current = this.detail?.item.status;
    return !!current && current !== target;
  }

  protected submitStatus(status: RdItemStatus): void {
    const blockerReason = this.blockerForm.controls.blockerReason.value.trim();
    this.statusChanged.emit({ status, blockerReason: status === 'blocked' ? blockerReason : undefined });
  }

  protected saveProgress(): void {
    const progress = Number(this.progressForm.controls.progress.value ?? 0);
    this.progressUpdated.emit(progress);
  }

  protected statusConfirmTitle(status: RdItemStatus): string {
    if (status === 'todo') return '确认将该研发项恢复为待开始吗？';
    if (status === 'doing') return '确认将该研发项标记为进行中吗？';
    if (status === 'blocked') return '确认将该研发项标记为阻塞吗？';
    if (status === 'done') return '确认将该研发项标记为已完成吗？';
    if (status === 'canceled') return '确认取消该研发项吗？';
    return '确认执行该操作吗？';
  }

  protected deleteConfirmTitle(): string {
    return '确认删除该研发项吗？删除后不可恢复。';
  }

  protected logColor(actionType: RdLogActionType): string {
    if (actionType === 'create' || actionType === 'comment') {
      return 'blue';
    }
    if (actionType === 'progress_update' || actionType === 'unblock') {
      return 'green';
    }
    if (actionType === 'block' || actionType === 'delete') {
      return 'red';
    }
    return 'gray';
  }
}