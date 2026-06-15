import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import type { MobileAppVersionStatus, MobileAppPlatformType } from '../../models/mobile-app-version.model';

@Component({
  selector: 'app-mobile-app-version-toolbar',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzIconModule, NzSelectModule, PageToolbarComponent, SearchBoxComponent],
  template: `
    <app-page-toolbar>
      <button toolbar-primary nz-button nzType="primary" (click)="create.emit()">
        <nz-icon nzType="plus" nzTheme="outline" />
        新建版本
      </button>

      <div toolbar-filters class="version-toolbar__filters">
        <nz-select
          class="version-toolbar__select"
          [ngModel]="statusFilter()"
          (ngModelChange)="statusFilterChange.emit($event)"
          nzPlaceHolder="发布状态"
        >
          <nz-option nzValue="" nzLabel="全部状态"></nz-option>
          <nz-option nzValue="published" nzLabel="已发布"></nz-option>
          <nz-option nzValue="testing" nzLabel="测试中"></nz-option>
          <nz-option nzValue="draft" nzLabel="草稿"></nz-option>
          <nz-option nzValue="archived" nzLabel="已归档"></nz-option>
        </nz-select>

        <nz-select
          class="version-toolbar__select"
          [ngModel]="platformFilter()"
          (ngModelChange)="platformFilterChange.emit($event)"
          nzPlaceHolder="平台"
        >
          <nz-option nzValue="" nzLabel="全平台"></nz-option>
          <nz-option nzValue="ios" nzLabel="iOS"></nz-option>
          <nz-option nzValue="android" nzLabel="Android"></nz-option>
        </nz-select>
      </div>

      <app-search-box
        toolbar-search
        class="version-toolbar__search"
        placeholder="搜索版本号、构建号…"
        [value]="keyword()"
        (valueChange)="keywordChange.emit($event)"
        (submitted)="keywordChange.emit($event)"
      />
    </app-page-toolbar>
  `,
  styles: [
    `
      .version-toolbar__filters {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .version-toolbar__select {
        width: 140px;
      }

      .version-toolbar__search {
        min-width: 240px;
        max-width: 360px;
      }

      @media (max-width: 720px) {
        .version-toolbar__select,
        .version-toolbar__search {
          width: 100%;
          max-width: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileAppVersionToolbarComponent {
  readonly keyword = input<string>('');
  readonly statusFilter = input<MobileAppVersionStatus | ''>('');
  readonly platformFilter = input<MobileAppPlatformType | ''>('');

  readonly keywordChange = output<string>();
  readonly statusFilterChange = output<MobileAppVersionStatus | ''>();
  readonly platformFilterChange = output<MobileAppPlatformType | ''>();
  readonly create = output<void>();
}
