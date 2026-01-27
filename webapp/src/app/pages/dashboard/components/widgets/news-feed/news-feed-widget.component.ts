import { ChangeDetectorRef, Component, computed, inject, Input, OnChanges, signal, SimpleChanges } from '@angular/core';
import { DashboardItem, NewsFeedWidgetConfig, RssFeedItem } from '../../../dashboard.model';
import { WidgetBaseComponent } from '../widget-base.component';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { CommonModule } from '@angular/common';
import { NzInputModule } from 'ng-zorro-antd/input';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { DashboardLayoutService } from '@pages/dashboard/services/dashboard-layout.service';
import { RssService } from '@pages/dashboard/services/rss.service';
@Component({
  selector: 'app-news-feed-widget',
  imports: [
    CommonModule,
    FormsModule,
    NzInputModule,
    NzButtonModule,
    WidgetBaseComponent,
    NzModalModule,
    NzIconModule,
  ],
  templateUrl: './news-feed-widget.component.html',
  styleUrls: ['./news-feed-widget.component.less'],
})
export class NewsFeedWidgetComponent implements OnChanges {
  @Input() item!: DashboardItem;

  private layout = inject(DashboardLayoutService);
  private rss = inject(RssService);
  private cdr = inject(ChangeDetectorRef);

  curConfig = signal<NewsFeedWidgetConfig | null>(null);
  rssUrl = signal('');
  isModalVisible = signal(false);
  readonly loading = signal(false);

  feedTitle = signal<string>('');
  feedItems = signal<RssFeedItem[]>([]);
  errorMsg = signal<string>('');

  hasConfig = computed(() => !!this.curConfig()?.rssUrl?.trim());

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item'] && changes['item'].currentValue) {
      const cfg = this.item?.config as NewsFeedWidgetConfig | undefined;
      this.curConfig.set(cfg ? { ...cfg } : null);
      // 初始化时如果已有配置，自动拉一次
      if (cfg?.rssUrl) this.reload(false);
    }
  }
  openConfig() {
    // 回填已有配置
    const cfg = this.item?.config as NewsFeedWidgetConfig | undefined;
    this.rssUrl.set(cfg?.rssUrl ?? '');
    this.isModalVisible.set(true);
  }

  reload(force = true) {
    const cfg = this.curConfig() ?? (this.item?.config as NewsFeedWidgetConfig | undefined);
    const url = (cfg?.rssUrl ?? '').trim();
    if (!url) return;

    this.loading.set(true);
    this.errorMsg.set('');

    const limit = cfg?.limit ?? 20;
    const cacheSec = cfg?.cacheSec ?? 300;

    this.rss.preview(url, { limit, cacheSec, force }).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.feedTitle.set(data.title ?? '');
        this.feedItems.set(data.items ?? []);
        if (this.feedTitle()) {
          this.item.title = this.feedTitle();
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.detail || err?.message || '加载失败');
        this.loading.set(false);
      }
    });
  }

  save() {
    const pid = this.item.projectId;
    const rssUrl = (this.rssUrl() ?? '').trim();
    if (!pid || !rssUrl) return;

    const prev = (this.item?.config as NewsFeedWidgetConfig | undefined) ?? {};
    const next: NewsFeedWidgetConfig = {
      ...prev,
      rssUrl,
      limit: (prev as NewsFeedWidgetConfig).limit ?? 20,
      cacheSec: (prev as NewsFeedWidgetConfig).cacheSec ?? 300,
    };

    this.item.config = next;
    this.curConfig.set(next);
    this.layout.updateConfig(pid, this.item.id, next);
    this.isModalVisible.set(false);

    // 保存后立即刷新
    this.reload(true);
  }
}
