import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type { ApiRequestEntity } from '@models/api-client/api-request.model';

type Auth = ApiRequestEntity['auth'];
type AuthType = NonNullable<Auth>['type'];

@Component({
  selector: 'app-auth-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule, NzInputModule, NzAlertModule],
  template: `
    <div class="wrap">
      <div class="bar">
        <nz-select class="type" [ngModel]="type()" (ngModelChange)="setType($event)">
          @for (t of types; track t) {
            <nz-option [nzValue]="t" [nzLabel]="t"></nz-option>
          }
        </nz-select>

        @if(type()==='apikey'){
          <nz-select class="in" [ngModel]="apiKeyIn()" (ngModelChange)="setApiKeyIn($event)">
            <nz-option nzValue="header" nzLabel="in: header"></nz-option>
            <nz-option nzValue="query" nzLabel="in: query"></nz-option>
          </nz-select>
        }
      </div>

      <div class="main">
        @switch (type()) {
          @case ('none') {
            <div class="empty">无鉴权</div>
          }

          @case ('basic') {
            <div class="grid">
              <div class="row">
                <div class="label">Username</div>
                <input
                  nz-input
                  placeholder="username"
                  [ngModel]="basicUsername()"
                  (ngModelChange)="setBasicUsername($event)"
                />
              </div>

              <div class="row">
                <div class="label">Password</div>
                <input
                  nz-input
                  placeholder="password"
                  type="password"
                  [ngModel]="basicPassword()"
                  (ngModelChange)="setBasicPassword($event)"
                />
              </div>
            </div>
          }

          @case ('bearer') {
            <div class="grid">
              <div class="row">
                <div class="label">Token</div>
                <input
                  nz-input
                  placeholder="Bearer token"
                  [ngModel]="bearerToken()"
                  (ngModelChange)="setBearerToken($event)"
                />
              </div>
            </div>
          }

          @case ('apikey') {
            <div class="grid">
              <div class="row">
                <div class="label">Key</div>
                <input
                  nz-input
                  placeholder="x-api-key / api_key"
                  [ngModel]="apiKeyKey()"
                  (ngModelChange)="setApiKeyKey($event)"
                />
              </div>

              <div class="row">
                <div class="label">Value</div>
                <input
                  nz-input
                  placeholder="value"
                  [ngModel]="apiKeyValue()"
                  (ngModelChange)="setApiKeyValue($event)"
                />
              </div>

              @if(apiKeyIn()==='query'){
                <nz-alert
                  nzType="info"
                  nzShowIcon
                  nzMessage="提示：query 型 API Key 不会写入请求头，会在发送时拼接到 URL 查询参数中。"
                ></nz-alert>
              }
              @if(apiKeyIn()==='header'){
                <nz-alert
                  nzType="info"
                  nzShowIcon
                  nzMessage="提示：header 型 API Key 会在发送时写入请求头。"
                ></nz-alert>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .wrap{ display:flex; flex-direction:column; height:100%; min-height:220px; }
    .bar{
      display:flex; gap:10px; align-items:center;
      padding:8px 0; border-bottom:1px solid #f0f0f0;
    }
    .type{ width:160px; }
    .in{ width:140px; }

    .main{ flex:1 1 auto; overflow:auto; padding-top:10px; }
    .empty{ padding:12px; opacity:.7; }

    .grid{ display:flex; flex-direction:column; gap:10px; }
    .row{ display:grid; grid-template-columns: 100px 1fr; align-items:center; gap:10px; }
    .label{ font-size:12px; opacity:.8; }
  `],
})
export class AuthEditorComponent {
  @Input() auth: Auth | undefined;
  @Output() authChange = new EventEmitter<Auth | undefined>();

  types: AuthType[] = ['none', 'basic', 'bearer', 'apikey'];

  type = computed<AuthType>(() => (this.auth?.type ?? 'none') as AuthType);

  // basic
  basicUsername = computed(() => (this.auth?.type === 'basic' ? (this.auth.basic?.username ?? '') : ''));
  basicPassword = computed(() => (this.auth?.type === 'basic' ? (this.auth.basic?.password ?? '') : ''));

  // bearer
  bearerToken = computed(() => (this.auth?.type === 'bearer' ? (this.auth.bearer?.token ?? '') : ''));

  // apikey
  apiKeyIn = computed<'header' | 'query'>(() => {
    if (this.auth?.type !== 'apikey') return 'header';
    return (this.auth.apikey?.in ?? 'header') as any;
  });
  apiKeyKey = computed(() => (this.auth?.type === 'apikey' ? (this.auth.apikey?.key ?? '') : ''));
  apiKeyValue = computed(() => (this.auth?.type === 'apikey' ? (this.auth.apikey?.value ?? '') : ''));

  setType(t: AuthType) {
    if (t === 'none') {
      this.authChange.emit({ type: 'none' } as any);
      return;
    }

    if (t === 'basic') {
      this.authChange.emit({
        type: 'basic',
        basic: { username: '', password: '' },
      } as any);
      return;
    }

    if (t === 'bearer') {
      this.authChange.emit({
        type: 'bearer',
        bearer: { token: '' },
      } as any);
      return;
    }

    if (t === 'apikey') {
      this.authChange.emit({
        type: 'apikey',
        apikey: { in: 'header', key: '', value: '' },
      } as any);
      return;
    }
  }

  setBasicUsername(v: string) {
    const next: any = { ...(this.auth ?? { type: 'basic' }), type: 'basic', basic: { ...(this.auth as any)?.basic, username: v } };
    this.authChange.emit(next);
  }

  setBasicPassword(v: string) {
    const next: any = { ...(this.auth ?? { type: 'basic' }), type: 'basic', basic: { ...(this.auth as any)?.basic, password: v } };
    this.authChange.emit(next);
  }

  setBearerToken(v: string) {
    const next: any = { ...(this.auth ?? { type: 'bearer' }), type: 'bearer', bearer: { ...(this.auth as any)?.bearer, token: v } };
    this.authChange.emit(next);
  }

  setApiKeyIn(v: 'header' | 'query') {
    const next: any = {
      ...(this.auth ?? { type: 'apikey' }),
      type: 'apikey',
      apikey: { ...(this.auth as any)?.apikey, in: v, key: this.apiKeyKey(), value: this.apiKeyValue() },
    };
    this.authChange.emit(next);
  }

  setApiKeyKey(v: string) {
    const next: any = {
      ...(this.auth ?? { type: 'apikey' }),
      type: 'apikey',
      apikey: { ...(this.auth as any)?.apikey, in: this.apiKeyIn(), key: v, value: this.apiKeyValue() },
    };
    this.authChange.emit(next);
  }

  setApiKeyValue(v: string) {
    const next: any = {
      ...(this.auth ?? { type: 'apikey' }),
      type: 'apikey',
      apikey: { ...(this.auth as any)?.apikey, in: this.apiKeyIn(), key: this.apiKeyKey(), value: v },
    };
    this.authChange.emit(next);
  }
}

