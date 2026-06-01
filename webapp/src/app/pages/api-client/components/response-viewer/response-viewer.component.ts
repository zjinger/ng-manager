import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  signal,
  ElementRef,
  ViewChild,
  viewChild,
  inject,
} from '@angular/core';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';

import { CurlActionsComponent } from './curl-actions.component';
import { ApiResponseEntity } from '@models/api-client/api-response.model';
import { SendResponse } from '@models/api-client';
import { ResponseBodyViewerComponent } from './response-body-viewer/response-body-viewer.component';
import { formatBytes } from '@app/utils/file.utils';
import { JsonViewerComponent } from '@app/shared/components/json-viewer';
import { TextSearchComponent } from './text-search/text-search.component';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-response-viewer',
  standalone: true,
  imports: [
    CommonModule,
    NzTabsModule,
    NzTagModule,
    NzSpinModule,
    NzAlertModule,
    NzButtonModule,
    NzIconModule,
    NzTooltipModule,
    CurlActionsComponent,
    ResponseBodyViewerComponent,
    JsonViewerComponent,
    TextSearchComponent,
  ],
  template: `
    <div class="wrap">
      <div class="top">
        <div class="left">
          <div class="title">Response</div>

          @if (response()) {
            <nz-tag [nzColor]="statusColor()">
              {{ response()?.status }} {{ response()?.statusText || '' }}
            </nz-tag>

            <span class="meta">{{ response()?.bodySize }} bytes</span>
          } @else {
            <span class="meta">-</span>
          }
        </div>

        <div class="right">
          <app-curl-actions [curl]="curl()"></app-curl-actions>
        </div>
      </div>

      @if (sending) {
        <div class="loading">
          <nz-spin></nz-spin>
        </div>
      } @else if (error()) {
        <nz-alert nzType="error" nzShowIcon [nzMessage]="error()"></nz-alert>
      } @else if (!response()) {
        <div class="empty">发送请求后在此查看响应</div>
      } @else {
        <nz-tabs class="tabs" [(nzSelectedIndex)]="tabIndex" [nzTabBarExtraContent]="extraTemplate">
          <nz-tab nzTitle="Body" [nzForceRender]="true">
            <div class="pane" #bodyPane>
              <!-- @if (isJson()) {
                <pre class="code">{{ prettyJson() }}</pre>
              } @else {
                <pre class="code">{{ response()?.bodyText }}</pre>
              } -->
              <app-response-body-viewer [response]="response()"></app-response-body-viewer>
            </div>
          </nz-tab>

          <nz-tab nzTitle="Headers" [nzForceRender]="true">
            <div class="pane" #headersPane>
              <div class="hlist">
                @for (k of headerKeys(); track k) {
                  <div class="hrow">
                    <div class="hk">{{ k }}</div>
                    <div class="hv">{{ response()?.headers?.[k] }}</div>
                  </div>
                }
              </div>
            </div>
          </nz-tab>

          <nz-tab nzTitle="Raw" [nzForceRender]="true">
            <div class="pane" #rawPane>
              <!-- <pre class="code">{{ rawDump() }}</pre> -->
              <app-json-viewer [json]="rawDump()" />
            </div>
          </nz-tab>
        </nz-tabs>
        <ng-template #extraTemplate>
          <button nz-button nzType="text" nz-tooltip nzTooltipTitle="copy body" (click)="copyBody()">
            <span nz-icon nzType="copy"></span>
          </button>
          <span class="sep"></span>
          <app-text-search [searchContainer]="currentTabPane()"></app-text-search>
        </ng-template>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        height: 100%;
        min-height: 0;
      }
      .wrap {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        width: 100%;
      }

      .top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        border-bottom: 1px solid #f0f0f0;
      }
      .left {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .title {
        font-weight: 700;
      }
      .meta {
        font-size: 12px;
        opacity: 0.65;
      }

      .loading {
        padding: 16px;
      }
      .empty {
        padding: 16px;
        opacity: 0.6;
      }

      .tabs {
        flex: 1 1 auto;
        min-height: 0;
      }
      .pane {
        height: 100%;
        min-height: 0;
        overflow: auto;
        padding: 10px 12px;
      }

      .code {
        margin: 0;
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
          monospace;
        font-size: 12px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .hlist {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .hrow {
        display: grid;
        grid-template-columns: 200px 1fr;
        gap: 10px;
        padding: 8px;
        border: 1px solid #f0f0f0;
        border-radius: 8px;
      }
      .hk {
        font-weight: 600;
        font-size: 12px;
      }
      .hv {
        font-size: 12px;
        opacity: 0.85;
        word-break: break-word;
      }

      /* Tabs 容器需要相对定位以支持搜索框定位 */
      .tabs {
        position: relative;
      }

      /* 确保 tab bar 有足够空间显示搜索组件 */
      :host ::ng-deep .ant-tabs-nav {
        display: flex;
        align-items: center;
      }

      :host ::ng-deep .ant-tabs-extra-content {
        flex: 1;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 4px;
      }

      .sep {
        width: 1px;
        height: 16px;
        background: #d9d9d9;
        margin: 0 4px;
        flex-shrink: 0;
      }
    `,
  ],
})
export class ResponseViewerComponent implements OnChanges {
  private readonly msg = inject(NzMessageService);
  @Input() sending = false;
  @Input() result: SendResponse | null = null;
  @Input() activedTabId: string | null = null;

