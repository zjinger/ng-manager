import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NodeVersionService } from './node-version.service';

@Component({
  selector: 'app-node-version',
  imports: [
    CommonModule,
    NzIconModule,
    NzButtonModule,
    NzSpinModule,
    NzToolTipModule,
    NzModalModule,
    NzInputModule,
    NzAutocompleteModule,
    FormsModule,
  ],
  template: `
    @let req = nodeVersion.projectRequirement();
    @if (req) {
      @if (req.voltaConfig) {
        <span
          nz-icon
          nzType="check-circle"
          nzTheme="fill"
          style="color: #52c41a; font-size: 14px;"
          nz-tooltip
          nzTooltipTitle="项目已配置 Volta (node@{{ req.voltaConfig }})，由 Volta 自动切换"
        ></span>
      } @else if (req.requiredVersion) {
        @if (req.isMatch) {
          <span
            nz-icon
            nzType="check-circle"
            nzTheme="fill"
            style="color: #52c41a; font-size: 14px;"
            nz-tooltip
            nzTooltipTitle="当前版本 {{ req.satisfiedBy }} 满足项目要求 ({{ req.requiredVersion }})"
          ></span>
        } @else if (req.satisfiedBy) {
          <span
            nz-icon
            nzType="warning"
            nzTheme="fill"
            style="color: #faad14; font-size: 14px;"
            nz-tooltip
            nzTooltipTitle="项目要求 {{ req.requiredVersion }}，运行后将自动切换到 {{
              req.satisfiedBy
            }}"
          ></span>
        } @else {
          <span
            nz-icon
            nzType="close-circle"
            nzTheme="fill"
            style="color: #ff4d4f; font-size: 14px;"
            nz-tooltip
            nzTooltipTitle="项目要求 {{ req.requiredVersion }}，但未找到匹配的已安装版本"
          ></span>
        }
      } @else {
        <span
          nz-icon
          nzType="info-circle"
          nzTheme="fill"
          style="color: #1890ff; font-size: 14px;"
          nz-tooltip
          nzTooltipTitle="该项目未配置 Node 版本要求"
        ></span>
      }
    }
    <span class="top-status">
      <nz-icon nzType="proj:node" nzTheme="outline"></nz-icon>
      {{ nodeVersion.currentVersion() || '检测中...' }}
    </span>

    <span class="manager-badge">{{ getManagerLabel() }}</span>

    <button nz-button nzType="default" (click)="refresh()" [nzLoading]="nodeVersion.loading()">
      <nz-icon nzType="reload" nzTheme="outline"></nz-icon>
      刷新
    </button>

    <button
      nz-button
      nzType="text"
      nz-tooltip
      nzTooltipTitle="Node版本设置"
      (click)="openSettingsModal()"
    >
      <nz-icon nzType="setting" nzTheme="outline"></nz-icon>
    </button>

    <!-- 设置 弹窗内容 -->
    <ng-template #settingsModal>
      <div class="modal-content">
        <!-- 未安装版本管理器的提示 -->
        @if (!nodeVersion.hasVersionManager() && !nodeVersion.loading()) {
          <div class="warning-message full-width">
            <span nz-icon nzType="warning" nzTheme="outline"></span>
            {{ nodeVersion.getNoManagerMessage() }}
          </div>
        }

        <!-- 项目版本要求状态 -->
        @if (req) {
          @if (req.voltaConfig) {
            <div class="status-section success">
              <div class="status-info">
                <span class="status-title">Volta 自动管理</span>
                <span class="status-desc">项目已配置 node@{{ req.voltaConfig }}</span>
              </div>
            </div>
          } @else if (req.isMatch) {
            <div class="status-section success">
              <div class="status-info">
                <span class="status-title">版本满足要求</span>
                <span class="status-desc"
                  >当前 {{ req.satisfiedBy }} 满足 {{ req.requiredVersion }}</span
                >
              </div>
            </div>
          } @else if (req.satisfiedBy) {
            <div class="status-section warning">
              <div class="status-info">
                <span class="status-title">将自动切换</span>
                <span class="status-desc"
                  >要求 {{ req.requiredVersion }}，切换到 {{ req.satisfiedBy }}</span
                >
              </div>
            </div>
          } @else if (req.requiredVersion) {
            <div class="status-section error">
              <div class="status-info">
                <span class="status-title">版本不匹配</span>
                <span class="status-desc">要求 {{ req.requiredVersion }}，未找到已安装版本</span>
              </div>
            </div>
          } @else {
            <div class="status-section info">
              <div class="status-info">
                <span class="status-title">未配置要求</span>
                <span class="status-desc">在 package.json 的 engines.node 字段配置</span>
              </div>
            </div>
          }
        }

        <!-- 版本管理器信息 -->
        <div class="manager-info">
          <span nz-icon nzType="database" nzTheme="outline"></span>
          <span
            >版本管理器:
            {{
              nodeVersion.manager() === 'nvm'
                ? 'NVM'
                : nodeVersion.manager() === 'volta'
                  ? 'Volta'
                  : '未检测到'
            }}</span
          >
          <span class="current-version">当前: {{ nodeVersion.currentVersion() || '未知' }}</span>
        </div>

        <!-- 快速安装区 -->
        @if (nodeVersion.hasVersionManager()) {
          <div class="install-section">
            <span class="section-title">快速安装</span>
            <div class="install-row">
              <input
                nz-input
                class="version-input"
                [(ngModel)]="selectedInstallVersion"
                name="selectedInstallVersion"
                [nzAutocomplete]="versionAuto"
                (input)="onVersionInput($event)"
                placeholder="输入版本号 (如 18.20.0)"
              />
              <nz-autocomplete #versionAuto>
                @for (v of filteredVersions; track v) {
                  <nz-auto-option [nzValue]="v" (click)="onVersionSelect(v)">{{
                    v
                  }}</nz-auto-option>
                }
              </nz-autocomplete>
              <button
                nz-button
                nzType="primary"
                nzSize="small"
                [nzLoading]="installing()"
                [disabled]="!selectedInstallVersion"
                (click)="installVersion()"
              >
                <span nz-icon nzType="download" nzTheme="outline"></span>
                安装
              </button>
            </div>
          </div>
        }

        <!-- 手动命令提示区 -->
        <div class="manual-section">
          <div class="section-header">
            <span class="section-title">手动安装命令</span>
            <span class="hint-text">如自动安装失败，可使用以下命令</span>
          </div>

          <div class="command-list">
            <!-- NVM 命令 -->
            <div class="command-item">
              <span class="command-label">NVM:</span>
              <code class="command-code">nvm install {{ getSuggestedVersion() }}</code>
              <button
                nz-button
                nzType="text"
                nzSize="small"
                nz-tooltip
                nzTooltipTitle="复制命令"
                (click)="copyCommand('nvm install ' + getSuggestedVersion())"
              >
                <span nz-icon nzType="copy" nzTheme="outline"></span>
              </button>
            </div>

            <!-- Volta 命令 -->
            <!-- <div class="command-item">
              <span class="command-label">Volta:</span>
              <code class="command-code">volta install node@{{ getSuggestedVersion() }}</code>
              <button
                nz-button
                nzType="text"
                nzSize="small"
                nz-tooltip
                nzTooltipTitle="复制命令"
                (click)="copyCommand('volta install node@' + getSuggestedVersion())"
              >
                <span nz-icon nzType="copy" nzTheme="outline"></span>
              </button>
            </div> -->
          </div>
        </div>

        <!-- 已安装版本列表 -->
        @let availableVersions = nodeVersion.availableVersions();
        @if (availableVersions.length > 0) {
          <div class="version-list-section">
            <span class="section-title">已安装版本</span>
            <nz-spin [nzSpinning]="nodeVersion.switching()">
              <div class="version-list">
                @for (v of availableVersions; track v) {
                  <span
                    class="version-tag"
                    [class.active]="v === nodeVersion.currentVersion()"
                    [class.clickable]="v !== nodeVersion.currentVersion()"
                  >
                    <span
                      class="version-name"
                      (click)="v !== nodeVersion.currentVersion() && switchVersion(v)"
                      >{{ v }}</span
                    >
                    @if (v !== nodeVersion.currentVersion()) {
                      <span
                        class="delete-btn"
                        nz-tooltip
                        nzTooltipTitle="删除"
                        (click)="confirmDelete(v, $event)"
                      >
                        <span nz-icon nzType="close" nzTheme="outline"></span>
                      </span>
                    } @else {
                      <span class="active-badge">当前</span>
                    }
                  </span>
                }
              </div>
            </nz-spin>
          </div>
        }

        <!-- 错误信息 -->
        @if (nodeVersion.error()) {
          <div class="error-message">
            <span nz-icon nzType="close-circle" nzTheme="outline"></span>
            {{ nodeVersion.error() }}
          </div>
        }
      </div>
    </ng-template>
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .top-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        background: #f6ffed;
        border: 1px solid #b7eb8f;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 500;
        color: #52c41a;
      }

      .manager-badge {
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 500;
        border-radius: 3px;
        background: #e6f7ff;
        color: #1890ff;
      }

      .info-message,
      .success-message,
      .warning-message,
      .error-message {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        padding: 8px 0;
      }

      .info-message {
        color: #1890ff;
      }

      .success-message {
        color: #52c41a;
      }

      .warning-message {
        color: #faad14;
      }

      .error-message {
        color: #ff4d4f;
      }

      .muted-text {
        color: #8c8c8c;
        font-size: 13px;
        margin-right: 12px;
      }

      .version-list-container {
        width: 100%;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        padding: 16px 0 4px;
        border-top: 1px solid #f0f0f0;
        margin-top: 12px;
      }

      .version-tag {
        padding: 6px 8px;
        font-size: 13px;
        border-radius: 6px;
        background: #fafafa;
        color: #595959;
        border: 1px solid #d9d9d9;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 4px;

        .version-name {
          padding: 0 6px;
        }

        &.clickable {
          cursor: pointer;

          &:hover {
            background: #e6f7ff;
            color: #1890ff;
            border-color: #91d5ff;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(24, 144, 255, 0.1);
          }
        }

        &.active {
          background: #1890ff;
          color: white;
          border-color: #1890ff;
          font-weight: 500;
          box-shadow: 0 2px 6px rgba(24, 144, 255, 0.2);
        }

        .delete-btn {
          display: none;
          padding: 2px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 10px;
          color: #8c8c8c;
          transition: all 0.2s ease;

          &:hover {
            color: #ff4d4f;
            background: #fff1f0;
          }
        }

        &:hover .delete-btn {
          display: inline-flex;
        }
      }

      .clickable,
      .cursor-pointer {
        cursor: pointer;
      }

      .version-list {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .modal-content {
        padding: 8px 0;
      }

      .install-section {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        margin-top: 8px;
        background: #fafafa;
        border-radius: 6px;
        padding: 12px;
      }

      .install-section .muted-text {
        white-space: nowrap;
        flex-shrink: 0;
      }

      .version-input {
        flex: 1;
        min-width: 180px;
        max-width: 240px;
      }

      .install-section button {
        flex-shrink: 0;
      }

      .modal-content {
        padding: 8px 0;
      }

      .section-title {
        font-size: 13px;
        font-weight: 500;
        color: #262626;
      }

      .status-section {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 12px;

        &.success {
          background: #f6ffed;
          border: 1px solid #b7eb8f;
          .status-info .status-title {
            color: #52c41a;
          }
        }

        &.warning {
          background: #fffbe6;
          border: 1px solid #ffe58f;
          .status-info .status-title {
            color: #faad14;
          }
        }

        &.error {
          background: #fff2f0;
          border: 1px solid #ffccc7;
          .status-info .status-title {
            color: #ff4d4f;
          }
        }

        &.info {
          background: #e6f7ff;
          border: 1px solid #91d5ff;
          .status-info .status-title {
            color: #1890ff;
          }
        }

        .status-info {
          display: flex;
          flex-direction: column;
          gap: 4px;

          .status-title {
            font-size: 14px;
            font-weight: 500;
          }

          .status-desc {
            font-size: 12px;
            color: #8c8c8c;
          }
        }
      }

      .manager-info {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #f5f5f5;
        border-radius: 6px;
        font-size: 12px;
        color: #595959;
        margin-bottom: 12px;

        .current-version {
          margin-left: auto;
          color: #1890ff;
          font-weight: 500;
        }
      }

      .install-section {
        background: #fafafa;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 16px;

        .install-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .version-input {
          flex: 1;
          min-width: 160px;
        }
      }

      .manual-section {
        background: #f5f5f5;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 16px;

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;

          .hint-text {
            font-size: 11px;
            color: #8c8c8c;
          }
        }

        .command-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .command-item {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #e8e8e8;

          .command-label {
            font-size: 12px;
            color: #8c8c8c;
            width: 40px;
          }

          .command-code {
            flex: 1;
            font-size: 12px;
            color: #1890ff;
            background: #e6f7ff;
            padding: 4px 8px;
            border-radius: 4px;
          }
        }
      }

      .version-list-section {
        .section-title {
          margin-bottom: 12px;
        }

        .version-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .version-tag {
          padding: 6px 8px;
          font-size: 13px;
          border-radius: 6px;
          background: #fafafa;
          color: #595959;
          border: 1px solid #d9d9d9;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;

          &.clickable {
            cursor: pointer;

            &:hover {
              background: #e6f7ff;
              color: #1890ff;
              border-color: #91d5ff;
            }
          }

          &.active {
            background: #1890ff;
            color: white;
            border-color: #1890ff;
          }

          .version-name {
            padding: 0 4px;
          }

          .delete-btn {
            display: none;
            padding: 2px;
            border-radius: 3px;
            cursor: pointer;
            color: #8c8c8c;

            &:hover {
              color: #ff4d4f;
              background: #fff1f0;
            }
          }

          .active-badge {
            font-size: 10px;
            padding: 2px 6px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 3px;
          }

          &:hover .delete-btn {
            display: inline-flex;
          }
        }
      }

      .error-message {
        margin-top: 12px;
      }

      .full-width {
        width: 100%;
      }
    `,
  ],
})
export class NodeVersionComponent implements OnInit, OnDestroy {
  nodeVersion = inject(NodeVersionService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);
  private settingsModal = viewChild<TemplateRef<any>>('settingsModal');
  /** 安装版本输入框值 */
  selectedInstallVersion: string | null = null;
  /** 推荐的可安装版本列表 */
  private recommendedVersions: string[] = [];
  /** 可输可选框-过滤后的版本列表 */
  filteredVersions: string[] = [];
  /** 正在安装 */
  installing = signal(false);
  private installMessageId = signal<string | null>(null);

