import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { CollapsibleCardComponent } from '@app/shared/components/collapsible-card/collapsible-card.component';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import {
  AgentConnectionsApiService,
  type CreateHubV2AgentConnectionRequest,
  type HubV2AgentConnectionListResponse,
  type HubV2AgentConnectionSummary,
  type UpdateHubV2AgentConnectionRequest,
} from '../../services';
import { ConnectionCardComponent } from './components/connection-card.component';

type CreateFormModel = {
  name: string;
  baseUrl: string;
  projectKey: string;
  projectName: string;
  projectToken: string;
  personalToken: string;
  isDefault: boolean;
};

type EditFormModel = {
  name: string;
  baseUrl: string;
  projectKey: string;
  projectName: string;
  projectTokenInput: string;
  personalTokenInput: string;
  clearProjectToken: boolean;
  clearPersonalToken: boolean;
  isDefault: boolean;
};

function createInitialForm(): CreateFormModel {
  return {
    name: '',
    baseUrl: '',
    projectKey: '',
    projectName: '',
    projectToken: '',
    personalToken: '',
    isDefault: false,
  };
}

function createInitialEditForm(name = ''): EditFormModel {
  return {
    name,
    baseUrl: '',
    projectKey: '',
    projectName: '',
    projectTokenInput: '',
    personalTokenInput: '',
    clearProjectToken: false,
    clearPersonalToken: false,
    isDefault: false,
  };
}

