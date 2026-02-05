import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, computed, signal } from '@angular/core';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';

import { CurlActionsComponent } from './curl-actions.component';
import { ApiResponseEntity } from '@models/api-client/api-response.model';
import { SendResponse } from '@models/api-client';


@Component({
  selector: 'app-response-viewer',
  standalone: true,
  imports: [CommonModule, NzTabsModule, NzTagModule, NzSpinModule, NzAlertModule, CurlActionsComponent],
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
        <nz-tabs class="tabs" [(nzSelectedIndex)]="tabIndex">
          <nz-tab nzTitle="Body">
            <div class="pane">
              @if (isJson()) {
                <pre class="code">{{ prettyJson() }}</pre>
              } @else {
                <pre class="code">{{ response()?.bodyText }}</pre>
              }
            </div>
          </nz-tab>

          <nz-tab nzTitle="Headers">
            <div class="pane">
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

          <nz-tab nzTitle="Raw">
            <div class="pane">
              <pre class="code">{{ rawDump() }}</pre>
            </div>
          </nz-tab>
        </nz-tabs>
      }
    </div>
  `,
  styles: [`
    :host{ display:flex; height:100%; min-height:0; }
    .wrap{ display:flex; flex-direction:column; height:100%; min-height:0; width:100%; }

    .top{
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:10px 12px;
      border-bottom:1px solid #f0f0f0;
    }
    .left{ display:flex; gap:10px; align-items:center; }
    .title{ font-weight:700; }
    .meta{ font-size:12px; opacity:.65; }

    .loading{ padding:16px; }
    .empty{ padding:16px; opacity:.6; }

    .tabs{ flex:1 1 auto; min-height:0; }
    .pane{ height:100%; min-height:0; overflow:auto; padding:10px 12px; }

    .code{
      margin:0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size:12px;
      line-height:1.5;
      white-space:pre-wrap;
      word-break:break-word;
    }

    .hlist{ display:flex; flex-direction:column; gap:8px; }
    .hrow{
      display:grid;
      grid-template-columns: 200px 1fr;
      gap:10px;
      padding:8px;
      border:1px solid #f0f0f0;
      border-radius:8px;
    }
    .hk{ font-weight:600; font-size:12px; }
    .hv{ font-size:12px; opacity:.85; word-break:break-word; }
  `],
})
export class ResponseViewerComponent implements OnChanges {

  @Input() sending = false;
  @Input() result: SendResponse | null = null;

  resultSig = signal<SendResponse | null>(null);

  tabIndex = 0;

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

  isJson = computed(() => {
    const res = this.response();
    if (!res) return false;

    const ct = (res.headers?.['content-type'] ?? res.headers?.['Content-Type'] ?? '').toLowerCase();
    if (ct.includes('application/json')) return true;

    // 容错：bodyText 看起来像 JSON
    const t = (res.bodyText ?? '').trim();
    return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'));
  });

  prettyJson = computed(() => {
    const t = (this.response()?.bodyText ?? '').trim();
    try {
      const obj = JSON.parse(t);
      return JSON.stringify(obj, null, 2);
    } catch {
      return this.response()?.bodyText ?? '';
    }
  });

  rawDump = computed(() => {
    if (!this.response()) return '';
    return JSON.stringify(this.response(), null, 2);
  });
}
