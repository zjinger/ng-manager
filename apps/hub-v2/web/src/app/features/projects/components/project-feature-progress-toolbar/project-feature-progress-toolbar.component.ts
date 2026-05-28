import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { FilterBarComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import type { ProjectFeaturePointStatus } from '../../models/project.model';

@Component({
  selector: 'app-project-feature-progress-toolbar',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzIconModule, NzSelectModule, FilterBarComponent, PageToolbarComponent, SearchBoxComponent],
  template: `
    <app-page-toolbar>
      @if (canManage()) {
        <button toolbar-primary nz-button nzType="primary" (click)="create.emit()">
          <span nz-icon nzType="plus"></span>
          新增功能点
        </button>
      }

      <app-filter-bar toolbar-filters class="feature-progress-toolbar__filters">
        <nz-select
          class="feature-progress-toolbar__select"
          [ngModel]="moduleFilter()"
          (ngModelChange)="moduleFilterChange.emit($event)"
          nzPlaceHolder="模块"
        >
          <nz-option nzValue="" nzLabel="全部模块"></nz-option>
          @for (module of moduleOptions(); track module) {
            <nz-option [nzValue]="module" [nzLabel]="module"></nz-option>
          }
        </nz-select>

        <nz-select
          class="feature-progress-toolbar__select"
          [ngModel]="statusFilter()"
          (ngModelChange)="statusFilterChange.emit($event)"
          nzPlaceHolder="状态"
        >
          <nz-option nzValue="" nzLabel="全部状态"></nz-option>
          @for (option of statusOptions(); track option.value) {
            <nz-option [nzValue]="option.value" [nzLabel]="option.label"></nz-option>
          }
        </nz-select>
      </app-filter-bar>

      <app-search-box
        toolbar-search
        class="feature-progress-toolbar__search"
        placeholder="搜索模块、子模块、功能点、负责人或备注"
        [value]="keyword()"
        (valueChange)="keywordChange.emit($event)"
        (submitted)="keywordChange.emit($event)"
      />
    </app-page-toolbar>
  `,
  styles: [
    `
      .feature-progress-toolbar__filters {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .feature-progress-toolbar__select {
        width: 180px;
      }

      .feature-progress-toolbar__search {
        min-width: 280px;
        max-width: 420px;
      }

      @media (max-width: 720px) {
        .feature-progress-toolbar__select,
        .feature-progress-toolbar__search {
          width: 100%;
          max-width: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectFeatureProgressToolbarComponent {
  readonly keyword = input('');
  readonly moduleFilter = input('');
  readonly statusFilter = input<ProjectFeaturePointStatus | ''>('');
  readonly moduleOptions = input<string[]>([]);
  readonly statusOptions = input<Array<{ value: ProjectFeaturePointStatus; label: string }>>([]);
  readonly canManage = input(false);

  readonly keywordChange = output<string>();
  readonly moduleFilterChange = output<string>();
  readonly statusFilterChange = output<ProjectFeaturePointStatus | ''>();
  readonly create = output<void>();
}