@Component({
  selector: 'app-ai-agent-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CollapsibleCardComponent,
    ConnectionCardComponent,
    NzButtonModule,
    NzTagModule,
    NzModalModule,
    NzInputModule,
    NzCheckboxModule,
    NzSpinModule,
    NzAlertModule,
    NzEmptyModule,
    NzIconModule,
  ],
  templateUrl: './ai-agent-settings.component.html',
  styleUrls: ['./ai-agent-settings.component.less'],
})
export class AiAgentSettingsComponent implements OnInit {
  private readonly api = inject(AgentConnectionsApiService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly items = signal<HubV2AgentConnectionSummary[]>([]);
  readonly configPath = signal('');

  readonly createVisible = signal(false);
  readonly editVisible = signal(false);
  readonly mcpServerConfigExample = JSON.stringify(
    {
      mcpServers: {
        'ng-manager': {
          command: 'ngm',
          args: ['mcp'],
        },
      },
    },
    null,
    2
  );
  createForm: CreateFormModel = createInitialForm();
  editForm: EditFormModel = createInitialEditForm();
  readonly editingItem = signal<HubV2AgentConnectionSummary | null>(null);

  ngOnInit(): void {
    void this.refresh();
  }

  async refresh(showToast = false): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    try {
      const data = await firstValueFrom(this.api.listHubV2AgentConnections());
      this.applyList(data);
      if (showToast) {
        this.message.success('已刷新 Agent Connection 列表');
      }
    } catch (error) {
      this.errorMessage.set(
        `加载 Agent Connection 失败，请检查 ngm server 是否正常运行。${this.extractErrorMessage(error)}`
      );
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(): void {
    this.createForm = createInitialForm();
    this.createVisible.set(true);
  }

  closeCreate(): void {
    this.createVisible.set(false);
  }

  async submitCreate(): Promise<void> {
    const form = this.createForm;
    const validationError = this.validateRequired(form.name, form.baseUrl, form.projectKey);
    if (validationError) {
      this.message.error(validationError);
      return;
    }
    const payload: CreateHubV2AgentConnectionRequest = {
      name: form.name.trim(),
      baseUrl: form.baseUrl.trim(),
      projectKey: form.projectKey.trim(),
      isDefault: form.isDefault,
    };
    if (form.projectName.trim()) {
      payload.projectName = form.projectName.trim();
    }
    if (form.projectToken.trim()) {
      payload.projectToken = form.projectToken.trim();
    }
    if (form.personalToken.trim()) {
      payload.personalToken = form.personalToken.trim();
    }

    await this.runSubmitting(async () => {
      const data = await firstValueFrom(this.api.createHubV2AgentConnection(payload));
      this.applyList(data);
      this.closeCreate();
      this.message.success('已新增 Agent Connection');
    });
  }

  openEdit(item: HubV2AgentConnectionSummary): void {
    this.editingItem.set(item);
    this.editForm = {
      ...createInitialEditForm(item.name),
      baseUrl: item.baseUrl,
      projectKey: item.projectKey,
      projectName: item.projectName ?? '',
      isDefault: item.isDefault,
    };
    this.editVisible.set(true);
  }

  closeEdit(): void {
    this.editVisible.set(false);
    this.editingItem.set(null);
  }

  async submitEdit(): Promise<void> {
    const editing = this.editingItem();
    if (!editing) {
      return;
    }
    const form = this.editForm;
    const validationError = this.validateRequired(editing.name, form.baseUrl, form.projectKey);
    if (validationError) {
      this.message.error(validationError);
      return;
    }

    const payload: UpdateHubV2AgentConnectionRequest = {
      baseUrl: form.baseUrl.trim(),
      projectKey: form.projectKey.trim(),
      projectName: form.projectName.trim() ? form.projectName.trim() : null,
      isDefault: form.isDefault ? true : undefined,
    };

    if (form.clearProjectToken) {
      payload.projectToken = null;
    } else if (form.projectTokenInput.trim()) {
      payload.projectToken = form.projectTokenInput.trim();
    }

    if (form.clearPersonalToken) {
      payload.personalToken = null;
    } else if (form.personalTokenInput.trim()) {
      payload.personalToken = form.personalTokenInput.trim();
    }

    await this.runSubmitting(async () => {
      const data = await firstValueFrom(
        this.api.updateHubV2AgentConnection(editing.name, payload)
      );
      this.applyList(data);
      this.closeEdit();
      this.message.success('已更新 Agent Connection');
    });
  }

  async setDefault(item: HubV2AgentConnectionSummary): Promise<void> {
    if (item.isDefault) {
      return;
    }
    await this.runSubmitting(async () => {
      const data = await firstValueFrom(
        this.api.setDefaultHubV2AgentConnection(item.name)
      );
      this.applyList(data);
      this.message.success(`已将 ${item.name} 设为默认连接`);
    });
  }

  confirmDelete(item: HubV2AgentConnectionSummary): void {
    const defaultHint = item.isDefault
      ? '如果仍有其他连接，系统会自动选择新的默认连接；否则会清空默认连接。'
      : '';
    this.modal.confirm({
      nzTitle: `删除连接 ${item.name}`,
      nzContent: `删除后该 Hub V2 connection 将从 agent-connections.json 中移除。相关 token 也会被删除。${defaultHint}`,
      nzOkText: '删除',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: async () => {
        await this.runSubmitting(async () => {
          const data = await firstValueFrom(
            this.api.deleteHubV2AgentConnection(item.name)
          );
          this.applyList(data);
          this.message.success('已删除连接');
        });
      },
    });
  }

  tokenStatusText(hasToken: boolean, preview?: string): string {
    if (!hasToken) {
      return 'missing';
    }
    return preview || 'configured';
  }

  onProjectTokenInput(value: string): void {
    const form = this.editForm;
    this.editForm = {
      ...form,
      projectTokenInput: value,
      clearProjectToken: value.trim() ? false : form.clearProjectToken,
    };
  }

  onPersonalTokenInput(value: string): void {
    const form = this.editForm;
    this.editForm = {
      ...form,
      personalTokenInput: value,
      clearPersonalToken: value.trim() ? false : form.clearPersonalToken,
    };
  }

  clearProjectTokenInEdit(): void {
    const form = this.editForm;
    this.editForm = {
      ...form,
      projectTokenInput: '',
      clearProjectToken: true,
    };
  }

  clearPersonalTokenInEdit(): void {
    const form = this.editForm;
    this.editForm = {
      ...form,
      personalTokenInput: '',
      clearPersonalToken: true,
    };
  }

  private applyList(data: HubV2AgentConnectionListResponse): void {
    this.items.set(data.items || []);
    this.configPath.set(data.configPath || '');
  }

  private validateRequired(name: string, baseUrl: string, projectKey: string): string | null {
    if (!name.trim()) {
      return 'name 必填';
    }
    if (!baseUrl.trim()) {
      return 'baseUrl 必填';
    }
    if (!/^https?:\/\//i.test(baseUrl.trim())) {
      return 'baseUrl 必须以 http:// 或 https:// 开头';
    }
    if (!projectKey.trim()) {
      return 'projectKey 必填';
    }
    return null;
  }

  private async runSubmitting(run: () => Promise<void>): Promise<void> {
    this.submitting.set(true);
    try {
      await run();
    } catch (error) {
      this.message.error(this.extractErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return '请求失败';
  }
}
