import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { FilterBarComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import type { FeatureProgressModuleOption } from '../../pages/project-feature-progress-page/models/project-feature-progress-page.model';
import type { ProjectFeaturePointStatus } from '../../models/project.model';

@Component({
  selector: 'app-project-feature-progress-toolbar',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzIconModule, NzSelectModule, FilterBarComponent, PageToolbarComponent, SearchBoxComponent],
  template: `
    <app-page-toolbar>
      @if (canManage()) {
        <div toolbar-primary class="feature-progress-toolbar__actions">
          <button nz-button type="button" (click)="excelInput.click()">
            <span nz-icon nzType="upload"></span>
            导入 Excel
          </button>
          <input
            #excelInput
            class="feature-progress-toolbar__file"
            type="file"
            accept=".xlsx,.xls"
            (change)="onExcelFileChange($event, excelInput)"
          />
        </div>
      }

      @if (canManage()) {
        <button toolbar-primary nz-button nzType="primary" (click)="create.emit()">
          <span nz-icon nzType="plus"></span>
          新增功能点
        </button>
      }

      @if (canManage()) {
        <button toolbar-primary nz-button type="button" (click)="settings.emit()">
          <span nz-icon nzType="setting"></span>
          进度设置
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
          @for (group of groupedModuleOptions(); track group.group) {
            <nz-option-group [nzLabel]="group.group">
              @for (module of group.options; track module.value) {
                <nz-option [nzValue]="module.value" [nzLabel]="module.label"></nz-option>
              }
            </nz-option-group>
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

      .feature-progress-toolbar__actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .feature-progress-toolbar__select {
        width: 180px;
      }

      .feature-progress-toolbar__search {
        min-width: 280px;
        max-width: 420px;
      }

      .feature-progress-toolbar__file {
        display: none;
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
  readonly moduleOptions = input<FeatureProgressModuleOption[]>([]);
  readonly statusOptions = input<Array<{ value: ProjectFeaturePointStatus; label: string }>>([]);
  readonly canManage = input(false);
  readonly groupedModuleOptions = computed(() => {
    const groups = new Map<string, FeatureProgressModuleOption[]>();
    for (const option of this.moduleOptions()) {
      groups.set(option.group, [...(groups.get(option.group) ?? []), option]);
    }
    return Array.from(groups.entries()).map(([group, options]) => ({ group, options }));
  });

  readonly keywordChange = output<string>();
  readonly moduleFilterChange = output<string>();
  readonly statusFilterChange = output<ProjectFeaturePointStatus | ''>();
  readonly create = output<void>();
  readonly settings = output<void>();
  readonly importExcel = output<File>();

  onExcelFileChange(event: Event, input: HTMLInputElement): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    input.value = '';
    if (file) {
      this.importExcel.emit(file);
    }
  }
}
