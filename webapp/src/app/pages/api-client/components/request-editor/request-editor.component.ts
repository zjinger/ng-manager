import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import type { ApiRequestEntity, ApiHttpMethod } from '@models/api-client';
import { RequestTabsComponent } from './request-tabs.component';
import { RequestUrlbarComponent } from './request-urlbar.component';
import { extractPathParamKeys, syncPathParamsByUrl } from '@pages/api-client/utils';
@Component({
  selector: 'app-request-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzSelectModule,
    NzSpinModule,
    RequestTabsComponent,
    RequestUrlbarComponent
  ],
  template: `
  @if(request){
    <app-request-urlbar
      [method]="request.method"
      [envVars]="envVars"
      [openEnv]="openEnv"
      [url]="request.url"
      [sending]="sending"
      (methodChange)="patch.emit({method:$event})"
      (urlChange)="onUrlChange($event)"
       (urlCommit)="onUrlCommit($event)"
      (send)="send.emit()"
      (save)="save.emit()"
    />
    <div class="name">
      <input nz-input placeholder="未命名接口名称" [ngModel]="request.name" (ngModelChange)="patch.emit({name:$event})" />
    </div>
    <app-request-tabs class="tabs" [req]="request" (patch)="patch.emit($event)" />
  }    
  `,
  styles: [`
    :host{ display: flex; flex-direction: column;}
    .name{ padding:10px; border-bottom:1px solid #f0f0f0; }
    .tabs{ flex:1 1 auto; overflow:hidden; padding:0 10px; }
    app-request-tabs{flex:1 1 auto; height:0;}
  `],
})
export class RequestEditorComponent {
  @Input() request: ApiRequestEntity | null = null;
  @Input() sending = false;
  @Input() envVars: Record<string, string> = {};
  @Input() openEnv!: () => void; // 点击提示时打开 Env 管理

  @Output() patch = new EventEmitter<Partial<ApiRequestEntity>>();
  @Output() send = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  methods: ApiHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  onUrlCommit(nextUrl: string) {
    const cur = this.request;
    if (!cur) return;

    const nextPathParams = syncPathParamsByUrl(nextUrl, cur.pathParams);
    // console.log('onUrlCommit', nextUrl, nextPathParams);

    // keys 变化才 patch，避免无意义写入
    const curKeys = extractPathParamKeys(cur.url ?? "");
    const nextKeys = extractPathParamKeys(nextUrl ?? "");
    const keysChanged =
      curKeys.length !== nextKeys.length || curKeys.some((k, i) => k !== nextKeys[i]);

    if (keysChanged) {
      this.patch.emit({ pathParams: nextPathParams });
    }
  }

  onUrlChange(nextUrl: string) {
    const cur = this.request;
    if (!cur) {
      this.patch.emit({ url: nextUrl });
      return;
    }

    const nextPathParams = syncPathParamsByUrl(nextUrl, cur.pathParams);

    // 合并 patch：url + pathParams
    // 只有当 path keys 发生变化时才带上 pathParams，减少无意义 patch
    const curKeys = extractPathParamKeys(cur.url ?? "");
    const nextKeys = extractPathParamKeys(nextUrl ?? "");
    const keysChanged =
      curKeys.length !== nextKeys.length || curKeys.some((k, i) => k !== nextKeys[i]);

    if (keysChanged) {
      this.patch.emit({ url: nextUrl, pathParams: nextPathParams });
    } else {
      this.patch.emit({ url: nextUrl });
    }
  }

}
