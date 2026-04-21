import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NodeVersionService } from './node-version.service';

@Component({
  selector: 'app-node-version',
  imports: [
    CommonModule,
    NzTagModule,
    NzIconModule,
    NzSpaceModule,
    NzButtonModule,
    NzSpinModule,
    NzToolTipModule,
  ],
  template: `
    <nz-space>
      <nz-spin *nzSpaceItem [nzSpinning]="nodeVersion.loading()">
        <nz-tag nzColor="blue">
          <span nz-icon nzType="nodejs" nzTheme="outline"></span>
          当前Node: {{ nodeVersion.currentVersion() || '检测中...' }}
        </nz-tag>
      </nz-spin>

      <nz-tag *nzSpaceItem [nzColor]="getManagerColor()">
        {{ getManagerLabel() }}
      </nz-tag>

      <button
        *nzSpaceItem
        nz-button
        nzType="default"
        nzSize="small"
        (click)="refresh()"
        title="刷新当前 Node 版本信息"
      >
        <span nz-icon nzType="reload"></span>
        刷新
      </button>
    </nz-space>

    <!-- 未安装版本管理器的提示 -->
    @if (!nodeVersion.hasVersionManager() && !nodeVersion.loading()) {
      <div class="warning-message">
        <span nz-icon nzType="warning" nzTheme="outline"></span>
        {{ nodeVersion.getNoManagerMessage() }}
      </div>
    }

    <!-- 项目版本要求提示 -->
    @if (nodeVersion.projectRequirement(); as req) {
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
          项目要求 {{ req.requiredVersion }}，将自动切换到 {{ req.satisfiedBy }}
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
      <div class="error-message" style="margin-top: 4px;">
        <span nz-icon nzType="close-circle" nzTheme="outline"></span>
        {{ nodeVersion.switchError() }}
      </div>
    }

    <!-- 常规错误信息 -->
    @if (nodeVersion.error()) {
      <div class="error-message" style="margin-top: 4px;">
        <span nz-icon nzType="close-circle" nzTheme="outline"></span>
        {{ nodeVersion.error() }}
      </div>
    }
    @let availableVersions = nodeVersion.availableVersions();
    <!-- 可用版本列表（可切换） -->
    @if (availableVersions.length > 0 && nodeVersion.hasVersionManager()) {
      <div class="version-list-container">
        <span class="muted-text">切换版本: </span>
        <nz-spin [nzSpinning]="nodeVersion.switching()" class="inline-block">
          @for (v of availableVersions; track v) {
            <nz-tag
              [nzColor]="v === nodeVersion.currentVersion() ? 'blue' : 'default'"
              class="version-tag clickable"
              (click)="switchVersion(v)"
            >
              {{ v }}
            </nz-tag>
          }
        </nz-spin>
      </div>
    }

    <!-- 不可切换时的可用版本（只读） -->
    @if (availableVersions.length > 0 && !nodeVersion.hasVersionManager()) {
      <div class="version-list-container">
        <span class="muted-text">可用版本: </span>
        @for (v of availableVersions; track v) {
          <nz-tag nzColor="default" class="version-tag">
            {{ v }}
          </nz-tag>
        }
      </div>
    }
  `,
  styles: `
    .info-message {
      color: #1890ff;
      font-size: 12px;
      margin-top: 8px;
    }

    .success-message {
      color: #52c41a;
      font-size: 12px;
      margin-top: 8px;
    }

    .warning-message {
      color: #faad14;
      font-size: 12px;
      margin-top: 8px;
    }

    .error-message {
      color: #ff4d4f;
      font-size: 12px;
      margin-top: 8px;
    }

    .muted-text {
      color: #888;
      font-size: 12px;
    }

    .version-list-container {
      margin-top: 8px;
    }

    .version-tag {
      margin: 2px;
      transition: all 0.2s ease;
    }

    .version-tag.clickable:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      border-color: #1890ff;
    }

    .clickable {
      cursor: pointer;
    }

    .cursor-pointer {
      cursor: pointer;
    }

    .inline-block {
      display: inline-block;
    }
  `,
})
export class NodeVersionComponent implements OnInit {
  nodeVersion = inject(NodeVersionService);
  private message = inject(NzMessageService);
  ngOnInit() {
    this.refresh();
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
