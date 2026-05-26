import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent } from '@shared/ui';
import type {
  CreateRdTaskSheetDefaultRouteInput,
  RdTaskSheetDefaultRouteEntity,
  RdTaskSheetDefaultRouteStatus,
  UpdateRdTaskSheetDefaultRouteInput,
} from '../../models/rd-task-sheet-config.model';

type Draft = Required<Omit<CreateRdTaskSheetDefaultRouteInput, 'sort'>> & { sort: number };

const DEFAULT_DRAFT: Draft = {
  issuerUserId: null,
  issuerName: '',
  issuerDepartment: '',
  receiverUserId: null,
  receiverName: '',
  receiverDepartment: '',
  receiverPhone: '',
  status: 'active',
  remark: '',
  sort: 0,
};

@Component({
  selector: 'app-task-sheet-default-route-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzFormModule, NzGridModule, NzIconModule, NzInputModule, NzSelectModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="760"
      [title]="initial() ? '编辑任务单配置' : '新建任务单配置'"
      [subtitle]="'维护发起人到默认接收人的带入关系，表单仍可手动覆盖。'"
      icon="schedule"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form nz-form nzLayout="vertical" class="route-form">
          <section class="form-section">
            <div class="form-section__title">
              <nz-icon nzType="user" nzTheme="outline" />
              发起信息
            </div>
            <div nz-row [nzGutter]="16">
              <div nz-col [nzSpan]="12">
                <nz-form-item>
                  <nz-form-label nzRequired>发布部门</nz-form-label>
                  <nz-form-control>
                    <input nz-input [ngModel]="draft().issuerDepartment" name="issuerDepartment" (ngModelChange)="updateField('issuerDepartment', $event)" />
                  </nz-form-control>
                </nz-form-item>
              </div>
              <div nz-col [nzSpan]="12">
                <nz-form-item>
                  <nz-form-label nzRequired>发起人</nz-form-label>
                  <nz-form-control>
                    <input nz-input [ngModel]="draft().issuerName" name="issuerName" (ngModelChange)="updateField('issuerName', $event)" />
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>
          </section>

          <section class="form-section">
            <div class="form-section__title">
              <nz-icon nzType="team" nzTheme="outline" />
              默认接收信息
            </div>
            <div nz-row [nzGutter]="16">
              <div nz-col [nzSpan]="8">
                <nz-form-item>
                  <nz-form-label nzRequired>接收部门</nz-form-label>
                  <nz-form-control>
                    <input nz-input [ngModel]="draft().receiverDepartment" name="receiverDepartment" (ngModelChange)="updateField('receiverDepartment', $event)" />
                  </nz-form-control>
                </nz-form-item>
              </div>
              <div nz-col [nzSpan]="8">
                <nz-form-item>
                  <nz-form-label nzRequired>接收人</nz-form-label>
                  <nz-form-control>
                    <input nz-input [ngModel]="draft().receiverName" name="receiverName" (ngModelChange)="updateField('receiverName', $event)" />
                  </nz-form-control>
                </nz-form-item>
              </div>
              <div nz-col [nzSpan]="8">
                <nz-form-item>
                  <nz-form-label>接收人电话</nz-form-label>
                  <nz-form-control>
                    <input nz-input [ngModel]="draft().receiverPhone" name="receiverPhone" (ngModelChange)="updateField('receiverPhone', $event)" />
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>
          </section>

          <section class="form-section">
            <div class="form-section__title">
              <nz-icon nzType="setting" nzTheme="outline" />
              配置状态
            </div>
            <div nz-row [nzGutter]="16">
              <div nz-col [nzSpan]="12">
                <nz-form-item>
                  <nz-form-label>状态</nz-form-label>
                  <nz-form-control>
                    <nz-select [ngModel]="draft().status" name="status" (ngModelChange)="updateField('status', $event)">
                      <nz-option nzLabel="启用" nzValue="active" />
                      <nz-option nzLabel="停用" nzValue="inactive" />
                    </nz-select>
                  </nz-form-control>
                </nz-form-item>
              </div>
              <div nz-col [nzSpan]="12">
                <nz-form-item>
                  <nz-form-label>排序</nz-form-label>
                  <nz-form-control>
                    <input nz-input type="number" [ngModel]="draft().sort" name="sort" (ngModelChange)="updateField('sort', +$event || 0)" />
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>
            <nz-form-item>
              <nz-form-label>备注</nz-form-label>
              <nz-form-control>
                <textarea nz-input rows="3" [ngModel]="draft().remark" name="remark" (ngModelChange)="updateField('remark', $event)"></textarea>
              </nz-form-control>
            </nz-form-item>
          </section>
        </form>
      </div>
      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" type="button" [disabled]="!canSubmit()" [nzLoading]="busy()" (click)="submit()">
          {{ initial() ? '保存' : '创建' }}
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .route-form {
        display: grid;
        gap: 18px;
      }
      .form-section {
        display: grid;
        gap: 2px;
      }
      .form-section__title {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 700;
      }
      .form-section__title nz-icon {
        color: var(--color-primary);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskSheetDefaultRouteDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly initial = input<RdTaskSheetDefaultRouteEntity | null>(null);
  readonly cancel = output<void>();
  readonly save = output<CreateRdTaskSheetDefaultRouteInput | UpdateRdTaskSheetDefaultRouteInput>();

  readonly draft = signal<Draft>({ ...DEFAULT_DRAFT });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const initial = this.initial();
      this.draft.set({
        issuerUserId: initial?.issuerUserId ?? null,
        issuerName: initial?.issuerName ?? '',
        issuerDepartment: initial?.issuerDepartment ?? '',
        receiverUserId: initial?.receiverUserId ?? null,
        receiverName: initial?.receiverName ?? '',
        receiverDepartment: initial?.receiverDepartment ?? '',
        receiverPhone: initial?.receiverPhone ?? '',
        status: initial?.status ?? 'active',
        remark: initial?.remark ?? '',
        sort: initial?.sort ?? 0,
      });
    });
  }

  updateField<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  canSubmit(): boolean {
    const draft = this.draft();
    return Boolean(
      hasText(draft.issuerName) &&
        hasText(draft.issuerDepartment) &&
        hasText(draft.receiverName) &&
        hasText(draft.receiverDepartment),
    );
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    const draft = this.draft();
    this.save.emit({
      issuerUserId: null,
      issuerName: textOrNull(draft.issuerName),
      issuerDepartment: textOrNull(draft.issuerDepartment),
      receiverUserId: null,
      receiverName: textOrNull(draft.receiverName),
      receiverDepartment: textOrNull(draft.receiverDepartment),
      receiverPhone: textOrNull(draft.receiverPhone),
      status: draft.status as RdTaskSheetDefaultRouteStatus,
      remark: textOrNull(draft.remark),
      sort: draft.sort,
    });
  }
}

function textOrNull(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}
