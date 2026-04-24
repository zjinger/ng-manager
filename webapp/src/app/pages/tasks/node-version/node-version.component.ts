import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
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
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NodeVersionService } from './node-version.service';

@Component({
  selector: 'app-node-version',
  imports: [
    CommonModule,
    NzIconModule,
    NzButtonModule,
    NzSpinModule,
    NzTooltipModule,
    NzModalModule,
    NzInputModule,
    NzAutocompleteModule,
    FormsModule,
    NzSelectModule,
    NzPopconfirmModule,
    NzPopoverModule,
  ],
  templateUrl: './node-version.component.html',
  styleUrl: './node-version.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  /** 写入配置相关 */
  showWriteConfig = false;
  writingConfig = false;
  selectedEngineVersion: string | null = null;
  customEngineVersion = '';
  recommendedEngineVersions: { label: string; value: string }[] = [];

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

  /** 获取 engines.node 配置预览 */
  getEngineConfigPreview(): string {
    const version = this.customEngineVersion || this.selectedEngineVersion || '';
    if (!version) {
      return '{ "engines": { "node": "请选择或输入版本" } }';
    }
    return `{ "engines": { "node": "${version}" } }`;
  }

  /** 打开写入配置表单 */
  openWriteConfig(): void {
    const req = this.nodeVersion.projectRequirement();
    if (req?.requiredVersion && req.hasEnginesConfig) {
      this.selectedEngineVersion = req.requiredVersion;
    }
    this.showWriteConfig = true;
  }

  /** 关闭写入配置表单并重置 */
  closeWriteConfig(): void {
    this.showWriteConfig = false;
    this.selectedEngineVersion = null;
    this.customEngineVersion = '';
  }

  /** 写入 engines.node 到 package.json */
  async writeEngineConfig() {
    const version = this.customEngineVersion || this.selectedEngineVersion;
    if (!version) {
      this.message.warning('请选择或输入版本号');
      return;
    }

    this.writingConfig = true;
    try {
      const success = await this.nodeVersion.writeEngineConfig(version);
      if (success) {
        this.message.success('已写入 engines.node 配置');
        this.showWriteConfig = false;
        this.nodeVersion.refresh();
        this.updateRecommendedEngineVersions();
      } else {
        this.message.error('写入配置失败');
      }
    } finally {
      this.writingConfig = false;
    }
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

  refresh(): Promise<void> {
    this.nodeVersion.getCurrentVersion();
    return this.nodeVersion.loadProjectRequirement().then(() => {
      this.updateRecommendedEngineVersions();
    });
  }

  /** 更新推荐版本列表，将后端返回的推荐版本添加到列表中 */
  private updateRecommendedEngineVersions(): void {
    const req = this.nodeVersion.projectRequirement();
    if (req?.requiredVersion) {
      const recommendedVersion = req.requiredVersion;
      const exists = this.recommendedEngineVersions.some((v) => v.value === recommendedVersion);
      if (!exists) {
        this.recommendedEngineVersions = [
          { label: recommendedVersion + ' (推荐)', value: recommendedVersion },
          ...this.recommendedEngineVersions,
        ];
      }
    }
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

  /** 打开 NVM 官网了解更多 */
  openNvmLearnMorePage(): void {
    window.open('https://www.nvmnode.com/', '_blank');
  }

  /** 打开 NVM 下载页面 */
  openNvmInstallPage(): void {
    window.open('https://www.nvmnode.com/guide/download.html', '_blank');
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
