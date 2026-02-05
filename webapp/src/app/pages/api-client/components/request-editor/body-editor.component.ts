import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type { ApiRequestEntityBody, ApiRequestEntityBodyMode, ApiRequestKvRow } from '@models/api-client/api-request.model';
import { KvTableComponent } from './kv-table.component';
import { uniqueId } from 'lodash';


@Component({
  selector: 'app-body-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzSelectModule, KvTableComponent],
  template: `
    <div class="wrap">
      <div class="bar">
        <nz-select class="mode" [ngModel]="mode()" (ngModelChange)="setMode($event)">
          @for (m of modes; track m) {
            <nz-option [nzValue]="m" [nzLabel]="m"></nz-option>
          }
        </nz-select>

        <input
          nz-input
          class="ctype"
          placeholder="content-type（可选）"
          [ngModel]="contentType()"
          (ngModelChange)="setContentType($event)"
        />

        @if(mode()==='json'){
          <button nz-button nzType="default" (click)="formatJson()">格式化 JSON</button>
        }
      </div>

      <div class="main">
        @switch (mode()) {
          @case ('none') {
            <div class="empty">无 Body</div>
          }
          @case ('text') {
            <textarea
              nz-input
              class="ta"
              placeholder="文本内容"
              [ngModel]="textBody()"
              (ngModelChange)="setTextBody($event)"
            ></textarea>
          }
          @case ('json') {
            <textarea
              nz-input
              class="ta"
              placeholder="{ }"
              [ngModel]="jsonText()"
              (ngModelChange)="setJsonText($event)"
            ></textarea>
            @if(jsonError()){
              <div class="err">{{jsonError()}}</div>
            }
          }
          @case ('urlencoded') {
            <app-kv-table
              [rows]="urlRows()"
              (rowsChange)="setUrlRows($event)"
              keyLabel="Key"
              valueLabel="Value"
              keyPlaceholder="a"
              valuePlaceholder="1"
            />
          }
          @default {
            <div class="empty">MVP 仅支持 none/json/text/urlencoded</div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .wrap{ display:flex; flex-direction:column; height:100%; min-height:260px; }
    .bar{
      display:flex; gap:10px; align-items:center;
      padding:8px 0; border-bottom:1px solid #f0f0f0;
    }
    .mode{ width:140px; }
    .ctype{ flex:1 1 auto; }
    .main{ flex:1 1 auto; overflow:auto; padding-top:10px; }
    .ta{ width:100%; height:100%; min-height:240px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size:12px; }
    .empty{ padding:12px; opacity:.7; }
    .err{ margin-top:8px; color:#a8071a; font-size:12px; }
  `],
})
export class BodyEditorComponent implements OnChanges {

  private msg = inject(NzMessageService);

  @Input() body: ApiRequestEntityBody | undefined;
  @Output() bodyChange = new EventEmitter<ApiRequestEntityBody | undefined>();
  //用 signal 承载输入
  private bodySig = signal<ApiRequestEntityBody | undefined>(undefined);

  modes: Array<ApiRequestEntityBodyMode> = ['none', 'json', 'text', 'urlencoded', 'form', 'binary'];

  // local json text buffer（避免用户输入过程中频繁 JSON.parse 崩）
  private _jsonText = signal('');

  mode = computed(() => (this.bodySig()?.mode ?? 'none') as ApiRequestEntityBodyMode);
  contentType = computed(() => this.bodySig()?.contentType ?? '');

  jsonText = computed(() => {
    if (this.mode() !== 'json') return '';
    // 如果外部 content 是 object，优先 stringify；如果是 string，用 string
    const c = this.body?.content;
    if (typeof c === 'string') return c;
    if (c == null) return this._jsonText() || '';
    try { return JSON.stringify(c, null, 2); } catch { return this._jsonText() || ''; }
  });

  jsonError = signal<string>('');

  textBody = computed(() => (this.body?.mode === 'text' ? String(this.body?.content ?? '') : ''));

  urlRows = computed<ApiRequestKvRow[]>(() => {
    if (this.body?.mode !== 'urlencoded') return [];
    const c = this.body?.content;
    // 约定：urlencoded content 用 Record<string,string>
    if (!c || typeof c !== 'object' || Array.isArray(c)) return [];
    return Object.entries(c).map(([k, v]) => ({ key: k, value: String(v ?? ''), enabled: true, id: uniqueId() }));
  });

  setMode(m: ApiRequestEntityBodyMode) {
    // 切换 mode 时给一个合理的默认 contentType（只在未填写时）
    const prev = this.body;
    const next: any = { ...(prev ?? {}), mode: m };

    if (!next.contentType) {
      if (m === 'json') next.contentType = 'application/json; charset=utf-8';
      if (m === 'text') next.contentType = 'text/plain; charset=utf-8';
      if (m === 'urlencoded') next.contentType = 'application/x-www-form-urlencoded; charset=utf-8';
      if (m === 'none') next.contentType = undefined;
    }

    if (m === 'none') {
      this.bodyChange.emit({ mode: 'none' } as any);
      return;
    }

    // 初始化 content
    if (m === 'json' && (prev?.mode !== 'json')) next.content = {};
    if (m === 'text' && (prev?.mode !== 'text')) next.content = '';
    if (m === 'urlencoded' && (prev?.mode !== 'urlencoded')) next.content = {};

    this.bodyChange.emit(next);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['body']) {
      const b = changes['body'].currentValue as ApiRequestEntityBody | undefined;
      this.bodySig.set(b);
      if (b?.mode === 'json') {
        if (typeof b.content === 'string') this._jsonText.set(b.content);
        else this._jsonText.set(b.content ? JSON.stringify(b.content, null, 2) : '');
        this.jsonError.set('');
      }
    }
  }

  setContentType(v: string) {
    const m = this.mode();
    const next: any = { ...(this.body ?? { mode: m }), contentType: v };
    this.bodyChange.emit(next);
  }

  setTextBody(v: string) {
    const next: any = { ...(this.body ?? { mode: 'text' }), mode: 'text', content: v };
    this.bodyChange.emit(next);
  }

  setJsonText(v: string) {
    this._jsonText.set(v);
    this.jsonError.set('');

    // 宽松策略：输入合法 JSON 才写回 content，否则只保留文本缓冲
    try {
      const parsed = v.trim() ? JSON.parse(v) : {};
      const next: any = { ...(this.body ?? { mode: 'json' }), mode: 'json', content: parsed };
      this.bodyChange.emit(next);
    } catch (e: any) {
      this.jsonError.set('JSON 不合法（继续输入即可）');
    }
  }

  formatJson() {
    const m = this.mode();
    if (m !== 'json') return;

    const c = this.body?.content;
    try {
      const text = JSON.stringify(c ?? {}, null, 2);
      this._jsonText.set(text);
      this.jsonError.set('');
      // 同步写回
      const next: any = { ...(this.body ?? { mode: 'json' }), mode: 'json', content: c ?? {} };
      this.bodyChange.emit(next);
      this.msg.success('已格式化');
    } catch {
      this.msg.error('格式化失败');
    }
  }

  setUrlRows(rows: ApiRequestKvRow[]) {
    // enabled=false 的不写入 content（更贴近 urlencoded 语义）
    const obj: Record<string, string> = {};
    for (const r of rows) {
      if (!r.enabled) continue;
      const k = (r.key ?? '').trim();
      if (!k) continue;
      obj[k] = String(r.value ?? '');
    }

    const next: any = { ...(this.body ?? { mode: 'urlencoded' }), mode: 'urlencoded', content: obj };
    this.bodyChange.emit(next);
  }
}
