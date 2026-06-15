import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, input, output, signal, effect } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent, FileUploadDropzoneComponent } from '@shared/ui';
import { UPLOAD_TARGETS } from '@shared/constants';
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
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    DialogShellComponent,
    FileUploadDropzoneComponent,
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [title]="isEditing() ? '编辑版本' : '新建版本'"
      icon="mobile"
      [width]="640"
      (cancel)="close.emit()"
    >
      <div dialog-body>
        <form nz-form [nzLayout]="'vertical'">
          <div class="row" nz-row [nzGutter]="16">
            <div class="col" nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzRequired>版本号</nz-form-label>
                <nz-form-control nzErrorTip="请输入版本号">
                  <input nz-input placeholder="例如 v1.3.0" [(ngModel)]="version" name="version" />
                </nz-form-control>
              </nz-form-item>
            </div>
            <div class="col" nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzRequired>构建号</nz-form-label>
                <nz-form-control nzErrorTip="请输入构建号">
                  <input nz-input placeholder="例如 2026061501" [(ngModel)]="buildNumber" name="buildNumber" />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div class="row" nz-row [nzGutter]="16">
            <div class="col" nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzRequired>平台</nz-form-label>
                <nz-form-control>
                  <nz-select [(ngModel)]="platform" name="platform">
                    <nz-option nzValue="ios" nzLabel="iOS"></nz-option>
                    <nz-option nzValue="android" nzLabel="Android"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div class="col" nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label>发布状态</nz-form-label>
                <nz-form-control>
                  <nz-select [(ngModel)]="status" name="status">
                    <nz-option nzValue="draft" nzLabel="草稿"></nz-option>
                    <nz-option nzValue="testing" nzLabel="测试中"></nz-option>
                    <nz-option nzValue="published" nzLabel="已发布"></nz-option>
                    <nz-option nzValue="archived" nzLabel="已归档"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div class="row" nz-row [nzGutter]="16">
            <div class="col" nz-col [nzSpan]="24">
              <nz-form-item>
                <nz-form-label>发布渠道</nz-form-label>
                <nz-form-control>
                  <nz-select [(ngModel)]="releaseChannel" name="releaseChannel">
                    <nz-option nzValue="企业内测 — 全员" nzLabel="企业内测 — 全员"></nz-option>
                    <nz-option nzValue="企业内测 — 研发组" nzLabel="企业内测 — 研发组"></nz-option>
                    <nz-option nzValue="灰度发布 — 10%" nzLabel="灰度发布 — 10%"></nz-option>
                    <nz-option nzValue="灰度发布 — 50%" nzLabel="灰度发布 — 50%"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div class="row" nz-row [nzGutter]="16">
            <div class="col" nz-col [nzSpan]="24">
              <nz-form-item>
                <nz-form-label>安装包</nz-form-label>
                <nz-form-control>
                  <app-file-upload-dropzone
                    [policy]="packagePolicy"
                    [files]="packageFiles()"
                    [multiple]="false"
                    [title]="'点击或拖拽安装包到此区域上传'"
                    [hint]="'支持 .ipa / .apk 格式'"
                    (filesChange)="onPackageFilesChange($event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div class="row" nz-row [nzGutter]="16">
            <div class="col" nz-col [nzSpan]="24">
              <nz-form-item>
                <nz-form-label>更新日志（每行一条）</nz-form-label>
                <nz-form-control>
                  <textarea
                    nz-input
                    rows="4"
                    placeholder="每行一条更新内容…"
                    [(ngModel)]="changelogText"
                    name="changelog"
                  ></textarea>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
        </form>
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="close.emit()">取消</button>
        <button nz-button nzType="primary" type="button" (click)="submit()" [disabled]="!isValid()">
          <nz-icon nzType="check" nzTheme="outline" />
          {{ isEditing() ? '保存修改' : '创建版本' }}
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .row {
        margin-bottom: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileAppVersionFormDialogComponent {
  readonly packagePolicy = UPLOAD_TARGETS.mobileAppPackage;

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
  readonly packageFiles = signal<File[]>([]);

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

  onPackageFilesChange(files: File[]): void {
    this.packageFiles.set(files);
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
    this.packageFiles.set([]);
  }
}
