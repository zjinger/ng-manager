import { CommonModule } from '@angular/common';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import type { ReportPublicBoardSummary, ReportPublicProject } from '../../models/report.model';
import { ReportApiService } from '../../services/report-api.service';

type ProjectOption = {
  id: string;
  name: string;
  projectKey: string;
};

@Component({
  selector: 'app-report-public-settings',
  standalone: true,
  imports: [
    CommonModule,
    ClipboardModule,
    FormsModule,
    NzButtonModule,
    NzCheckboxModule,
    NzSelectModule,
    NzSpinModule,
  ],
  templateUrl: './report-public-settings.component.html',
  styleUrl: './report-public-settings.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportPublicSettingsComponent {
  private readonly api = inject(ReportApiService);
  private readonly message = inject(NzMessageService);
  private readonly clipboard = inject(Clipboard);
  private readonly destroyRef = inject(DestroyRef);

  readonly publicBoards = input<ReportPublicBoardSummary[]>([]);
  readonly boardsLoading = input(false);
  readonly boardActionId = input<string | null>(null);

  readonly refreshBoards = output<void>();
  readonly copyBoardLink = output<string>();
  readonly invalidateBoard = output<string>();
  readonly deleteBoard = output<string>();

  readonly loading = signal(false);
  readonly addingProject = signal(false);
  readonly selectedProjectId = signal('');
  readonly allowAllProjects = signal(false);
  readonly projectOptions = signal<ProjectOption[]>([]);
  readonly publicProjects = signal<ReportPublicProject[]>([]);
  readonly copyingProjectId = signal<string | null>(null);
  readonly regeneratingProjectId = signal<string | null>(null);
  readonly removingProjectId = signal<string | null>(null);

  readonly availableProjectOptions = computed(() => {
    const usedIds = new Set(this.publicProjects().map((item) => item.projectId));
    return this.projectOptions().filter((item) => !usedIds.has(item.id));
  });

  readonly canAdd = computed(() => {
    return !!this.selectedProjectId().trim() && !this.addingProject();
  });
  readonly hasPublicProject = computed(() => this.publicProjects().length > 0);

  constructor() {
    this.loadAll();
  }

  addProject(): void {
    const projectId = this.selectedProjectId().trim();
    if (!projectId || this.addingProject()) {
      return;
    }
    this.addingProject.set(true);
    this.api
      .addReportPublicProject({
        projectId,
        allowAllProjects: this.allowAllProjects(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entity) => {
          this.addingProject.set(false);
          this.publicProjects.update((items) => {
            const next = items.filter((item) => item.id !== entity.id);
            return [entity, ...next];
          });
          this.selectedProjectId.set('');
          this.allowAllProjects.set(false);
          this.message.success('已加入公开项目');
        },
        error: (error: { error?: { message?: string } }) => {
          this.addingProject.set(false);
          this.message.error(error?.error?.message || '加入公开项目失败');
        },
      });
  }

  copyShareLink(project: ReportPublicProject): void {
    const link = this.buildShareLink(project.shareToken);
    this.copyingProjectId.set(project.id);
    const ok = this.clipboard.copy(link);
    this.copyingProjectId.set(null);
    if (ok) {
      this.message.success('分享链接已复制');
    } else {
      this.message.error('复制失败，请手动复制');
    }
  }

  regenerateLink(project: ReportPublicProject): void {
    if (this.regeneratingProjectId() === project.id) {
      return;
    }
    this.regeneratingProjectId.set(project.id);
    this.api
      .regenerateReportPublicLink(project.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entity) => {
          this.regeneratingProjectId.set(null);
          this.publicProjects.update((items) => items.map((item) => (item.id === entity.id ? entity : item)));
          this.message.success('分享链接已重置');
        },
        error: (error: { error?: { message?: string } }) => {
          this.regeneratingProjectId.set(null);
          this.message.error(error?.error?.message || '重置分享链接失败');
        },
      });
  }

  removeProject(project: ReportPublicProject): void {
    if (this.removingProjectId() === project.id) {
      return;
    }
    this.removingProjectId.set(project.id);
    this.api
      .removeReportPublicProject(project.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.removingProjectId.set(null);
          this.publicProjects.update((items) => items.filter((item) => item.id !== project.id));
          this.message.success('已移除公开项目');
        },
        error: (error: { error?: { message?: string } }) => {
          this.removingProjectId.set(null);
          this.message.error(error?.error?.message || '移除公开项目失败');
        },
      });
  }

  private loadAll(): void {
    this.loading.set(true);

    forkJoin({
      projects: this.api.listReportPublicProjects(),
      options: this.api.listAccessibleProjects(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ projects, options }) => {
          this.loading.set(false);
          this.publicProjects.set(projects.items || []);
          this.projectOptions.set(options.items || []);
          const firstAvailable = (options.items || []).find(
            (item) => !(projects.items || []).some((publicItem) => publicItem.projectId === item.id),
          );
          this.selectedProjectId.set(firstAvailable?.id || '');
        },
        error: (error: { error?: { message?: string } }) => {
          this.loading.set(false);
          this.message.error(error?.error?.message || '加载公开访问设置失败');
        },
      });
  }

  protected buildShareLink(shareToken: string): string {
    return `${window.location.origin}/public/report?share=${encodeURIComponent(shareToken)}`;
  }
}
