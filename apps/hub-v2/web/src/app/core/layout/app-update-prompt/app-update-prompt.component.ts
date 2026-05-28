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
          <strong>应用已更新</strong>
          <span>刷新后可使用最新版本。</span>
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
}
