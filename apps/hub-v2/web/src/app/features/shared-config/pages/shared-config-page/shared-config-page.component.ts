import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ProjectContextStore } from '@core/state';
import { FilterBarComponent, ListStateComponent, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';

import { ConfigListComponent } from '../../components/config-list.component';
import { ConfigFormDialogComponent } from '../../dialogs/config-form-dialog.component';
import type {
  CreateSharedConfigInput,
  SharedConfigEntity,
  SharedConfigScope,
  SharedConfigStatus,
} from '../../models/shared-config.model';
import { SharedConfigStore } from '../../store/shared-config.store';

@Component({
  selector: 'app-shared-config-page',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzSelectModule,
    PageHeaderComponent,
    PageToolbarComponent,
    SearchBoxComponent,
    FilterBarComponent,
    ListStateComponent,
    ConfigListComponent,
    ConfigFormDialogComponent,
  ],
  providers: [SharedConfigStore],
  template: `
    <app-page-header title="共享配置" [subtitle]="subtitle()" />

    <app-page-toolbar>
      <button toolbar-primary nz-button nzType="primary" class="toolbar__create" (click)="openCreate()">新建配置</button>

      <app-filter-bar toolbar-filters class="toolbar__filters">
        <nz-select class="toolbar__select" [ngModel]="status()" (ngModelChange)="status.set($event)">
          <nz-option nzLabel="全部状态" nzValue=""></nz-option>
          <nz-option nzLabel="启用" nzValue="active"></nz-option>
          <nz-option nzLabel="停用" nzValue="inactive"></nz-option>
        </nz-select>

        <nz-select class="toolbar__select" [ngModel]="scope()" (ngModelChange)="scope.set($event)">
          <nz-option nzLabel="全部范围" nzValue=""></nz-option>
          <nz-option nzLabel="项目" nzValue="project"></nz-option>
          <nz-option nzLabel="全局" nzValue="global"></nz-option>
        </nz-select>

        <button nz-button class="toolbar__filter-btn" (click)="applyFilters()">筛选</button>
      </app-filter-bar>

      <app-search-box
        toolbar-search
        placeholder="搜索配置名称或 Key"
        [value]="keyword()"
        (valueChange)="keyword.set($event)"
        (submitted)="applyFilters()"
      />
    </app-page-toolbar>

    <app-list-state
      [loading]="store.loading()"
      [empty]="store.items().length === 0"
      loadingText="正在加载共享配置…"
      emptyTitle="当前没有共享配置"
      emptyDescription="先创建一批用于测试的项目配置。"
    >
      <app-config-list [items]="store.items()" (edit)="openEdit($event)" />
    </app-list-state>

    <app-config-form-dialog
      [open]="dialogOpen()"
      [busy]="store.busy()"
      [value]="editing()"
      (cancel)="closeDialog()"
      (create)="submit($event)"
    />
  `,
  styles: [
    `
      .toolbar__filters {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      @media (max-width: 768px) {
        .toolbar__create,
        .toolbar__select,
        .toolbar__filter-btn {
          width: 100%;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedConfigPageComponent {
  readonly store = inject(SharedConfigStore);
  private readonly projectContext = inject(ProjectContextStore);

  readonly keyword = signal('');
  readonly status = signal<SharedConfigStatus>('');
  readonly scope = signal<SharedConfigScope | ''>('');
  readonly dialogOpen = signal(false);
  readonly editing = signal<SharedConfigEntity | null>(null);

  readonly subtitle = computed(() => {
    const projectName = this.projectContext.currentProject()?.name ?? '当前项目';
    return `${projectName} · ${this.store.total()} 条配置`;
  });

  constructor() {
    this.store.initialize();
    effect(() => {
      this.store.refreshForProject(this.projectContext.currentProjectId());
    });
  }

  applyFilters(): void {
    this.store.updateQuery({
      keyword: this.keyword().trim(),
      status: this.status(),
      scope: this.scope(),
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(item: SharedConfigEntity): void {
    this.editing.set(item);
    this.dialogOpen.set(true);
  }

  submit(input: CreateSharedConfigInput): void {
    const editing = this.editing();
    if (editing) {
      this.store.update(
        editing.id,
        {
          ...input,
          projectId: this.projectContext.currentProjectId(),
        },
        () => this.closeDialog(),
      );
      return;
    }

    this.store.create(
      {
        ...input,
        projectId: this.projectContext.currentProjectId(),
      },
      () => this.closeDialog(),
    );
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
  }
}
