import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';

import type {
  ProjectFeatureProgressSettings,
  ProjectFeatureProgressStatusOption,
  ProjectFeatureProgressSummary,
} from '../../models/project.model';

export interface FeatureProgressSettingsSaveInput {
  statusOptions: ProjectFeatureProgressStatusOption[];
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
      nzTitle="进度设置"
      (nzOnClose)="cancel.emit()"
    >
      <ng-template nzDrawerContent>
        @if (summary(); as item) {
          <form nz-form nzLayout="vertical" class="overall-form" (ngSubmit)="submit()">
            <div class="overall-form__computed">
              <span>整体进度（自动计算）</span>
              <strong>{{ item.computedProgress }}%</strong>
            </div>
            <section class="overall-form__status-options">
              <h3>进度状态配置</h3>
              <p>该配置仅影响当前项目的模块/子模块进度状态显示。</p>
              @for (option of draftStatusOptions(); track option.key) {
                <div class="overall-form__status-row">
                  <input
                    nz-input
                    [ngModel]="option.label"
                    (ngModelChange)="updateStatusOptionLabel(option.key, $event)"
                    [name]="'statusLabel_' + option.key"
                  />
                  <nz-input-number
                    [ngModel]="option.progress"
                    (ngModelChange)="updateStatusOptionProgress(option.key, $event)"
                    [name]="'statusProgress_' + option.key"
                    [nzMin]="0"
                    [nzMax]="100"
                  ></nz-input-number>
                </div>
              }
            </section>
            <footer class="overall-form__actions">
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
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
        padding: 10px 12px;
        border: 1px solid var(--border-color-soft);
        border-radius: var(--border-radius);
        color: var(--text-muted);
        background: var(--bg-subtle);
      }

      .overall-form__computed strong {
        color: var(--text-heading);
        font-size: 18px;
      }

      .overall-form__status-options {
        display: grid;
        gap: 10px;
        margin: 18px 0;
        padding: 14px;
        border: 1px solid var(--border-color-soft);
        border-radius: var(--border-radius);
        background: var(--bg-subtle);
      }

      .overall-form__status-options h3 {
        margin: 0;
        color: var(--text-heading);
        font-size: 14px;
      }

      .overall-form__status-options p {
        margin: 0;
        color: var(--text-muted);
        font-size: 12px;
      }

      .overall-form__status-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 112px;
        gap: 8px;
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
  readonly settings = input<ProjectFeatureProgressSettings | null>(null);

  readonly save = output<FeatureProgressSettingsSaveInput>();
  readonly cancel = output<void>();

  readonly draftStatusOptions = signal<ProjectFeatureProgressStatusOption[]>([]);

  constructor() {
    effect(() => {
      const summary = this.summary();
      if (!this.open() || !summary) return;
      this.draftStatusOptions.set(this.settings()?.statusOptions.map((option) => ({ ...option })) ?? []);
    });
  }

  submit(): void {
    this.save.emit({
      statusOptions: this.normalizedStatusOptions(),
    });
  }

  normalizeProgress(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
  }

  updateStatusOptionLabel(key: ProjectFeatureProgressStatusOption['key'], label: string): void {
    this.draftStatusOptions.set(
      this.draftStatusOptions().map((option) =>
        option.key === key ? { ...option, label } : option
      )
    );
  }

  updateStatusOptionProgress(key: ProjectFeatureProgressStatusOption['key'], value: unknown): void {
    this.draftStatusOptions.set(
      this.draftStatusOptions().map((option) =>
        option.key === key ? { ...option, progress: this.normalizeProgress(value) } : option
      )
    );
  }

  normalizedStatusOptions(): ProjectFeatureProgressStatusOption[] {
    return this.draftStatusOptions()
      .map((option) => ({
        ...option,
        label: option.label.trim() || option.key,
        progress: this.normalizeProgress(option.progress),
      }))
      .sort((left, right) => left.progress - right.progress);
  }
}