  readonly bodyPaneRef = viewChild<ElementRef<HTMLElement>>('bodyPane');
  readonly headersPaneRef = viewChild<ElementRef<HTMLElement>>('headersPane');
  readonly rawPaneRef = viewChild<ElementRef<HTMLElement>>('rawPane');

  resultSig = signal<SendResponse | null>(null);

  tabIndex = signal(0);

  // 当前激活的 tab pane
  currentTabPane = computed(() => {
    // 根据 tabIndex 返回对应的 pane 元素
    switch (this.tabIndex()) {
      case 0:
        return this.bodyPaneRef()?.nativeElement ?? null;
      case 1:
        return this.headersPaneRef()?.nativeElement ?? null;
      case 2:
        return this.rawPaneRef()?.nativeElement ?? null;
      default:
        return null;
    }
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['result']) {
      const r = changes['result'].currentValue as SendResponse | null;
      this.resultSig.set(r);
    }
  }

  error = computed(() => {
    const res = this.resultSig();
    if (!res) return null;
    return res.error ? res.error.message : null;
  });

  curl = computed(() => {
    const res = this.resultSig();
    if (!res) return null;
    return res.curl ? res.curl : null;
  });

  response = computed(() => {
    const res = this.resultSig();
    if (!res) return null;
    return res.response;
  });

  headerKeys = computed(() => {
    const h = this.response()?.headers ?? {};
    return Object.keys(h).sort((a, b) => a.localeCompare(b));
  });

  statusColor = computed(() => {
    const s = this.response()?.status ?? 0;
    if (!s) return 'default';
    if (s >= 200 && s < 300) return 'green';
    if (s >= 300 && s < 400) return 'blue';
    if (s >= 400 && s < 500) return 'orange';
    return 'red';
  });

  rawDump = computed(() => {
    const res = this.response();
    if (!res) return '';

    // 避免直接修改原对象
    const { bodyBase64, ...rest } = res;

    // 防止深拷贝base64
    return JSON.stringify(
      {
        ...rest,
        bodyBase64: bodyBase64
          ? `[base64 content omitted: ${formatBytes(res.bodySize ?? 0)}]`
          : undefined,
      },
      null,
      2,
    );
  });

  copyBody() {
    const text = this.response()?.bodyText ?? '';
    if (!text) {
      this.msg.warning('响应体为空，无内容可复制');
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => this.msg.success('已复制到剪贴板'),
      () => this.msg.error('复制失败'),
    );
  }
}
