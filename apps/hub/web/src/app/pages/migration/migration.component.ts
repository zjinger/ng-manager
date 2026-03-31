import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { MigrationService } from '../../core/migration/migration.service';

@Component({
  selector: 'app-migration',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzButtonModule],
  templateUrl: './migration.component.html',
  styleUrls: ['./migration.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MigrationComponent {
  private readonly migrationService = inject(MigrationService);

  readonly v2Label = this.migrationService.config.v2Label;
  readonly v2Url = this.migrationService.config.v2BaseUrl;

  goToV2(): void {
    this.migrationService.redirectToV2();
  }
}