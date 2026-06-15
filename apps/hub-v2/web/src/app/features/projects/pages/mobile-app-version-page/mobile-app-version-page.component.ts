import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

import { ListStateComponent, PageHeaderComponent } from '@shared/ui';
import { ProjectContextStore } from '@core/state';
import type {
  MobileAppVersion,
  MobileAppVersionStats,
  MobileAppReleaseRecord,
  MobileAppVersionStatus,
  MobileAppPlatformType,
  CreateMobileAppVersionInput,
  UpdateMobileAppVersionInput,
} from '../../models/mobile-app-version.model';
import { MobileAppVersionApiService } from '../../services/mobile-app-version-api.service';
import { MobileAppVersionStatsComponent } from '../../components/mobile-app-version-stats/mobile-app-version-stats.component';
import { MobileAppVersionToolbarComponent } from '../../components/mobile-app-version-toolbar/mobile-app-version-toolbar.component';
import { MobileAppVersionTableComponent } from '../../components/mobile-app-version-table/mobile-app-version-table.component';
import { MobileAppReleaseTimelineComponent } from '../../components/mobile-app-release-timeline/mobile-app-release-timeline.component';
import { MobileAppVersionDetailDrawerComponent } from '../../components/mobile-app-version-detail-drawer/mobile-app-version-detail-drawer.component';
import { MobileAppVersionFormDialogComponent } from '../../components/mobile-app-version-form-dialog/mobile-app-version-form-dialog.component';

