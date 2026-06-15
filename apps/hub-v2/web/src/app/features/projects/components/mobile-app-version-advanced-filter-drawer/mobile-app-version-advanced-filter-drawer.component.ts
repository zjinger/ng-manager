import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

@Component({
  selector: 'app-mobile-app-version-advanced-filter-drawer',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzDrawerModule, NzSwitchModule],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      nzPlacement="right"
      [nzClosable]="true"
      [nzWidth]="420"
      nzTitle="高级筛选"
      (nzOnClose)="close.emit()"
    >
      <ng-template nzDrawerContent>
        <div class="advanced-panel">
          <div class="advanced-field">
            <label>归档数据</label>
            <div class="advanced-switch">
              <div>
                <strong>仅看已归档</strong>
                <p>开启后列表只展示已归档 APP 版本，可进入详情执行删除。</p>
              </div>
              <nz-switch [ngModel]="draftArchivedOnly()" (ngModelChange)="draftArchivedOnly.set($event)" />
            </div>
          </div>

          <div class="advanced-actions">
            <button nz-button type="button" (click)="reset()">重置</button>
            <button nz-button nzType="primary" type="button" (click)="apply.emit(draftArchivedOnly())">
              应用筛选
            </button>
          </div>
        </div>
      </ng-template>
    </nz-drawer>
  `,
  styles: [
    `
      .advanced-panel {
        display: grid;
        gap: 14px;
      }

      .advanced-field {
        display: grid;
        gap: 8px;
      }

      .advanced-field label {
        font-size: 13px;
        color: var(--text-secondary);
      }

      .advanced-switch {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 12px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--surface-subtle);
      }

      .advanced-switch strong {
        display: block;
        color: var(--text-primary);
        font-size: 14px;
      }

      .advanced-switch p {
        margin: 4px 0 0;
        color: var(--text-secondary);
        font-size: 12px;
      }

      .advanced-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 6px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileAppVersionAdvancedFilterDrawerComponent {
  readonly open = input(false);
  readonly archivedOnly = input(false);

  readonly close = output<void>();
  readonly apply = output<boolean>();

  readonly draftArchivedOnly = signal(false);

  constructor() {
    effect(() => {
      if (this.open()) {
        this.draftArchivedOnly.set(this.archivedOnly());
      }
    });
  }

  reset(): void {
    this.draftArchivedOnly.set(false);
    this.apply.emit(false);
  }
}
