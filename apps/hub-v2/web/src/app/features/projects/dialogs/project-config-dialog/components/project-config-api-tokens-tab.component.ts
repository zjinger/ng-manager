import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type {
  CreateProjectApiTokenInput,
  ProjectApiTokenEntity,
  ProjectApiTokenScope,
} from '../../../models/project.model';

@Component({
  selector: 'app-project-config-api-tokens-tab',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    NzButtonModule,
    NzDatePickerModule,
    NzIconModule,
    NzInputModule,
    NzPopconfirmModule,
    NzSelectModule,
  ],
  templateUrl: './project-config-api-tokens-tab.component.html',
  styleUrls: ['./project-config-api-tokens-tab.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectConfigApiTokensTabComponent {
  readonly busy = input(false);
  readonly apiTokens = input<ProjectApiTokenEntity[]>([]);
  readonly latestCreatedToken = input<string | null>(null);
  readonly pendingTokenIds = input<string[]>([]);
  readonly canManageConfig = input(false);

  readonly createApiToken = output<CreateProjectApiTokenInput>();
  readonly revokeApiToken = output<string>();
  readonly copyLatestToken = output<string>();
  readonly clearLatestToken = output<void>();

  readonly tokenNameDraft = signal('');
  readonly tokenScopesDraft = signal<ProjectApiTokenScope[]>(['issues:read', 'rd:read']);
  readonly tokenExpiresAt = signal<Date | null>(null);

  isTokenPending(id: string): boolean {
    return this.pendingTokenIds().includes(id);
  }

  canSubmitTokenCreate(): boolean {
    return this.tokenNameDraft().trim().length > 0 && this.tokenScopesDraft().length > 0;
  }

  submitTokenCreate(): void {
    if (!this.canSubmitTokenCreate()) {
      return;
    }
    this.createApiToken.emit({
      name: this.tokenNameDraft().trim(),
      scopes: this.tokenScopesDraft(),
      expiresAt: this.tokenExpiresAt() ? this.tokenExpiresAt()!.toISOString() : null,
    });
    this.tokenNameDraft.set('');
    this.tokenExpiresAt.set(null);
  }

  renderScopes(scopes: ProjectApiTokenScope[]): string {
    return scopes
      .map((scope) => {
        if (scope === 'issues:read') return 'Issue读取';
        if (scope === 'rd:read') return '研发项读取';
        if (scope === 'docs:read') return '文档读取';
        return '反馈读取';
      })
      .join(' / ');
  }
}
