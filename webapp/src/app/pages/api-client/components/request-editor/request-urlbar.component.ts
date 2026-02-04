import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type { HttpMethod } from '@app/models/api-request.model';
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
        placeholder="https://..."
        [ngModel]="url"
        (ngModelChange)="urlChange.emit($event)"
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
export class RequestUrlbarComponent {
  @Input() envVars: Record<string, string> = {};
  @Input() openEnv!: () => void; // 点击提示时打开 Env 管理
  @Input() method: HttpMethod = 'GET';
  @Input() url = '';
  @Input() sending = false;

  @Output() methodChange = new EventEmitter<HttpMethod>();
  @Output() urlChange = new EventEmitter<string>();
  @Output() send = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  missingVars = computed(() => {
    return collectMissingFromStrings([this.url], this.envVars);
  });
}
