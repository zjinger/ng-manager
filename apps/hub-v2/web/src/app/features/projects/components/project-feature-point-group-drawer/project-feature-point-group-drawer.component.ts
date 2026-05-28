import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';

export interface FeaturePointGroupDrawerTarget {
  id: string;
  level: 'module' | 'submodule';
  name: string;
  parentName?: string | null;
  manualProgress: number | null;
  computedProgress: number;
  sort: number;
  remark: string | null;
}

export interface FeaturePointGroupDrawerSaveInput {
  id: string;
  name: string;
  manualProgress: number | null;
  sort: number;
  remark: string | null;
}

@Component({
  selector: 'app-project-feature-point-group-drawer',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzDrawerModule,
    NzFormModule,
    NzGridModule,
    NzInputModule,
    NzInputNumberModule,
  ],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      nzPlacement="right"
      [nzClosable]="true"
      [nzWidth]="460"
      [nzTitle]="target()?.level === 'submodule' ? '编辑子模块' : '编辑模块'"
      (nzOnClose)="cancel.emit()"
    >
      <ng-template nzDrawerContent>
        @if (target(); as item) {
          <form nz-form nzLayout="vertical" class="feature-group-form" (ngSubmit)="submit(item.id)">
            @if (item.parentName) {
              <div class="feature-group-form__parent">上级模块：{{ item.parentName }}</div>
            }

            <div nz-row [nzGutter]="16">
              <div nz-col [nzSpan]="24">
                <nz-form-item>
                  <nz-form-label nzFor="groupName" nzRequired>名称</nz-form-label>
                  <nz-form-control>
                    <input
                      nz-input
                      name="groupName"
                      [ngModel]="draftName()"
                      (ngModelChange)="draftName.set($event)"
                      placeholder="请输入名称"
                    />
                  </nz-form-control>
                </nz-form-item>
              </div>

              <div nz-col [nzSpan]="12">
                <nz-form-item>
                  <nz-form-label nzFor="manualProgress">手动进度</nz-form-label>
                  <nz-form-control>
                    <nz-input-number
                      name="manualProgress"
                      [ngModel]="draftManualProgress()"
                      (ngModelChange)="draftManualProgress.set(normalizeProgressOrNull($event))"
                      [nzMin]="0"
                      [nzMax]="100"
                      [nzPlaceHolder]="'自动：' + item.computedProgress + '%'"
                    ></nz-input-number>
                  </nz-form-control>
                </nz-form-item>
              </div>

              <div nz-col [nzSpan]="12">
                <nz-form-item>
                  <nz-form-label nzFor="sort">排序</nz-form-label>
                  <nz-form-control>
                    <nz-input-number
                      name="sort"
                      [ngModel]="draftSort()"
                      (ngModelChange)="draftSort.set(normalizeSort($event))"
                      [nzMin]="0"
                    ></nz-input-number>
                  </nz-form-control>
                </nz-form-item>
              </div>

              <div nz-col [nzSpan]="24">
                <nz-form-item>
                  <nz-form-label nzFor="remark">备注</nz-form-label>
                  <nz-form-control>
                    <textarea
                      nz-input
                      rows="4"
                      name="remark"
                      [ngModel]="draftRemark()"
                      (ngModelChange)="draftRemark.set($event)"
                      placeholder="记录手动调整原因或补充说明"
                    ></textarea>
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>

            <footer class="feature-group-form__actions">
              <button nz-button type="button" (click)="draftManualProgress.set(null)" [disabled]="saving()">清除手动进度</button>
              <span class="feature-group-form__spacer"></span>
              <button nz-button type="button" (click)="cancel.emit()" [disabled]="saving()">取消</button>
              <button nz-button nzType="primary" htmlType="submit" [disabled]="saving() || !draftName().trim()" [nzLoading]="saving()">保存</button>
            </footer>
          </form>
        }
      </ng-template>
    </nz-drawer>
  `,
  styles: [
    `
      .feature-group-form nz-input-number {
        width: 100%;
      }

      .feature-group-form__parent {
        margin-bottom: 14px;
        padding: 10px 12px;
        border: 1px solid var(--border-color-soft);
        border-radius: var(--border-radius);
        color: var(--text-muted);
        background: var(--bg-subtle);
      }

      .feature-group-form__actions {
        display: flex;
        align-items: center;
        gap: 10px;
        padding-top: 6px;
      }

      .feature-group-form__spacer {
        flex: 1;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectFeaturePointGroupDrawerComponent {
  readonly open = input(false);
  readonly saving = input(false);
  readonly target = input<FeaturePointGroupDrawerTarget | null>(null);

  readonly save = output<FeaturePointGroupDrawerSaveInput>();
  readonly cancel = output<void>();

  readonly draftName = signal('');
  readonly draftManualProgress = signal<number | null>(null);
  readonly draftSort = signal(0);
  readonly draftRemark = signal('');

  constructor() {
    effect(() => {
      const target = this.target();
      if (!this.open() || !target) return;
      this.draftName.set(target.name);
      this.draftManualProgress.set(target.manualProgress);
      this.draftSort.set(target.sort);
      this.draftRemark.set(target.remark ?? '');
    });
  }

  submit(id: string): void {
    const name = this.draftName().trim();
    if (!name) return;
    this.save.emit({
      id,
      name,
      manualProgress: this.draftManualProgress(),
      sort: this.normalizeSort(this.draftSort()),
      remark: this.draftRemark().trim() || null,
    });
  }

  normalizeProgressOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
  }

  normalizeSort(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
  }
}
