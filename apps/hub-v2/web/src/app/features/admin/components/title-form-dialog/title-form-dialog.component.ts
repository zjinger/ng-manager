import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogShellComponent } from '@shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

export interface TitleFormEntity {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  sort: number;
  remark: string | null;
}

export interface TitleFormInput {
  code?: string;
  name?: string;
  status?: 'active' | 'inactive';
  sort?: number;
  remark?: string | null;
}

@Component({
  selector: 'app-title-form-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzFormModule, NzGridModule, NzIconModule, NzInputModule, NzSelectModule, DialogShellComponent],
  template: `
    <app-dialog-shell [open]="open()" [width]="560" [title]="mode() === 'create' ? '新建' + noun() : '编辑' + noun()" icon="idcard" (cancel)="cancel.emit()">
      <div dialog-body>
        <form nz-form [nzLayout]="'vertical'" class="title-form">
          <section class="title-form-section">
            <div class="title-form-section__title">
              <nz-icon nzType="idcard" nzTheme="outline" />
              基本信息
            </div>

            <div class="row" nz-row [nzGutter]="16">
              <div class="col" nz-col [nzSpan]="12">
                <nz-form-item>
                  <nz-form-label nzRequired nzFor="titleName">{{ noun() }}名称</nz-form-label>
                  <nz-form-control [nzErrorTip]="'请输入' + noun() + '名称'">
                    <input
                      id="titleName"
                      nz-input
                      required="true"
                      [ngModel]="draftName()"
                      name="titleName"
                      (ngModelChange)="draftName.set($event || '')"
                    />
                  </nz-form-control>
                </nz-form-item>
              </div>

              <div class="col" nz-col [nzSpan]="12">
                <nz-form-item>
                  <nz-form-label nzRequired nzFor="titleCode">{{ noun() }}编码</nz-form-label>
                  <nz-form-control [nzErrorTip]="'请输入' + noun() + '编码'">
                    <input
                      id="titleCode"
                      nz-input
                      required="true"
                      [ngModel]="draftCode()"
                      name="titleCode"
                      [disabled]="mode() === 'edit'"
                      (ngModelChange)="draftCode.set(($event || '').toLowerCase())"
                    />
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>

            <div class="row" nz-row [nzGutter]="16">
              <div class="col" nz-col [nzSpan]="12">
                <nz-form-item>
                  <nz-form-label nzFor="titleStatus">状态</nz-form-label>
                  <nz-form-control>
                    <nz-select
                      [ngModel]="draftStatus()"
                      name="titleStatus"
                      (ngModelChange)="draftStatus.set($event || 'active')"
                    >
                      <nz-option nzLabel="启用" nzValue="active" />
                      <nz-option nzLabel="停用" nzValue="inactive" />
                    </nz-select>
                  </nz-form-control>
                </nz-form-item>
              </div>

              <div class="col" nz-col [nzSpan]="12">
                <nz-form-item>
                  <nz-form-label nzFor="titleSort">排序</nz-form-label>
                  <nz-form-control>
                    <input
                      id="titleSort"
                      nz-input
                      type="number"
                      [ngModel]="draftSort()"
                      name="titleSort"
                      (ngModelChange)="draftSort.set(+$event || 0)"
                    />
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>

            <div class="row" nz-row [nzGutter]="16">
              <div class="col" nz-col [nzSpan]="24">
                <nz-form-item>
                  <nz-form-label nzFor="titleRemark">备注</nz-form-label>
                  <nz-form-control>
                    <textarea
                      id="titleRemark"
                      nz-input
                      rows="4"
                      [ngModel]="draftRemark()"
                      name="titleRemark"
                      (ngModelChange)="draftRemark.set($event || '')"
                    ></textarea>
                  </nz-form-control>
                </nz-form-item>
              </div>
            </div>
          </section>
        </form>
      </div>
      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" type="button" [disabled]="!canSubmit()" (click)="submit()">{{ mode() === 'create' ? '创建' : '保存' }}</button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [`
    .title-form-section {
      display: flex;
      flex-direction: column;
    }

    .title-form-section__title {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text-primary);
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .title-form-section__title nz-icon {
      color: var(--color-primary);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TitleFormDialogComponent {
  readonly open = input(false);
  readonly mode = input<'create' | 'edit'>('create');
  readonly noun = input('职务');
  readonly initial = input<TitleFormEntity | null>(null);
  readonly cancel = output<void>();
  readonly save = output<TitleFormInput>();

  readonly draftCode = signal('');
  readonly draftName = signal('');
  readonly draftStatus = signal<'active' | 'inactive'>('active');
  readonly draftSort = signal(0);
  readonly draftRemark = signal('');

  constructor() {
    effect(() => {
      const source = this.initial();
      const open = this.open();
      const mode = this.mode();
      if (!open) {
        return;
      }
      this.draftCode.set(source?.code ?? '');
      this.draftName.set(source?.name ?? '');
      this.draftStatus.set(source?.status ?? 'active');
      this.draftSort.set(source?.sort ?? 0);
      this.draftRemark.set(source?.remark ?? '');
      if (mode === 'create' && !source) {
        this.draftStatus.set('active');
      }
    });
  }

  canSubmit(): boolean {
    return !!this.draftName().trim() && !!this.draftCode().trim();
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.save.emit({
      code: this.draftCode().trim(),
      name: this.draftName().trim(),
      status: this.draftStatus(),
      sort: this.draftSort(),
      remark: this.draftRemark().trim() || null,
    });
  }
}
