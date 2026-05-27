import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CustomIconRegistry } from '@core/icons';
import { AppUpdateService } from '@core/services/app-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <router-outlet></router-outlet>

    @if (appUpdate.updateAvailable()) {
      <section class="app-update-prompt" role="status" aria-live="polite">
        <div class="app-update-prompt__content">
          <strong>应用已更新</strong>
          <span>刷新后可使用最新版本。</span>
        </div>
        <div class="app-update-prompt__actions">
          <button type="button" class="app-update-prompt__button" (click)="appUpdate.deferUpdate()">稍后</button>
          <button type="button" class="app-update-prompt__button app-update-prompt__button--primary" (click)="appUpdate.reloadForUpdate()">
            刷新页面
          </button>
        </div>
      </section>
    }
  `,
  styles: [
    `
      .app-update-prompt {
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 1100;
        display: flex;
        max-width: min(420px, calc(100vw - 32px));
        gap: 16px;
        align-items: center;
        padding: 14px 16px;
        color: #0f172a;
        background: #ffffff;
        border: 1px solid #dbeafe;
        border-radius: 8px;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
      }

      .app-update-prompt__content {
        display: grid;
        gap: 2px;
        min-width: 0;
      }

      .app-update-prompt__content strong {
        font-size: 14px;
        line-height: 20px;
      }

      .app-update-prompt__content span {
        color: #475569;
        font-size: 13px;
        line-height: 18px;
      }

      .app-update-prompt__actions {
        display: flex;
        flex: 0 0 auto;
        gap: 8px;
      }

      .app-update-prompt__button {
        min-width: 64px;
        height: 32px;
        padding: 0 12px;
        font: inherit;
        color: #334155;
        cursor: pointer;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
      }

      .app-update-prompt__button--primary {
        color: #ffffff;
        background: #2563eb;
        border-color: #2563eb;
      }

      @media (max-width: 520px) {
        .app-update-prompt {
          right: 16px;
          bottom: 16px;
          left: 16px;
          align-items: stretch;
          flex-direction: column;
        }

        .app-update-prompt__actions {
          justify-content: flex-end;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly iconRegistry = inject(CustomIconRegistry);
  protected readonly appUpdate = inject(AppUpdateService);

  constructor() {
    this.iconRegistry.init();
    this.appUpdate.start();
  }
}
