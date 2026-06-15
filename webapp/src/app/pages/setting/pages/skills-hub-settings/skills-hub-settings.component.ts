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
import { UserStore } from '@app/core/stores';
import { SkillCardComponent } from './components/skill-card.component';
import { SkillDetailViewerComponent } from './components/skill-detail-viewer.component';
import { SKILL_CATEGORY_OPTIONS } from './constants/skill-hub-options';
import type { SkillDetailEntity, SkillEntity } from './models/skill-hub.model';
import { SkillHubApiService } from '../../services/skill-hub-api.service';

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
    SkillCardComponent,
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
            <div class="skill-grid-container">
              <div class="skill-grid">
                @for (item of items(); track item.id) {
                  <app-skill-card
                    [skill]="item"
                    [selected]="selected()?.id === item.id"
                    (cardClick)="openDetail($event)"
                  />
                }
              </div>
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
  styleUrls: ['./skills-hub-settings.component.less'],
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
    this.api
      .list({
        page: this.page(),
        pageSize: this.pageSize(),
        keyword: this.keyword().trim() || undefined,
        category: this.category() || undefined,
      })
      .subscribe({
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
}
