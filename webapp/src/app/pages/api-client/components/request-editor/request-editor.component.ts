import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import type { ApiRequestEntity, HttpMethod } from '@app/models/api-request.model';
import { RequestTabsComponent } from './request-tabs.component';
import { RequestUrlbarComponent } from './request-urlbar.component';

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
    <app-request-urlbar
      [method]="req.method"
      [envVars]="envVars"
      [openEnv]="openEnv"
      [url]="req.url"
      [sending]="sending"
      (methodChange)="patch.emit({method:$event})"
      (urlChange)="patch.emit({url:$event})"
      (send)="send.emit()"
      (save)="save.emit()"
    />
    <div class="name">
      <input nz-input placeholder="未命名接口名称" [ngModel]="req.name" (ngModelChange)="patch.emit({name:$event})" />
    </div>
    <app-request-tabs class="tabs" [req]="req" (patch)="patch.emit($event)" />
      
  `,
  styles: [`
    :host{ display: flex; flex-direction: column;}
    .name{ padding:10px; border-bottom:1px solid #f0f0f0; }
    .tabs{ flex:1 1 auto; overflow:hidden; padding:0 10px; }
    app-request-tabs{flex:1 1 auto; height:0;}
  `],
})
export class RequestEditorComponent {
  @Input() req!: ApiRequestEntity;
  @Input() sending = false;
  @Input() envVars: Record<string, string> = {};
  @Input() openEnv!: () => void; // 点击提示时打开 Env 管理


  @Output() patch = new EventEmitter<Partial<ApiRequestEntity>>();
  @Output() send = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  @ViewChild('urlbar') urlbar!: RequestUrlbarComponent;

  methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
}
