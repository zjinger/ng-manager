import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';

import type { ApiRequestEntity } from '@app/models/api-request.model';

type Options = ApiRequestEntity['options'];

@Component({
  selector: 'app-advanced-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCheckboxModule,
    NzInputModule,
    NzAlertModule,
  ],
  template: `
    <div class="wrap">
      <div class="grid">
        <!-- timeout -->
        <div class="row">
          <div class="label">Timeout (ms)</div>
          <input
            nz-input
            type="number"
            min="0"
            placeholder="30000"
            [ngModel]="timeoutMs()"
            (ngModelChange)="setTimeout($event)"
          />
          <div class="desc">请求超时时间，单位毫秒（0 表示不超时）</div>
        </div>

        <!-- follow redirects -->
        <div class="row checkbox">
          <label nz-checkbox [ngModel]="followRedirects()" (ngModelChange)="setFollowRedirects($event)">
            Follow Redirects
          </label>
          <div class="desc">是否自动跟随 HTTP 重定向（302 / 301）</div>
        </div>

        <!-- insecure TLS -->
        <div class="row checkbox">
          <label nz-checkbox [ngModel]="insecureTLS()" (ngModelChange)="setInsecureTLS($event)">
            Insecure TLS
          </label>
          <div class="desc">跳过 TLS 证书校验（仅在 Node 环境下尽力支持）</div>
        </div>

        <!-- proxy -->
        <div class="row">
          <div class="label">Proxy</div>
          <input
            nz-input
            placeholder="http://127.0.0.1:7890"
            [ngModel]="proxy()"
            (ngModelChange)="setProxy($event)"
          />
          <div class="desc muted">代理地址（当前版本仅保存，不参与实际请求）</div>
        </div>

        <nz-alert
          nzType="info"
          nzShowIcon
          nzMessage="说明：Proxy 配置已保存，但当前 NodeHttpClient 尚未实现代理支持，请勿依赖该选项进行调试。"
        ></nz-alert>
      </div>
    </div>
  `,
  styles: [`
    .wrap{
      display:flex;
      flex-direction:column;
      height:100%;
      min-height:240px;
    }

    .grid{
      display:flex;
      flex-direction:column;
      gap:14px;
      padding-top:10px;
    }

    .row{
      display:grid;
      grid-template-columns: 140px 1fr;
      align-items:center;
      gap:10px;
    }

    .row.checkbox{
      grid-template-columns: 1fr;
    }

    .label{
      font-size:12px;
      opacity:.8;
    }

    .desc{
      grid-column: 2 / span 1;
      font-size:12px;
      opacity:.65;
    }

    .row.checkbox .desc{
      grid-column: 1 / span 1;
      margin-left:24px;
    }

    .muted{
      color:#999;
    }
  `],
})
export class AdvancedEditorComponent {
  @Input() options: Options | undefined;
  @Output() optionsChange = new EventEmitter<Options | undefined>();

  timeoutMs = computed(() => this.options?.timeoutMs ?? 30000);
  followRedirects = computed(() => this.options?.followRedirects ?? true);
  insecureTLS = computed(() => this.options?.insecureTLS ?? false);
  proxy = computed(() => this.options?.proxy ?? '');

  private emit(next: Options) {
    this.optionsChange.emit(next);
  }

  setTimeout(v: number) {
    const n = Number(v);
    this.emit({ ...(this.options ?? {}), timeoutMs: isNaN(n) ? undefined : n });
  }

  setFollowRedirects(v: boolean) {
    this.emit({ ...(this.options ?? {}), followRedirects: v });
  }

  setInsecureTLS(v: boolean) {
    this.emit({ ...(this.options ?? {}), insecureTLS: v });
  }

  setProxy(v: string) {
    this.emit({ ...(this.options ?? {}), proxy: v || undefined });
  }
}
