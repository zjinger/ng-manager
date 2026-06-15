import { FormsModule } from '@angular/forms';
import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { UPLOAD_TARGETS } from '@shared/constants';
import { FileUploadDropzoneComponent, PanelCardComponent } from '@shared/ui';
import { DEFAULT_PORTAL_SETTINGS, type PortalSettings } from '../../models/mobile-app-version.model';

@Component({
  selector: 'app-portal-settings-tab',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    NzSwitchModule,
    FileUploadDropzoneComponent,
    PanelCardComponent,
  ],
  template: `
    <div class="portal-settings">
      <app-panel-card title="访问链接" titleIcon="link">
        <div class="settings-section-body">
          <div class="toggle-row toggle-row--topless">
            <div class="toggle-info">
              <div class="toggle-title">启用门户公开访问</div>
              <div class="toggle-desc">开启并保存后，外部用户才能通过下载页链接访问移动端 APP 门户。</div>
            </div>
            <nz-switch [ngModel]="draft().enabled" (ngModelChange)="updateField('enabled', $event)" />
          </div>

          @if (draft().enabled) {
            <div class="field-label">门户公开地址</div>
            <div class="portal-url-row">
              <div class="portal-url-text">{{ publicUrl() }}</div>
              <a nz-button nzType="default" [href]="publicUrl()" target="_blank" rel="noopener">
                <nz-icon nzType="export" nzTheme="outline" />
                打开
              </a>
              <button nz-button nzType="default" type="button" (click)="copyPublicUrl()">
                <nz-icon nzType="copy" nzTheme="outline" />
                复制
              </button>
            </div>
            <div class="access-note">保存配置后链接生效；至少发布一个 iOS 或 Android 版本后，下载页才会展示安装包。</div>
          } @else {
            <div class="access-disabled">当前未开放公开访问，下载页链接不会对外生效。</div>
          }
        </div>
      </app-panel-card>

      <app-panel-card title="品牌信息" titleIcon="appstore">
        <div class="settings-section-body">
          <div class="field-group">
            <div class="field-label">门户 Logo</div>
            <div class="field-hint">显示在下载页面顶部，推荐 128×128 PNG</div>
            <div class="logo-upload-row">
              <div class="logo-preview">
                @if (draft().logoUrl) {
                  <img [src]="draft().logoUrl!" alt="logo" />
                } @else {
                  {{ (draft().name || 'H2').slice(0, 2).toUpperCase() }}
                }
              </div>
              <app-file-upload-dropzone
                class="logo-dropzone"
                [policy]="logoPolicy"
                [files]="logoFiles()"
                [multiple]="false"
                [showPreview]="false"
                [title]="'拖放 Logo 图片到此处，或点击选择'"
                [hint]="'PNG / JPG / SVG，最大 10 MB'"
                (filesChange)="onLogoFilesChange($event)"
              />
            </div>
          </div>

          <div class="field-row">
            <div class="field-group">
              <div class="field-label">门户名称 <span class="required">*</span></div>
              <input nz-input placeholder="请输入门户名称" [ngModel]="draft().name" (ngModelChange)="updateField('name', $event)" />
            </div>
            <div class="field-group">
              <div class="field-label">门户副标题</div>
              <input nz-input placeholder="请输入副标题" [ngModel]="draft().subtitle" (ngModelChange)="updateField('subtitle', $event)" />
            </div>
          </div>

          <div class="field-group">
            <div class="field-label">门户描述</div>
            <textarea nz-input rows="3" placeholder="请输入门户描述" [ngModel]="draft().description" (ngModelChange)="updateField('description', $event)"></textarea>
          </div>

          <div class="field-row">
            <div class="field-group">
              <div class="field-label">品牌主色</div>
              <div class="color-row">
                <div class="color-swatch" [style.background]="draft().primaryColor"></div>
                <input nz-input class="color-input" [ngModel]="draft().primaryColor" (ngModelChange)="updateField('primaryColor', $event)" />
              </div>
            </div>
            <div class="field-group">
              <div class="field-label">品牌辅助色</div>
              <div class="color-row">
                <div class="color-swatch" [style.background]="draft().accentColor"></div>
                <input nz-input class="color-input" [ngModel]="draft().accentColor" (ngModelChange)="updateField('accentColor', $event)" />
              </div>
            </div>
          </div>
        </div>
      </app-panel-card>

      <app-panel-card title="页面模块" titleIcon="layout">
        <div class="settings-section-body">
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">显示二维码区域</div>
              <div class="toggle-desc">在下载页面展示 iOS / Android 二维码</div>
            </div>
            <nz-switch [ngModel]="draft().showQrcode" (ngModelChange)="updateField('showQrcode', $event)" />
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">显示安装说明</div>
              <div class="toggle-desc">展示 iOS 和 Android 的安装步骤</div>
            </div>
            <nz-switch [ngModel]="draft().showInstallGuide" (ngModelChange)="updateField('showInstallGuide', $event)" />
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">显示版本历史</div>
              <div class="toggle-desc">在页面底部展示版本更新日志</div>
            </div>
            <nz-switch [ngModel]="draft().showVersionHistory" (ngModelChange)="updateField('showVersionHistory', $event)" />
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">显示系统要求</div>
              <div class="toggle-desc">展示最低系统版本要求</div>
            </div>
            <nz-switch [ngModel]="draft().showSystemRequirements" (ngModelChange)="updateField('showSystemRequirements', $event)" />
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">显示下载统计</div>
              <div class="toggle-desc">在页面上展示总下载量</div>
            </div>
            <nz-switch [ngModel]="draft().showDownloadStats" (ngModelChange)="updateField('showDownloadStats', $event)" />
          </div>
        </div>
      </app-panel-card>

      <app-panel-card title="公告横幅" titleIcon="message">
        <div class="settings-section-body">
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">启用公告横幅</div>
              <div class="toggle-desc">在下载页面顶部显示一条公告消息</div>
            </div>
            <nz-switch [ngModel]="draft().bannerEnabled" (ngModelChange)="updateField('bannerEnabled', $event)" />
          </div>

          @if (draft().bannerEnabled) {
            <div class="banner-fields">
              <div class="field-group">
                <div class="field-label">横幅文案</div>
                <input nz-input placeholder="请输入横幅文案" [ngModel]="draft().bannerText" (ngModelChange)="updateField('bannerText', $event)" />
              </div>
              <div class="field-row">
                <div class="field-group">
                  <div class="field-label">横幅样式</div>
                  <nz-select [ngModel]="draft().bannerStyle" (ngModelChange)="updateField('bannerStyle', $event)" style="width: 100%">
                    <nz-option nzValue="info" nzLabel="信息 (蓝色)"></nz-option>
                    <nz-option nzValue="success" nzLabel="成功 (绿色)"></nz-option>
                    <nz-option nzValue="brand" nzLabel="品牌色 (紫色)"></nz-option>
                    <nz-option nzValue="warning" nzLabel="警告 (黄色)"></nz-option>
                  </nz-select>
                </div>
                <div class="field-group">
                  <div class="field-label">链接地址</div>
                  <input nz-input placeholder="可选，点击横幅跳转" [ngModel]="draft().bannerLink" (ngModelChange)="updateField('bannerLink', $event)" />
                </div>
              </div>
            </div>
          }
        </div>
      </app-panel-card>

      <div class="settings-actions">
        <button nz-button nzType="default" nzDanger (click)="resetToDefault.emit()">
          <nz-icon nzType="undo" nzTheme="outline" />
          重置为默认
        </button>
        <button nz-button nzType="default" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" (click)="save.emit(draft())">
          <nz-icon nzType="save" nzTheme="outline" />
          保存设置
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .portal-settings {
        display: grid;
        gap: 16px;
        padding-top: 16px;
      }

      .settings-section-body {
        padding: 20px;
      }

      .field-group {
        margin-bottom: 20px;
      }

      .field-group:last-child {
        margin-bottom: 0;
      }

      .field-label {
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--text);
      }

      .field-label .required {
        color: var(--color-danger, #ff4d4f);
        font-size: 13px;
        font-weight: 600;
      }

      .field-hint {
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 8px;
      }

      .field-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .portal-url-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .portal-url-text {
        flex: 1;
        min-width: 0;
        padding: 8px 10px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--bg-muted);
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 12px;
        line-height: 20px;
        overflow-wrap: anywhere;
      }

      .logo-upload-row {
        display: flex;
        align-items: center;
        gap: 20px;
      }

      .logo-preview {
        width: 64px;
        height: 64px;
        border-radius: 12px;
        background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
        color: #fff;
        display: grid;
        place-items: center;
        font-weight: 800;
        font-size: 24px;
        flex-shrink: 0;
        overflow: hidden;
      }

      .logo-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .logo-dropzone {
        flex: 1;
        min-width: 0;
      }

      :host ::ng-deep .logo-dropzone .upload-zone {
        min-height: 120px;
        border-radius: var(--border-radius);
      }

      :host ::ng-deep .logo-dropzone .upload-zone__icon {
        width: 38px;
        height: 38px;
        margin-bottom: 8px;
      }

      :host ::ng-deep .logo-dropzone .upload-zone__icon > span[nz-icon] {
        font-size: 20px;
      }

      :host ::ng-deep .logo-dropzone .upload-zone__title {
        font-size: 13px;
      }

      :host ::ng-deep .logo-dropzone .upload-zone__hint {
        font-size: 12px;
      }

      .color-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .color-swatch {
        width: 38px;
        height: 38px;
        border-radius: 6px;
        border: 1px solid var(--border-color);
        cursor: pointer;
        flex-shrink: 0;
      }

      .color-input {
        flex: 1;
        font-family: var(--font-mono);
      }

      .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid var(--border-color);
      }

      .toggle-row--topless {
        padding-top: 0;
      }

      .toggle-row:last-child {
        border-bottom: none;
      }

      .toggle-info {
        flex: 1;
      }

      .toggle-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
      }

      .toggle-desc {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 2px;
      }

      .banner-fields {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--border-color);
      }

      .access-note,
      .access-disabled {
        margin-top: 8px;
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.6;
      }

      .access-disabled {
        margin-top: 12px;
      }

      .settings-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        padding-top: 4px;
      }

      @media (max-width: 720px) {
        .field-row {
          grid-template-columns: 1fr;
        }

        .portal-url-row {
          align-items: stretch;
          flex-direction: column;
        }

        .logo-upload-row {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalSettingsTabComponent {
  private readonly clipboard = inject(Clipboard);
  private readonly message = inject(NzMessageService);

  readonly logoPolicy = UPLOAD_TARGETS.projectAvatar;
  readonly settings = input<PortalSettings | null>(null);
  readonly publicUrl = input('');

  readonly save = output<PortalSettings>();
  readonly cancel = output<void>();
  readonly resetToDefault = output<void>();

  readonly draft = signal<PortalSettings>({ ...DEFAULT_PORTAL_SETTINGS });
  readonly logoFiles = signal<File[]>([]);

  constructor() {
    effect(() => {
      this.draft.set({ ...(this.settings() ?? DEFAULT_PORTAL_SETTINGS) });
      this.logoFiles.set([]);
    });
  }

  updateField<K extends keyof PortalSettings>(key: K, value: PortalSettings[K]): void {
    this.draft.update((current) => ({ ...current, [key]: value }));
  }

  onLogoFilesChange(files: File[]): void {
    this.logoFiles.set(files);
    const file = files[0] ?? null;
    if (file) {
      this.draft.update((current) => ({
        ...current,
        logoFile: file,
        logoUrl: URL.createObjectURL(file),
      }));
      return;
    }
    this.draft.update((current) => ({
      ...current,
      logoFile: null,
      logoUrl: this.settings()?.logoUrl ?? null,
    }));
  }

  copyPublicUrl(): void {
    const url = this.publicUrl();
    if (!url) {
      return;
    }
    if (this.clipboard.copy(url)) {
      this.message.success('门户访问链接已复制');
      return;
    }
    this.message.error('复制失败，请手动复制');
  }
}
