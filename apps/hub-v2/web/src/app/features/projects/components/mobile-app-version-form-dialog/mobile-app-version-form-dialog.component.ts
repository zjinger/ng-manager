import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, input, output, signal, effect } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import type {
  MobileAppVersion,
  CreateMobileAppVersionInput,
  UpdateMobileAppVersionInput,
  MobileAppVersionStatus,
  MobileAppPlatformType,
} from '../../models/mobile-app-version.model';

@Component({
  selector: 'app-mobile-app-version-form-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzDatePickerModule,
    NzFormModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="open()"
      [nzTitle]="isEditing() ? '编辑版本' : '新建版本'"
      [nzWidth]="540"
      [nzFooter]="null"
      (nzOnCancel)="close.emit()"
    >
      <div *nzModalContent class="form-content">
        <div class="form-row">
          <nz-form-item>
            <nz-form-label [nzRequired]="true">版本号</nz-form-label>
            <nz-form-control>
              <input nz-input placeholder="例如 v1.3.0" [(ngModel)]="version" />
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label [nzRequired]="true">构建号</nz-form-label>
            <nz-form-control>
              <input nz-input placeholder="例如 2026061501" [(ngModel)]="buildNumber" />
            </nz-form-control>
          </nz-form-item>
        </div>
        <div class="form-row">
          <nz-form-item>
            <nz-form-label [nzRequired]="true">平台</nz-form-label>
            <nz-form-control>
              <nz-select [(ngModel)]="platform">
                <nz-option nzValue="ios" nzLabel="iOS"></nz-option>
                <nz-option nzValue="android" nzLabel="Android"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>发布状态</nz-form-label>
            <nz-form-control>
              <nz-select [(ngModel)]="status">
                <nz-option nzValue="draft" nzLabel="草稿"></nz-option>
                <nz-option nzValue="testing" nzLabel="测试中"></nz-option>
                <nz-option nzValue="published" nzLabel="已发布"></nz-option>
                <nz-option nzValue="archived" nzLabel="已归档"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
        </div>
        <nz-form-item>
          <nz-form-label>发布渠道</nz-form-label>
          <nz-form-control>
            <nz-select [(ngModel)]="releaseChannel">
              <nz-option nzValue="企业内测 — 全员" nzLabel="企业内测 — 全员"></nz-option>
              <nz-option nzValue="企业内测 — 研发组" nzLabel="企业内测 — 研发组"></nz-option>
              <nz-option nzValue="灰度发布 — 10%" nzLabel="灰度发布 — 10%"></nz-option>
              <nz-option nzValue="灰度发布 — 50%" nzLabel="灰度发布 — 50%"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>更新日志</nz-form-label>
          <nz-form-control>
            <textarea
              nz-input
              rows="4"
              placeholder="每行一条更新内容…"
              [(ngModel)]="changelogText"
            ></textarea>
          </nz-form-control>
        </nz-form-item>
      </div>
      <div *nzModalFooter class="form-footer">
        <button nz-button (click)="close.emit()">取消</button>
        <button nz-button nzType="primary" (click)="submit()" [disabled]="!isValid()">
          {{ isEditing() ? '保存修改' : '创建版本' }}
        </button>
      </div>
    </nz-modal>
  `,
  styles: [
    `
      .form-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      nz-form-item {
        margin-bottom: 0;
      }

      nz-form-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-secondary);
      }

      textarea {
        resize: vertical;
        min-height: 72px;
      }

      .form-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileAppVersionFormDialogComponent {
  readonly open = input(false);
  readonly editVersion = input<MobileAppVersion | null>(null);

  readonly close = output<void>();
  readonly create = output<CreateMobileAppVersionInput>();
  readonly update = output<{ id: string; input: UpdateMobileAppVersionInput }>();

  readonly isEditing = signal(false);
  readonly version = signal('');
  readonly buildNumber = signal('');
  readonly platform = signal<MobileAppPlatformType>('ios');
  readonly status = signal<MobileAppVersionStatus>('draft');
  readonly releaseChannel = signal('企业内测 — 全员');
  readonly changelogText = signal('');

  constructor() {
    effect(() => {
      const editVersion = this.editVersion();
      if (editVersion) {
        this.isEditing.set(true);
        this.version.set(editVersion.version);
        this.buildNumber.set(editVersion.buildNumber);
        this.platform.set(editVersion.platform);
        this.status.set(editVersion.status);
        this.releaseChannel.set(editVersion.releaseChannel);
        this.changelogText.set(editVersion.changelog.join('\n'));
      } else {
        this.isEditing.set(false);
        this.resetForm();
      }
    });
  }

  isValid(): boolean {
    return !!this.version().trim() && !!this.buildNumber().trim();
  }

  submit(): void {
    if (!this.isValid()) return;

    const changelog = this.changelogText()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (this.isEditing() && this.editVersion()) {
      this.update.emit({
        id: this.editVersion()!.id,
        input: {
          version: this.version().trim(),
          buildNumber: this.buildNumber().trim(),
          platform: this.platform(),
          status: this.status(),
          releaseChannel: this.releaseChannel(),
          changelog,
        },
      });
    } else {
      this.create.emit({
        version: this.version().trim(),
        buildNumber: this.buildNumber().trim(),
        platform: this.platform(),
        status: this.status(),
        releaseChannel: this.releaseChannel(),
        changelog,
        minOsVersion: this.platform() === 'ios' ? 'iOS 15.0' : 'Android 10',
      });
    }
  }

  private resetForm(): void {
    this.version.set('');
    this.buildNumber.set('');
    this.platform.set('ios');
    this.status.set('draft');
    this.releaseChannel.set('企业内测 — 全员');
    this.changelogText.set('');
  }
}
