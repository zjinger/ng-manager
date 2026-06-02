import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppUpdateService } from '@core/services/app-update.service';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-update-prompt',
  standalone: true,
  imports: [NzIconModule],
  template: `
    @if (appUpdate.updateAvailable()) {
      <section class="app-update-prompt" role="status" aria-live="polite">
        <div class="app-update-prompt__content">
          <strong>{{ title }}</strong>
          <span>{{ description }}</span>
        </div>
        <div class="app-update-prompt__actions">
          <button type="button" class="app-update-prompt__button" (click)="appUpdate.deferUpdate()">
            稍后
          </button>
          <button
            type="button"
            class="app-update-prompt__button app-update-prompt__button--primary"
            (click)="appUpdate.reloadForUpdate()"
          >
            <span nz-icon nzType="reload"></span>
            <span>刷新</span>
          </button>
        </div>
      </section>
    }
  `,
  styleUrl: './app-update-prompt.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppUpdatePromptComponent {
  protected readonly appUpdate = inject(AppUpdateService);

  protected get title(): string {
    return this.appUpdate.pendingUpdate()?.source === 'chunk-error' ? '应用资源已更新' : '应用已更新';
  }

  protected get description(): string {
    return this.appUpdate.pendingUpdate()?.source === 'chunk-error'
      ? '请刷新页面。'
      : '刷新后可使用最新版本。';
  }
}
