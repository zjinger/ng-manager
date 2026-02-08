import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type { ApiHttpMethod } from '@models/api-client';
import { collectMissingFromStrings } from '@pages/api-client/utils';
import { NzTagModule } from 'ng-zorro-antd/tag';

@Component({
  selector: 'app-request-urlbar',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzSelectModule, NzTagModule],
  template: `
    <div class="bar">
      <nz-select class="method" [ngModel]="method" (ngModelChange)="methodChange.emit($event)">
        @for (m of methods; track m) {
          <nz-option [nzValue]="m" [nzLabel]="m"></nz-option>
        }
      </nz-select>

      <input
        nz-input
        class="url"
        placeholder="http://..."
        [ngModel]="draftUrl"
        (ngModelChange)="onDraftChange($event)"
        (blur)="commit()"
        (keydown.enter)="commit()"
      />

      <button nz-button nzType="primary" [nzLoading]="sending" (click)="send.emit()">发送</button>
      <button nz-button nzType="default" (click)="save.emit()">保存</button>
    </div>
    @if (missingVars().length) {
      <div class="var-hint">
        <nz-tag nzColor="warning">
          未解析变量：{{ missingVars().join(', ') }}
        </nz-tag>
        <a (click)="openEnv()">去配置</a>
      </div>
    }
  `,
  styles: [`
    .bar{
      display:flex;
      gap:10px;
      padding:10px;
      border-bottom:1px solid #f0f0f0;
      align-items:center;
    }
    .method{ width:120px; }
    .url{ flex:1 1 auto; }
    .var-hint{
      padding: 4px 10px 8px;
      font-size: 12px;
      display: flex;
      gap: 8px;
      align-items: center;
    }
  `],
})
export class RequestUrlbarComponent implements OnChanges {
  @Input() envVars: Record<string, string> = {};
  @Input() openEnv!: () => void; // 点击提示时打开 Env 管理
  @Input() method: ApiHttpMethod = 'GET';
  @Input() url = '';
  @Input() sending = false;

  // env meta
  @Input() envName: string | null = null;
  @Input() baseUrl: string | null = null;

  @Output() methodChange = new EventEmitter<ApiHttpMethod>();
  /** 输入过程中（debounce）持续更新 url（只改文本，不同步 path params） */
  @Output() urlChange = new EventEmitter<string>();
  /** 用户确认（blur/enter）后的提交：用于同步 path params */
  @Output() urlCommit = new EventEmitter<string>();
  @Output() send = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  methods: ApiHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  missingVars = computed(() => collectMissingFromStrings([this.draftUrl], this.envVars));


  draftUrl = '';
  private t?: number;

  ngOnChanges(changes: SimpleChanges) {
    // 外部 url 变化时（切换 request / replay history / reset），同步到 draft
    if (changes['url']) {
      this.draftUrl = this.url ?? '';
    }
  }

  onDraftChange(v: string) {
    this.draftUrl = v ?? '';
    // debounce 发 urlChange，避免每键都 patch store
    if (this.t) window.clearTimeout(this.t);
    this.t = window.setTimeout(() => {
      this.urlChange.emit(this.draftUrl);
    }, 250);
  }

  commit() {
    // 先把最后一次输入也 push 掉（避免 blur 时 draft 未下发）
    if (this.t) {
      window.clearTimeout(this.t);
      this.t = undefined;
    }
    this.urlChange.emit(this.draftUrl);
    this.urlCommit.emit(this.draftUrl);
  }

  placeholder = computed(() => {
    // 有 baseUrl 时引导用户写相对路径
    return this.baseUrl ? '/path (相对路径，将拼接 Base URL)' : 'https://... 或 /path';
  });

  previewUrl = computed(() => {
    const raw = (this.url ?? '').trim();
    if (!raw) return '';

    // absolute url → 不展示 preview（本身就是最终）
    if (isAbsoluteUrl(raw)) return '';

    // relative url + baseUrl → 展示 resolved
    const base = (this.baseUrl ?? '').trim();
    if (!base) return '';

    try {
      return new URL(raw, base).toString();
    } catch {
      return '';
    }
  });
}

function isAbsoluteUrl(u: string) {
  return /^https?:\/\//i.test(u);
}