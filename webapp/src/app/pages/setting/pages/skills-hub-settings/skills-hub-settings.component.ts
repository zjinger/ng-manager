import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { UserStore } from '@app/core/stores';
import { SkillDetailViewerComponent } from './components/skill-detail-viewer.component';
import { SKILL_CATEGORY_OPTIONS } from './constants/skill-hub-options';
import type { SkillDetailEntity, SkillEntity } from './models/skill-hub.model';
import { SkillHubApiService } from './services/skill-hub-api.service';

@Component({
  selector: 'app-skills-hub-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzEmptyModule,
    NzIconModule,
    NzInputModule,
    NzPaginationModule,
    NzSelectModule,
    NzSpinModule,
    NzTagModule,
    SkillDetailViewerComponent,
  ],
  template: `
    @if (!hasPersonalToken()) {
      <div class="skill-hub-empty">
        <nz-empty
          nzNotFoundImage="simple"
          [nzNotFoundContent]="'请先配置 Hub V2 Personal Token 后再使用 Skill Hub。'"
        ></nz-empty>
      </div>
    } @else {
    <div class="skill-hub">
      <div class="skill-toolbar">
        <nz-input-group [nzPrefix]="searchPrefix" class="toolbar-search">
          <input
            nz-input
            type="text"
            placeholder="搜索名称、标签、描述"
            [ngModel]="keyword()"
            (ngModelChange)="keyword.set($event)"
            (keyup.enter)="load(true)"
          />
        </nz-input-group>
        <ng-template #searchPrefix>
          <nz-icon nzType="search" nzTheme="outline" />
        </ng-template>
        <nz-select
          class="toolbar-select"
          [ngModel]="category()"
          (ngModelChange)="setCategory($event)"
          nzAllowClear
          nzPlaceHolder="分类"
          style="width: 156px;"
        >
          @for (item of categoryOptions; track item.value) {
            <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
          }
        </nz-select>
        <button nz-button (click)="load(true)">筛选</button>
      </div>

      <nz-spin [nzSpinning]="loading()">
        @if (!loading() && items().length === 0) {
          <nz-empty
            nzNotFoundImage="simple"
            [nzNotFoundContent]="'暂无 Skill，调整筛选条件或稍后再试。'"
          ></nz-empty>
        } @else {
          <div class="skill-grid">
            @for (item of items(); track item.id) {
              <article
                class="skill-card"
                [class.is-selected]="selected()?.id === item.id"
                (click)="openDetail(item)"
              >
                <div class="skill-card-header">
                  <div class="skill-icon" [ngClass]="skillIconTone(item)">
                    <nz-icon [nzType]="skillIconType(item)" nzTheme="outline" />
                  </div>
                  <div class="skill-card-info">
                    <h3 class="skill-card-title">
                      <span class="skill-card-title-text">{{ item.name }}</span>
                      <span class="skill-stat version">{{ item.latestVersion || '未发布' }}</span>
                    </h3>
                    <div class="skill-card-author">
                      <span class="skill-card-author-avatar" [ngClass]="avatarTone(item)">{{ avatarText(item.ownerName) }}</span>
                      <span>{{ item.ownerName || '未知作者' }}</span>
                    </div>
                  </div>
                </div>
                <p class="skill-card-desc">{{ cardDescription(item) }}</p>
                <div class="skill-card-footer">
                  <div class="skill-stats">
                    <span class="skill-tag category">{{ skillCategoryLabel(item.category) }}</span>
                    @for (tag of item.tags.slice(0, 3); track tag) {
                      <span class="skill-tag">{{ tag }}</span>
                    }
                  </div>
                  <span class="skill-card-updated">更新 {{ item.updatedAt | date: 'MM-dd HH:mm' }}</span>
                </div>
              </article>
            }
          </div>

          @if (total() > 0) {
            <div class="skill-pagination">
              <nz-pagination
                [nzTotal]="total()"
                [nzPageIndex]="page()"
                [nzPageSize]="pageSize()"
                [nzPageSizeOptions]="[12, 24, 48, 96]"
                [nzShowSizeChanger]="true"
                [nzShowQuickJumper]="true"
                [nzShowTotal]="totalTpl"
                nzSize="small"
                (nzPageIndexChange)="onPageIndexChange($event)"
                (nzPageSizeChange)="onPageSizeChange($event)"
              ></nz-pagination>
              <ng-template #totalTpl let-total>共 {{ total }} 条</ng-template>
            </div>
          }
        }
      </nz-spin>
    </div>
    }

    <app-skill-detail-viewer
      [open]="detailOpen()"
      [skill]="selected()"
      (close)="closeDetail()"
      (download)="download($event.skill, $event.version)"
    />
  `,
  styles: [`
    :host { display: block; height: 100%; overflow: auto; }
    .skill-hub-empty { display: flex; align-items: center; justify-content: center; min-height: 400px; }
    .skill-hub { padding: 0 0 16px; }
    .skill-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .toolbar-search { max-width: 280px; }
    .skill-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .skill-card { padding: 18px; border: 1px solid var(--app-border-color); border-radius: 12px; background: var(--app-component-bg); cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s; }
    .skill-card:hover { border-color: var(--app-primary); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
    .skill-card.is-selected { border-color: var(--app-primary); }
    .skill-card-header { display: flex; align-items: flex-start; gap: 12px; }
    .skill-icon { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 10px; font-size: 18px; }
    .skill-card-info { flex: 1; min-width: 0; }
    .skill-card-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 15px; font-weight: 600; }
    .skill-card-title-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .skill-stat.version { font-size: 12px; color: var(--app-text-secondary); font-weight: 400; }
    .skill-card-author { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 13px; color: var(--app-text-secondary); }
    .skill-card-author-avatar { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; color: #fff; font-size: 10px; font-weight: 700; }
    .skill-card-desc { margin: 10px 0 0; font-size: 13px; color: var(--app-text-secondary); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .skill-card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
    .skill-stats { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .skill-tag { display: inline-block; padding: 1px 8px; border-radius: 4px; font-size: 12px; background: #fafafa; color: var(--app-text-secondary); }
    .skill-tag.category { background: color-mix(in srgb, var(--app-primary) 12%, transparent); color: var(--app-primary); }
    .skill-card-updated { font-size: 12px; color: var(--text-color-gray); white-space: nowrap; }
    .skill-pagination { display: flex; justify-content: flex-end; margin-top: 20px; }
    .blue { background: #eff6ff; color: #2563eb; }
    .purple { background: #f3e8ff; color: #7c3aed; }
    .green { background: #ecfdf5; color: #059669; }
    .orange { background: #fffbeb; color: #d97706; }
    .rose { background: #fff1f2; color: #e11d48; }
    .cyan { background: #ecfeff; color: #0891b2; }
    .indigo { background: #eef2ff; color: #4f46e5; }
    .a1 { background: linear-gradient(135deg, #14b8a6, #0ea5e9); }
    .a2 { background: linear-gradient(135deg, #8b5cf6, #ec4899); }
    .a3 { background: linear-gradient(135deg, #f97316, #ef4444); }
    .a4 { background: linear-gradient(135deg, #22c55e, #84cc16); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsHubSettingsComponent {
  private readonly api = inject(SkillHubApiService);
  private readonly message = inject(NzMessageService);
  private readonly userStore = inject(UserStore);

  readonly hasPersonalToken = computed(() => this.userStore.hasHubUserToken());
  readonly categoryOptions = SKILL_CATEGORY_OPTIONS;
  readonly keyword = signal('');
  readonly category = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(24);
  readonly loading = signal(false);
  readonly items = signal<SkillEntity[]>([]);
  readonly total = signal(0);
  readonly selected = signal<SkillDetailEntity | null>(null);
  readonly detailOpen = signal(false);

  constructor() {
    this.userStore.ensureHubUserTokenLoaded();
    if (this.hasPersonalToken()) {
      this.load();
    }
  }

  load(resetPage = false): void {
    if (resetPage) this.page.set(1);
    this.loading.set(true);
    this.api.list({
      page: this.page(),
      pageSize: this.pageSize(),
      keyword: this.keyword().trim() || undefined,
      category: this.category() || undefined,
    }).subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.total.set(0);
        this.loading.set(false);
      },
    });
  }

  setCategory(value: string | null): void {
    this.category.set(value || '');
    this.load(true);
  }

  onPageIndexChange(page: number): void {
    this.page.set(page);
    this.load();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.load();
  }

  openDetail(item: SkillEntity): void {
    this.api.getById(item.id).subscribe({
      next: (detail) => {
        this.selected.set(detail);
        this.detailOpen.set(true);
      },
      error: () => this.message.error('Skill 详情加载失败'),
    });
  }

  closeDetail(): void {
    this.detailOpen.set(false);
  }

  download(skill: SkillDetailEntity, version: { id: string }): void {
    this.api.download(skill.id, version.id).subscribe();
  }

  skillCategoryLabel(value: string | null | undefined): string {
    const normalized = value?.trim() || 'general';
    return SKILL_CATEGORY_OPTIONS.find((item) => item.value === normalized)?.label || normalized;
  }

  cardDescription(item: Pick<SkillEntity, 'description' | 'descriptionMd' | 'slug'>): string {
    return this.markdownSummary(item.descriptionMd) || item.description?.trim() || item.slug;
  }

  skillIconType(item: Pick<SkillEntity, 'category' | 'tags'>): string {
    const source = `${item.category} ${item.tags.join(' ')}`.toLowerCase();
    if (source.includes('api')) return 'api';
    if (source.includes('data') || source.includes('db')) return 'database';
    if (source.includes('doc') || source.includes('markdown')) return 'file-text';
    if (source.includes('image') || source.includes('img')) return 'picture';
    if (source.includes('cli') || source.includes('shell')) return 'code';
    return 'appstore';
  }

  skillIconTone(item: Pick<SkillEntity, 'id' | 'category' | 'tags'>): string {
    const source = `${item.category} ${item.tags.join(' ')}`.toLowerCase();
    if (source.includes('api')) return 'purple';
    if (source.includes('data') || source.includes('db')) return 'green';
    if (source.includes('doc') || source.includes('markdown')) return 'blue';
    if (source.includes('image') || source.includes('img')) return 'rose';
    if (source.includes('cli') || source.includes('shell')) return 'cyan';
    return ['blue', 'purple', 'green', 'orange', 'rose', 'cyan', 'indigo'][this.hashText(item.id) % 7];
  }

  avatarTone(item: Pick<SkillEntity, 'ownerUserId' | 'ownerName' | 'id'>): string {
    return `a${(this.hashText(item.ownerUserId || item.ownerName || item.id) % 4) + 1}`;
  }

  avatarText(name: string | null): string {
    const n = (name || '作者').trim();
    return n.slice(-1);
  }

  private ownerAvatarKey(item: Pick<SkillEntity, 'id' | 'ownerUserId'>): string {
    return item.ownerUserId || item.id;
  }

  private hashText(value: string): number {
    return Array.from(value || 'skill').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  }

  private markdownSummary(value: string | null | undefined): string {
    return (value || '')
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[#>*_~\-\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
