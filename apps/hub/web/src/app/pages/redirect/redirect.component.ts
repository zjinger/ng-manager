import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { MigrationService } from '../../core/migration/migration.service';

@Component({
  selector: 'app-redirect',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzButtonModule],
  templateUrl: './redirect.component.html',
  styleUrls: ['./redirect.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RedirectComponent implements OnInit, OnDestroy {
  private readonly migrationService = inject(MigrationService);

  readonly countdown = signal(Math.ceil(this.migrationService.config.autoRedirectDelay / 1000));

  private redirectTimer: number | null = null;
  private countdownTimer: number | null = null;

  ngOnInit(): void {
    const delay = this.migrationService.config.autoRedirectDelay;

    this.redirectTimer = window.setTimeout(() => {
      this.migrationService.replaceToV2();
    }, delay);

    this.countdownTimer = window.setInterval(() => {
      const current = this.countdown();
      if (current > 1) {
        this.countdown.set(current - 1);
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.redirectTimer !== null) {
      window.clearTimeout(this.redirectTimer);
    }

    if (this.countdownTimer !== null) {
      window.clearInterval(this.countdownTimer);
    }
  }

  goNow(): void {
    this.migrationService.replaceToV2();
  }
}