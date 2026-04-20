import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  selector: 'app-public-document-legacy-page',
  standalone: true,
  imports: [NzButtonModule, RouterLink],
  template: `
    <main class="legacy-doc">
      <section class="legacy-doc__card">
        <h1>文档链接已升级</h1>
        <!-- <p>当前链接仅包含文档标识（slug），无法唯一定位到项目文档。</p> -->
        <p>请使用新链接格式访问：<code>/public/docs/:projectKey/:slug</code></p>
        @if (slug()) {
          <p class="legacy-doc__hint">当前 slug：<code>{{ slug() }}</code></p>
        }
        <div class="legacy-doc__actions">
          <a nz-button nzType="primary" routerLink="/login">返回系统首页</a>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100dvh;
        overflow: hidden;
      }
      .legacy-doc {
        height: 100%;
        display: grid;
        place-items: center;
        background: var(--bg-page);
        padding: 16px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
      }
      .legacy-doc__card {
        width: min(680px, 100%);
        border: 1px solid var(--border-color-soft);
        border-radius: 14px;
        background: var(--surface-primary);
        padding: 24px;
        box-shadow: var(--shadow-sm);
      }
      .legacy-doc__card h1 {
        margin: 0 0 10px;
        color: var(--text-heading);
        font-size: 24px;
      }
      .legacy-doc__card p {
        margin: 8px 0;
        color: var(--text-muted);
        line-height: 1.7;
      }
      .legacy-doc__card code {
        color: var(--text-primary);
        background: var(--bg-subtle);
        padding: 2px 6px;
        border-radius: 6px;
      }
      .legacy-doc__hint {
        margin-top: 14px;
      }
      .legacy-doc__actions {
        margin-top: 16px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicDocumentLegacyPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  readonly slug = computed(() => (this.route.snapshot.paramMap.get('slug') || '').trim());

  constructor() {
    this.title.setTitle('文档链接已升级');
  }
}
