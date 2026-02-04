import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild } from '@angular/core';
import { PageLayoutComponent } from '@app/shared';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ApiHistoryDrawerComponent } from './components/history';
import { RequestCollectionsComponent } from './components/request-collections';
import { EnvPickerComponent, RequestEditorComponent } from './components/request-editor';
import { ResponseViewerComponent } from './components/response-viewer';
import { ApiClientStateService } from './services';

@Component({
  selector: 'app-api-client.component',
  imports: [
    CommonModule,
    PageLayoutComponent,
    NzButtonModule,
    NzIconModule,
    RequestCollectionsComponent,
    RequestEditorComponent,
    ResponseViewerComponent,
    ApiHistoryDrawerComponent,
    EnvPickerComponent
  ],
  styles: [
    `
    .api-grid{
      display:grid;
      grid-template-columns: 280px 1fr 420px;
      gap: 12px;
      height: calc(100vh - 64px - 32px);
      min-height: 520px;
    }
    .col{
      border-radius: 8px;
      overflow: hidden;
      display:flex;
      flex-direction:column;
      min-width:0;
    }
    .left,
    .mid,
    .right {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }
    `
  ],
  template: `
      <app-page-layout [title]="'API 请求'" [loading]="store.loading()" [isFullscreen]="true">
      <ng-container ngProjectAs="actions">
         <app-env-picker
          [(drawerOpen)]="store.envDrawerOpen"
          [envs]="store.envs()"
          [envId]="store.activeEnvId()"
          (envChange)="store.setActiveEnv($event)"
          [saveEnv]="store.saveEnv.bind(store)"
          [deleteEnv]="store.deleteEnv.bind(store)"
        />
        <button nz-button nzType="primary" (click)="store.newRequest()">新建请求</button>
        <button nz-button nzType="default" (click)="store.loadRequests()">刷新</button>
        <button nz-button nzType="default" (click)="store.openHistory()">历史</button>
      </ng-container>

      <div class="api-grid">
        <div class="col left">
          <app-request-collections />
        </div>

        <div class="col mid">
          <app-request-editor
            [req]="store.activeRequest()"
            [sending]="store.sending()"
            [envVars]="store.envVarRecord()"
            [openEnv]="openEnv"
            (patch)="store.patchActive($event)"
            (save)="store.saveActive()"
            (send)="store.sendActive()"
          />
        </div>

        <div class="col right">
          <app-response-viewer [result]="store.lastResult()" />
        </div>
      </div>
    </app-page-layout>
    @if (store.historyOpen()) {
      <app-api-history-drawer
        [open]="true"
        [loading]="store.historyLoading()"
        [histories]="store.histories()"
        (close)="store.closeHistory()"
        (replay)="store.replayHistory($event)"
      />
    }

  `,
})
export class ApiClientComponent {
  store = inject(ApiClientStateService);

  openEnv = () => {
    this.store.envDrawerOpen.set(true);
  }
}
