import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

export interface PortalSettings {
  logoUrl: string | null;
  name: string;
  subtitle: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  showQrcode: boolean;
  showInstallGuide: boolean;
  showVersionHistory: boolean;
  showSystemRequirements: boolean;
  showDownloadStats: boolean;
  bannerEnabled: boolean;
  bannerText: string;
  bannerStyle: 'info' | 'success' | 'brand' | 'warning';
  bannerLink: string;
}

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
  ],
  template: `
    <div class="portal-settings">
      <div class="settings-section">
        <div class="settings-section-header">
          <nz-icon nzType="appstore" nzTheme="outline" />
          <h3>品牌信息</h3>
        </div>
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
              <div class="upload-area" (click)="logoInput.click()">
                <input #logoInput type="file" accept="image/png,image/svg+xml" hidden (change)="onLogoPicked($event)" />
                <nz-icon nzType="upload" nzTheme="outline" />
                <p>点击上传新 Logo</p>
                <div class="upload-hint">PNG / SVG，最大 2 MB</div>
              </div>
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
      </div>

      <div class="settings-section">
        <div class="settings-section-header">
          <nz-icon nzType="layout" nzTheme="outline" />
          <h3>页面模块</h3>
        </div>
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
      </div>

      <div class="settings-section">
        <div class="settings-section-header">
          <nz-icon nzType="message" nzTheme="outline" />
          <h3>公告横幅</h3>
        </div>
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
      </div>

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

      .settings-section {
        background: var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        overflow: hidden;
      }

      .settings-section-header {
        padding: 14px 20px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .settings-section-header nz-icon {
        font-size: 16px;
        color: var(--text-muted);
      }

      .settings-section-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        color: var(--text-heading);
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
        color: var(--danger);
        font-size: 11px;
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

      .upload-area {
        flex: 1;
        border: 1.5px dashed var(--border-color);
        border-radius: var(--border-radius);
        padding: 16px;
        text-align: center;
        cursor: pointer;
        transition: border-color 0.15s, background 0.15s;
      }

      .upload-area:hover {
        border-color: var(--primary);
        background: color-mix(in srgb, var(--primary-500) 6%, transparent);
      }

      .upload-area nz-icon {
        font-size: 20px;
        color: var(--text-muted);
        margin-bottom: 4px;
      }

      .upload-area p {
        font-size: 13px;
        color: var(--text-secondary);
        margin: 0;
      }

      .upload-hint {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 4px;
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
  readonly settings = input<PortalSettings | null>(null);

  readonly save = output<PortalSettings>();
  readonly cancel = output<void>();
  readonly resetToDefault = output<void>();

  readonly draft = signal<PortalSettings>({
    logoUrl: null,
    name: 'Hub V2 Mobile',
    subtitle: '研发协作随身端',
    description: 'Hub V2 Mobile 是面向研发团队的移动端协作工具，支持查看待办、处理 Issue、跟进研发项和接收通知。',
    primaryColor: '#6366F1',
    accentColor: '#10B981',
    showQrcode: true,
    showInstallGuide: true,
    showVersionHistory: true,
    showSystemRequirements: false,
    showDownloadStats: false,
    bannerEnabled: true,
    bannerText: 'v1.2.0 已发布 — 全新统一待办入口',
    bannerStyle: 'brand',
    bannerLink: '',
  });

  updateField<K extends keyof PortalSettings>(key: K, value: PortalSettings[K]): void {
    this.draft.update((current) => ({ ...current, [key]: value }));
  }

  onLogoPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      this.updateField('logoUrl', url);
    }
    input.value = '';
  }
}
