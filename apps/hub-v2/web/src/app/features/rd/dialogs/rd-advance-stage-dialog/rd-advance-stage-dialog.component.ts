import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { RdItemEntity, RdStageEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-advance-stage-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzModalModule,
    NzSelectModule,
    NzButtonModule,
    NzInputModule,
    NzDatePickerModule,
    NzFormModule,
    NzGridModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="open()"
      [nzTitle]="'进入下一阶段'"
      [nzOkText]="'确认推进'"
      [nzCancelText]="'取消'"
      [nzOkLoading]="busy()"
      [nzOkDisabled]="busy() || !selectedStageId() || selectedMemberIds().length === 0 || invalidDateRange()"
      (nzOnCancel)="cancel.emit()"
      (nzOnOk)="confirmSelection()"
    >
      <ng-container *nzModalContent>
        @if (item(); as current) {
          <form nz-form nzLayout="vertical" class="advance-form">
            <p class="hint">
              当前研发项：<strong>{{ current.title }}</strong>
            </p>

            <div nz-row nzGutter="16">
              <div nz-col nzSpan="24">
                <nz-form-item>
                  <nz-form-label nzRequired>下一阶段</nz-form-label>
                  <nz-form-control>
                    <nz-select
                      nzShowSearch
                      nzPlaceHolder="选择下一阶段"
                      [ngModel]="selectedStageId()"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="selectedStageId.set($event || '')"
                    >
                      @for (stage of candidateStages(); track stage.id) {
                        <nz-option [nzLabel]="stage.name" [nzValue]="stage.id"></nz-option>
                      }
                    </nz-select>
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>

            <div nz-row nzGutter="16">
              <div nz-col nzSpan="24">
                <nz-form-item>
                  <nz-form-label nzRequired>执行人</nz-form-label>
                  <nz-form-control>
                    <nz-select
                      nzMode="multiple"
                      nzShowSearch
                      nzPlaceHolder="选择下一阶段成员（默认沿用当前成员）"
                      [ngModel]="selectedMemberIds()"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="selectedMemberIds.set(normalizeMemberIds($event))"
                    >
                      @for (member of members(); track member.userId) {
                        <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
                      }
                    </nz-select>
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>

            <div nz-row nzGutter="16">
              <div nz-col nzSpan="24">
                <nz-form-item>
                  <nz-form-label>描述</nz-form-label>
                  <nz-form-control>
                    <textarea
                      nz-input
                      rows="4"
                      maxlength="100"
                      [ngModel]="description()"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="description.set(normalizeDescription($event))"
                      placeholder="可选：填写本次推进说明（会记录到研发动态）"
                    ></textarea>
                    <p class="desc-count">{{ description().length }}/100</p>
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>

            <div nz-row nzGutter="16">
              <div nz-col nzSpan="12">
                <nz-form-item>
                  <nz-form-label>计划开始</nz-form-label>
                  <nz-form-control>
                    <nz-date-picker
                      style="width:100%"
                      nzPlaceHolder="计划开始（可选）"
                      nzFormat="yyyy-MM-dd"
                      nzPopupClassName="hub-datepicker-overlay"
                      [ngModel]="planStartDate()"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="updateDateField('planStartAt', $event)"
                    ></nz-date-picker>
                  </nz-form-control>
                </nz-form-item>
              </div>
              <div nz-col nzSpan="12">
                <nz-form-item>
                  <nz-form-label>计划结束</nz-form-label>
                  <nz-form-control>
                    <nz-date-picker
                      style="width:100%"
                      nzPlaceHolder="计划结束（可选）"
                      nzFormat="yyyy-MM-dd"
                      nzPopupClassName="hub-datepicker-overlay"
                      [ngModel]="planEndDate()"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="updateDateField('planEndAt', $event)"
                    ></nz-date-picker>
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>
          </form>

          @if (invalidDateRange()) {
            <p class="empty">计划开始不能晚于计划结束。</p>
          }
          @if (selectedMemberIds().length === 0) {
            <p class="empty">请至少选择 1 名执行人。</p>
          }
          @if (candidateStages().length === 0) {
            <p class="empty">当前项目没有可推进的后续阶段。</p>
          }
        }
      </ng-container>
    </nz-modal>
  `,
  styles: [
    `
      .advance-form {
        padding-top: 2px;
      }
      .hint {
        margin: 0 0 12px;
        color: var(--text-secondary);
      }
      .hint--sub {
        margin-top: 0;
      }
      .desc-count {
        margin: 6px 0 0;
        text-align: right;
        font-size: 12px;
        color: var(--text-muted);
      }
      .empty {
        margin: 8px 0 0;
        color: var(--text-muted);
        font-size: 12px;
      }
      @media (max-width: 768px) {
        .advance-form [nz-col] {
          width: 100%;
          max-width: 100%;
          flex: 0 0 100%;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdAdvanceStageDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly item = input<RdItemEntity | null>(null);
  readonly stages = input<RdStageEntity[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly currentMemberIds = input<string[]>([]);
  readonly confirm = output<{ stageId: string; memberIds: string[]; description?: string; planStartAt?: string; planEndAt?: string }>();
  readonly cancel = output<void>();

  readonly selectedStageId = signal('');
  readonly selectedMemberIds = signal<string[]>([]);
  readonly description = signal('');
  readonly planStartDate = signal<Date | null>(null);
  readonly planEndDate = signal<Date | null>(null);
  readonly invalidDateRange = computed(() => {
    const start = this.planStartDate();
    const end = this.planEndDate();
    if (!start || !end) {
      return false;
    }
    return start.getTime() > end.getTime();
  });
  readonly candidateStages = computed(() => {
    const current = this.item();
    const all = [...this.stages()].filter((stage) => stage.enabled).sort((a, b) => a.sort - b.sort);
    if (!current) {
      return [];
    }
    if (!current.stageId) {
      return all;
    }
    const currentStage = all.find((stage) => stage.id === current.stageId);
    if (!currentStage) {
      return all;
    }
    return all.filter((stage) => stage.sort > currentStage.sort);
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        this.selectedStageId.set('');
        this.selectedMemberIds.set([]);
        this.description.set('');
        this.planStartDate.set(null);
        this.planEndDate.set(null);
        return;
      }
      const first = this.candidateStages()[0];
      this.selectedStageId.set(first?.id ?? '');
      this.selectedMemberIds.set([]);
      this.description.set('');
      this.planStartDate.set(this.normalizeDate(this.item()?.planStartAt || null));
      this.planEndDate.set(this.normalizeDate(this.item()?.planEndAt || null));
    });
  }

  confirmSelection(): void {
    const stageId = this.selectedStageId().trim();
    if (!stageId) {
      return;
    }
    const description = this.description().trim();
    this.confirm.emit({
      stageId,
      memberIds: this.selectedMemberIds(),
      description: description || undefined,
      planStartAt: this.formatDate(this.planStartDate()),
      planEndAt: this.formatDate(this.planEndDate()),
    });
  }

  normalizeMemberIds(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)));
  }

  normalizeDescription(value: unknown): string {
    return String(value ?? '').slice(0, 100);
  }

  updateDateField(key: 'planStartAt' | 'planEndAt', value: unknown): void {
    const date = this.normalizeDate(value);
    if (key === 'planStartAt') {
      this.planStartDate.set(date);
      return;
    }
    this.planEndDate.set(date);
  }

  private formatDate(value: unknown): string | undefined {
    const date = this.normalizeDate(value);
    if (!date) {
      return undefined;
    }
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizeDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
      const date = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }
}