  ngOnInit() {
    this.refresh();
  }

  ngOnDestroy(): void {
    this.installMessageId() && this.message.remove(this.installMessageId()!);
  }

  /** 输入时过滤推荐版本列表 */
  onVersionInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value.toLowerCase();
    if (!input) {
      this.filteredVersions = [...this.recommendedVersions];
    } else {
      this.filteredVersions = this.recommendedVersions.filter((v) =>
        v.toLowerCase().includes(input),
      );
    }
    // 自动添加版本前缀
    if (input && !input.startsWith('v')) {
      this.selectedInstallVersion = 'v' + input;
    } else {
      this.selectedInstallVersion = input;
    }
  }

  /** 选择版本时更新选中值 */
  onVersionSelect(version: string): void {
    this.selectedInstallVersion = version;
  }
  openSettingsModal() {
    this.updateRecommendedVersions();
    this.modal.create({
      nzTitle: 'Node版本设置',
      nzContent: this.settingsModal(),
      nzFooter: null,
      nzWidth: 500,
    });
  }

  /** 获取建议的版本号（用于手动命令提示） */
  getSuggestedVersion(): string {
    if (this.selectedInstallVersion) {
      return this.selectedInstallVersion.replace(/^v/, '');
    }
    const req = this.nodeVersion.projectRequirement();
    if (req?.requiredVersion) {
      return req.requiredVersion.replace(/^[\^~>=<]+/, '').split(' ')[0];
    }
    return '18.20.0';
  }

  /** 复制命令到剪贴板 */
  copyCommand(command: string): void {
    navigator.clipboard
      .writeText(command)
      .then(() => {
        this.message.success('命令已复制到剪贴板');
      })
      .catch(() => {
        this.message.error('复制失败');
      });
  }

  /** 根据项目要求的版本更新推荐版本列表 */
  updateRecommendedVersions() {
    const req = this.nodeVersion.projectRequirement();
    this.recommendedVersions = this.nodeVersion.generateRecommendedVersions(
      req?.requiredVersion || null,
    );
    this.filteredVersions = [...this.recommendedVersions];
    if (!this.selectedInstallVersion) {
      this.selectedInstallVersion = this.recommendedVersions[0] || null;
    }
  }

  /** 安装选中的版本 */
  async installVersion() {
    if (!this.selectedInstallVersion) {
      this.message.warning('请先选择一个版本');
      return;
    }
    this.installing.set(true);
    const version = this.selectedInstallVersion;
    this.installMessageId.set(
      this.message.loading(`正在安装 ${version}...`, {
        nzDuration: 0,
      }).messageId,
    );
    let installSuccess = false;
    try {
      installSuccess = await this.nodeVersion.installVersion(version);
    } finally {
      this.installMessageId() && this.message.remove(this.installMessageId()!);
      this.installing.set(false);
    }

    if (installSuccess) {
      if (this.nodeVersion.alreadyInstalled()) {
        this.message.warning(`${version} 已安装`);
      } else {
        this.message.success(`${version} 安装成功`);
      }
      this.nodeVersion.refresh();
      this.selectedInstallVersion = null;
      this.updateRecommendedVersions();
    } else {
      this.message.error(`${version} 安装失败`);
    }
  }

  refresh() {
    this.nodeVersion.getCurrentVersion();
    this.nodeVersion.loadProjectRequirement();
  }

  /** 确认删除版本（带确认弹窗） */
  confirmDelete(version: string, event: Event) {
    event.stopPropagation();
    this.modal.confirm({
      nzTitle: '确认删除',
      nzContent: `确定要删除${version} 版本吗？`,
      nzOkText: '删除',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () => this.deleteVersion(version),
    });
  }

  /** 执行删除版本 */
  async deleteVersion(version: string) {
    const success = await this.nodeVersion.deleteVersion(version);
    if (success) {
      this.message.success(`${version} 版本已删除`);
      this.nodeVersion.refresh();
    } else {
      this.message.error(`删除${version} 版本失败`);
    }
  }

  async switchVersion(version: string) {
    if (version === this.nodeVersion.currentVersion()) {
      this.message.info('当前已是该版本');
      return;
    }

    const success = await this.nodeVersion.switchVersion(version);

    if (success) {
      this.message.success(`已切换到 ${version}`);
      // 切换成功后重新加载项目版本要求，更新状态显示
      this.nodeVersion.loadProjectRequirement();
    }
  }

  getManagerLabel = computed(() => {
    const req = this.nodeVersion.projectRequirement();
    if (req?.voltaConfig) {
      return 'Volta';
    }
    return 'NVM';
  });
  /** 获取当前版本管理器 */
  getManagerColor = computed(() => {
    const req = this.nodeVersion.projectRequirement();
    if (req?.voltaConfig) {
      return 'orange';
    }
    return 'green';
  });
}
