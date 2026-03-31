import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { MigrationService } from '../../core/migration/migration.service';

@Component({
  selector: 'app-migration-banner',
  standalone: true,
  imports: [CommonModule,  NzButtonModule],
  templateUrl: './migration-banner.component.html',
  styleUrls: ['./migration-banner.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MigrationBannerComponent {
  private readonly migrationService = inject(MigrationService);
  private readonly router = inject(Router);

  readonly visible = this.migrationService.showBanner;
  readonly notice = this.migrationService.config.notice;

  goToV2(): void {
    this.migrationService.redirectToV2();
  }

  goToMigrationPage(): void {
    this.router.navigateByUrl('/migration');
  }
}