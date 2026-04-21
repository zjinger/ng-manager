import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, TemplateRef, viewChild } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
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
          <div class="warning-message">
            <span nz-icon nzType="warning" nzTheme="outline"></span>
            {{ nodeVersion.getNoManagerMessage() }}
          </div>
        }

        <!-- 项目版本要求提示 -->
        @if (req) {
          @if (req.voltaConfig) {
            <div class="info-message">
              <span nz-icon nzType="check-circle" nzTheme="outline"></span>
              项目已配置 Volta (node@{{ req.voltaConfig }})，由 Volta 自动切换
            </div>
          } @else if (!req.requiredVersion) {
            <div class="info-message">
              <span nz-icon nzType="info-circle" nzTheme="outline"></span>
              该项目未配置 Node 版本要求
              <span
                nz-icon
                nzType="question-circle"
                nzTheme="outline"
                nz-tooltip
                nzTooltipTitle="在 package.json 的 engines.node 字段中配置（如 >=18.0.0）"
                class="cursor-pointer"
              ></span>
            </div>
          } @else if (req.isMatch) {
            <div class="success-message">
              <span nz-icon nzType="check-circle" nzTheme="outline"></span>
              当前版本 {{ req.satisfiedBy }} 满足项目要求 ({{ req.requiredVersion }})
            </div>
          } @else if (req.satisfiedBy) {
            <div class="warning-message">
              <span nz-icon nzType="warning" nzTheme="outline"></span>
              项目要求 {{ req.requiredVersion }}，运行后将自动切换到 {{ req.satisfiedBy }}
            </div>
          } @else {
            <div class="error-message">
              <span nz-icon nzType="close-circle" nzTheme="outline"></span>
              项目要求 {{ req.requiredVersion }}，但未找到匹配的已安装版本
            </div>
          }
        }

        <!-- 切换错误信息 -->
        @if (nodeVersion.switchError()) {
          <div class="error-message">
            <span nz-icon nzType="close-circle" nzTheme="outline"></span>
            {{ nodeVersion.switchError() }}
          </div>
        }

        <!-- 常规错误信息 -->
        @if (nodeVersion.error()) {
          <div class="error-message">
            <span nz-icon nzType="close-circle" nzTheme="outline"></span>
            {{ nodeVersion.error() }}
          </div>
        }

        @let availableVersions = nodeVersion.availableVersions();
        <!-- 可用版本列表 -->
        @if (availableVersions.length > 0) {
          <div class="version-list-container">
            <span class="muted-text">切换版本: </span>
            @if (nodeVersion.hasVersionManager()) {
              <nz-spin [nzSpinning]="nodeVersion.switching()">
                <div class="version-list">
                  @for (v of availableVersions; track v) {
                    <span
                      class="version-tag clickable"
                      [class.active]="v === nodeVersion.currentVersion()"
                      (click)="switchVersion(v)"
                    >
                      {{ v }}
                    </span>
                  }
                </div>
              </nz-spin>
            } @else {
              @for (v of availableVersions; track v) {
                <span class="version-tag">{{ v }}</span>
              }
            }
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
        padding: 6px 14px;
        font-size: 13px;
        border-radius: 6px;
        background: #fafafa;
        color: #595959;
        border: 1px solid #d9d9d9;
        transition: all 0.2s ease;

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
    `,
  ],
})
export class NodeVersionComponent implements OnInit {
  nodeVersion = inject(NodeVersionService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);
  settingsModal = viewChild<TemplateRef<any>>('settingsModal');

  ngOnInit() {
    this.refresh();
  }

  openSettingsModal() {
    this.modal.create({
      nzTitle: 'Node版本设置',
      nzContent: this.settingsModal(),
      nzFooter: null,
      nzWidth: 500,
    });
  }

  refresh() {
    this.nodeVersion.getCurrentVersion();
    this.nodeVersion.loadProjectRequirement();
  }

  async switchVersion(version: string) {
    if (version === this.nodeVersion.currentVersion()) {
      this.message.info('当前已是该版本');
      return;
    }

    const success = await this.nodeVersion.switchVersion(version);

    if (success) {
      this.message.success(`已切换到 Node ${version}`);
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