@Component({
  selector: 'app-mobile-app-version-page',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzTabsModule,
    ListStateComponent,
    PageHeaderComponent,
    MobileAppVersionStatsComponent,
    MobileAppVersionToolbarComponent,
    MobileAppVersionTableComponent,
    MobileAppReleaseTimelineComponent,
    MobileAppVersionDetailDrawerComponent,
    MobileAppVersionFormDialogComponent,
  ],
  template: `
    <app-page-header title="版本管理" [subtitle]="subtitle()">
      <div class="page-actions">
        <button nz-button (click)="reload()" [disabled]="loading()">
          <nz-icon nzType="reload" nzTheme="outline" />
          刷新
        </button>
      </div>
    </app-page-header>

    @if (!projectId()) {
      <app-list-state
        [empty]="true"
        emptyTitle="请先选择项目"
        emptyDescription="选择项目后再管理移动端 APP 版本。"
      />
    } @else {
      <app-list-state [loading]="loading()" [empty]="false" loadingText="正在加载版本数据…">
        @if (error()) {
          <section class="state-card state-card--error">
            <h2>版本数据加载失败</h2>
            <p>{{ error() }}</p>
            <button nz-button nzType="primary" (click)="reload()">重新加载</button>
          </section>
        } @else {
          <app-mobile-app-version-stats [stats]="stats()" />

          <nz-tabs [(nzSelectedIndex)]="activeTab" class="version-tabs">
            <nz-tab nzTitle="版本列表">
              <app-mobile-app-version-toolbar
                [keyword]="keywordInput()"
                [statusFilter]="statusFilter()"
                [platformFilter]="platformFilter()"
                (keywordChange)="setKeywordInput($event)"
                (statusFilterChange)="statusFilter.set($event)"
                (platformFilterChange)="platformFilter.set($event)"
                (create)="openCreateDialog()"
              />

              <app-mobile-app-version-table
                [versions]="filteredVersions()"
                (viewDetail)="openDetailDrawer($event)"
                (edit)="openEditDialog($event)"
                (archive)="archiveVersion($event)"
                (delete)="deleteVersion($event)"
              />
            </nz-tab>
            <nz-tab nzTitle="发布记录">
              <div class="release-tab">
                <app-mobile-app-release-timeline
                  [records]="releaseRecords()"
                  (viewDetail)="viewReleaseDetail($event)"
                />
              </div>
            </nz-tab>
          </nz-tabs>

          <app-mobile-app-version-detail-drawer
            [open]="detailDrawerOpen()"
            [version]="selectedVersion()"
            (close)="closeDetailDrawer()"
            (edit)="openEditDialog($event)"
            (archive)="archiveVersion($event)"
            (publish)="publishVersion($event)"
          />

          <app-mobile-app-version-form-dialog
            [open]="formDialogOpen()"
            [editVersion]="editingVersion()"
            (close)="closeFormDialog()"
            (create)="createVersion($event)"
            (update)="updateVersion($event)"
          />
        }
      </app-list-state>
    }
  `,
  styles: [
    `
      .page-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .state-card {
        padding: 24px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        background: var(--bg-container);
      }

      .state-card--error {
        border-color: var(--color-danger-light);
      }

      .state-card h2 {
        margin: 0;
        color: var(--text-heading);
        font-size: 16px;
      }

      .state-card p {
        margin: 6px 0 14px;
        color: var(--text-muted);
      }

      .version-tabs {
        margin-top: 4px;
      }

      .release-tab {
        padding-top: 16px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileAppVersionPageComponent {
  private readonly projectContext = inject(ProjectContextStore);
  private readonly api = inject(MobileAppVersionApiService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly stats = signal<MobileAppVersionStats | null>(null);
  readonly versions = signal<MobileAppVersion[]>([]);
  readonly releaseRecords = signal<MobileAppReleaseRecord[]>([]);

  readonly keywordInput = signal('');
  readonly keyword = signal('');
  readonly statusFilter = signal<MobileAppVersionStatus | ''>('');
  readonly platformFilter = signal<MobileAppPlatformType | ''>('');
  readonly activeTab = signal(0);

  readonly detailDrawerOpen = signal(false);
  readonly selectedVersion = signal<MobileAppVersion | null>(null);

  readonly formDialogOpen = signal(false);
  readonly editingVersion = signal<MobileAppVersion | null>(null);

  readonly projectId = computed(() => this.projectContext.currentProjectId());
  readonly subtitle = computed(() => this.projectContext.currentProject()?.name || '请先选择项目');

  readonly filteredVersions = computed(() => {
    let result = this.versions();
    const keyword = this.keyword().trim().toLowerCase();
    const statusFilter = this.statusFilter();
    const platformFilter = this.platformFilter();

    if (keyword) {
      result = result.filter(
        (v) =>
          v.version.toLowerCase().includes(keyword) ||
          v.buildNumber.toLowerCase().includes(keyword) ||
          v.packageName.toLowerCase().includes(keyword)
      );
    }

    if (statusFilter) {
      result = result.filter((v) => v.status === statusFilter);
    }

    if (platformFilter) {
      result = result.filter((v) => v.platform === platformFilter);
    }

    return result;
  });

  private keywordTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const projectId = this.projectId();
      this.resetState();
      this.loadData(projectId);
    });

    this.destroyRef.onDestroy(() => {
      if (this.keywordTimer) {
        clearTimeout(this.keywordTimer);
      }
    });
  }

  reload(): void {
    this.loadData(this.projectId());
  }

  setKeywordInput(value: string): void {
    this.keywordInput.set(value);
    if (this.keywordTimer) {
      clearTimeout(this.keywordTimer);
    }
    this.keywordTimer = setTimeout(() => {
      this.keyword.set(value);
      this.keywordTimer = null;
    }, 300);
  }

  openDetailDrawer(version: MobileAppVersion): void {
    this.selectedVersion.set(version);
    this.detailDrawerOpen.set(true);
  }

  closeDetailDrawer(): void {
    this.detailDrawerOpen.set(false);
    this.selectedVersion.set(null);
  }

  openCreateDialog(): void {
    this.editingVersion.set(null);
    this.formDialogOpen.set(true);
  }

  openEditDialog(version: MobileAppVersion): void {
    this.closeDetailDrawer();
    this.editingVersion.set(version);
    this.formDialogOpen.set(true);
  }

  closeFormDialog(): void {
    this.formDialogOpen.set(false);
    this.editingVersion.set(null);
  }

  createVersion(input: CreateMobileAppVersionInput): void {
    this.api
      .createVersion(input)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (version) => {
          this.message.success('版本已创建');
          this.closeFormDialog();
          this.reload();
        },
        error: () => {
          this.message.error('创建版本失败');
        },
      });
  }

  updateVersion(event: { id: string; input: UpdateMobileAppVersionInput }): void {
    this.api
      .updateVersion(event.id, event.input)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (version) => {
          if (version) {
            this.message.success('版本已更新');
            this.closeFormDialog();
            this.reload();
          }
        },
        error: () => {
          this.message.error('更新版本失败');
        },
      });
  }

  archiveVersion(version: MobileAppVersion): void {
    this.api
      .updateVersion(version.id, { status: 'archived' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          if (updated) {
            this.message.success('版本已归档');
            this.closeDetailDrawer();
            this.reload();
          }
        },
        error: () => {
          this.message.error('归档版本失败');
        },
      });
  }

  deleteVersion(version: MobileAppVersion): void {
    this.api
      .deleteVersion(version.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (success) => {
          if (success) {
            this.message.success('版本已删除');
            this.closeDetailDrawer();
            this.reload();
          }
        },
        error: () => {
          this.message.error('删除版本失败');
        },
      });
  }

  publishVersion(version: MobileAppVersion): void {
    this.api
      .updateVersion(version.id, { status: 'published' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          if (updated) {
            this.message.success('版本已发布到门户');
            this.closeDetailDrawer();
            this.reload();
          }
        },
        error: () => {
          this.message.error('发布版本失败');
        },
      });
  }

  viewReleaseDetail(record: MobileAppReleaseRecord): void {
    const version = this.versions().find((v) => v.id === record.id);
    if (version) {
      this.openDetailDrawer(version);
    }
  }

  private loadData(projectId: string | null): void {
    if (!projectId) {
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.api
      .listVersions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (versions) => {
          this.versions.set(versions);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err instanceof Error ? err.message : '加载失败，请稍后重试');
          this.loading.set(false);
        },
      });

    this.api
      .getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => this.stats.set(stats),
        error: () => {},
      });

    this.api
      .getReleaseRecords()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (records) => this.releaseRecords.set(records),
        error: () => {},
      });
  }

  private resetState(): void {
    this.versions.set([]);
    this.stats.set(null);
    this.releaseRecords.set([]);
    this.keywordInput.set('');
    this.keyword.set('');
    this.statusFilter.set('');
    this.platformFilter.set('');
    this.activeTab.set(0);
    this.closeDetailDrawer();
    this.closeFormDialog();
  }
}
