import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';

import type { ProjectFeatureProgressSummary } from '../../models/project.model';

export interface FeatureProgressOverallSaveInput {
  progress: number;
  remark: string | null;
}

@Component({
  selector: 'app-project-feature-progress-overall-drawer',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzDrawerModule, NzFormModule, NzInputModule, NzInputNumberModule],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      nzPlacement="right"
      [nzClosable]="true"
      [nzWidth]="420"
      nzTitle="调整整体进度"
      (nzOnClose)="cancel.emit()"
    >
      <ng-template nzDrawerContent>
        @if (summary(); as item) {
          <form nz-form nzLayout="vertical" class="overall-form" (ngSubmit)="submit()">
            <div class="overall-form__computed">自动计算：{{ item.computedProgress }}%</div>
            <nz-form-item>
              <nz-form-label nzFor="overallProgress" nzRequired>整体进度</nz-form-label>
              <nz-form-control>
                <nz-input-number
                  name="overallProgress"
                  [ngModel]="draftProgress()"
                  (ngModelChange)="draftProgress.set(normalizeProgress($event))"
                  [nzMin]="0"
                  [nzMax]="100"
                ></nz-input-number>
              </nz-form-control>
            </nz-form-item>
            <nz-form-item>
              <nz-form-label nzFor="overallRemark">备注</nz-form-label>
              <nz-form-control>
                <textarea
                  nz-input
                  rows="4"
                  name="overallRemark"
                  [ngModel]="draftRemark()"
                  (ngModelChange)="draftRemark.set($event)"
                  placeholder="记录整体进度调整原因"
                ></textarea>
              </nz-form-control>
            </nz-form-item>
            <footer class="overall-form__actions">
              <button nz-button type="button" (click)="clear.emit()" [disabled]="saving() || item.overrideProgress === null">清除手动进度</button>
              <span class="overall-form__spacer"></span>
              <button nz-button type="button" (click)="cancel.emit()" [disabled]="saving()">取消</button>
              <button nz-button nzType="primary" htmlType="submit" [disabled]="saving()" [nzLoading]="saving()">保存</button>
            </footer>
          </form>
        }
      </ng-template>
    </nz-drawer>
  `,
  styles: [
    `
      .overall-form nz-input-number {
        width: 100%;
      }

      .overall-form__computed {
        margin-bottom: 14px;
        padding: 10px 12px;
        border: 1px solid var(--border-color-soft);
        border-radius: var(--border-radius);
        color: var(--text-muted);
        background: var(--bg-subtle);
      }

      .overall-form__actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .overall-form__spacer {
        flex: 1;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectFeatureProgressOverallDrawerComponent {
  readonly open = input(false);
  readonly saving = input(false);
  readonly summary = input<ProjectFeatureProgressSummary | null>(null);

  readonly save = output<FeatureProgressOverallSaveInput>();
  readonly clear = output<void>();
  readonly cancel = output<void>();

  readonly draftProgress = signal(0);
  readonly draftRemark = signal('');

  constructor() {
    effect(() => {
      const summary = this.summary();
      if (!this.open() || !summary) return;
      this.draftProgress.set(summary.overrideProgress ?? summary.computedProgress);
      this.draftRemark.set(summary.overrideRemark ?? '');
    });
  }

  submit(): void {
    this.save.emit({
      progress: this.normalizeProgress(this.draftProgress()),
      remark: this.draftRemark().trim() || null,
    });
  }

  normalizeProgress(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
  }
}
